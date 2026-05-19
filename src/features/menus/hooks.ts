import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMenu, deleteMenu, listMenus, reorderMenus, updateMenu } from './api';
import type { CreateMenuInput, UpdateMenuInput } from './types';

/** 부스 메뉴 목록 조회. boothId 가 유효할 때만 조회. */
export function useMenus(boothId: number | null | undefined) {
  return useQuery({
    queryKey: ['menus', boothId],
    queryFn: () => listMenus(boothId as number),
    enabled: boothId != null,
  });
}

export function useCreateMenu(boothId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuInput) => createMenu(boothId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menus', boothId] }),
  });
}

export function useUpdateMenu(boothId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ menuId, patch }: { menuId: number; patch: UpdateMenuInput }) =>
      updateMenu(boothId, menuId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menus', boothId] }),
  });
}

export function useDeleteMenu(boothId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (menuId: number) => deleteMenu(boothId, menuId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menus', boothId] }),
  });
}

export function useReorderMenus(boothId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (menuIds: number[]) => reorderMenus(boothId, menuIds),
    // 응답이 재정렬된 전체 목록 — refetch 없이 캐시를 바로 교체한다.
    onSuccess: (data) => qc.setQueryData(['menus', boothId], data),
  });
}
