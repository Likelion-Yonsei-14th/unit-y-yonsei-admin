/**
 * 총학생회 공지사항 도메인 모델.
 *
 * 카드뉴스(인스타그램 스타일) + 본문 한 쌍이 단위.
 */

/**
 * 공지 분류. 운영진 피드백으로 도입된 날짜+장소 기반 태그.
 * 모바일 웹사이트와 통일.
 *
 * - general:    날짜·장소 무관 공통 안내(전체 일정·안전 수칙·결제 등)
 * - bluerun:    5/26 블루런
 * - songdo:     5/27 송도(언기도 앞)
 * - sinchon_28: 5/28 신촌(동문광장·노천극장)
 * - sinchon_29: 5/29 신촌(동문광장·노천극장)
 */
export type NoticeCategory = 'general' | 'bluerun' | 'songdo' | 'sinchon_28' | 'sinchon_29';

export interface NoticeCategoryMeta {
  id: NoticeCategory;
  label: string;
  /** 배지 색조 — Tailwind 클래스로 mapping. */
  tone: 'neutral' | 'secondary' | 'warning' | 'primary' | 'success';
}

export const NOTICE_CATEGORIES: Record<NoticeCategory, NoticeCategoryMeta> = {
  general: { id: 'general', label: '전체', tone: 'neutral' },
  bluerun: { id: 'bluerun', label: '5/26 블루런', tone: 'secondary' },
  songdo: { id: 'songdo', label: '5/27 송도', tone: 'warning' },
  sinchon_28: { id: 'sinchon_28', label: '5/28 신촌', tone: 'primary' },
  sinchon_29: { id: 'sinchon_29', label: '5/29 신촌', tone: 'success' },
};

export interface Notice {
  id: number;
  title: string;
  content: string;
  /** 등록일자 — yyyy-mm-dd. */
  date: string;
  /** 카드뉴스 이미지 첨부 여부. 실제 URL 은 별도 필드/엔드포인트로 분리될 수 있음. */
  hasImage: boolean;
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
 * 프론트가 쓰는 필드만 선언 — imageUrl/isPinned/viewCount/performanceId/boothId 는 미사용.
 */
export interface NoticeDTO {
  id: number;
  title: string;
  content: string;
  date: string;
  hasImage: boolean;
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
  hasImage: boolean;
  category: NoticeCategory;
}

export interface UpdateNoticeInput {
  id: number;
  title: string;
  content: string;
  hasImage: boolean;
  category: NoticeCategory;
}
