import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { getMyPerformance, getPerformance, listPerformances } from './api';

/**
 * Super/Master 전용 전체 공연 목록 조회.
 * Performer 도 read 권한은 있지만 리스트 페이지 진입 자체가 막혀 있으므로
 * 여기서는 별도 enabled 분기 없이 호출 시점만 신뢰.
 */
export function usePerformances() {
  return useQuery({
    queryKey: ['performances'],
    queryFn: listPerformances,
  });
}

export function usePerformance(teamId: number | null | undefined) {
  // NaN 이 흘러들어와 getPerformance(NaN) 이 호출되는 사고를 차단.
  const valid = teamId != null && Number.isInteger(teamId) && teamId > 0;
  return useQuery({
    queryKey: ['performances', teamId],
    queryFn: () => getPerformance(teamId as number),
    enabled: valid,
  });
}

/**
 * 로그인한 Performer 의 자기 팀 프로필 조회.
 * Super/Master/Booth 계정이면 enabled=false로 쿼리가 안 나감.
 */
export function useMyPerformance() {
  const user = useAuthStore(s => s.user);
  const isPerformer = user?.role === 'Performer' && user.performanceTeamId != null;

  return useQuery({
    queryKey: ['performances', 'me', user?.performanceTeamId],
    queryFn: getMyPerformance,
    enabled: isPerformer,
  });
}
