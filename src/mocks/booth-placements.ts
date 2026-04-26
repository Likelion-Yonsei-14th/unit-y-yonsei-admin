import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * UI 동작 확인용 시드. 좌표·크기 모두 임의값.
 * 정식 좌표는 placement editor (/booth-layout/edit) 로 시딩.
 */
export const mockBoothPlacements: BoothPlacementDTO[] = [
  { id: 1, booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38, width: 5, height: 6 },
  { id: 2, booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52, width: 7, height: 3 },
  { id: 3, booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40, width: 8, height: 10 },
];
