export type ReservationState = 'waiting' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  /** 이 예약이 속한 부스 id. 화면 필터링 · 권한 검사 기준. */
  boothId: number;
  /**
   * ⚠️ 백엔드 예약 모델은 시간 슬롯이 없는 대기열(reservationNumber/aheadOfMe) 구조라
   * 실제 연결 시 항상 빈 문자열이 된다. 시간대 표시 여부는 백엔드/기획 재논의 필요.
   */
  time: string;
  name: string;
  people: number;
  contact: string;
  status: ReservationState;
}

/** 백엔드 예약 응답 DTO (ReservationResponse). */
export interface ReservationDTO {
  id: number;
  boothId: number;
  reservationNumber: number;
  bookerName: string;
  phoneNumber: string;
  partySize: number;
  /** 'PENDING' | 'CONFIRMED' | 'CANCELLED' */
  status: string;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
}

/** 부스별 상태 카운트. picker 의 booth counts 와 summary 가 공유하는 형태. */
export type ReservationCounts = Record<ReservationState, number>;

/**
 * 부스별 예약 현황 요약 (GET /admin/reservations/summary).
 * 예약 0건 부스는 `byBooth` 에 없다 — 조회 측에서 0 으로 기본 처리한다.
 */
export interface ReservationSummary {
  byBooth: Map<number, ReservationCounts>;
  totals: ReservationCounts & { total: number };
}

/** 백엔드 예약 요약 응답 DTO (ReservationSummaryResponse). */
export interface ReservationSummaryDTO {
  booths: {
    boothId: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    total: number;
  }[];
  totals: { pending: number; confirmed: number; cancelled: number; total: number };
}
