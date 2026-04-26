import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { placementStorage } from './storage';
import { toBoothPlacement, fromBoothPlacement } from './mapper';
import type { BoothPlacement, BoothPlacementDTO, MapSectionId } from './types';

// ---- listPlacements(date) ----

const listPlacementsMock = async (date: string): Promise<BoothPlacement[]> =>
  placementStorage.loadAll().filter((p) => p.date === date).map(toBoothPlacement);

const listPlacementsReal = async (date: string): Promise<BoothPlacement[]> => {
  const qs = new URLSearchParams({ date }).toString();
  const data = await api.get<BoothPlacementDTO[]>(`/booth-placements?${qs}`);
  return data.map(toBoothPlacement);
};

export const listPlacements = env.USE_MOCK ? listPlacementsMock : listPlacementsReal;

// ---- getPlacementsByBoothId(boothId) ----
// 한 운영자가 자리 여러 개를 가질 수 있어 array 반환.

const getPlacementsByBoothIdMock = async (boothId: number): Promise<BoothPlacement[]> =>
  placementStorage.loadAll().filter((p) => p.booth_id === boothId).map(toBoothPlacement);

const getPlacementsByBoothIdReal = async (boothId: number): Promise<BoothPlacement[]> => {
  const data = await api.get<BoothPlacementDTO[]>(`/booth-placements/by-booth/${boothId}`);
  return data.map(toBoothPlacement);
};

export const getPlacementsByBoothId = env.USE_MOCK
  ? getPlacementsByBoothIdMock
  : getPlacementsByBoothIdReal;

// ---- createPlacement ----

export interface CreatePlacementInput {
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const createPlacementMock = async (input: CreatePlacementInput): Promise<BoothPlacement> => {
  const dto = placementStorage.createOne({
    booth_id: input.boothId,
    date: input.date,
    section: input.section,
    booth_number: input.boothNumber,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  });
  return toBoothPlacement(dto);
};

const createPlacementReal = async (input: CreatePlacementInput): Promise<BoothPlacement> => {
  const data = await api.post<BoothPlacementDTO>('/booth-placements', {
    booth_id: input.boothId,
    date: input.date,
    section: input.section,
    booth_number: input.boothNumber,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  });
  return toBoothPlacement(data);
};

export const createPlacement = env.USE_MOCK ? createPlacementMock : createPlacementReal;

// ---- updatePlacement ----

const updatePlacementMock = async (placement: BoothPlacement): Promise<BoothPlacement> => {
  const dto = placementStorage.updateOne(fromBoothPlacement(placement));
  return toBoothPlacement(dto);
};

const updatePlacementReal = async (placement: BoothPlacement): Promise<BoothPlacement> => {
  const data = await api.put<BoothPlacementDTO>(
    `/booth-placements/${placement.id}`,
    fromBoothPlacement(placement),
  );
  return toBoothPlacement(data);
};

export const updatePlacement = env.USE_MOCK ? updatePlacementMock : updatePlacementReal;

// ---- deletePlacement ----

const deletePlacementMock = async (id: number): Promise<void> => {
  placementStorage.deleteOne(id);
};

const deletePlacementReal = async (id: number): Promise<void> => {
  await api.delete(`/booth-placements/${id}`);
};

export const deletePlacement = env.USE_MOCK ? deletePlacementMock : deletePlacementReal;

// ---- copyPlacements ----

export interface CopyPlacementsInput {
  fromDate: string;
  toDate: string;
  section: MapSectionId;
}

const copyPlacementsMock = async (input: CopyPlacementsInput): Promise<BoothPlacement[]> => {
  const created = placementStorage.copyAcrossDates(input.fromDate, input.toDate, input.section);
  return created.map(toBoothPlacement);
};

const copyPlacementsReal = async (input: CopyPlacementsInput): Promise<BoothPlacement[]> => {
  const data = await api.post<BoothPlacementDTO[]>('/booth-placements/copy', {
    from_date: input.fromDate,
    to_date: input.toDate,
    section: input.section,
  });
  return data.map(toBoothPlacement);
};

export const copyPlacements = env.USE_MOCK ? copyPlacementsMock : copyPlacementsReal;

// ---- resetSection ----
// real 백엔드는 `DELETE /booth-placements?date=&section=` 같은 컬렉션 삭제로 매핑.

const resetSectionMock = async (date: string, section: MapSectionId): Promise<void> => {
  placementStorage.resetSection(date, section);
};

const resetSectionReal = async (date: string, section: MapSectionId): Promise<void> => {
  const qs = new URLSearchParams({ date, section }).toString();
  await api.delete(`/booth-placements?${qs}`);
};

export const resetSection = env.USE_MOCK ? resetSectionMock : resetSectionReal;
