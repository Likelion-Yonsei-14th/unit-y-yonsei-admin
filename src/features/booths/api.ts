import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockBoothsById } from '@/mocks/booth-profile';
import { toBooth, fromBooth } from './mapper';
import type { Booth, BoothDTO, BoothStatus } from './types';

// ---- Mock ----

async function getMyBoothMock(): Promise<Booth | null> {
  await new Promise((r) => setTimeout(r, 150));
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Booth' || user.boothId == null) return null;
  return mockBoothsById[user.boothId] ?? null;
}

async function updateMyBoothMock(booth: Booth): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 200));
  mockBoothsById[booth.id] = { ...booth };
  return mockBoothsById[booth.id];
}

async function listBoothsMock(): Promise<Booth[]> {
  await new Promise((r) => setTimeout(r, 100));
  return Object.values(mockBoothsById);
}

async function setBoothReservableMock(input: {
  boothId: number;
  isReservable: boolean;
}): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 120));
  const cur = mockBoothsById[input.boothId];
  if (!cur) throw new Error(`mock: booth ${input.boothId} not found`);
  mockBoothsById[input.boothId] = { ...cur, isReservable: input.isReservable };
  return mockBoothsById[input.boothId];
}

// ---- Real ----

async function getMyBoothReal(): Promise<Booth | null> {
  const user = useAuthStore.getState().user;
  if (!user || user.boothId == null) return null;
  const dto = await api.get<BoothDTO>(`/booths/${user.boothId}`);
  return toBooth(dto);
}

async function updateMyBoothReal(booth: Booth): Promise<Booth> {
  const dto = await api.put<BoothDTO>(`/admin/booths/${booth.id}`, fromBooth(booth));
  return toBooth(dto);
}

async function listBoothsReal(): Promise<Booth[]> {
  const dtos = await api.get<BoothDTO[]>('/booths');
  return dtos.map(toBooth);
}

async function setBoothReservableReal(input: {
  boothId: number;
  isReservable: boolean;
}): Promise<Booth> {
  const dto = await api.patch<BoothDTO>(`/admin/booths/${input.boothId}/reservable`, {
    isReservable: input.isReservable,
  });
  return toBooth(dto);
}

// ---- 분기 export ----

export const getMyBooth = env.USE_MOCK ? getMyBoothMock : getMyBoothReal;
export const updateMyBooth = env.USE_MOCK ? updateMyBoothMock : updateMyBoothReal;
export const listBooths = env.USE_MOCK ? listBoothsMock : listBoothsReal;
export const setBoothReservable = env.USE_MOCK ? setBoothReservableMock : setBoothReservableReal;

// status enum 은 BoothStatus 타입 재사용 — 별도 status 변경 API 가 필요하면
// PATCH /admin/booths/{id}/status 로 동일 패턴 추가.
export type { BoothStatus };
