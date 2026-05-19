/**
 * 부스 메뉴 도메인.
 * 백엔드 Menu 는 부스 임베디드가 아니라 별도 리소스 — `/api/booths/{boothId}/menus`(공개 조회),
 * `/api/admin/booths/{boothId}/menus`(어드민 생성·수정·삭제).
 */

/** 프론트 모델 (camelCase). */
export interface Menu {
  id: number;
  boothId: number;
  name: string;
  description: string;
  /** 원 단위 정수. */
  price: number;
  imageUrl: string | null;
  isSoldOut: boolean;
  /** 부스 내 표시 순서. 백엔드에서 부스 단위 UNIQUE 제약. */
  displayOrder: number;
}

/** 백엔드 응답 DTO (MenuResponse). */
export interface MenuDTO {
  id: number;
  boothId: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isSoldOut: boolean;
  displayOrder: number;
}

/** 메뉴 생성 입력 (MenuCreateRequest). displayOrder 는 api 레이어가 채운다. */
export interface CreateMenuInput {
  name: string;
  description: string;
  price: number;
  isSoldOut: boolean;
}

/** 메뉴 수정 입력 (MenuUpdateRequest — 부분 갱신). */
export interface UpdateMenuInput {
  name?: string;
  description?: string;
  price?: number;
  isSoldOut?: boolean;
}
