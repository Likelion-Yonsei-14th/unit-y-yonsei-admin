/**
 * 섹션 = 지도 이미지 1 장 단위의 물리적 구획.
 * - global  → 국제캠 (5/27 전용)
 * - baekyang → 백양로 (5/28, 5/29 공유)
 * - hangeul  → 한글탑 (5/28, 5/29 공유)
 */
export type MapSectionId = 'global' | 'baekyang' | 'hangeul';

export interface MapSection {
  id: MapSectionId;
  label: string;
  imageUrl: string;
  validDates: string[];
  imageAspectRatio: number;
}

/**
 * 백엔드 응답 (snake_case).
 * 좌표·크기는 모두 이미지 기준 0–100 % (리사이즈/해상도에 안전).
 * - id = surrogate PK. 한 운영자(booth_id)가 같은 (date, section)에 자리 여러 개 가능.
 * - (x, y) = 사각형 핀의 **중심점** 좌표.
 * - (width, height) = 사각형 footprint.
 */
export interface BoothPlacementDTO {
  id: number;
  booth_id: number;
  date: string;
  section: MapSectionId;
  booth_number: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 프론트 모델 (camelCase). 매퍼를 거쳐 변환. */
export interface BoothPlacement {
  id: number;
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 슬라이더 카드 렌더용 머지 결과.
 * 페이지 레벨에서 placement + BoothProfile(이름·단체명) + 예약 카운트 집계를 합쳐서 생성.
 */
export interface PickerBooth {
  placement: BoothPlacement;
  profile: { name: string; organizationName: string };
  counts: { waiting: number; completed: number; cancelled: number };
}
