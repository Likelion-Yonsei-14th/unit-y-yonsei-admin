import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getReservationSummary,
  listBoothReservations,
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
 * 부스별 예약 현황 요약 — dashboard KPI · 부스 picker 의 부스별 카운트 집계용.
 *
 * 예약 행 전체가 아니라 부스별 상태 카운트만 받는다 (GET /admin/reservations/summary).
 * queryKey 가 ['reservations', ...] 프리픽스라 상태 변경 mutation 의
 * invalidateQueries(['reservations']) 에 함께 갱신된다.
 */
export function useReservationSummary() {
  return useQuery({
    queryKey: ['reservations', 'summary'],
    queryFn: getReservationSummary,
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
 *
 * `ready` 는 쿼리가 첫 응답을 줬는지 여부(reservationsQuery.isSuccess). 로딩 중에는
 * reservations 가 빈 배열이라, 그때 기준 집합을 잡으면 실제 데이터 도착 시 전부
 * "신규"로 오인된다 — ready 전에는 기준 집합을 잡지 않는다.
 */
export function useNewReservationAlert(
  reservations: Reservation[],
  boothId: number,
  ready: boolean,
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

    // 쿼리 첫 응답 전에는 기준 집합을 잡지 않는다 — 로딩 중 빈 배열을 baseline 으로
    // 삼으면 실제 데이터가 기존 예약 전부를 신규로 오인해 가짜 토스트를 띄운다.
    if (!ready) return;

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
  }, [reservations, boothId, ready]);
}
