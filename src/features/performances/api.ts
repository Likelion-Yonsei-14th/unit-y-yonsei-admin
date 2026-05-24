import { api, ApiError } from '@/lib/api-client';
import { env } from '@/lib/env';
import {
  fromPerformancePatch,
  toPerformance,
  toPerformanceImage,
  toPerformanceListItem,
  toSetlistItem,
} from './mapper';
import type {
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

async function getPerformanceReal(id: number): Promise<Performance | null> {
  const dto = await api.get<PerformanceDTO>(`/performances/${id}`);
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
export const getPerformance = env.USE_MOCK ? mock.getPerformanceMock : getPerformanceReal;
export const getMyPerformance = env.USE_MOCK ? mock.getMyPerformanceMock : getMyPerformanceReal;
export const updateMyPerformance = env.USE_MOCK
  ? mock.updateMyPerformanceMock
  : updateMyPerformanceReal;
export const updatePerformance = env.USE_MOCK ? mock.updatePerformanceMock : updatePerformanceReal;
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
