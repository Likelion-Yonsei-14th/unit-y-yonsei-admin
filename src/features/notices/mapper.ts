import { NOTICE_CATEGORIES } from './types';
import type { Notice, NoticeCategory, NoticeDTO, NoticeWriteDTO } from './types';

/** 백엔드 category 문자열 → NoticeCategory. 모르는 값이면 OTHERS 로 폴백. */
function toNoticeCategory(value: string): NoticeCategory {
  return value in NOTICE_CATEGORIES ? (value as NoticeCategory) : 'OTHERS';
}

export const toNotice = (d: NoticeDTO): Notice => {
  // imageUrls 가 진실. 백엔드가 아직 단일 imageUrl 만 주면 1원소 배열로 폴백.
  const imageUrls = d.imageUrls ?? (d.imageUrl ? [d.imageUrl] : []);
  return {
    id: d.id,
    title: d.title,
    content: d.content,
    date: d.date,
    imageUrls,
    // imageUrl·hasImage 는 imageUrls 에서 파생 — 목록 썸네일·공개 앱 호환용.
    imageUrl: imageUrls[0] ?? '',
    hasImage: imageUrls.length > 0,
    isPinned: d.isPinned ?? false,
    category: toNoticeCategory(d.category),
  };
};

export const fromNotice = (
  n: Pick<Notice, 'title' | 'content' | 'imageUrls' | 'isPinned' | 'category'>,
): NoticeWriteDTO => {
  const imageUrls = n.imageUrls ?? [];
  return {
    title: n.title,
    content: n.content,
    imageUrls,
    // imageUrl·hasImage 는 imageUrls 에서 파생 — 공개 앱 호환 superset.
    imageUrl: imageUrls[0] ?? '',
    hasImage: imageUrls.length > 0,
    isPinned: n.isPinned,
    category: n.category,
  };
};
