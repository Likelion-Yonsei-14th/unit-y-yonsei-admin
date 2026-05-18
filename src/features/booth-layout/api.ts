import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mapLocationStorage } from './storage';
import { toMapLocation } from './mapper';
import type {
  MapLocation,
  MapLocationDTO,
  MapLocationType,
  MapDisplayStatus,
  PageResponse,
} from './types';

const BASE = '/admin/map-locations';

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
  // 슬롯 100개 미만 전제 — 단일 페이지 조회.
  const qs = new URLSearchParams({ location_type: 'BOOTH', size: '100' }).toString();
  const page = await api.get<PageResponse<MapLocationDTO>>(`${BASE}?${qs}`);
  return page.content.map(toMapLocation);
};

export const listMapLocations = env.USE_MOCK ? listMapLocationsMock : listMapLocationsReal;

// ---- createMapLocation ----

const createMapLocationMock = async (input: CreateMapLocationInput): Promise<MapLocation> => {
  const dto = mapLocationStorage.createOne({
    locationName: input.locationName,
    sector: input.sector,
    mapX: input.mapX,
    mapY: input.mapY,
    width: input.width,
    height: input.height,
    locationType: 'BOOTH' as MapLocationType,
    displayOrder: 0,
    displayStatus: 'VISIBLE' as MapDisplayStatus,
  });
  return toMapLocation(dto);
};

const createMapLocationReal = async (input: CreateMapLocationInput): Promise<MapLocation> => {
  const dto = await api.post<MapLocationDTO>(BASE, {
    locationName: input.locationName,
    sector: input.sector,
    mapX: input.mapX,
    mapY: input.mapY,
    width: input.width,
    height: input.height,
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
): Promise<MapLocation> => toMapLocation(mapLocationStorage.updateOne(id, patch));

const updateMapLocationReal = async (
  id: number,
  patch: UpdateMapLocationPatch,
): Promise<MapLocation> => {
  const dto = await api.patch<MapLocationDTO>(`${BASE}/${id}`, patch);
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
