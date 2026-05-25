import { NOTICE_CATEGORIES } from './types';
import type { Notice, NoticeCategory, NoticeDTO, NoticeWriteDTO } from './types';

/** 백엔드 category 문자열 → NoticeCategory. 모르는 값이면 OTHERS 로 폴백. */
function toNoticeCategory(value: string): NoticeCategory {
  return value in NOTICE_CATEGORIES ? (value as NoticeCategory) : 'OTHERS';
}

export const toNotice = (d: NoticeDTO): Notice => ({
  id: d.id,
  title: d.title,
  content: d.content,
  date: d.date,
  hasImage: d.hasImage,
  imageUrl: d.imageUrl ?? '',
  isPinned: d.isPinned ?? false,
  category: toNoticeCategory(d.category),
});

export const fromNotice = (
  n: Pick<Notice, 'title' | 'content' | 'imageUrl' | 'isPinned' | 'category'>,
): NoticeWriteDTO => ({
  title: n.title,
  content: n.content,
  // 백엔드 hasImage 는 imageUrl 유무와 동치 — 매퍼가 단일 진실로 계산.
  hasImage: n.imageUrl !== '',
  imageUrl: n.imageUrl,
  isPinned: n.isPinned,
  category: n.category,
});
