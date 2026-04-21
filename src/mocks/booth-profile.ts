/**
 * Booth 권한 사용자의 "내 부스" mock.
 * 백엔드 붙으면 useMyBooth() 훅이 이 자리를 대체.
 */

export interface MenuItem {
  id: number;
  order: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  soldOut: boolean;
}

export interface BoothProfile {
  name: string;
  organizationName: string;
  description: string;
  signatureMenu: string;
  operatingHours: string;
  orderNotice: string;
}

export const mockBoothProfile: BoothProfile = {
  name: '문헌정보학과 부스',
  organizationName: '연세대학교 문헌정보학과',
  description: '문헌정보학과에서 준비한 맛있는 음식과 즐거운 체험을 즐겨보세요!',
  signatureMenu: '후라이드 치킨',
  operatingHours: '10:00 - 18:00',
  orderNotice: '테이블 이용 시 메인 메뉴를 하나 이상 주문해주셔야 합니다.',
};

export const mockMenuItems: MenuItem[] = [
  { id: 1, order: 1, name: '치킨', description: '바삭한 후라이드 치킨', price: '15,000원', image: null, soldOut: false },
  { id: 2, order: 2, name: '감자튀김', description: '겉바속촉 감자튀김', price: '5,000원', image: null, soldOut: false },
  { id: 3, order: 3, name: '콜라', description: '시원한 콜라', price: '2,000원', image: null, soldOut: true },
];
