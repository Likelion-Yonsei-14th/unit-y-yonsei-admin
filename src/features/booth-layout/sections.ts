import globalImg from '@/assets/map/global-section.jpg';
import baekyangImg from '@/assets/map/baekyang-section.jpg';
import hangeulImg from '@/assets/map/hangeul-section.jpg';
import type { BoothSector } from '@/features/booths/types';
import type { MapSection, MapSectionId } from './types';

export const MAP_SECTIONS: Record<MapSectionId, MapSection> = {
  global: {
    id: 'global',
    label: '국제캠',
    imageUrl: globalImg,
    validDates: ['2026-05-27'],
    imageAspectRatio: 3420 / 2728,
  },
  baekyang: {
    id: 'baekyang',
    label: '백양로',
    imageUrl: baekyangImg,
    validDates: ['2026-05-28', '2026-05-29'],
    imageAspectRatio: 1272 / 4524,
  },
  hangeul: {
    id: 'hangeul',
    label: '한글탑',
    imageUrl: hangeulImg,
    validDates: ['2026-05-28', '2026-05-29'],
    imageAspectRatio: 1272 / 1016,
  },
};

/** 축제 운영일. 순서 = 사용자 기본 선택 우선순위 (첫 요소가 default). */
export const FESTIVAL_DATES = ['2026-05-27', '2026-05-28', '2026-05-29'] as const;

export type FestivalDate = (typeof FESTIVAL_DATES)[number];

/**
 * focusedBooth 가 없을 때(=해당 날짜에 배치 0 개 등) 배경으로 띄울 fallback 섹션.
 * 5/27 → 국제캠, 그 외 → 백양로.
 */
export function fallbackSectionFor(date: string): MapSection {
  if (date === '2026-05-27') return MAP_SECTIONS.global;
  return MAP_SECTIONS.baekyang;
}

/** 해당 날짜에 유효한 섹션들을 nav 정의 순(global → baekyang → hangeul)으로 반환. */
export function sectionsValidFor(date: string): MapSectionId[] {
  return (Object.values(MAP_SECTIONS) as Array<(typeof MAP_SECTIONS)[MapSectionId]>)
    .filter((s) => s.validDates.includes(date))
    .map((s) => s.id);
}

/** MapLocation.sector(한글탑/백양로/송도) → 지도 이미지 섹션 키. */
export const sectionForSector: Record<BoothSector, MapSectionId> = {
  송도: 'global',
  백양로: 'baekyang',
  한글탑: 'hangeul',
};

/**
 * 축제 일차(Booth.date) ↔ 캘린더 날짜.
 * day 1 = 5/26(블루런, 부스 없음)이라 layout UI 는 day 2~4 만 쓴다.
 */
const DATE_BY_DAY: Record<number, string> = {
  2: '2026-05-27',
  3: '2026-05-28',
  4: '2026-05-29',
};

/** ISO 날짜 → 축제 일차. 매칭 없으면 null. */
export function dayForDate(date: string): number | null {
  const found = Object.entries(DATE_BY_DAY).find(([, iso]) => iso === date);
  return found ? Number(found[0]) : null;
}

/** 축제 일차 → ISO 날짜. 매칭 없으면 null. */
export function dateForDay(day: number | null): string | null {
  return day != null ? (DATE_BY_DAY[day] ?? null) : null;
}
