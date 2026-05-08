import { describe, expect, it } from 'vitest';
import { fromNotice, toNotice } from './mapper';
import { isNewNotice, type NoticeDTO } from './types';

describe('notices mapper', () => {
  describe('toNotice', () => {
    it('snake_case DTO 의 has_image 를 hasImage 로, 나머지는 그대로 옮긴다', () => {
      const dto: NoticeDTO = {
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        has_image: true,
        category: 'songdo',
      };
      expect(toNotice(dto)).toEqual({
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
        category: 'songdo',
      });
    });

    it('has_image false 도 그대로 false 로 매핑', () => {
      const dto: NoticeDTO = {
        id: 1,
        title: 't',
        content: 'c',
        date: '2026-01-01',
        has_image: false,
        category: 'general',
      };
      expect(toNotice(dto).hasImage).toBe(false);
    });

    it('category 는 그대로 통과', () => {
      const dto: NoticeDTO = {
        id: 2,
        title: 't',
        content: 'c',
        date: '2026-05-26',
        has_image: false,
        category: 'sinchon_29',
      };
      expect(toNotice(dto).category).toBe('sinchon_29');
    });
  });

  describe('fromNotice', () => {
    it('camelCase 모델의 hasImage → has_image + category 통과, id/date 는 보내지 않음', () => {
      const result = fromNotice({
        title: 't',
        content: 'c',
        hasImage: true,
        category: 'bluerun',
      });
      expect(result).toEqual({
        title: 't',
        content: 'c',
        has_image: true,
        category: 'bluerun',
      });
    });
  });

  it('round-trip — toNotice(fromNotice + id/date) 는 원본과 동등', () => {
    const original = {
      id: 99,
      title: '왕복 테스트',
      content: '...',
      date: '2026-05-02',
      hasImage: true,
      category: 'sinchon_28' as const,
    };
    // fromNotice 는 id/date 를 빼고 has_image 만 변환 — 백엔드는 id/date 를
    // 별도로 채워서 응답한다는 가정. 그 가정 하에 형태가 round-trip 되는지 확인.
    const dto: NoticeDTO = {
      id: original.id,
      date: original.date,
      ...fromNotice(original),
    };
    expect(toNotice(dto)).toEqual(original);
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
