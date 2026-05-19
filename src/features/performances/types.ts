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
}

export interface PerformanceImageCreateDTO {
  imageUrl: string;
  imageOrder: number;
  imageType: PerformanceImageType;
}

export interface SetlistCreateDTO {
  songTitle: string;
  singerName: string;
  songOrder: number;
  note: string | null;
}

export type SetlistUpdateDTO = SetlistCreateDTO;
