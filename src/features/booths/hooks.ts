import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import {
  addBoothImage,
  deleteBooth,
  deleteBoothImage,
  getMyBooth,
  listBooths,
  listBoothImages,
  setBoothReservable,
  updateBoothImage,
  updateMyBooth,
} from './api';
import type { Booth, BoothImageCreateDTO, BoothImageUpdateDTO } from './types';

/** 로그인한 Booth 역할 사용자의 자기 부스 조회. boothId 없으면 enabled=false. */
export function useMyBooth() {
  const user = useAuthStore((s) => s.user);
  const isBoothUser = user?.role === 'Booth' && user.boothId != null;

  return useQuery({
    queryKey: ['booths', 'me', user?.boothId],
    queryFn: getMyBooth,
    enabled: isBoothUser,
  });
}

/** Super/Master 용 전체 부스 목록. */
export function useBooths() {
  return useQuery({
    queryKey: ['booths', 'all'],
    queryFn: listBooths,
  });
}

/** 자기 부스 전체 저장 (PUT — 전체 교체). */
export function useUpdateMyBooth() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (booth: Booth) => updateMyBooth(booth),
    onSuccess: (data) => {
      queryClient.setQueryData(['booths', 'me', user?.boothId], data);
    },
  });
}

/** 자기 부스 운영 ON/OFF 단건 변경 (PATCH /reservable). 전체 저장과 독립. */
export function useSetBoothReservable() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setBoothReservable,
    onSuccess: (data) => {
      queryClient.setQueryData(['booths', 'me', user?.boothId], data);
      // 전체 목록 캐시(useBooths)도 같은 부스 항목을 갱신 — 예약 관리 페이지(Super/Master)
      // 의 예약 가능 토글이 저장 직후 즉시 따라오도록. 이게 없으면 백엔드엔 반영돼도
      // 'all' 캐시가 stale 이라 화면 토글이 안 움직인다.
      queryClient.setQueryData<Booth[]>(['booths', 'all'], (old) =>
        old?.map((b) => (b.id === data.id ? data : b)),
      );
    },
  });
}

/**
 * 임의 부스 전체 저장 (PUT). 편집기에서 다른 부스의 locationId 를 바꿀 때 사용.
 * api 의 updateMyBooth 는 booth.id 로 PUT 하므로 본인/타인 구분이 없다.
 */
export function useUpdateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booth: Booth) => updateMyBooth(booth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booths'] });
    },
  });
}

/**
 * 부스 삭제 — 어드민 계정 삭제(A-014) cascade 용. 단독 액션이 아니라
 * user-management 의 계정 삭제 흐름에서 백엔드가 A-014 를 던질 때 호출한다.
 * 성공 시 booth 목록·예약 요약(부스 카운트)·자기부스(me) 캐시 모두 invalidate.
 */
export function useDeleteBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBooth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booths'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

/** 특정 부스의 이미지 목록 (display_order 오름차순). boothId 없으면 enabled=false. */
export function useBoothImages(boothId: number | null | undefined) {
  return useQuery({
    queryKey: ['booth-images', boothId],
    queryFn: () => listBoothImages(boothId as number),
    enabled: boothId != null,
  });
}

/**
 * 부스 이미지 추가 (POST). imageUrl 은 uploads 의 uploadImage(file,'booth') 로
 * 먼저 S3 에 올린 뒤 받은 공개 URL 을 넘긴다 — 이 mutation 은 URL 참조만 저장한다.
 */
export function useAddBoothImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boothId, input }: { boothId: number; input: BoothImageCreateDTO }) =>
      addBoothImage(boothId, input),
    onSuccess: (_data, { boothId }) => {
      queryClient.invalidateQueries({ queryKey: ['booth-images', boothId] });
    },
  });
}

/** 부스 이미지 수정 (PATCH — imageUrl/displayOrder 부분 수정). */
export function useUpdateBoothImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      boothId,
      imageId,
      patch,
    }: {
      boothId: number;
      imageId: number;
      patch: BoothImageUpdateDTO;
    }) => updateBoothImage(boothId, imageId, patch),
    onSuccess: (_data, { boothId }) => {
      queryClient.invalidateQueries({ queryKey: ['booth-images', boothId] });
    },
  });
}

/** 부스 이미지 삭제 (DELETE). */
export function useDeleteBoothImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boothId, imageId }: { boothId: number; imageId: number }) =>
      deleteBoothImage(boothId, imageId),
    onSuccess: (_data, { boothId }) => {
      queryClient.invalidateQueries({ queryKey: ['booth-images', boothId] });
    },
  });
}
