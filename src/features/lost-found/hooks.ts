import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLostItem, deleteLostItem, listLostItems, updateLostItem } from './api';

/**
 * 분실물 목록 조회. 목록 열람 권한이 없는 역할(Booth)은 `enabled: false` 로
 * 호출해 닿지 못할 요청을 막는다 — Booth 는 등록 폼만 쓴다.
 */
export function useLostItems(enabled = true) {
  return useQuery({
    queryKey: ['lost-items'],
    queryFn: listLostItems,
    enabled,
  });
}

export function useCreateLostItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLostItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-items'] });
    },
  });
}

export function useUpdateLostItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLostItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-items'] });
    },
  });
}

export function useDeleteLostItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLostItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-items'] });
    },
  });
}
