import type { Reservation, ReservationDTO } from './types';

export const toReservation = (d: ReservationDTO): Reservation => ({
  id: d.id,
  boothId: d.booth_id,
  time: d.time,
  name: d.name,
  people: d.people,
  contact: d.contact,
  status: d.status,
});
