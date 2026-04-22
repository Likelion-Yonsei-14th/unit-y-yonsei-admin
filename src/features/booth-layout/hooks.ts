import { useQuery } from '@tanstack/react-query';
import { getPlacementByBoothId, listPlacements } from './api';

/** 특정 날짜에 배치된 부스 목록 조회. */
export function usePlacements(date: string) {
  return useQuery({
    queryKey: ['booth-placements', date],
    queryFn: () => listPlacements(date),
    enabled: !!date,
  });
}

/** Booth 단일 부스의 배치 조회 (boothId null 이면 disabled). */
export function useMyBoothPlacement(boothId: number | null) {
  return useQuery({
    queryKey: ['booth-placement', 'by-booth', boothId],
    queryFn: () => getPlacementByBoothId(boothId!),
    enabled: boothId != null,
  });
}
