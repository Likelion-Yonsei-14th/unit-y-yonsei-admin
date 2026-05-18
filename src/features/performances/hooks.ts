import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import {
  addPerformanceImage,
  addSetlistItem,
  deletePerformanceImage,
  deleteSetlistItem,
  getLivePerformance,
  getMyPerformance,
  getPerformance,
  getPerformanceImages,
  getSetlist,
  listPerformances,
  setLivePerformance,
  updateMyPerformance,
  updateSetlistItem,
} from './api';
import type {
  Performance,
  PerformanceImageCreateDTO,
  SetlistCreateDTO,
  SetlistUpdateDTO,
} from './types';

/**
 * Super/Master 전용 전체 공연 목록 조회.
 * Performer 도 read 권한은 있지만 리스트 페이지 진입 자체가 막혀 있으므로
 * 여기서는 별도 enabled 분기 없이 호출 시점만 신뢰.
 */
export function usePerformances() {
  return useQuery({
    queryKey: ['performances'],
    queryFn: listPerformances,
  });
}

export function usePerformance(id: number | null | undefined) {
  // NaN 이 흘러들어와 getPerformance(NaN) 이 호출되는 사고를 차단.
  const valid = id != null && Number.isInteger(id) && id > 0;
  return useQuery({
    queryKey: ['performances', id],
    queryFn: () => getPerformance(id as number),
    enabled: valid,
  });
}

/**
 * 로그인한 Performer 의 자기 공연 조회.
 * Super/Master/Booth 계정이면 enabled=false로 쿼리가 안 나감.
 */
export function useMyPerformance() {
  const user = useAuthStore((s) => s.user);
  const isPerformer = user?.role === 'Performer' && user.performanceTeamId != null;

  return useQuery({
    // `/me` 는 단수형 엔드포인트라 id 가 필요 없다 — 정적 키.
    // (performanceTeamId 는 enabled 게이트에만 쓰고 캐시 키엔 넣지 않는다.)
    queryKey: ['performances', 'me'],
    queryFn: getMyPerformance,
    enabled: isPerformer,
  });
}

/**
 * 본인 공연(`/me`) 본문 부분 업데이트.
 * 성공 시 본인 공연 캐시를 직접 갱신하고 목록을 invalidate 한다.
 */
export function useUpdateMyPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<Performance>) => updateMyPerformance(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(['performances', 'me'], data);
      queryClient.setQueryData(['performances', data.id], data);
      // 리스트 invalidation — 공연명/날짜/상태 등 리스트 표시 필드가 바뀔 수 있어.
      queryClient.invalidateQueries({ queryKey: ['performances'], exact: true });
    },
  });
}

/** 공연 이미지 목록 — 별도 sub-resource. */
export function usePerformanceImages(performanceId: number | null | undefined) {
  const valid = performanceId != null && Number.isInteger(performanceId) && performanceId > 0;
  return useQuery({
    queryKey: ['performances', performanceId, 'images'],
    queryFn: () => getPerformanceImages(performanceId as number),
    enabled: valid,
  });
}

/** 셋리스트 — 별도 sub-resource. */
export function useSetlist(performanceId: number | null | undefined) {
  const valid = performanceId != null && Number.isInteger(performanceId) && performanceId > 0;
  return useQuery({
    queryKey: ['performances', performanceId, 'setlists'],
    queryFn: () => getSetlist(performanceId as number),
    enabled: valid,
  });
}

/**
 * 이미지 추가. performanceId 는 쿼리키 invalidation 용으로만 받는다
 * (서버는 `/me` 라 본인 공연에 귀속).
 */
export function useAddPerformanceImage(performanceId: number | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PerformanceImageCreateDTO) => addPerformanceImage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances', performanceId, 'images'] });
    },
  });
}

export function useDeletePerformanceImage(performanceId: number | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: number) => deletePerformanceImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances', performanceId, 'images'] });
    },
  });
}

export function useAddSetlistItem(performanceId: number | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetlistCreateDTO) => addSetlistItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances', performanceId, 'setlists'] });
    },
  });
}

export function useUpdateSetlistItem(performanceId: number | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ setlistId, input }: { setlistId: number; input: SetlistUpdateDTO }) =>
      updateSetlistItem(setlistId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances', performanceId, 'setlists'] });
    },
  });
}

export function useDeleteSetlistItem(performanceId: number | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setlistId: number) => deleteSetlistItem(setlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances', performanceId, 'setlists'] });
    },
  });
}

/**
 * 현재 라이브로 지정된 공연 id 조회 (없으면 null) + 15초 폴링.
 * 운영 중 다른 Super 스태프의 변경을 따라잡기 위한 폴링.
 */
export function useLivePerformance() {
  return useQuery({
    queryKey: ['performances', 'live'],
    queryFn: getLivePerformance,
    refetchInterval: 15_000,
  });
}

/**
 * 라이브 공연 지정/해제. id=null 이면 해제.
 * 성공 시 라이브 쿼리 캐시를 즉시 갱신해 화면에 바로 반영.
 */
export function useSetLivePerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setLivePerformance,
    onSuccess: (id) => {
      queryClient.setQueryData(['performances', 'live'], id);
    },
  });
}
