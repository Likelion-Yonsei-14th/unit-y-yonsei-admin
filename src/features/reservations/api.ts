import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockReservations } from '@/mocks/reservations';
import { reservationStateToBackend, toReservation } from './mapper';
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

/** 벌크 상태 변경 — 다중 id 를 한 번에 status 로 옮긴다. mock 은 순차 적용. */
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

// ---- mock: 새 예약 도착 시뮬레이션 ----
// 정적 mock 만으로는 폴링해도 뱃지·토스트가 동작하지 않아 QA 가 불가능하다.
// 부스별로 벽시계 ~20초마다 합성 PENDING 예약을 1건씩, 최대 3건까지 주입한다.
const mockInjectBaseline = new Map<number, number>();
const mockInjectCount = new Map<number, number>();

function maybeInjectMockReservation(boothId: number): void {
  const now = Date.now();
  // 첫 호출은 기준 시각만 잡고 주입하지 않는다 — 진입 직후 토스트 방지.
  if (!mockInjectBaseline.has(boothId)) {
    mockInjectBaseline.set(boothId, now);
    return;
  }
  const count = mockInjectCount.get(boothId) ?? 0;
  if (count >= 3) return;
  if (now - (mockInjectBaseline.get(boothId) ?? now) < 20_000) return;

  mockInjectBaseline.set(boothId, now);
  mockInjectCount.set(boothId, count + 1);
  memory.push({
    id: `MOCKNEW-${boothId}-${count + 1}`,
    boothId,
    time: '',
    name: `신규예약자${count + 1}`,
    people: 2,
    contact: '010-0000-0000',
    status: 'waiting',
  });
}

async function listBoothReservationsMock(boothId: number): Promise<Reservation[]> {
  await new Promise((r) => setTimeout(r, 100));
  maybeInjectMockReservation(boothId);
  return memory.filter((r) => r.boothId === boothId);
}

// ---- list / mutations (real) ----

async function listReservationsReal(): Promise<Reservation[]> {
  // ⚠️ 백엔드는 부스별 조회(GET /admin/reservations/booths/{boothId})만 제공한다.
  // 전체 예약 목록 엔드포인트(GET /admin/reservations)는 아직 없음 — 백엔드 추가 요청 항목.
  const dtos = await api.get<ReservationDTO[]>('/admin/reservations');
  return dtos.map(toReservation);
}

async function listBoothReservationsReal(boothId: number): Promise<Reservation[]> {
  const dtos = await api.get<ReservationDTO[]>(`/admin/reservations/booths/${boothId}`);
  return dtos.map(toReservation);
}

async function setReservationStatusReal(input: {
  id: string;
  status: ReservationState;
}): Promise<Reservation> {
  const dto = await api.patch<ReservationDTO>(`/admin/reservations/${input.id}/status`, {
    status: reservationStateToBackend(input.status),
  });
  return toReservation(dto);
}

/**
 * 벌크 상태 변경 — 백엔드에 벌크 엔드포인트가 없어 단건 PATCH 를 병렬 호출한다.
 * 일부 실패 시 Promise.all 이 reject — 호출부 onError 가 받는다.
 */
async function setReservationsStatusBulkReal(input: {
  ids: string[];
  status: ReservationState;
}): Promise<Reservation[]> {
  return Promise.all(input.ids.map((id) => setReservationStatusReal({ id, status: input.status })));
}

// ---- 분기 export ----

export const listReservations = env.USE_MOCK ? listReservationsMock : listReservationsReal;
export const listBoothReservations = env.USE_MOCK
  ? listBoothReservationsMock
  : listBoothReservationsReal;
export const setReservationStatus = env.USE_MOCK
  ? setReservationStatusMock
  : setReservationStatusReal;
export const setReservationsStatusBulk = env.USE_MOCK
  ? setReservationsStatusBulkMock
  : setReservationsStatusBulkReal;
