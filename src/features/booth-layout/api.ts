import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockBoothPlacements } from '@/mocks/booth-placements';
import { toBoothPlacement } from './mapper';
import type { BoothPlacement, BoothPlacementDTO } from './types';

// ---- listPlacements(date) ----

const listPlacementsMock = async (date: string): Promise<BoothPlacement[]> =>
  mockBoothPlacements.filter((p) => p.date === date).map(toBoothPlacement);

const listPlacementsReal = async (date: string): Promise<BoothPlacement[]> => {
  const qs = new URLSearchParams({ date }).toString();
  const data = await api.get<BoothPlacementDTO[]>(`/booth-placements?${qs}`);
  return data.map(toBoothPlacement);
};

export const listPlacements = env.USE_MOCK ? listPlacementsMock : listPlacementsReal;

// ---- getPlacementByBoothId(boothId) ----
// Booth 계정이 본인 배치(=본인 날짜·섹션)를 resolve 하려고 호출.

const getPlacementByBoothIdMock = async (boothId: number): Promise<BoothPlacement | null> => {
  const row = mockBoothPlacements.find((p) => p.booth_id === boothId);
  return row ? toBoothPlacement(row) : null;
};

const getPlacementByBoothIdReal = async (boothId: number): Promise<BoothPlacement | null> => {
  const data = await api.get<BoothPlacementDTO | null>(`/booth-placements/by-booth/${boothId}`);
  return data ? toBoothPlacement(data) : null;
};

export const getPlacementByBoothId = env.USE_MOCK
  ? getPlacementByBoothIdMock
  : getPlacementByBoothIdReal;
