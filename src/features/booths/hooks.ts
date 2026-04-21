import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { getMyBoothProfile } from './api';

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
