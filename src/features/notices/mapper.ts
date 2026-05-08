import type { Notice, NoticeDTO } from './types';

export const toNotice = (d: NoticeDTO): Notice => ({
  id: d.id,
  title: d.title,
  content: d.content,
  date: d.date,
  hasImage: d.has_image,
  category: d.category,
});

export const fromNotice = (
  n: Pick<Notice, 'title' | 'content' | 'hasImage' | 'category'>,
): Pick<NoticeDTO, 'title' | 'content' | 'has_image' | 'category'> => ({
  title: n.title,
  content: n.content,
  has_image: n.hasImage,
  category: n.category,
});
