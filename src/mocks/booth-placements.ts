import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * UI 동작 확인용 시드. 좌표·크기 모두 임의값 — 실 배치 좌표/크기는 운영 준비 단계의 별도 작업.
 * booth_id 는 mockBoothsById 의 키와 매칭 (1: 문헌정보학과, 2: 빈 부스, 3: 경영학과 푸드트럭).
 */
export const mockBoothPlacements: BoothPlacementDTO[] = [
  { booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38, width: 5, height: 6 },
  { booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52, width: 7, height: 3 },
  { booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40, width: 8, height: 10 },
];
