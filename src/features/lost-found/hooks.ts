import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLostItem, deleteLostItem, listLostItems, updateLostItem } from './api';

export function useLostItems() {
  return useQuery({
    queryKey: ['lost-items'],
    queryFn: listLostItems,
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
