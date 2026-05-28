import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mapLocationStorage } from './storage';
import { toMapLocation } from './mapper';
import type { MapLocation, MapLocationDTO, MapLocationType, MapDisplayStatus } from './types';
import type { PageResponse } from '@/types/api';

const BASE = '/admin/map-locations';

/** n 을 소수 digits 자리로 반올림. */
const round = (n: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

type CoordFields = {
  mapX?: number;
  mapY?: number;
  width?: number | null;
  height?: number | null;
};

/**
 * 좌표 소수 자릿수를 백엔드 @Digits 한계로 절사한다.
 * mapX/mapY = DECIMAL(10,4), width/height = DECIMAL(6,3) — 편집기가 픽셀÷이미지
 * 비율로 만든 긴 소수(예: 42.857142857…)를 그대로 보내면 검증에서 400 이 난다.
 */
function clampCoords<T extends CoordFields>(v: T): T {
  const out = { ...v };
  if (typeof out.mapX === 'number') out.mapX = round(out.mapX, 4);
  if (typeof out.mapY === 'number') out.mapY = round(out.mapY, 4);
  if (typeof out.width === 'number') out.width = round(out.width, 3);
  if (typeof out.height === 'number') out.height = round(out.height, 3);
  return out;
}

/** 생성 입력. locationType 은 BOOTH 고정, displayStatus 는 VISIBLE 기본. */
export interface CreateMapLocationInput {
  locationName: string;
  sector: string;
  mapX: number;
  mapY: number;
  width: number;
  height: number;
}

/** 수정 입력 — 부분 패치. */
export interface UpdateMapLocationPatch {
  locationName?: string;
  sector?: string;
  mapX?: number;
  mapY?: number;
  width?: number;
  height?: number;
  displayStatus?: MapDisplayStatus;
}

// ---- listMapLocations: BOOTH 타입 전체 ----

const listMapLocationsMock = async (): Promise<MapLocation[]> =>
  mapLocationStorage
    .loadAll()
    .filter((d) => d.locationType === 'BOOTH')
    .map(toMapLocation);

const listMapLocationsReal = async (): Promise<MapLocation[]> => {
  // 페이지 순회로 BOOTH 타입 슬롯을 전부 수집한다.
  // 단일 페이지(size=100) 고정 조회로는 슬롯이 100개를 넘는 순간 뒤쪽 location 이
  // 누락돼, 그걸 가리키는 부스가 FE 에서 "미배치"로 보이고 editor 가 거부하는
  // 침묵 버그가 났었다(booths.api.ts:listBoothsReal 와 동일한 패턴 적용).
  // hasNext 만 믿으면 백엔드가 page 를 무시/오계산할 때 무한 루프가 가능하므로
  // totalPages 상한 + MAX_PAGES 하드 캡 + content 빈 응답 가드를 함께 둔다.
  const PAGE_SIZE = 100;
  const MAX_PAGES = 50; // 안전 상한(슬롯 5000개) — 잘못된 응답에서의 요청 폭주 차단.
  const all: MapLocationDTO[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages && page < MAX_PAGES) {
    const qs = new URLSearchParams({
      location_type: 'BOOTH',
      size: String(PAGE_SIZE),
      page: String(page),
    }).toString();
    const res = await api.get<PageResponse<MapLocationDTO>>(`${BASE}?${qs}`);
    all.push(...res.content);
    totalPages = res.totalPages;
    if (!res.hasNext || res.content.length === 0) break;
    page += 1;
  }
  return all.map(toMapLocation);
};

export const listMapLocations = env.USE_MOCK ? listMapLocationsMock : listMapLocationsReal;

// ---- createMapLocation ----

const createMapLocationMock = async (input: CreateMapLocationInput): Promise<MapLocation> => {
  const c = clampCoords(input);
  const dto = mapLocationStorage.createOne({
    locationName: c.locationName,
    sector: c.sector,
    mapX: c.mapX,
    mapY: c.mapY,
    width: c.width,
    height: c.height,
    locationType: 'BOOTH' as MapLocationType,
    displayOrder: 0,
    displayStatus: 'VISIBLE' as MapDisplayStatus,
  });
  return toMapLocation(dto);
};

const createMapLocationReal = async (input: CreateMapLocationInput): Promise<MapLocation> => {
  const c = clampCoords(input);
  const dto = await api.post<MapLocationDTO>(BASE, {
    locationName: c.locationName,
    sector: c.sector,
    mapX: c.mapX,
    mapY: c.mapY,
    width: c.width,
    height: c.height,
    locationType: 'BOOTH',
    displayStatus: 'VISIBLE',
  });
  return toMapLocation(dto);
};

export const createMapLocation = env.USE_MOCK ? createMapLocationMock : createMapLocationReal;

// ---- updateMapLocation (PATCH) ----

const updateMapLocationMock = async (
  id: number,
  patch: UpdateMapLocationPatch,
): Promise<MapLocation> => toMapLocation(mapLocationStorage.updateOne(id, clampCoords(patch)));

const updateMapLocationReal = async (
  id: number,
  patch: UpdateMapLocationPatch,
): Promise<MapLocation> => {
  const dto = await api.patch<MapLocationDTO>(`${BASE}/${id}`, clampCoords(patch));
  return toMapLocation(dto);
};

export const updateMapLocation = env.USE_MOCK ? updateMapLocationMock : updateMapLocationReal;

// ---- deleteMapLocation ----

const deleteMapLocationMock = async (id: number): Promise<void> => {
  mapLocationStorage.deleteOne(id);
};

const deleteMapLocationReal = async (id: number): Promise<void> => {
  await api.delete(`${BASE}/${id}`);
};

export const deleteMapLocation = env.USE_MOCK ? deleteMapLocationMock : deleteMapLocationReal;
