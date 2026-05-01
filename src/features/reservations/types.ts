export type ReservationState = 'waiting' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  /** 이 예약이 속한 부스 id. 화면 필터링 · 권한 검사 기준. */
  boothId: number;
  time: string;
  name: string;
  people: number;
  contact: string;
  status: ReservationState;
}

export interface ReservationDTO {
  id: string;
  booth_id: number;
  time: string;
  name: string;
  people: number;
  contact: string;
  status: ReservationState;
}
