import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { getMyPerformance, getPerformance, listPerformances, updatePerformance } from './api';
import type { PerformanceDetail } from './types';

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

/**
 * 공연팀 상세(프로필 + 타임테이블 + 셋리스트 + 이미지) 부분 업데이트.
 * Performer 본인 폼과 Super/Master 운영진 편집 양쪽이 같은 mutation 을 공유한다.
 * 성공 시 관련된 query cache 를 직접 갱신해 즉시 화면 반영 + 다음 navigate 시
 * 잘못된 데이터를 보여주지 않게 한다.
 */
export function useUpdatePerformance() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, patch }: { teamId: number; patch: Partial<PerformanceDetail> }) =>
      updatePerformance(teamId, patch),
    onSuccess: (data) => {
      queryClient.setQueryData(['performances', data.teamId], data);
      // 본인 팀 상세 캐시도 같이 갱신 (Performer 가 본인 팀을 수정했을 때).
      if (user?.role === 'Performer' && user.performanceTeamId === data.teamId) {
        queryClient.setQueryData(['performances', 'me', data.teamId], data);
      }
      // 리스트 invalidation — 팀명/날짜/대표 사진 등 리스트 표시 필드가 바뀔 수 있어.
      queryClient.invalidateQueries({ queryKey: ['performances'], exact: true });
    },
  });
}
