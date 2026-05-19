import { describe, expect, it } from 'vitest';
import { fromNotice, toNotice } from './mapper';
import { isNewNotice, type NoticeDTO } from './types';

describe('notices mapper', () => {
  describe('toNotice', () => {
    it('백엔드 DTO 를 Notice 모델로 옮긴다', () => {
      const dto: NoticeDTO = {
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
        imageUrl: 'https://img/x.jpg',
        isPinned: true,
        category: 'songdo',
      };
      expect(toNotice(dto)).toEqual({
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
        imageUrl: 'https://img/x.jpg',
        isPinned: true,
        category: 'songdo',
      });
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
        category: 'general',
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
        category: 'sinchon_29',
      };
      expect(toNotice(dto).category).toBe('sinchon_29');
    });

    it('알 수 없는 category 문자열은 general 로 폴백', () => {
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
      expect(toNotice(dto).category).toBe('general');
    });
  });

  describe('fromNotice', () => {
    it('이미지 URL 이 있으면 hasImage true 로 변환한다', () => {
      const result = fromNotice({
        title: 't',
        content: 'c',
        imageUrl: 'https://img/c.jpg',
        isPinned: true,
        category: 'bluerun',
      });
      expect(result).toEqual({
        title: 't',
        content: 'c',
        hasImage: true,
        imageUrl: 'https://img/c.jpg',
        isPinned: true,
        category: 'bluerun',
      });
    });

    it('이미지 URL 이 비어 있으면 hasImage false', () => {
      const result = fromNotice({
        title: 't',
        content: 'c',
        imageUrl: '',
        isPinned: false,
        category: 'general',
      });
      expect(result.hasImage).toBe(false);
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
