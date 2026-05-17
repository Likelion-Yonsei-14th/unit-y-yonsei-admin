import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listBoothReservations,
  listReservations,
  setReservationStatus,
  setReservationsStatusBulk,
} from './api';
import type { Reservation } from './types';

/**
 * 부스별 예약 조회 + 15초 폴링.
 * 예약 관리 페이지는 한 부스만 다루므로 이 훅을 쓴다 — 백엔드도 부스별 조회
 * (GET /admin/reservations/booths/{boothId}) 만 제공.
 *
 * refetchInterval 로 새 예약을 운영자 개입 없이 따라잡는다. 쿼리가 마운트된
 * 동안만 폴링하고(화면 이탈 시 자동 중단), refetchIntervalInBackground 는
 * 기본값(false) 이라 백그라운드 탭은 폴링하지 않는다.
 */
export function useBoothReservations(boothId: number) {
  return useQuery({
    queryKey: ['reservations', boothId],
    queryFn: () => listBoothReservations(boothId),
    enabled: Number.isFinite(boothId),
    refetchInterval: 15_000,
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

/**
 * 폴링으로 새 PENDING 예약이 들어오면 토스트로 알린다.
 *
 * 풀에 없던 id 중 status 가 waiting 인 것만 "신규"로 센다 — 단순 건수 비교로는
 * '완료 → 대기로 되돌리기' 전이를 신규 도착으로 오인한다.
 * 첫 데이터 채움과 부스 전환 직후에는 토스트하지 않는다.
 */
export function useNewReservationAlert(
  reservations: Reservation[],
  boothId: number,
  onViewWaiting: () => void,
) {
  // null = 아직 기준 집합 미설정 (첫 로드 토스트 스킵용).
  const prevIdsRef = useRef<Set<string> | null>(null);
  const prevBoothIdRef = useRef(boothId);
  // 콜백을 ref 로 받아 effect deps 에서 제외 — 렌더마다 effect 가 재실행되지 않도록.
  const onViewWaitingRef = useRef(onViewWaiting);
  onViewWaitingRef.current = onViewWaiting;

  useEffect(() => {
    // 부스 전환 시 직전 부스 데이터를 신규로 오인하지 않도록 기준 집합 리셋.
    if (prevBoothIdRef.current !== boothId) {
      prevBoothIdRef.current = boothId;
      prevIdsRef.current = null;
    }

    const currentIds = new Set(reservations.map((r) => r.id));

    // 첫 채움: 토스트 없이 기준 집합만 설정.
    if (prevIdsRef.current === null) {
      prevIdsRef.current = currentIds;
      return;
    }

    const prevIds = prevIdsRef.current;
    const newPendingCount = reservations.filter(
      (r) => r.status === 'waiting' && !prevIds.has(r.id),
    ).length;
    prevIdsRef.current = currentIds;

    if (newPendingCount > 0) {
      toast(`새 예약 ${newPendingCount}건이 들어왔습니다`, {
        action: {
          label: '대기자 목록 보기',
          onClick: () => onViewWaitingRef.current(),
        },
      });
    }
  }, [reservations, boothId]);
}
