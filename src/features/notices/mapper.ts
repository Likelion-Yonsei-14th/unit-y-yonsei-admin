import { NOTICE_CATEGORIES } from './types';
import type { Notice, NoticeCategory, NoticeDTO, NoticeWriteDTO } from './types';

/** 백엔드 category 문자열 → NoticeCategory. 모르는 값이면 OTHERS 로 폴백. */
function toNoticeCategory(value: string): NoticeCategory {
  return value in NOTICE_CATEGORIES ? (value as NoticeCategory) : 'OTHERS';
}

export const toNotice = (d: NoticeDTO): Notice => {
  // 백엔드 정본은 중첩 images[](displayOrder 순 정렬됨). 레거시 단일 imageUrl 만 오면 폴백.
  const imageUrls = d.images?.map((img) => img.imageUrl) ?? (d.imageUrl ? [d.imageUrl] : []);
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
    // 백엔드 정본은 중첩 images[] — 배열 인덱스+1 을 display_order 로(1부터·중복 없음).
    images: imageUrls.map((url, i) => ({ image_url: url, display_order: i + 1 })),
    // imageUrl·hasImage 는 서버 레거시 fallback 용 파생값(images 가 있으면 서버가 무시).
    imageUrl: imageUrls[0] ?? '',
    hasImage: imageUrls.length > 0,
    isPinned: n.isPinned,
    category: n.category,
  };
};
