/**
 * Booth 역할 사용자의 "내 부스" mock.
 * 백엔드 붙으면 features/booths/api.ts의 real 구현이 대체.
 *
 * 동시에 Super/Master의 부스 선택 화면(예약 관리 진입 picker)에서도
 * `Object.values(mockBoothsById)` 형태로 부스 목록 소스로 재사용된다.
 *
 * booth_id 1 → 작성 완료된 부스 (데모용)
 * booth_id 2 → 갓 생성된 빈 부스 (작성 전 플로우 확인용)
 * booth_id 3 → 또 다른 작성 완료 부스 (picker 에서 전환 QA 용)
 */

import type { BoothProfile } from '@/features/booths/types';

const filledBooth: BoothProfile = {
  id: 1,
  name: '문헌정보학과 부스',
  organizationName: '연세대학교 문헌정보학과',
  description: '문헌정보학과에서 준비한 맛있는 음식과 즐거운 체험을 즐겨보세요!',
  signatureMenu: '후라이드 치킨',
  operatingHours: '10:00 - 18:00',
  reservationEnabled: true,
  orderNotice: '테이블 이용 시 메인 메뉴를 하나 이상 주문해주셔야 합니다.',
  thumbnails: [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
      isMain: true,
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
      isMain: false,
    },
  ],
  menuItems: [
    { id: 1, order: 1, name: '치킨', description: '바삭한 후라이드 치킨', price: '15,000원', image: null, soldOut: false },
    { id: 2, order: 2, name: '감자튀김', description: '겉바속촉 감자튀김', price: '5,000원', image: null, soldOut: false },
    { id: 3, order: 3, name: '콜라', description: '시원한 콜라', price: '2,000원', image: null, soldOut: true },
  ],
};

const emptyBooth: BoothProfile = {
  id: 2,
  name: '',
  organizationName: '',
  description: '',
  signatureMenu: '',
  operatingHours: '',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [],
  menuItems: [],
};

const secondFilledBooth: BoothProfile = {
  id: 3,
  name: '경영학과 푸드트럭',
  organizationName: '연세대학교 경영학과',
  description: '경영학과 학생회가 운영하는 푸드트럭. 햄버거와 감자튀김을 맛보세요.',
  signatureMenu: '치즈버거',
  operatingHours: '11:00 - 19:00',
  reservationEnabled: true,
  orderNotice: '테이블 이용 시 메뉴 주문 필수.',
  thumbnails: [
    {
      id: 10,
      url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80',
      isMain: true,
    },
  ],
  menuItems: [
    { id: 10, order: 1, name: '치즈버거', description: '더블 치즈버거', price: '8,000원', image: null, soldOut: false },
    { id: 11, order: 2, name: '감자튀김', description: '케이준 양념', price: '4,000원', image: null, soldOut: false },
  ],
};

export const mockBoothsById: Record<number, BoothProfile> = {
  1: filledBooth,
  2: emptyBooth,
  3: secondFilledBooth,
};
