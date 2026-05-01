import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, listAdminUsers, setUserActive, setUserRole } from './api';

/**
 * 관리자 페이지 — 어드민 풀 전체 조회.
 * Super/Master 만 진입 가능 (라우트 가드로 막힘) — 여기서는 권한 분기 없음.
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: listAdminUsers,
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * 신규 계정 생성 mutation. 성공 시 사용자 목록 캐시를 invalidate 해
 * `/users` 진입 시 새 항목이 즉시 보이도록 한다.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
