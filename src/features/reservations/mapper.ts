import type { Reservation, ReservationDTO, ReservationState } from './types';

// ---- 예약 상태 enum 변환 ----
// 백엔드: PENDING | CONFIRMED | CANCELLED ↔ 프론트: waiting | completed | cancelled

const STATE_FROM_BACKEND: Record<string, ReservationState> = {
  PENDING: 'waiting',
  CONFIRMED: 'completed',
  CANCELLED: 'cancelled',
};
const STATE_TO_BACKEND: Record<ReservationState, string> = {
  waiting: 'PENDING',
  completed: 'CONFIRMED',
  cancelled: 'CANCELLED',
};

export function reservationStateFromBackend(value: string): ReservationState {
  return STATE_FROM_BACKEND[value?.toUpperCase()] ?? 'waiting';
}

export function reservationStateToBackend(state: ReservationState): string {
  return STATE_TO_BACKEND[state];
}

export const toReservation = (d: ReservationDTO): Reservation => ({
  id: String(d.id),
  boothId: d.boothId,
  // 백엔드 예약은 대기열 모델 — 시간 슬롯 필드가 없다.
  time: '',
  name: d.bookerName,
  people: d.partySize,
  contact: d.phoneNumber,
  status: reservationStateFromBackend(d.status),
});
