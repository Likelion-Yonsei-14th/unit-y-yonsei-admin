import type { BoothSector } from '@/features/booths/types';
import type { MapLocation, MapLocationDTO } from './types';

/** BigDecimal 직렬화(number|string) → number. null 통과. */
const num = (v: number | string | null): number | null =>
  v == null ? null : typeof v === 'number' ? v : Number(v);

export const toMapLocation = (d: MapLocationDTO): MapLocation => ({
  id: d.id,
  locationName: d.locationName,
  // sector 는 백엔드 enum(한글탑/백양로/송도) 기준. 그대로 단언.
  sector: d.sector as BoothSector,
  mapX: num(d.mapX) ?? 0,
  mapY: num(d.mapY) ?? 0,
  width: num(d.width),
  height: num(d.height),
  locationType: d.locationType,
  displayOrder: d.displayOrder,
  displayStatus: d.displayStatus,
});
