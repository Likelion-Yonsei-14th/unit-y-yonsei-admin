/**
 * 부스(Booth) 도메인 모델.
 *
 * "내 부스" 화면은 Booth 역할 사용자 한 명당 하나의 BoothProfile을 가진다.
 * 이 파일의 타입이 백엔드 DB 스키마 초안 역할을 한다 — 필드 추가/변경 시
 * mapper.ts의 DTO 매핑만 손대면 화면은 그대로.
 */

export interface BoothImage {
  id: number;
  url: string;
  /** 부스 대표 이미지 여부. 하나의 프로필에 정확히 0~1장. */
  isMain: boolean;
}

export interface BoothMenuItem {
  id: number;
  /** 노출 순서 (1부터). 드래그로 재정렬 가능. */
  order: number;
  name: string;
  description: string;
  /** 가격 표기 문자열. "5,000원" 같은 포맷 유지. */
  price: string;
  image: string | null;
  soldOut: boolean;
}

export interface BoothProfile {
  id: number;
  name: string;
  organizationName: string;
  description: string;
  signatureMenu: string;
  operatingHours: string;
  /** 부스 운영 ON/OFF. 예약/주문 받을지 여부. */
  reservationEnabled: boolean;
  orderNotice: string;
  thumbnails: BoothImage[];
  menuItems: BoothMenuItem[];
}

// ---- 백엔드 응답 DTO (snake_case). 스키마 확정되면 보정. ----

export interface BoothImageDTO {
  id: number;
  url: string;
  is_main: boolean;
}

export interface BoothMenuItemDTO {
  id: number;
  order: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  sold_out: boolean;
}

export interface BoothProfileDTO {
  id: number;
  name: string;
  organization_name: string;
  description: string;
  signature_menu: string;
  operating_hours: string;
  reservation_enabled: boolean;
  order_notice: string;
  thumbnails: BoothImageDTO[];
  menu_items: BoothMenuItemDTO[];
}

// ---- 완료 판정 헬퍼 ----
// 기획 합의: 부스 상세는 필수 필드 + 대표 이미지 1장, 메뉴 리스트는
// 저장된 메뉴가 1개 이상이고 모든 아이템에 이름/가격이 채워져 있을 때 "작성 완료".
// (저장된 데이터는 항상 정상 상태여야 한다는 전제 — 빈 필드 메뉴는 저장 단계에서 차단.)

export function isBoothInfoCompleted(b: BoothProfile | null | undefined): boolean {
  if (!b) return false;
  return Boolean(
    b.name &&
    b.organizationName &&
    b.description &&
    b.signatureMenu &&
    b.operatingHours &&
    b.thumbnails.some(t => t.isMain),
  );
}

export function isMenuListCompleted(b: BoothProfile | null | undefined): boolean {
  if (!b) return false;
  return b.menuItems.length > 0 && b.menuItems.every(m => m.name && m.price);
}
