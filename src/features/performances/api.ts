import { api, ApiError } from '@/lib/api-client';
import { env } from '@/lib/env';
import type { ReviewDTO } from '@/features/performance-review/types';
import {
  fromPerformancePatch,
  toLiveStage,
  toMyCheerMessage,
  toPerformance,
  toPerformanceImage,
  toPerformanceListItem,
  toPerformanceTimetableItem,
  toSetlistItem,
} from './mapper';
import type {
  LiveStage,
  LiveStageDTO,
  MyCheerMessage,
  Performance,
  PerformanceDTO,
  PerformanceImage,
  PerformanceImageCreateDTO,
  PerformanceImageDTO,
  PerformanceListItem,
  PerformanceListItemDTO,
  PerformanceTimetableItem,
  PerformanceTimetableItemDTO,
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

// ---- 타임테이블 / 라이브 무대 (공개 read) ----
// GET /performances/timetable    — 일차·시작 시간 순 정렬된 공연 타임테이블(PerformanceReadController).
// GET /performances/live-stages  — 무대별 현재 진행 중인 공연(MANUAL=수동/AUTO=시간). 진행 중인 무대만.
// 둘 다 LocalTime('HH:mm[:ss]') — 타임존 없는 벽시계 → 매퍼에서 문자열 'HH:mm' 로만 자른다.

async function getPerformanceTimetableReal(): Promise<PerformanceTimetableItem[]> {
  const dtos = await api.get<PerformanceTimetableItemDTO[]>('/performances/timetable');
  return dtos.map(toPerformanceTimetableItem);
}

async function getLiveStagesReal(): Promise<LiveStage[]> {
  const dtos = await api.get<LiveStageDTO[]>('/performances/live-stages');
  return dtos.map(toLiveStage);
}

// ---- 타임테이블 / 라이브 무대 mock ----
// 기존 mock 공연 시드(@/mocks/performances)를 건드리지 않고 이 도메인 안에서 닫는다.
// 백엔드 응답 형태(DTO, hashtagN 개별 컬럼, 'HH:mm:ss')를 흉내내 매퍼를 그대로 태운다.

const MOCK_TIMETABLE_DTO: PerformanceTimetableItemDTO[] = [
  // 5/28 신촌(date=3)
  {
    id: 1,
    performanceName: '멋쟁이사자처럼 연세대',
    performanceDate: 3,
    startTime: '14:00:00',
    endTime: '14:30:00',
    performanceCategory: 'CLUB',
    lineupName: '멋쟁이사자처럼 연세대',
    hashtag1: 'IT창업',
    hashtag2: '밴드',
    hashtag3: '열정',
    youtubeUrl: 'https://youtube.com/likelion',
    instagramUrl: 'https://instagram.com/likelion_yonsei',
    performanceStatus: 'ONGOING',
    locationId: 2,
    locationName: '동문광장',
  },
  {
    id: 5,
    performanceName: '재즈필',
    performanceDate: 3,
    startTime: '16:30:00',
    endTime: '16:45:00',
    performanceCategory: 'CLUB',
    lineupName: '재즈필',
    hashtag1: '재즈',
    hashtag2: '빅밴드',
    hashtag3: null,
    youtubeUrl: null,
    instagramUrl: 'https://instagram.com/jazzfeel_yonsei',
    performanceStatus: 'SCHEDULED',
    locationId: 3,
    locationName: '노천극장',
  },
  {
    id: 16,
    performanceName: 'BTL',
    performanceDate: 3,
    startTime: '18:00:00',
    endTime: '18:30:00',
    performanceCategory: 'ARTIST',
    lineupName: 'BTL',
    hashtag1: 'KPOP',
    hashtag2: '댄스',
    hashtag3: '메인무대',
    youtubeUrl: 'https://youtube.com/btl_yonsei',
    instagramUrl: 'https://instagram.com/btl_yonsei',
    performanceStatus: 'SCHEDULED',
    locationId: 3,
    locationName: '노천극장',
  },
  // 5/29 신촌(date=4)
  {
    id: 10,
    performanceName: '페르세우스',
    performanceDate: 4,
    startTime: '15:15:00',
    endTime: '15:30:00',
    performanceCategory: 'CLUB',
    lineupName: '페르세우스',
    hashtag1: '록밴드',
    hashtag2: null,
    hashtag3: null,
    youtubeUrl: null,
    instagramUrl: 'https://instagram.com/perseus_yonsei',
    performanceStatus: 'SCHEDULED',
    locationId: 2,
    locationName: '동문광장',
  },
  {
    id: 24,
    performanceName: '연세 인디 콜라보',
    performanceDate: 4,
    startTime: '19:30:00',
    endTime: '20:30:00',
    performanceCategory: 'ARTIST',
    lineupName: '연세 인디 콜라보',
    hashtag1: '인디',
    hashtag2: '콜라보',
    hashtag3: null,
    youtubeUrl: null,
    instagramUrl: null,
    performanceStatus: 'SCHEDULED',
    locationId: 3,
    locationName: '노천극장',
  },
  // 5/27 송도(date=2)
  {
    id: 4,
    performanceName: 'Occlusion',
    performanceDate: 2,
    startTime: '21:30:00',
    endTime: '22:00:00',
    performanceCategory: 'CLUB',
    lineupName: 'Occlusion',
    hashtag1: '록밴드',
    hashtag2: '잔나비',
    hashtag3: null,
    youtubeUrl: null,
    instagramUrl: 'https://instagram.com/occlusion_band',
    performanceStatus: 'SCHEDULED',
    locationId: 1,
    locationName: '언기도 앞',
  },
];

const MOCK_LIVE_STAGES_DTO: LiveStageDTO[] = [
  {
    // 노천극장 — 운영진이 수동 지정한 아티스트 메인 무대.
    source: 'MANUAL',
    performance: {
      id: 16,
      performanceName: 'BTL',
      startTime: '18:00:00',
      endTime: '18:30:00',
      performanceStatus: 'ONGOING',
      performanceCategory: 'ARTIST',
      hashtag1: 'KPOP',
      hashtag2: '댄스',
      hashtag3: '메인무대',
      youtubeUrl: 'https://youtube.com/btl_yonsei',
      instagramUrl: 'https://instagram.com/btl_yonsei',
      locationId: 3,
      locationName: '노천극장',
    },
  },
  {
    // 동문광장 — 시간 기반 자동 판정된 동아리 무대.
    source: 'AUTO',
    performance: {
      id: 1,
      performanceName: '멋쟁이사자처럼 연세대',
      startTime: '14:00:00',
      endTime: '14:30:00',
      performanceStatus: 'ONGOING',
      performanceCategory: 'CLUB',
      hashtag1: 'IT창업',
      hashtag2: '밴드',
      hashtag3: '열정',
      youtubeUrl: 'https://youtube.com/likelion',
      instagramUrl: 'https://instagram.com/likelion_yonsei',
      locationId: 2,
      locationName: '동문광장',
    },
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getPerformanceTimetableMock(): Promise<PerformanceTimetableItem[]> {
  await delay(180);
  return MOCK_TIMETABLE_DTO.map(toPerformanceTimetableItem);
}

async function getLiveStagesMock(): Promise<LiveStage[]> {
  await delay(150);
  return MOCK_LIVE_STAGES_DTO.map(toLiveStage);
}

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
export const getPerformanceTimetable = env.USE_MOCK
  ? getPerformanceTimetableMock
  : getPerformanceTimetableReal;
export const getLiveStages = env.USE_MOCK ? getLiveStagesMock : getLiveStagesReal;
