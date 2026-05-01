import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listReservations,
  setReservationStatus,
  setReservationsStatusBulk,
} from './api';

/**
 * 예약 풀 전체 조회. 부스별 필터는 페이지에서 useMemo 로 처리.
 *
 * 한 페이지가 한 부스만 다룬다는 가정에 맞춰 백엔드는 boothId 쿼리 파라미터를
 * 받는 형태로 발전할 수 있음 — 그때 listReservations 시그니처 추가.
 */
export function useReservations() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: listReservations,
  });
}

export function useSetReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setReservationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useSetReservationsStatusBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setReservationsStatusBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
