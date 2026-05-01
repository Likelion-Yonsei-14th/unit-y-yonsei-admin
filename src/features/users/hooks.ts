import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from './api';

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
