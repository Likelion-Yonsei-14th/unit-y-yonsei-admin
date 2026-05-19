/**
 * 부스 메뉴 mock.
 * boothId → 메뉴 목록. mocks/booth-profile.ts 의 음식 부스(isFood=true) id 와 묶인다.
 * 메뉴 카드는 isFood 부스에만 뜨므로, 작성완료/필요 두 케이스를 위해
 *  - boothId 1(문헌정보학과, 음식) : 메뉴 작성 완료 시드
 *  - 그 외 음식 부스 : 빈 목록(작성 전 플로우)
 */
import type { Menu } from '@/features/menus/types';

const seeds: Menu[] = [
  {
    id: 101,
    boothId: 1,
    name: '후라이드 치킨',
    description: '바삭하게 튀긴 한 마리 치킨.',
    price: 18000,
    imageUrl: null,
    isSoldOut: false,
    displayOrder: 1,
  },
  {
    id: 102,
    boothId: 1,
    name: '양념 치킨',
    description: '매콤달콤 양념 치킨.',
    price: 19000,
    imageUrl: null,
    isSoldOut: false,
    displayOrder: 2,
  },
  {
    id: 103,
    boothId: 1,
    name: '콜라 (500ml)',
    description: '시원한 탄산음료.',
    price: 2000,
    imageUrl: null,
    isSoldOut: true,
    displayOrder: 3,
  },
];

/** boothId → 메뉴 목록. api 레이어가 in-memory 복사로 mutation 을 반영한다. */
export const mockMenusByBooth: Record<number, Menu[]> = seeds.reduce<Record<number, Menu[]>>(
  (acc, m) => {
    (acc[m.boothId] ??= []).push(m);
    return acc;
  },
  {},
);
