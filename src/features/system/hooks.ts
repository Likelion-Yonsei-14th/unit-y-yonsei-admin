import { useQuery } from '@tanstack/react-query';
import { getActiveAlerts, getErrorLogs, getSystemHealth } from './api';

/** health·alerts 폴링 주기(ms). 화면이 떠 있는 동안만. */
const POLL_INTERVAL = 12_000;

/**
 * 서버 health 스냅샷. 화면 떠 있는 동안 12초 폴링.
 * refetchIntervalInBackground 기본값(false) 덕에 탭이 백그라운드면 자동 정지 —
 * 보이지 않는 화면에 대한 무의미한 폴링을 막는다.
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: getSystemHealth,
    refetchInterval: POLL_INTERVAL,
  });
}

/** 현재 활성 알림. health 와 같은 주기로 폴링(빈 배열 = 무사고). */
export function useActiveAlerts() {
  return useQuery({
    queryKey: ['system', 'alerts'],
    queryFn: getActiveAlerts,
    refetchInterval: POLL_INTERVAL,
  });
}

/**
 * 최근 ERROR 로그. 폴링하지 않고 진입 시 1회 — 수동 새로고침 버튼(refetch)으로 갱신.
 * (메모리 링버퍼라 자주 폴링할 가치가 낮고, 폴링 시 화면이 계속 흔들린다.)
 */
export function useErrorLogs() {
  return useQuery({
    queryKey: ['system', 'errors'],
    queryFn: getErrorLogs,
  });
}
