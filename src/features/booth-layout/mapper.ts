import type { BoothPlacement, BoothPlacementDTO } from './types';

export const toBoothPlacement = (d: BoothPlacementDTO): BoothPlacement => ({
  boothId: d.booth_id,
  date: d.date,
  section: d.section,
  boothNumber: d.booth_number,
  x: d.x,
  y: d.y,
});
