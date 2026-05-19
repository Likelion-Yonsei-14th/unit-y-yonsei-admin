/**
 * 지도 위치(MapLocation) 도메인 — 백엔드 MapLocationResponse 미러.
 * 부스 배치는 MapLocation(type=BOOTH) + Booth.locationId 로 표현된다.
 */
import type { BoothSector } from '@/features/booths/types';

/** 백엔드 MapLocationType enum. 편집기는 BOOTH 만 다룬다. */
export type MapLocationType = 'STAGE' | 'BOOTH' | 'ENTRANCE' | 'FACILITY' | 'OTHER';

/** 백엔드 MapDisplayStatus enum. */
export type MapDisplayStatus = 'VISIBLE' | 'HIDDEN';

/**
 * 섹션 = 지도 이미지 1장 단위의 물리 구획.
 * - global  → 국제캠(송도, 5/27)
 * - baekyang → 백양로(5/28·29 공유)
 * - hangeul  → 한글탑(5/28·29 공유)
 */
export type MapSectionId = 'global' | 'baekyang' | 'hangeul';

export interface MapSection {
  id: MapSectionId;
  label: string;
  imageUrl: string;
  validDates: string[];
  imageAspectRatio: number;
}

/** Spring Data PageResponse 미러 (목록 응답 래퍼). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/** 백엔드 응답 DTO (MapLocationResponse). 좌표는 BigDecimal → JSON 에서 number|string. */
export interface MapLocationDTO {
  id: number;
  locationName: string;
  sector: string;
  mapX: number | string;
  mapY: number | string;
  width: number | string | null;
  height: number | string | null;
  locationType: MapLocationType;
  displayOrder: number;
  displayStatus: MapDisplayStatus;
  createdAt: string;
  updatedAt: string;
}

/** 프론트 모델 (camelCase, 좌표 number 정규화). */
export interface MapLocation {
  id: number;
  locationName: string;
  sector: BoothSector;
  mapX: number;
  mapY: number;
  width: number | null;
  height: number | null;
  locationType: MapLocationType;
  displayOrder: number;
  displayStatus: MapDisplayStatus;
}

/**
 * 편집기 캔버스·예약 picker 가 공유하는 배치 박스 뷰모델.
 * MapLocation + Booth 를 페이지 레벨에서 조인해 만든다.
 * 좌표 필드명이 x/y/width/height 인 이유 — 캔버스 드래그·리사이즈 기하 코드가 이 이름에 의존.
 */
export interface PlacementBox {
  /** MapLocation.id — 좌표 수정·삭제 mutation 키. */
  locationId: number;
  /** 이 슬롯을 점유한 Booth.id. */
  boothId: number;
  /** 핀 라벨 — Booth.location(섹터 내 번호) 문자열화. 없으면 '?'. */
  boothNumber: string;
  section: MapSectionId;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 예약 picker 슬라이더 카드 렌더용 머지 결과. */
export interface PickerBooth {
  placement: PlacementBox;
  profile: { name: string; organization: string };
  counts: { waiting: number; completed: number; cancelled: number };
}

/**
 * 섹션별 새 부스 자리 기본 크기(%) — width/height 미지정 자리의 폴백이자
 * 편집기 신규 배치의 초기 크기. 섹션마다 부스 규격이 달라 분리한다.
 * 송도(국제캠)는 지도 비율상 세로가 더 긴 규격.
 */
export const DEFAULT_BOX_SIZE_BY_SECTION: Record<MapSectionId, { width: number; height: number }> =
  {
    global: { width: 3.606, height: 4.456 },
    baekyang: { width: 5, height: 1 },
    hangeul: { width: 5.059, height: 6.272 },
  };
