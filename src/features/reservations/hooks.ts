import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listBoothReservations,
  listReservations,
  setReservationStatus,
  setReservationsStatusBulk,
} from './api';

/**
 * 부스별 예약 조회.
 * 예약 관리 페이지는 한 부스만 다루므로 이 훅을 쓴다 — 백엔드도 부스별 조회
 * (GET /admin/reservations/booths/{boothId}) 만 제공.
 */
export function useBoothReservations(boothId: number) {
  return useQuery({
    queryKey: ['reservations', boothId],
    queryFn: () => listBoothReservations(boothId),
    enabled: Number.isFinite(boothId),
  });
}

/**
 * 예약 풀 전체 조회 — 부스 picker 의 부스별 카운트 집계용.
 *
 * ⚠️ 실제 백엔드엔 전체 예약 목록 엔드포인트가 없다. picker 는 booth-layout
 * (지도 배치) 도메인에 묶여 있어, 그 도메인 연동 작업 때 카운트 출처
 * (예: GET /booths/reservable 의 waitingCount) 를 함께 정리한다.
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
