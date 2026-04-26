import type { BoothPlacement, BoothPlacementDTO } from './types';

export const toBoothPlacement = (d: BoothPlacementDTO): BoothPlacement => ({
  id: d.id,
  boothId: d.booth_id,
  date: d.date,
  section: d.section,
  boothNumber: d.booth_number,
  x: d.x,
  y: d.y,
  width: d.width,
  height: d.height,
});

export const fromBoothPlacement = (m: BoothPlacement): BoothPlacementDTO => ({
  id: m.id,
  booth_id: m.boothId,
  date: m.date,
  section: m.section,
  booth_number: m.boothNumber,
  x: m.x,
  y: m.y,
  width: m.width,
  height: m.height,
});
