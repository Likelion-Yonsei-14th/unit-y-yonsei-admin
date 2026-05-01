import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockReservations } from '@/mocks/reservations';
import { toReservation } from './mapper';
import type { Reservation, ReservationDTO, ReservationState } from './types';

const memory: Reservation[] = mockReservations.map((r) => ({ ...r }));

// ---- list / mutations (mock) ----

async function listReservationsMock(): Promise<Reservation[]> {
  await new Promise((r) => setTimeout(r, 100));
  return memory.slice();
}

async function setReservationStatusMock(input: {
  id: string;
  status: ReservationState;
}): Promise<Reservation> {
  await new Promise((r) => setTimeout(r, 80));
  const idx = memory.findIndex((r) => r.id === input.id);
  if (idx < 0) throw new Error(`mock: reservation ${input.id} 을(를) 찾을 수 없습니다.`);
  memory[idx] = { ...memory[idx], status: input.status };
  return memory[idx];
}

/**
 * 벌크 상태 변경 — 다중 id 를 한 번에 status 로 옮긴다. mock 은 순차 적용.
 * 실제 백엔드는 한 번의 PATCH 컬렉션 요청으로 매핑될 가능성이 큼.
 */
async function setReservationsStatusBulkMock(input: {
  ids: string[];
  status: ReservationState;
}): Promise<Reservation[]> {
  await new Promise((r) => setTimeout(r, 120));
  const updated: Reservation[] = [];
  for (const id of input.ids) {
    const idx = memory.findIndex((r) => r.id === id);
    if (idx < 0) continue;
    memory[idx] = { ...memory[idx], status: input.status };
    updated.push(memory[idx]);
  }
  return updated;
}

// ---- list / mutations (real) ----

async function listReservationsReal(): Promise<Reservation[]> {
  const dtos = await api.get<ReservationDTO[]>('/reservations');
  return dtos.map(toReservation);
}

async function setReservationStatusReal(input: {
  id: string;
  status: ReservationState;
}): Promise<Reservation> {
  const dto = await api.patch<ReservationDTO>(`/reservations/${input.id}`, {
    status: input.status,
  });
  return toReservation(dto);
}

async function setReservationsStatusBulkReal(input: {
  ids: string[];
  status: ReservationState;
}): Promise<Reservation[]> {
  const dtos = await api.patch<ReservationDTO[]>('/reservations', input);
  return dtos.map(toReservation);
}

// ---- 분기 export ----

export const listReservations = env.USE_MOCK ? listReservationsMock : listReservationsReal;
export const setReservationStatus = env.USE_MOCK
  ? setReservationStatusMock
  : setReservationStatusReal;
export const setReservationsStatusBulk = env.USE_MOCK
  ? setReservationsStatusBulkMock
  : setReservationsStatusBulkReal;
