import { NOTICE_CATEGORIES } from './types';
import type { Notice, NoticeCategory, NoticeDTO, NoticeWriteDTO } from './types';

/** 백엔드 category 문자열 → NoticeCategory. 모르는 값이면 general 로 폴백. */
function toNoticeCategory(value: string): NoticeCategory {
  return value in NOTICE_CATEGORIES ? (value as NoticeCategory) : 'general';
}

export const toNotice = (d: NoticeDTO): Notice => ({
  id: d.id,
  title: d.title,
  content: d.content,
  date: d.date,
  hasImage: d.hasImage,
  category: toNoticeCategory(d.category),
});

export const fromNotice = (
  n: Pick<Notice, 'title' | 'content' | 'hasImage' | 'category'>,
): NoticeWriteDTO => ({
  title: n.title,
  content: n.content,
  hasImage: n.hasImage,
  // 프론트엔 이미지 URL·상단 고정 개념이 없어 기본값 전송 — 백엔드 기능 도입 시 보강.
  imageUrl: '',
  isPinned: false,
  category: n.category,
});
