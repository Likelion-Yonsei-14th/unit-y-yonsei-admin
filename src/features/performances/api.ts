import { api, ApiError } from '@/lib/api-client';
import { env } from '@/lib/env';
import type { ReviewDTO } from '@/features/performance-review/types';
import {
  fromPerformancePatch,
  toMyCheerMessage,
  toPerformance,
  toPerformanceImage,
  toPerformanceListItem,
  toSetlistItem,
} from './mapper';
import type {
  MyCheerMessage,
  Performance,
  PerformanceDTO,
  PerformanceImage,
  PerformanceImageCreateDTO,
  PerformanceImageDTO,
  PerformanceListItem,
  PerformanceListItemDTO,
  SetlistCreateDTO,
  SetlistItem,
  SetlistItemDTO,
  SetlistUpdateDTO,
} from './types';
import * as mock from '@/mocks/performances';

// ---- real 구현 ----
// 주의: 백엔드 PerformanceReadController 가 /api 프리픽스 누락 상태 → 백엔드 수정 후 동작.

async function listPerformancesReal(): Promise<PerformanceListItem[]> {
  const dtos = await api.get<PerformanceListItemDTO[]>('/performances');
  return dtos.map(toPerformanceListItem);
}

// SUPER 전용 — HIDDEN 포함 전체 공연. 공개 /performances 는 HIDDEN 을 제외하므로
// 운영(공개/숨김 관리)용으로는 이 어드민 엔드포인트를 쓴다.
async function listAdminPerformancesReal(): Promise<PerformanceListItem[]> {
  const dtos = await api.get<PerformanceListItemDTO[]>('/admin/performances');
  return dtos.map(toPerformanceListItem);
}

// 운영진(SUPER/MASTER) 상세 조회 — 어드민 전용 엔드포인트라 HIDDEN(미발행) 공연도 200 으로 반환.
// 공개 GET /performances/{id} 는 HIDDEN 을 404(P-006)로 숨기므로, HIDDEN 을 포함하는
// 어드민 목록(listAdminPerformances)에서 클릭해 상세·수정폼을 채우는 데는 부적합했다.
// 응답 스키마는 공개 상세와 동일 → toPerformance 매퍼 그대로 재사용.
async function getPerformanceReal(id: number): Promise<Performance | null> {
  const dto = await api.get<PerformanceDTO>(`/admin/performances/${id}`);
  return toPerformance(dto);
}

async function getMyPerformanceReal(): Promise<Performance | null> {
  try {
    const dto = await api.get<PerformanceDTO>('/admin/performances/me');
    return toPerformance(dto);
  } catch (err) {
    // P-006(Performance not found) = 이 performer 에 배정된 공연이 아직 없음.
    // 에러가 아니라 "빈 상태" 로 다뤄 화면이 안내 문구를 띄우게 한다.
    if (err instanceof ApiError && (err.status === 404 || err.body?.code === 'P-006')) {
      return null;
    }
    throw err;
  }
}

async function updateMyPerformanceReal(patch: Partial<Performance>): Promise<Performance> {
  const dto = await api.patch<PerformanceDTO>(
    '/admin/performances/me',
    fromPerformancePatch(patch),
  );
  return toPerformance(dto);
}

/**
 * 운영진(SUPER/MASTER)이 임의 공연을 부분 갱신.
 * `/me` 와 동일한 PerformanceUpdateRequest 시맨틱(non-null 필드만 반영).
 * 백엔드 PerformanceAdminController.updatePerformance(id) — 2026-05-20 머지.
 */
async function updatePerformanceReal(
  id: number,
  patch: Partial<Performance>,
): Promise<Performance> {
  const dto = await api.patch<PerformanceDTO>(
    `/admin/performances/${id}`,
    fromPerformancePatch(patch),
  );
  return toPerformance(dto);
}

