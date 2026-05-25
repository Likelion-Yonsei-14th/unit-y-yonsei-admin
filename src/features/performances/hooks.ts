import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import {
  addPerformanceImage,
  addSetlistItem,
  deletePerformance,
  deletePerformanceImage,
  deleteSetlistItem,
  getLivePerformance,
  getMyCheerMessages,
  getMyPerformance,
  getPerformance,
  getPerformanceImages,
  getSetlist,
  listAdminPerformances,
  listPerformances,
  setLivePerformance,
  updateMyPerformance,
  updatePerformance,
  updateSetlistItem,
} from './api';
import type {
  Performance,
  PerformanceImageCreateDTO,
  PerformanceStatus,
  SetlistCreateDTO,
  SetlistUpdateDTO,
} from './types';

/**
 * 공연 목록 조회.
 * - 기본(공개): /performances — HIDDEN 제외. 대시보드 등 일반 용도.
 * - admin:true + SUPER: /admin/performances — HIDDEN 포함 전체(공개/숨김 관리용).
 *   admin 엔드포인트는 SUPER 전용이라, 비-SUPER 는 자동으로 공개 목록으로 폴백한다.
 *
 * 키는 `['performances','list',variant]` 네임스페이스 — 단건(`['performances',id]`)·
 * 서브리소스와 구분되어, 목록 invalidation 이 prefix `['performances','list']` 로
 * admin·public 두 변형만 정확히 갱신한다.
 */
export function usePerformances({ admin = false }: { admin?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const useAdmin = admin && user?.role === 'Super';
  return useQuery({
    queryKey: ['performances', 'list', useAdmin ? 'admin' : 'public'],
    queryFn: useAdmin ? listAdminPerformances : listPerformances,
  });
}

/** 공연 공개/숨김 등 status 변경 (SUPER·MASTER). updatePerformance 의 status 전용 래퍼. */
export function useSetPerformanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: PerformanceStatus }) =>
      updatePerformance(id, { performanceStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances', 'list'] });
    },
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

  return useQuery({
    // `/admin/performances/me` 는 단수형 엔드포인트라 id 가 필요 없다 — 정적 키.
    // performanceTeamId 로는 게이트하지 않는다 — `/me` 응답이 늦거나 그 필드를
    // 안 주면 쿼리가 비활성 → data 없음·isLoading false → 로딩 중에 "소속 공연
    // 없음" 을 잘못 띄운다. 역할만으로 게이트하고 실제 유무는 응답으로 판단.
    queryKey: ['performances', 'me'],
    queryFn: getMyPerformance,
    enabled: user?.role === 'Performer',
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
      queryClient.invalidateQueries({ queryKey: ['performances', 'list'] });
    },
  });
}

/**
 * 운영진(SUPER/MASTER) 이 임의 공연을 부분 갱신.
 * `useUpdateMyPerformance` 와 별개 — `PATCH /admin/performances/{id}` 로 다른 팀
 * 공연을 수정할 때 사용. 호출부가 `id` 를 미리 알고 hook 셋업 시 넘긴다.
 * id 가 null 이면 mutate 호출이 막힌다(가드).
 */
export function useUpdatePerformance(performanceId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<Performance>) => {
      if (performanceId == null) {
        return Promise.reject(new Error('useUpdatePerformance: performanceId 가 없습니다.'));
      }
      return updatePerformance(performanceId, patch);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['performances', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['performances', 'list'] });
    },
  });
}

/**
 * 운영진(SUPER/MASTER) 의 공연 영구 삭제.
 * `DELETE /admin/performances/{id}` — 성공 시 전체 목록을 invalidate 한다.
 * (단건 캐시는 `removeQueries` 로 폐기 — 삭제된 공연을 stale 상태로 들고 있지 않도록.)
 * 호출부가 mutate(id) 로 삭제할 공연 id 를 넘긴다. 자식 데이터 잔존 시 400 으로 reject 되며,
 * 호출부가 그 에러 메시지를 사용자에게 노출한다.
 */
export function useDeletePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePerformance(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['performances', id] });
      queryClient.invalidateQueries({ queryKey: ['performances', 'list'] });
    },
  });
}

/**
 * 로그인한 Performer 본인 공연의 응원 메시지 목록(전 상태).
 * `useMyPerformance` 와 동일하게 역할만으로 게이트 — Super/Master/Booth 면 쿼리가 안 나간다.
 * 읽기 전용이라 별도 폴링은 두지 않는다(목록·셋리스트와 동일 정책).
 */
export function useMyCheerMessages() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['performances', 'me', 'cheer-messages'],
    queryFn: getMyCheerMessages,
    enabled: user?.role === 'Performer',
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
