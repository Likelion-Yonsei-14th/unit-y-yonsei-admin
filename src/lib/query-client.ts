import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/**
 * TanStack Query 전역 설정.
 *
 * 어드민 앱 특성상:
 * - 포커스 변경 시 재요청은 끔 (자주 탭 전환)
 * - 401은 재시도 하지 않음 (인증 만료)
 * - 기본 staleTime 10초 (탭 복귀 시 리페치되지 않도록)
 * - gcTime 24시간: 약전파 행사장 대비. 잠깐 자리를 비웠다 돌아와도(페이지
 *   재방문) 마지막으로 불러온 데이터가 GC되지 않고 즉시 표시된 뒤 백그라운드로
 *   갱신된다. 캐시는 메모리에만 있어 새로고침 시엔 사라진다(영속화는 별도 과제).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
