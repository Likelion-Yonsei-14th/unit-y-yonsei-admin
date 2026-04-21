/**
 * Booth 역할 사용자의 "내 부스" mock.
 * 백엔드 붙으면 features/booths/api.ts의 real 구현이 대체.
 *
 * booth_id 1 → 작성 완료된 부스 (데모용)
 * booth_id 2 → 갓 생성된 빈 부스 (작성 전 플로우 확인용)
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

export const mockBoothsById: Record<number, BoothProfile> = {
  1: filledBooth,
  2: emptyBooth,
};
