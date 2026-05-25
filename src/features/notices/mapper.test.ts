import { describe, expect, it } from 'vitest';
import { fromNotice, toNotice } from './mapper';
import { isNewNotice, type NoticeDTO } from './types';

describe('notices mapper', () => {
  describe('toNotice', () => {
    it('중첩 images[] 를 imageUrls 로 평탄화하고 imageUrl·hasImage 를 파생한다', () => {
      const dto: NoticeDTO = {
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
        imageUrl: 'https://img/a.jpg',
        images: [
          { id: 1, imageUrl: 'https://img/a.jpg', displayOrder: 1 },
          { id: 2, imageUrl: 'https://img/b.jpg', displayOrder: 2 },
        ],
        isPinned: true,
        category: 'BOOTH',
      };
      expect(toNotice(dto)).toEqual({
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
        imageUrl: 'https://img/a.jpg',
        imageUrls: ['https://img/a.jpg', 'https://img/b.jpg'],
        isPinned: true,
        category: 'BOOTH',
      });
    });

    it('images 가 없으면 레거시 단일 imageUrl 을 1원소 배열로 폴백', () => {
      const dto: NoticeDTO = {
        id: 8,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
        imageUrl: 'https://img/x.jpg',
        isPinned: false,
        category: 'BOOTH',
      };
      const result = toNotice(dto);
      expect(result.imageUrls).toEqual(['https://img/x.jpg']);
      expect(result.imageUrl).toBe('https://img/x.jpg');
      expect(result.hasImage).toBe(true);
    });

    it('hasImage false 도 그대로 false 로 매핑', () => {
      const dto: NoticeDTO = {
        id: 1,
        title: 't',
        content: 'c',
        date: '2026-01-01',
        hasImage: false,
        imageUrl: '',
        isPinned: false,
        category: 'OTHERS',
      };
      expect(toNotice(dto).hasImage).toBe(false);
    });

    it('알려진 category 는 그대로 통과', () => {
      const dto: NoticeDTO = {
        id: 2,
        title: 't',
        content: 'c',
        date: '2026-05-26',
        hasImage: false,
        imageUrl: '',
        isPinned: false,
        category: 'PERFORMANCE',
      };
      expect(toNotice(dto).category).toBe('PERFORMANCE');
    });

    it('알 수 없는 category 문자열은 OTHERS 로 폴백', () => {
      const dto: NoticeDTO = {
        id: 3,
        title: 't',
        content: 'c',
        date: '2026-05-26',
        hasImage: false,
        imageUrl: '',
        isPinned: false,
        category: 'unknown_value',
      };
      expect(toNotice(dto).category).toBe('OTHERS');
    });
  });

  describe('fromNotice', () => {
    it('imageUrls 를 순서대로 중첩 images[](display_order 1부터)로 보내고 imageUrl·hasImage 파생', () => {
      const result = fromNotice({
        title: 't',
        content: 'c',
        imageUrls: ['https://img/c.jpg', 'https://img/d.jpg'],
        isPinned: true,
        category: 'BLUERUN',
      });
      expect(result).toEqual({
        title: 't',
        content: 'c',
        hasImage: true,
        imageUrl: 'https://img/c.jpg',
        images: [
          { image_url: 'https://img/c.jpg', display_order: 1 },
          { image_url: 'https://img/d.jpg', display_order: 2 },
        ],
        isPinned: true,
        category: 'BLUERUN',
      });
    });

    it('imageUrls 가 비어 있으면 images 빈 배열·hasImage false·imageUrl 빈 문자열', () => {
      const result = fromNotice({
        title: 't',
        content: 'c',
        imageUrls: [],
        isPinned: false,
        category: 'OTHERS',
      });
      expect(result.hasImage).toBe(false);
      expect(result.imageUrl).toBe('');
      expect(result.images).toEqual([]);
    });
  });
});

describe('isNewNotice', () => {
  // 기준 today: 2026-05-08 (KST 자정).
  const today = new Date('2026-05-08T00:00:00+09:00');

  it('당일 등록은 New', () => {
    expect(isNewNotice('2026-05-08', today)).toBe(true);
  });

  it('1일 전 등록은 New', () => {
    expect(isNewNotice('2026-05-07', today)).toBe(true);
  });

  it('3일 전 등록은 New (경계 포함)', () => {
    expect(isNewNotice('2026-05-05', today)).toBe(true);
  });

  it('4일 전 등록은 New 아님 (경계 밖)', () => {
    expect(isNewNotice('2026-05-04', today)).toBe(false);
  });

  it('미래 날짜는 New 아님', () => {
    expect(isNewNotice('2026-05-09', today)).toBe(false);
  });
});
