import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMe, hasStoredToken } from './api';
import { useAuthStore } from './store';
import { setUnauthorizedHandler } from '@/lib/api-client';

/**
 * 앱 루트에서 한 번 실행.
 *
 * - 저장된 토큰이 있으면 /me 호출해서 user 복원
 * - 없으면 isInitializing=false로 바로 전환
 * - API client의 401 핸들러를 스토어와 연결
 */
export function AuthInitializer({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  const hasToken = hasStoredToken();

  // isLoading 은 useAuth().isInitializing 으로 가드가 처리하므로 여기서 따로 다룰 필요 없음.
  const { data, isSuccess, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!hasToken) {
      setInitializing(false);
      return;
    }
    if (isSuccess && data) {
      setUser(data);
      setInitializing(false);
    }
    if (isError) {
      setUser(null);
      setInitializing(false);
    }
  }, [hasToken, isSuccess, isError, data, setUser, setInitializing]);

  // 401 시 스토어에서 user 제거
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });
  }, [setUser]);

  return <>{children}</>;
}
