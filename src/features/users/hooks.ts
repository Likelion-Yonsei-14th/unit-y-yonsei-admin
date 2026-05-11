import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, listAdminUsers, resetUserPassword, setUserRole } from './api';

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
 * 비밀번호 강제 재설정 — 응답으로 받은 임시 비번을 운영자가 사용자에게 전달.
 * 목록 캐시 무효화는 불필요 (active/role 등 표시 필드는 안 바뀜).
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: resetUserPassword,
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
