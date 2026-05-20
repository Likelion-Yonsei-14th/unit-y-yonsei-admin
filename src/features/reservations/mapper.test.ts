import { describe, expect, it } from 'vitest';
import {
  reservationStateFromBackend,
  reservationStateToBackend,
  toReservation,
  toReservationSummary,
} from './mapper';
import type { Reservation, ReservationDTO, ReservationSummaryDTO } from './types';

const makeDTO = (override: Partial<ReservationDTO> = {}): ReservationDTO => ({
  id: 1,
  boothId: 1,
  reservationNumber: 1,
  bookerName: 'x',
  phoneNumber: '010-0000-0000',
  partySize: 1,
  status: 'PENDING',
  cancelReason: '',
  createdAt: '',
  updatedAt: '',
  ...override,
});

describe('reservations mapper', () => {
  describe('toReservation', () => {
    it('백엔드 DTO 의 필드명을 프론트 모델로 정확히 옮긴다', () => {
      const dto = makeDTO({
        id: 7,
        boothId: 3,
        reservationNumber: 5,
        bookerName: '김철수',
        phoneNumber: '010-1234-5678',
        partySize: 4,
        status: 'PENDING',
      });
      expect(toReservation(dto)).toEqual({
        id: '7',
        boothId: 3,
        reservationNumber: 5,
        name: '김철수',
        people: 4,
        contact: '010-1234-5678',
        status: 'waiting',
      });
    });

    it('id 는 항상 문자열로 변환된다', () => {
      const r = toReservation(makeDTO({ id: 123 }));
      expect(typeof r.id).toBe('string');
      expect(r.id).toBe('123');
    });

    it('상태 enum 백→프 매핑: PENDING/CONFIRMED/CANCELLED → waiting/completed/cancelled', () => {
      const status = (s: string) => toReservation(makeDTO({ status: s })).status;
      expect(status('PENDING')).toBe('waiting');
      expect(status('CONFIRMED')).toBe('completed');
      expect(status('CANCELLED')).toBe('cancelled');
    });
  });

  describe('toReservationSummary', () => {
    it('상태 키를 프론트 키로 변환한다 (pending→waiting, confirmed→completed)', () => {
      const dto: ReservationSummaryDTO = {
        booths: [
          { boothId: 1, pending: 5, confirmed: 3, cancelled: 1, total: 9 },
          { boothId: 2, pending: 0, confirmed: 2, cancelled: 0, total: 2 },
        ],
        totals: { pending: 5, confirmed: 5, cancelled: 1, total: 11 },
      };
      const summary = toReservationSummary(dto);
      expect(summary.byBooth.get(1)).toEqual({ waiting: 5, completed: 3, cancelled: 1 });
      expect(summary.byBooth.get(2)).toEqual({ waiting: 0, completed: 2, cancelled: 0 });
      expect(summary.totals).toEqual({ waiting: 5, completed: 5, cancelled: 1, total: 11 });
    });

    it('빈 booths 배열이면 byBooth 도 빈 Map', () => {
      const summary = toReservationSummary({
        booths: [],
        totals: { pending: 0, confirmed: 0, cancelled: 0, total: 0 },
      });
      expect(summary.byBooth.size).toBe(0);
      expect(summary.totals.total).toBe(0);
    });
  });

  describe('reservationStateFromBackend', () => {
    it('알려진 상태는 그대로 매핑', () => {
      expect(reservationStateFromBackend('PENDING')).toBe('waiting');
      expect(reservationStateFromBackend('CONFIRMED')).toBe('completed');
      expect(reservationStateFromBackend('CANCELLED')).toBe('cancelled');
    });

    it('대소문자 무관 — 소문자도 정상 매핑', () => {
      expect(reservationStateFromBackend('pending')).toBe('waiting');
      expect(reservationStateFromBackend('Confirmed')).toBe('completed');
    });

    it('알 수 없는 값은 waiting 으로 폴백', () => {
      expect(reservationStateFromBackend('UNKNOWN')).toBe('waiting');
      expect(reservationStateFromBackend('')).toBe('waiting');
    });
  });

  describe('상태 round-trip', () => {
    it('toBackend → fromBackend 가 원래 상태로 돌아온다', () => {
      const states: Reservation['status'][] = ['waiting', 'completed', 'cancelled'];
      for (const s of states) {
        expect(reservationStateFromBackend(reservationStateToBackend(s))).toBe(s);
      }
    });
  });
});
