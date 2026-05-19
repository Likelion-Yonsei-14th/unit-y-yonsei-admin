/**
 * 부스(Booth) 도메인 모델 — 백엔드 BoothResponse 미러.
 * 필드/케이싱은 백엔드(`~/Desktop/unit-y-yonsei-server` BoothResponse)와 1:1.
 */

/** 백엔드 BoothSector enum. JSON 값도 한글 그대로. */
export type BoothSector = '한글탑' | '백양로' | '송도';

/** 백엔드 BoothStatus enum. */
export type BoothStatus = 'OPEN' | 'CLOSED' | 'PREPARING';

export const BOOTH_STATUS_LABEL: Record<BoothStatus, string> = {
  OPEN: '운영 중',
  CLOSED: '운영 종료',
  PREPARING: '준비 중',
};

/** 프론트 모델 (camelCase). */
export interface Booth {
  id: number;
  adminId: number;
  name: string;
  organization: string;
  description: string;
  /** 축제 일차 1~4. 미입력 null. */
  date: number | null;
  /** 'HH:mm'. 미입력 null. */
  openTime: string | null;
  closeTime: string | null;
  sector: BoothSector | null;
  /** 섹터 내 배치 번호. */
  location: number | null;
  status: BoothStatus;
  isFood: boolean;
  /** 푸드트럭(외부 업체 운영) 여부. */
  isFoodTruck: boolean;
  instagram: string;
  isReservable: boolean;
  account: string;
  /** 부스 공지("오늘 18시 조기 마감" 등). 미입력 null. */
  notice: string | null;
  /** 지도 위치 엔티티 ID. booth-layout 연동용 — 이번 범위에선 읽기만. */
  locationId: number | null;
  /** 백엔드 계산값. organization·date·openTime·closeTime·sector·location 모두 입력 시 true. */
  profileComplete: boolean;
  /** 대표 메뉴 카테고리 목록. 백엔드 representativeMenus. 쓰기 가능. */
  representativeMenus: string[];
  /** 현재 대기 팀 수. 읽기 전용(서버 계산). */
  waitingCount: number;
  /** display_order=1 부스 이미지 URL. 읽기 전용. 업로드는 이번 범위 외. */
  thumbnailUrl: string | null;
  /** 부스 분류 태그. '#' 접두사 포함, 최대 3개. 백엔드 tags 필드 도입 전까지는 항상 []. */
  tags: string[];
}

/**
 * 백엔드 BoothResponse.mapLocation — 부스에 연결된 지도 위치. 미배치면 null.
 * ⚠️ 응답은 평탄 locationId 가 아니라 이 중첩 객체로 내려온다. toBooth 가 id 를 추출.
 */
export interface BoothMapLocationDTO {
  id: number;
  sector: BoothSector | null;
  mapX: number | string;
  mapY: number | string;
  width: number | string | null;
  height: number | string | null;
}

/** 백엔드 응답 DTO (BoothResponse). tags 는 백엔드 도입 전까지 optional. */
export interface BoothDTO {
  id: number;
  adminId: number;
  name: string;
  organization: string;
  description: string;
  date: number | null;
  openTime: string | null;
  closeTime: string | null;
  sector: BoothSector | null;
  location: number | null;
  status: BoothStatus;
  isFood: boolean;
  isFoodTruck: boolean;
  instagram: string;
  isReservable: boolean;
  account: string;
  notice: string | null;
  /** 부스에 연결된 지도 위치. 미배치면 null. locationId 는 mapLocation.id 에서 얻는다. */
  mapLocation: BoothMapLocationDTO | null;
  profileComplete: boolean;
  representativeMenus: string[];
  waitingCount: number;
  thumbnailUrl: string | null;
  tags?: string[];
}

/** PUT /admin/booths/{id} 요청 바디 (BoothUpdateRequest). */
export interface BoothUpdateDTO {
  name: string;
  organization: string | null;
  description: string;
  date: number | null;
  openTime: string | null;
  closeTime: string | null;
  sector: BoothSector | null;
  location: number | null;
  status: BoothStatus;
  isFood: boolean;
  /** 백엔드 BoothUpdateRequest 가 @NotNull 로 요구 — 누락 시 400. */
  isFoodTruck: boolean;
  instagram: string;
  isReservable: boolean;
  account: string;
  locationId: number | null;
  representativeMenus: string[];
  /** 부스 공지. 미전송 시 백엔드가 null 로 덮어쓰므로 반드시 round-trip. */
  notice: string | null;
  /** 백엔드 tags 도입 후 활성. 도입 전엔 백엔드가 무시. */
  tags?: string[];
}
