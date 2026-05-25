/**
 * 총학생회 공지사항 도메인 모델.
 *
 * 카드뉴스(인스타그램 스타일) + 본문 한 쌍이 단위.
 */

/**
 * 공지 분류. 백엔드 `NoticeCategory` enum 과 1:1 — 값(대문자)을 그대로 송수신한다.
 *
 * - BLUERUN:     블루런 관련
 * - BOOTH:       부스 관련
 * - PERFORMANCE: 공연 관련
 * - OTHERS:      그 외 공통 안내(기본값)
 */
export type NoticeCategory = 'BLUERUN' | 'BOOTH' | 'PERFORMANCE' | 'OTHERS';

export interface NoticeCategoryMeta {
  id: NoticeCategory;
  label: string;
  /** 배지 색조 — Tailwind 클래스로 mapping. */
  tone: 'neutral' | 'secondary' | 'warning' | 'primary' | 'success';
}

export const NOTICE_CATEGORIES: Record<NoticeCategory, NoticeCategoryMeta> = {
  BLUERUN: { id: 'BLUERUN', label: '블루런', tone: 'secondary' },
  BOOTH: { id: 'BOOTH', label: '부스', tone: 'primary' },
  PERFORMANCE: { id: 'PERFORMANCE', label: '공연', tone: 'success' },
  OTHERS: { id: 'OTHERS', label: '기타', tone: 'neutral' },
};

export interface Notice {
  id: number;
  title: string;
  content: string;
  /** 등록일자 — yyyy-mm-dd. */
  date: string;
  /** 카드뉴스 이미지 첨부 여부. imageUrls 가 비어 있지 않은지와 동치. */
  hasImage: boolean;
  /** 대표(첫 장) 카드뉴스 이미지 URL — 목록 썸네일·공개 앱 호환용 파생값. 없으면 빈 문자열. */
  imageUrl: string;
  /**
   * 카드뉴스 이미지 URL 목록. 배열 순서 = 카드 슬라이드 순서, 첫 장이 대표.
   * 레거시 단일-이미지 응답엔 없을 수 있어 옵셔널 — 매퍼/목 api 가 항상 채운다.
   * 소비처는 `?? []` 로 안전 처리.
   */
  imageUrls?: string[];
  /** 상단 고정 여부 — 목록·앱 상단에 우선 노출. */
  isPinned: boolean;
  category: NoticeCategory;
}

/**
 * 등록일이 today 기준 3일 이내(과거 0~3일)면 New. KST 자정 기준.
 * 운영진 피드백 — 모바일 웹사이트와 동일 윈도우.
 */
export function isNewNotice(noticeDate: string, today: Date = new Date()): boolean {
  // today 가 의미하는 KST 날짜(YYYY-MM-DD)를 추출. UTC 자정 ≠ KST 자정 이라
  // 단순 toISOString().slice(0,10) 은 자정 직전·직후에 하루 어긋남.
  const todayKstDay = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dMs = new Date(`${noticeDate}T00:00:00+09:00`).getTime();
  const tMs = new Date(`${todayKstDay}T00:00:00+09:00`).getTime();
  const diffDays = (tMs - dMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

// ---- 백엔드 DTO (NoticeResponse / NoticeCreateRequest, camelCase) ----

/**
 * 백엔드 공지 응답 (NoticeResponse).
 * 프론트가 쓰는 필드만 선언 — viewCount/performanceId/boothId 는 미사용.
 */
export interface NoticeDTO {
  id: number;
  title: string;
  content: string;
  date: string;
  hasImage: boolean;
  /** 대표(첫 장) 이미지 URL. imageUrls 의 첫 원소와 동일하게 백엔드가 파생해 내려준다. */
  imageUrl: string;
  /**
   * 카드뉴스 이미지 URL 목록(순서 보존). 백엔드가 아직 안 내려주면 toNotice 가 imageUrl 로 폴백.
   */
  imageUrls?: string[];
  isPinned: boolean;
  /** 백엔드는 자유 문자열. toNotice 가 NoticeCategory 로 정규화. */
  category: string;
}

/** 백엔드 공지 생성/수정 요청 (NoticeCreateRequest / NoticeUpdateRequest). */
export interface NoticeWriteDTO {
  title: string;
  content: string;
  hasImage: boolean;
  imageUrl: string;
  isPinned: boolean;
  category: string;
}

export interface CreateNoticeInput {
  title: string;
  content: string;
  /** 업로드 완료된 이미지 URL. 없으면 빈 문자열. */
  imageUrl: string;
  isPinned: boolean;
  category: NoticeCategory;
}

export interface UpdateNoticeInput {
  id: number;
  title: string;
  content: string;
  /** 업로드 완료된 이미지 URL. 없으면 빈 문자열. */
  imageUrl: string;
  isPinned: boolean;
  category: NoticeCategory;
}
