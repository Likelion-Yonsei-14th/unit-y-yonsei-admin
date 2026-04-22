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

/**
 * 부스별 예약 mock.
 * - booth 1 (문헌정보학과 부스): 대기·완료·취소 섞인 실 운영 데이터 분포
 * - booth 2 (빈 부스): 의도적으로 예약 없음 — 프로필 미작성 부스의 빈 상태 QA 용
 * - booth 3 (경영학과 푸드트럭): Master 가 picker 에서 전환해볼 두 번째 실데이터 부스
 */
export const mockReservations: Reservation[] = [
  { id: 'RES001', boothId: 1, time: '14:30', name: '김철수', people: 4, contact: '010-1234-5678', status: 'waiting' },
  { id: 'RES002', boothId: 1, time: '14:45', name: '이영희', people: 2, contact: '010-2345-6789', status: 'waiting' },
  { id: 'RES003', boothId: 1, time: '15:00', name: '박민수', people: 3, contact: '010-3456-7890', status: 'completed' },
  { id: 'RES004', boothId: 1, time: '15:15', name: '최지우', people: 5, contact: '010-4567-8901', status: 'cancelled' },
  { id: 'RES005', boothId: 1, time: '15:30', name: '정수현', people: 2, contact: '010-5678-9012', status: 'waiting' },

  { id: 'RES101', boothId: 3, time: '13:00', name: '강다현', people: 3, contact: '010-7777-1111', status: 'waiting' },
  { id: 'RES102', boothId: 3, time: '13:20', name: '윤서준', people: 2, contact: '010-7777-2222', status: 'completed' },
  { id: 'RES103', boothId: 3, time: '14:10', name: '한예린', people: 4, contact: '010-7777-3333', status: 'completed' },
];