/**
 * 운영진(SUPER/MASTER)이 임의 공연을 영구 삭제.
 * 백엔드 PerformanceAdminController.deletePerformance(id) — body 없음, void(성공 시 빈 봉투).
 * ⚠️ 이미지·셋리스트·공지 등 자식 데이터가 남아 있으면 400(P-009/P-010/P-011)으로 차단된다 —
 * 호출부가 에러 메시지를 사용자에게 노출해 먼저 자식 데이터를 정리하도록 안내한다.
 */
async function deletePerformanceReal(id: number): Promise<void> {
  await api.delete(`/admin/performances/${id}`);
}

/**
 * 로그인한 Performer 본인 공연의 응원 메시지 목록(전 상태: VISIBLE/HIDDEN).
 * 백엔드 PerformanceCheerMessageController.getMyPerformanceCheerMessages — camelCase 응답,
 * 와이어 shape 는 performance-review ReviewDTO 와 동일.
 */
async function getMyCheerMessagesReal(): Promise<MyCheerMessage[]> {
  const dtos = await api.get<ReviewDTO[]>('/admin/performances/me/cheer-messages');
  return dtos.map(toMyCheerMessage);
}

async function getPerformanceImagesReal(performanceId: number): Promise<PerformanceImage[]> {
  const dtos = await api.get<PerformanceImageDTO[]>(`/performances/${performanceId}/images`);
  return dtos.map(toPerformanceImage);
}

async function addPerformanceImageReal(
  input: PerformanceImageCreateDTO,
): Promise<PerformanceImage> {
  const dto = await api.post<PerformanceImageDTO>('/admin/performances/me/images', input);
  return toPerformanceImage(dto);
}

async function deletePerformanceImageReal(imageId: number): Promise<void> {
  await api.delete(`/admin/performances/me/images/${imageId}`);
}

async function getSetlistReal(performanceId: number): Promise<SetlistItem[]> {
  const dtos = await api.get<SetlistItemDTO[]>(`/performances/${performanceId}/setlists`);
  return dtos.map(toSetlistItem);
}

async function addSetlistItemReal(input: SetlistCreateDTO): Promise<SetlistItem> {
  const dto = await api.post<SetlistItemDTO>('/admin/performances/me/setlists', input);
  return toSetlistItem(dto);
}

async function updateSetlistItemReal(
  setlistId: number,
  input: SetlistUpdateDTO,
): Promise<SetlistItem> {
  const dto = await api.patch<SetlistItemDTO>(
    `/admin/performances/me/setlists/${setlistId}`,
    input,
  );
  return toSetlistItem(dto);
}

