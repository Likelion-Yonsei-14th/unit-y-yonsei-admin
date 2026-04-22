import globalImg from '@/assets/map/global-section.jpg';
import baekyangImg from '@/assets/map/baekyang-section.jpg';
import hangeulImg from '@/assets/map/hangeul-section.jpg';
import type { MapSection, MapSectionId } from './types';

export const MAP_SECTIONS: Record<MapSectionId, MapSection> = {
  global:   { id: 'global',   label: '국제캠', imageUrl: globalImg,   validDates: ['2026-05-27'], imageAspectRatio: 3420 / 2728 },
  baekyang: { id: 'baekyang', label: '백양로', imageUrl: baekyangImg, validDates: ['2026-05-28', '2026-05-29'], imageAspectRatio: 1272 / 4524 },
  hangeul:  { id: 'hangeul',  label: '한글탑', imageUrl: hangeulImg,  validDates: ['2026-05-28', '2026-05-29'], imageAspectRatio: 1272 / 1016 },
};

/** 축제 운영일. 순서 = 사용자 기본 선택 우선순위 (첫 요소가 default). */
export const FESTIVAL_DATES = ['2026-05-27', '2026-05-28', '2026-05-29'] as const;

export type FestivalDate = typeof FESTIVAL_DATES[number];

/**
 * focusedBooth 가 없을 때(=해당 날짜에 배치 0 개 등) 배경으로 띄울 fallback 섹션.
 * 5/27 → 국제캠, 그 외 → 백양로.
 */
export function fallbackSectionFor(date: string): MapSection {
  if (date === '2026-05-27') return MAP_SECTIONS.global;
  return MAP_SECTIONS.baekyang;
}
