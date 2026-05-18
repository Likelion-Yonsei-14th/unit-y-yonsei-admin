import type { MapLocationDTO } from '@/features/booth-layout/types';

/**
 * MapLocation(type=BOOTH) mock 시드.
 * id = 점유 부스의 booth id (1:1). sector 는 그 부스의 Booth.sector 와 일치.
 * 좌표는 이미지 0–100 % 중심점 + 폭/높이.
 */
const now = '2026-05-01T00:00:00';

const loc = (
  id: number,
  sector: string,
  mapX: number,
  mapY: number,
  width: number,
  height: number,
): MapLocationDTO => ({
  id,
  locationName: `${sector} 부스 ${id}`,
  sector,
  mapX,
  mapY,
  width,
  height,
  locationType: 'BOOTH',
  displayOrder: id,
  displayStatus: 'VISIBLE',
  createdAt: now,
  updatedAt: now,
});

export const mockMapLocations: MapLocationDTO[] = [
  // 백양로(baekyang) — 좁고 긴 캔버스. x≈41.6, y 스텝, 좁은 박스.
  loc(1, '백양로', 41.59, 12, 8, 2.4),
  loc(4, '백양로', 41.59, 24, 8, 2.4),
  loc(6, '백양로', 41.59, 36, 8, 2.4),
  loc(7, '백양로', 41.59, 48, 8, 2.4),
  loc(8, '백양로', 41.59, 60, 8, 2.4),
  loc(9, '백양로', 41.59, 72, 8, 2.4),
  loc(10, '백양로', 41.59, 84, 8, 2.4),
  // 한글탑(hangeul)
  loc(3, '한글탑', 35, 30, 8, 9),
  loc(13, '한글탑', 55, 30, 8, 9),
  // 송도(global)
  loc(5, '송도', 50, 45, 6, 7),
];
