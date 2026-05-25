import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockBoothsById } from '@/mocks/booth-profile';
import { allocateMockBoothImageId, mockBoothImagesByBoothId } from '@/mocks/booth-images';
import { fromBooth, fromBoothCreate, toBooth, toBoothImage } from './mapper';
import type {
  Booth,
  BoothCreateInput,
  BoothDTO,
  BoothImage,
  BoothImageCreateDTO,
  BoothImageDTO,
  BoothImageUpdateDTO,
} from './types';
import type { PageResponse } from '@/types/api';

// ---- Mock ----

async function getMyBoothMock(): Promise<Booth | null> {
  await new Promise((r) => setTimeout(r, 150));
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Booth' || user.boothId == null) return null;
  return mockBoothsById[user.boothId] ?? null;
}

async function updateMyBoothMock(booth: Booth): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 200));
  mockBoothsById[booth.id] = { ...booth };
  return mockBoothsById[booth.id];
}

async function listBoothsMock(): Promise<Booth[]> {
  await new Promise((r) => setTimeout(r, 100));
  return Object.values(mockBoothsById);
}

async function setBoothReservableMock(input: {
  id: number;
  isReservable: boolean;
}): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 150));
  const booth = mockBoothsById[input.id];
  if (!booth) throw new Error(`mock: booth ${input.id} 을(를) 찾을 수 없습니다.`);
  mockBoothsById[input.id] = { ...booth, isReservable: input.isReservable };
  return mockBoothsById[input.id];
}

async function deleteBoothMock(id: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  delete mockBoothsById[id];
}

async function createBoothMock(input: BoothCreateInput): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 200));
  // 새 부스 id 는 기존 최대값 + 1. 작성 완료 여부는 백엔드와 동일 규칙으로 계산.
  const nextId = Math.max(0, ...Object.keys(mockBoothsById).map(Number)) + 1;
  const profileComplete = Boolean(
    input.organization?.trim() &&
    input.date != null &&
    input.openTime &&
    input.closeTime &&
    input.sector &&
    input.location != null,
  );
  const created: Booth = {
    id: nextId,
    adminId: input.adminId,
    name: input.name,
    organization: input.organization ?? '',
    description: input.description ?? '',
    date: input.date ?? null,
    openTime: input.openTime ?? null,
    closeTime: input.closeTime ?? null,
    sector: input.sector ?? null,
    location: input.location ?? null,
    status: input.status,
    isFood: input.isFood,
    isFoodTruck: input.isFoodTruck,
    instagram: input.instagram ?? '',
    isReservable: input.isReservable,
    account: input.account ?? '',
    notice: input.notice ?? null,
    locationId: input.locationId ?? null,
    profileComplete,
    representativeMenus: input.representativeMenus ?? [],
    waitingCount: 0,
    thumbnailUrl: null,
    tags: [],
  };
  mockBoothsById[nextId] = created;
  return created;
}

const sortByDisplayOrder = (a: BoothImage, b: BoothImage) => a.displayOrder - b.displayOrder;

async function listBoothImagesMock(boothId: number): Promise<BoothImage[]> {
  await new Promise((r) => setTimeout(r, 100));
  return [...(mockBoothImagesByBoothId[boothId] ?? [])].sort(sortByDisplayOrder);
}

async function addBoothImageMock(boothId: number, input: BoothImageCreateDTO): Promise<BoothImage> {
  await new Promise((r) => setTimeout(r, 150));
  const created: BoothImage = {
    id: allocateMockBoothImageId(),
    boothId,
    imageUrl: input.imageUrl,
    displayOrder: input.displayOrder,
  };
  (mockBoothImagesByBoothId[boothId] ??= []).push(created);
  return created;
}

async function updateBoothImageMock(
  boothId: number,
  imageId: number,
  patch: BoothImageUpdateDTO,
): Promise<BoothImage> {
  await new Promise((r) => setTimeout(r, 150));
  const list = mockBoothImagesByBoothId[boothId] ?? [];
  const idx = list.findIndex((img) => img.id === imageId);
  if (idx === -1)
    throw new Error(`mock: booth ${boothId} 이미지 ${imageId} 을(를) 찾을 수 없습니다.`);
  const next: BoothImage = {
    ...list[idx],
    ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
    ...(patch.displayOrder !== undefined ? { displayOrder: patch.displayOrder } : {}),
  };
  list[idx] = next;
  return next;
}

async function deleteBoothImageMock(boothId: number, imageId: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  const list = mockBoothImagesByBoothId[boothId];
  if (list) mockBoothImagesByBoothId[boothId] = list.filter((img) => img.id !== imageId);
}

// ---- Real ----

async function getMyBoothReal(): Promise<Booth | null> {
  const user = useAuthStore.getState().user;
  if (!user || user.boothId == null) return null;
  const dto = await api.get<BoothDTO>(`/booths/${user.boothId}`);
  return toBooth(dto);
}

async function updateMyBoothReal(booth: Booth): Promise<Booth> {
  const dto = await api.put<BoothDTO>(`/admin/booths/${booth.id}`, fromBooth(booth));
  return toBooth(dto);
}

