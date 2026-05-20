import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockBoothsById } from '@/mocks/booth-profile';
import { toBooth, fromBooth } from './mapper';
import type { Booth, BoothDTO } from './types';

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
  id: number;
  isReservable: boolean;
}): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 150));
  const booth = mockBoothsById[input.id];
  if (!booth) throw new Error(`mock: booth ${input.id} 을(를) 찾을 수 없습니다.`);
  mockBoothsById[input.id] = { ...booth, isReservable: input.isReservable };
  return mockBoothsById[input.id];
}

async function deleteBoothMock(id: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  delete mockBoothsById[id];
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

/** 부스 운영 ON/OFF 단건 변경 — 전체 PUT 과 별개의 전용 엔드포인트. */
async function setBoothReservableReal(input: {
  id: number;
  isReservable: boolean;
}): Promise<Booth> {
  const dto = await api.patch<BoothDTO>(`/admin/booths/${input.id}/reservable`, {
    isReservable: input.isReservable,
  });
  return toBooth(dto);
}

/**
 * 부스 행을 DB 에서 완전히 삭제. 어드민 계정 삭제(A-014) 가드를 풀어주는 cascade
 * 용도 — 단독 호출보다 useDeleteUser 흐름에서 컨펌 후 함께 사용.
 */
async function deleteBoothReal(id: number): Promise<void> {
  await api.delete(`/admin/booths/${id}`);
}

// ---- 분기 export ----

export const getMyBooth = env.USE_MOCK ? getMyBoothMock : getMyBoothReal;
export const updateMyBooth = env.USE_MOCK ? updateMyBoothMock : updateMyBoothReal;
export const listBooths = env.USE_MOCK ? listBoothsMock : listBoothsReal;
export const setBoothReservable = env.USE_MOCK ? setBoothReservableMock : setBoothReservableReal;
export const deleteBooth = env.USE_MOCK ? deleteBoothMock : deleteBoothReal;
