export type ReservationState = 'waiting' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  time: string;
  name: string;
  people: number;
  contact: string;
  status: ReservationState;
}

export const mockReservations: Reservation[] = [
  { id: 'RES001', time: '14:30', name: '김철수', people: 4, contact: '010-1234-5678', status: 'waiting' },
  { id: 'RES002', time: '14:45', name: '이영희', people: 2, contact: '010-2345-6789', status: 'waiting' },
  { id: 'RES003', time: '15:00', name: '박민수', people: 3, contact: '010-3456-7890', status: 'completed' },
];