async function listBoothsReal(): Promise<Booth[]> {
  // 백엔드가 /booths 를 페이지 래퍼({ content, hasNext, totalPages, ... })로 바꿨다.
  // size 최대 100 이므로 부스가 100개를 넘어도 누락이 없도록 끝까지 순회해 전부 수집한다.
  // (useBooths 소비처 — 대시보드·배치도 편집·예약 picker — 는 페이지가 아니라 '전체 부스
  // 배열'을 기대한다.) hasNext 만 믿으면 백엔드가 page 를 무시/오계산할 때 무한 루프가
  // 날 수 있어, totalPages 상한 + 하드 캡(MAX_PAGES) + content 빈 응답 가드로 폭주를 막는다.
  const PAGE_SIZE = 100;
  const MAX_PAGES = 50; // 안전 상한(부스 5000개) — 잘못된 응답에서의 요청 폭주 차단.
  const all: BoothDTO[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages && page < MAX_PAGES) {
    const res = await api.get<PageResponse<BoothDTO>>(`/booths?page=${page}&size=${PAGE_SIZE}`);
    all.push(...res.content);
    totalPages = res.totalPages;
    // hasNext=false 거나 content 가 비면 즉시 종료 — 서버가 page 를 무시해도 멈춘다.
    if (!res.hasNext || res.content.length === 0) break;
    page += 1;
  }
  return all.map(toBooth);
}

/** 부스 운영 ON/OFF 단건 변경 — 전체 PUT 과 별개의 전용 엔드포인트. */
async function setBoothReservableReal(input: {
  id: number;
  isReservable: boolean;
}): Promise<Booth> {
  const dto = await api.patch<BoothDTO>(`/admin/booths/${input.id}/reservable`, {
    isReservable: input.isReservable,
  });
  return toBooth(dto);
}

/**
 * 부스 행을 DB 에서 완전히 삭제. 어드민 계정 삭제(A-014) 가드를 풀어주는 cascade
 * 용도 — 단독 호출보다 useDeleteUser 흐름에서 컨펌 후 함께 사용.
 */
async function deleteBoothReal(id: number): Promise<void> {
  await api.delete(`/admin/booths/${id}`);
}

/** 신규 부스 생성 — POST /admin/booths. 응답 BoothResponse 를 Booth 모델로 변환. */
async function createBoothReal(input: BoothCreateInput): Promise<Booth> {
  const dto = await api.post<BoothDTO>('/admin/booths', fromBoothCreate(input));
  return toBooth(dto);
}

/** 부스 이미지 목록 — 공개 GET /booths/{boothId}/images (display_order 오름차순). */
async function listBoothImagesReal(boothId: number): Promise<BoothImage[]> {
  const dtos = await api.get<BoothImageDTO[]>(`/booths/${boothId}/images`);
  return dtos.map(toBoothImage);
}

/** 부스 이미지 추가 — POST /admin/booths/{boothId}/images. imageUrl 은 uploads 로 먼저 업로드한 URL. */
async function addBoothImageReal(boothId: number, input: BoothImageCreateDTO): Promise<BoothImage> {
  const dto = await api.post<BoothImageDTO>(`/admin/booths/${boothId}/images`, input);
  return toBoothImage(dto);
}

/** 부스 이미지 수정 — PATCH /admin/booths/{boothId}/images/{imageId} (부분 수정). */
async function updateBoothImageReal(
  boothId: number,
  imageId: number,
  patch: BoothImageUpdateDTO,
): Promise<BoothImage> {
  const dto = await api.patch<BoothImageDTO>(`/admin/booths/${boothId}/images/${imageId}`, patch);
  return toBoothImage(dto);
}

/** 부스 이미지 삭제 — DELETE /admin/booths/{boothId}/images/{imageId}. */
async function deleteBoothImageReal(boothId: number, imageId: number): Promise<void> {
  await api.delete(`/admin/booths/${boothId}/images/${imageId}`);
}

// ---- 분기 export ----

export const getMyBooth = env.USE_MOCK ? getMyBoothMock : getMyBoothReal;
export const updateMyBooth = env.USE_MOCK ? updateMyBoothMock : updateMyBoothReal;
export const listBooths = env.USE_MOCK ? listBoothsMock : listBoothsReal;
export const setBoothReservable = env.USE_MOCK ? setBoothReservableMock : setBoothReservableReal;
export const deleteBooth = env.USE_MOCK ? deleteBoothMock : deleteBoothReal;
export const createBooth = env.USE_MOCK ? createBoothMock : createBoothReal;
export const listBoothImages = env.USE_MOCK ? listBoothImagesMock : listBoothImagesReal;
export const addBoothImage = env.USE_MOCK ? addBoothImageMock : addBoothImageReal;
export const updateBoothImage = env.USE_MOCK ? updateBoothImageMock : updateBoothImageReal;
export const deleteBoothImage = env.USE_MOCK ? deleteBoothImageMock : deleteBoothImageReal;
