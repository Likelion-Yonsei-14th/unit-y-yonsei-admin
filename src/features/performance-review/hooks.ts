import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteReview, listReviews, setReviewHidden } from './api';

export function useReviews() {
  return useQuery({
    queryKey: ['performance-reviews'],
    queryFn: listReviews,
  });
}

export function useSetReviewHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setReviewHidden,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
  });
}
