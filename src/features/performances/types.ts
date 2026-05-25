/**
 * 공연(Performance) 도메인 모델 — 백엔드 performance 도메인 응답 미러.
 * 필드/케이싱은 백엔드(`~/Desktop/unit-y-yonsei-server` origin/dev)와 1:1.
 */

export type PerformanceCategory = 'ARTIST' | 'CLUB';
export type PerformanceStatus = 'SCHEDULED' | 'ONGOING' | 'ENDED' | 'CANCELED' | 'HIDDEN';
export type PerformanceImageType = 'PROFILE' | 'DETAIL';

export const PERFORMANCE_CATEGORY_LABEL: Record<PerformanceCategory, string> = {
  ARTIST: '아티스트',
  CLUB: '동아리',
};

export const PERFORMANCE_STATUS_LABEL: Record<PerformanceStatus, string> = {
  SCHEDULED: '예정',
  ONGOING: '진행 중',
  ENDED: '종료',
  CANCELED: '취소',
  HIDDEN: '비공개',
};

// ---- 서브 엔티티 (별도 sub-resource) ----

export interface SetlistItem {
  id: number;
  performanceId: number;
  songTitle: string;
  singerName: string;
  /** 노출 순서 (1부터). */
  songOrder: number;
  note: string;
}

export interface PerformanceImage {
  id: number;
  performanceId: number;
  imageUrl: string;
  /** 노출 순서 (1부터). */
  imageOrder: number;
  imageType: PerformanceImageType;
}

// ---- 프론트 모델 ----

/** 리스트 카드용 경량 모델. */
export interface PerformanceListItem {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDate: number | null;
  startTime: string | null; // 'HH:mm'
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
}

/** 공연 상세/내 공연. images·setlist 는 별도 쿼리로 로드 — 이 모델에 포함하지 않는다. */
export interface Performance {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDescription: string;
  performanceDate: number | null;
  startTime: string | null;
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
  /** 공연 SNS 링크. 미입력 시 빈 문자열. */
  instagramUrl: string;
  youtubeUrl: string;
  /** 해시태그 — '#' 접두 포함, 최대 3개. */
  hashtags: string[];
}

// ---- 백엔드 DTO (camelCase — 모델과 거의 동일) ----

export interface PerformanceListItemDTO {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDate: number | null;
  startTime: string | null;
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
}

export interface PerformanceDTO {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDescription: string;
  performanceDate: number | null;
  startTime: string | null;
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
  /** 미설정 시 백엔드가 null 로 내려준다. */
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  /** 해시태그 내용 — '#' 미포함. 미설정 시 null. */
  hashtag1?: string | null;
  hashtag2?: string | null;
  hashtag3?: string | null;
}

export interface PerformanceImageDTO {
  id: number;
  performanceId: number;
  imageUrl: string;
  imageOrder: number;
  imageType: PerformanceImageType;
}

export interface SetlistItemDTO {
  id: number;
  performanceId: number;
  songTitle: string;
  singerName: string;
  songOrder: number;
  note: string | null;
}

// ---- 요청 DTO ----

/** PATCH /api/admin/performances/me — 전 필드 optional. */
export interface PerformanceUpdateDTO {
  performanceName?: string;
  performanceDescription?: string;
  performanceDate?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  performanceCategory?: PerformanceCategory | null;
  performanceStatus?: PerformanceStatus;
  lineupName?: string;
  locationId?: number | null;
  instagramUrl?: string;
  youtubeUrl?: string;
  /** 해시태그 내용 — '#' 미포함. 빈 슬롯은 null. */
  hashtag1?: string | null;
  hashtag2?: string | null;
  hashtag3?: string | null;
}

export interface PerformanceImageCreateDTO {
  imageUrl: string;
  imageOrder: number;
  imageType: PerformanceImageType;
}

// ---- 내 공연 응원 메시지 (GET /admin/performances/me/cheer-messages) ----
// 백엔드 PerformanceCheerMessageResponse 미러 — 다른 도메인과 달리 camelCase 로 내려온다.
// 와이어 DTO 는 performance-review 의 ReviewDTO 와 동일 shape 라 거기서 import 해 재사용한다
// (api.ts 참고). 다만 performance-review 의 Review 모델은 어드민 모더레이션용으로
// singerName 을 버리고 favoriteSong 으로 좁히므로, Performer 본인이 곡/가수/상태를 그대로
// 보는 이 화면 전용으로 별도 모델을 둔다.
export type CheerMessageDisplayStatus = 'VISIBLE' | 'HIDDEN';

export interface MyCheerMessage {
  id: number;
  performanceId: number;
  performanceName: string;
  setlistId: number | null;
  /** 응원이 향한 셋리스트 곡의 가수. 곡 미선택 메시지는 null. */
  singerName: string | null;
  /** 응원이 향한 셋리스트 곡명. 곡 미선택 메시지는 null. */
  songTitle: string | null;
  message: string;
  displayStatus: CheerMessageDisplayStatus;
  /**
   * "yyyy-MM-dd HH:mm" — 백엔드 LocalDateTime(타임존 없음)을 그대로 받은 문자열.
   * new Date() 로 파싱하면 로컬 타임존만큼 밀리므로 문자열 그대로 표시한다.
   */
  createdAt: string;
}

export interface SetlistCreateDTO {
  songTitle: string;
  singerName: string;
  songOrder: number;
  note: string | null;
}

export type SetlistUpdateDTO = SetlistCreateDTO;
