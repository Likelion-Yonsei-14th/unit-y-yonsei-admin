import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { getMyBooth, listBooths, updateMyBooth } from './api';
import type { Booth } from './types';

/** 로그인한 Booth 역할 사용자의 자기 부스 조회. boothId 없으면 enabled=false. */
export function useMyBooth() {
  const user = useAuthStore((s) => s.user);
  const isBoothUser = user?.role === 'Booth' && user.boothId != null;

  return useQuery({
    queryKey: ['booths', 'me', user?.boothId],
    queryFn: getMyBooth,
    enabled: isBoothUser,
  });
}

/** Super/Master 용 전체 부스 목록. */
export function useBooths() {
  return useQuery({
    queryKey: ['booths', 'all'],
    queryFn: listBooths,
  });
}

/** 자기 부스 전체 저장 (PUT — 전체 교체). */
export function useUpdateMyBooth() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (booth: Booth) => updateMyBooth(booth),
    onSuccess: (data) => {
      queryClient.setQueryData(['booths', 'me', user?.boothId], data);
    },
  });
}

/**
 * 임의 부스 전체 저장 (PUT). 편집기에서 다른 부스의 locationId 를 바꿀 때 사용.
 * api 의 updateMyBooth 는 booth.id 로 PUT 하므로 본인/타인 구분이 없다.
 */
export function useUpdateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booth: Booth) => updateMyBooth(booth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booths'] });
    },
  });
}
