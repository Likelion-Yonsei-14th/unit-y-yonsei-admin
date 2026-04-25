import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { getMyBoothProfile, updateMyBoothProfile } from './api';
import type { BoothProfile } from './types';

/**
 * 로그인한 Booth 역할 사용자의 자기 부스 프로필 조회.
 * Super/Master/Performer 계정이면 enabled=false로 쿼리 자체가 안 나감.
 */
export function useMyBoothProfile() {
  const user = useAuthStore(s => s.user);
  const isBoothUser = user?.role === 'Booth' && user.boothId != null;

  return useQuery({
    queryKey: ['booths', 'me', user?.boothId],
    queryFn: getMyBoothProfile,
    enabled: isBoothUser,
  });
}

/**
 * 자기 부스 프로필 부분 업데이트.
 * 두 폼(부스 상세 / 메뉴 리스트) 이 각자 자기 영역만 patch 로 보낸다.
 */
export function useUpdateMyBoothProfile() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<BoothProfile>) => updateMyBoothProfile(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(['booths', 'me', user?.boothId], data);
    },
  });
}
