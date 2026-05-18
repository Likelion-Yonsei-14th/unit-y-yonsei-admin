// src/features/booth-layout/storage.ts
import type { MapLocationDTO } from './types';
import { mockMapLocations } from '@/mocks/map-locations';

/**
 * mock 환경의 MapLocation persistence.
 * 백엔드 붙는 시점엔 api.ts 의 real 구현이 대체하므로 view-layer 는 storage 를 모른다.
 * 키 versioned(:v2) — placement(:v1) 스키마와 단절.
 */
const STORAGE_KEY = 'unit-y:map-locations:v2';

function readRaw(): MapLocationDTO[] {
  if (typeof window === 'undefined') return [...mockMapLocations];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeRaw(mockMapLocations);
      return [...mockMapLocations];
    }
    const parsed = JSON.parse(raw) as MapLocationDTO[];
    return Array.isArray(parsed) ? parsed : [...mockMapLocations];
  } catch {
    return [...mockMapLocations];
  }
}

function writeRaw(rows: MapLocationDTO[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export const mapLocationStorage = {
  loadAll(): MapLocationDTO[] {
    return readRaw();
  },

  /** 신규 생성. id 는 max(id)+1. createdAt/updatedAt 은 호출 시각. */
  createOne(input: Omit<MapLocationDTO, 'id' | 'createdAt' | 'updatedAt'>): MapLocationDTO {
    const rows = readRaw();
    const nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const ts = new Date().toISOString();
    const dto: MapLocationDTO = { ...input, id: nextId, createdAt: ts, updatedAt: ts };
    rows.push(dto);
    writeRaw(rows);
    return dto;
  },

  /** 부분 수정. id 없으면 throw. */
  updateOne(id: number, patch: Partial<MapLocationDTO>): MapLocationDTO {
    const rows = readRaw();
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`map location id ${id} 가 존재하지 않습니다.`);
    const updated: MapLocationDTO = {
      ...rows[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    rows[idx] = updated;
    writeRaw(rows);
    return updated;
  },

  deleteOne(id: number): void {
    const rows = readRaw();
    writeRaw(rows.filter((r) => r.id !== id));
  },
};
