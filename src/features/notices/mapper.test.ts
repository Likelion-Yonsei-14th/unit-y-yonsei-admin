import { describe, expect, it } from 'vitest';
import { fromNotice, toNotice } from './mapper';
import type { NoticeDTO } from './types';

describe('notices mapper', () => {
  describe('toNotice', () => {
    it('snake_case DTO 의 has_image 를 hasImage 로, 나머지는 그대로 옮긴다', () => {
      const dto: NoticeDTO = {
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        has_image: true,
      };
      expect(toNotice(dto)).toEqual({
        id: 7,
        title: '제목',
        content: '본문',
        date: '2026-05-01',
        hasImage: true,
      });
    });

    it('has_image false 도 그대로 false 로 매핑', () => {
      const dto: NoticeDTO = {
        id: 1,
        title: 't',
        content: 'c',
        date: '2026-01-01',
        has_image: false,
      };
      expect(toNotice(dto).hasImage).toBe(false);
    });
  });

  describe('fromNotice', () => {
    it('camelCase 모델의 hasImage → has_image, id/date 는 보내지 않음', () => {
      const result = fromNotice({ title: 't', content: 'c', hasImage: true });
      expect(result).toEqual({ title: 't', content: 'c', has_image: true });
    });
  });

  it('round-trip — toNotice(fromNotice + id/date) 는 원본과 동등', () => {
    const original = {
      id: 99,
      title: '왕복 테스트',
      content: '...',
      date: '2026-05-02',
      hasImage: true,
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
