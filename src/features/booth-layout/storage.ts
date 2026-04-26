// src/features/booth-layout/storage.ts
import type { BoothPlacementDTO, MapSectionId } from './types';
import { mockBoothPlacements } from '@/mocks/booth-placements';

/**
 * mock 환경의 placement persistence.
 * 백엔드 붙는 시점엔 api.ts 의 real 구현이 대체하므로 view-layer 는
 * storage 의 존재를 모른다.
 *
 * 키 versioned (`:v1`) — 스키마 변경 시 키 bump 으로 안전 마이그레이션.
 */
const STORAGE_KEY = 'unit-y:placements:v1';

function readRaw(): BoothPlacementDTO[] {
  if (typeof window === 'undefined') return [...mockBoothPlacements];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeRaw(mockBoothPlacements);
      return [...mockBoothPlacements];
    }
    const parsed = JSON.parse(raw) as BoothPlacementDTO[];
    return Array.isArray(parsed) ? parsed : [...mockBoothPlacements];
  } catch {
    return [...mockBoothPlacements];
  }
}

function writeRaw(rows: BoothPlacementDTO[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    // 한도 초과/private mode 등 — 호출부 mutation 에서 toast 처리.
    throw err;
  }
}

export const placementStorage = {
  loadAll(): BoothPlacementDTO[] {
    return readRaw();
  },

  /** id 가 있으면 update, 없으면 throw — create 는 createOne 사용. */
  upsertOne(dto: BoothPlacementDTO): BoothPlacementDTO {
    const rows = readRaw();
    const idx = rows.findIndex((r) => r.id === dto.id);
    if (idx < 0) {
      throw new Error(`placement id ${dto.id} 가 존재하지 않습니다.`);
    }
    // (date, section, booth_number) 중복 검사 — 자기 자신 제외.
    const conflict = rows.find(
      (r) =>
        r.id !== dto.id &&
        r.date === dto.date &&
        r.section === dto.section &&
        r.booth_number === dto.booth_number,
    );
    if (conflict) {
      throw new Error(
        `이미 ${dto.date} ${dto.section} 에 부스번호 "${dto.booth_number}" 가 존재합니다.`,
      );
    }
    rows[idx] = dto;
    writeRaw(rows);
    return dto;
  },

  createOne(input: Omit<BoothPlacementDTO, 'id'>): BoothPlacementDTO {
    const rows = readRaw();
    const conflict = rows.find(
      (r) =>
        r.date === input.date &&
        r.section === input.section &&
        r.booth_number === input.booth_number,
    );
    if (conflict) {
      throw new Error(
        `이미 ${input.date} ${input.section} 에 부스번호 "${input.booth_number}" 가 존재합니다.`,
      );
    }
    const nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const dto: BoothPlacementDTO = { ...input, id: nextId };
    rows.push(dto);
    writeRaw(rows);
    return dto;
  },

  deleteOne(id: number): void {
    const rows = readRaw();
    writeRaw(rows.filter((r) => r.id !== id));
  },

  /**
   * fromDate × section 의 모든 row 를 toDate 로 복제.
   * toDate × section 기존 row 는 삭제(덮어쓰기 시맨틱).
   */
  copyAcrossDates(fromDate: string, toDate: string, section: MapSectionId): BoothPlacementDTO[] {
    if (fromDate === toDate) return [];
    const rows = readRaw();
    const sources = rows.filter((r) => r.date === fromDate && r.section === section);
    if (sources.length === 0) return [];
    const filtered = rows.filter((r) => !(r.date === toDate && r.section === section));
    let nextId = filtered.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const created: BoothPlacementDTO[] = sources.map((s) => ({ ...s, id: nextId++, date: toDate }));
    writeRaw([...filtered, ...created]);
    return created;
  },

  /** 특정 (date, section) 의 모든 row 삭제. */
  resetSection(date: string, section: MapSectionId): void {
    const rows = readRaw();
    writeRaw(rows.filter((r) => !(r.date === date && r.section === section)));
  },
};