async function deleteSetlistItemReal(setlistId: number): Promise<void> {
  await api.delete(`/admin/performances/me/setlists/${setlistId}`);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- 공연 삭제 / 내 응원 메시지 mock ----
// 기존 mock 공연 시드(@/mocks/performances)는 건드리지 않고 이 도메인 안에서 닫는다.

/** 운영진 공연 삭제 mock — 서버 상태가 없으므로 성공만 흉내낸다(목록 invalidation 은 hook 책임). */
async function deletePerformanceMock(_id: number): Promise<void> {
  await delay(150);
}

// Performer 본인 응원 메시지 mock 시드 — 백엔드 응답(ReviewDTO shape, camelCase)을 흉내내
// 매퍼를 그대로 태운다. createdAt 은 'yyyy-MM-dd HH:mm' 문자열(타임존 없음).
const MOCK_MY_CHEER_MESSAGES_DTO: ReviewDTO[] = [
  {
    id: 1,
    performanceId: 1,
    performanceName: '멋쟁이사자처럼 연세대',
    setlistId: 11,
    singerName: '잔나비',
    songTitle: '주저하는 연인들을 위해',
    message: '무대 너무 좋았어요! 다음 곡도 기대할게요 🦁',
    displayStatus: 'VISIBLE',
    createdAt: '2026-05-28 14:12',
  },
  {
    id: 2,
    performanceId: 1,
    performanceName: '멋쟁이사자처럼 연세대',
    setlistId: null,
    singerName: null,
    songTitle: null,
    message: '백양로에서 응원합니다 화이팅!',
    displayStatus: 'VISIBLE',
    createdAt: '2026-05-28 14:20',
  },
  {
    id: 3,
    performanceId: 1,
    performanceName: '멋쟁이사자처럼 연세대',
    setlistId: 12,
    singerName: '혁오',
    songTitle: 'TOMBOY',
    message: '이 곡 라이브로 들으니 소름… 최고의 무대였습니다',
    displayStatus: 'HIDDEN',
    createdAt: '2026-05-28 14:35',
  },
];

async function getMyCheerMessagesMock(): Promise<MyCheerMessage[]> {
  await delay(180);
  return MOCK_MY_CHEER_MESSAGES_DTO.map(toMyCheerMessage);
}

// ---- 라이브 수동지정 ----
// GET  /home/current-performance — 공개 조회(HomeController). 수동 지정한 현재 라이브 공연. 미지정 시 data=null.
// PUT  /admin/performances/live  — SUPER 전용 지정/교체/해제(LivePerformanceAdminController). performanceId=null 이면 해제.
// 둘 다 PerformanceCurrentResponse(camelCase)를 반환하나 FE 는 공연 id 만 필요하므로 그 필드만 좁혀 number|null 로 다룬다.
type LivePerformanceResponse = { id: number } | null;

async function getLivePerformanceReal(): Promise<number | null> {
  const res = await api.get<LivePerformanceResponse>('/home/current-performance');
  return res?.id ?? null;
}

async function setLivePerformanceReal(performanceId: number | null): Promise<number | null> {
  const res = await api.put<LivePerformanceResponse>('/admin/performances/live', {
    performanceId,
  });
  return res?.id ?? null;
}

// ---- 분기 export ----

export const listPerformances = env.USE_MOCK ? mock.listPerformancesMock : listPerformancesReal;
export const listAdminPerformances = env.USE_MOCK
  ? mock.listPerformancesMock
  : listAdminPerformancesReal;
export const getPerformance = env.USE_MOCK ? mock.getPerformanceMock : getPerformanceReal;
export const getMyPerformance = env.USE_MOCK ? mock.getMyPerformanceMock : getMyPerformanceReal;
export const updateMyPerformance = env.USE_MOCK
  ? mock.updateMyPerformanceMock
  : updateMyPerformanceReal;
export const updatePerformance = env.USE_MOCK ? mock.updatePerformanceMock : updatePerformanceReal;
export const deletePerformance = env.USE_MOCK ? deletePerformanceMock : deletePerformanceReal;
export const getMyCheerMessages = env.USE_MOCK ? getMyCheerMessagesMock : getMyCheerMessagesReal;
export const getPerformanceImages = env.USE_MOCK
  ? mock.getPerformanceImagesMock
  : getPerformanceImagesReal;
export const addPerformanceImage = env.USE_MOCK
  ? mock.addPerformanceImageMock
  : addPerformanceImageReal;
export const deletePerformanceImage = env.USE_MOCK
  ? mock.deletePerformanceImageMock
  : deletePerformanceImageReal;
export const getSetlist = env.USE_MOCK ? mock.getSetlistMock : getSetlistReal;
export const addSetlistItem = env.USE_MOCK ? mock.addSetlistItemMock : addSetlistItemReal;
export const updateSetlistItem = env.USE_MOCK ? mock.updateSetlistItemMock : updateSetlistItemReal;
export const deleteSetlistItem = env.USE_MOCK ? mock.deleteSetlistItemMock : deleteSetlistItemReal;
export const getLivePerformance = env.USE_MOCK
  ? mock.getLivePerformanceMock
  : getLivePerformanceReal;
export const setLivePerformance = env.USE_MOCK
  ? mock.setLivePerformanceMock
  : setLivePerformanceReal;
