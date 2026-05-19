import type {
  Reservation,
  ReservationCounts,
  ReservationDTO,
  ReservationState,
  ReservationSummary,
  ReservationSummaryDTO,
} from './types';

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
  reservationNumber: d.reservationNumber,
  name: d.bookerName,
  people: d.partySize,
  contact: d.phoneNumber,
  status: reservationStateFromBackend(d.status),
});

// ---- 예약 현황 요약 ----
// 백엔드 상태 키(pending/confirmed/cancelled) → 프론트 상태 키(waiting/completed/cancelled).

export const toReservationSummary = (d: ReservationSummaryDTO): ReservationSummary => {
  const byBooth = new Map<number, ReservationCounts>();
  for (const b of d.booths) {
    byBooth.set(b.boothId, {
      waiting: b.pending,
      completed: b.confirmed,
      cancelled: b.cancelled,
    });
  }
  return {
    byBooth,
    totals: {
      waiting: d.totals.pending,
      completed: d.totals.confirmed,
      cancelled: d.totals.cancelled,
      total: d.totals.total,
    },
  };
};
