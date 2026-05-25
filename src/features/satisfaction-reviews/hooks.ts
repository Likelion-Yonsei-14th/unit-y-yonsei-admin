import { useQuery } from '@tanstack/react-query';
import { getSatisfactionReviews } from './api';

/** 만족도 후기 집계 + 목록 조회 (Super/Master 읽기 전용). */
export function useSatisfactionReviews() {
  return useQuery({
    queryKey: ['satisfaction-reviews'],
    queryFn: getSatisfactionReviews,
  });
}
