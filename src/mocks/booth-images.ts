/**
 * 부스 다중 이미지 mock 풀. boothId → BoothImage[] (displayOrder 오름차순).
 * 백엔드 BoothImageResponse 형태(features/booths/types.ts BoothImage)와 동일.
 *
 * 작성 완료 부스(booth-profile.ts 의 1·3·4 등) 일부에만 시드를 둔다.
 * displayOrder=1 이 썸네일(BoothResponse.thumbnailUrl 과 같은 의미).
 * api 의 add/update/delete mock 이 이 객체를 직접 변형(mutate)한다.
 */
import type { BoothImage } from '@/features/booths/types';

const IMG = (seed: string) => `https://images.unsplash.com/${seed}?w=800&q=80`;

const seeds: BoothImage[] = [
  { id: 101, boothId: 1, imageUrl: IMG('photo-1555939594-58d7cb561ad1'), displayOrder: 1 },
  { id: 102, boothId: 1, imageUrl: IMG('photo-1606755962773-d324e0a13086'), displayOrder: 2 },
  { id: 103, boothId: 1, imageUrl: IMG('photo-1513104890138-7c749659a591'), displayOrder: 3 },
  { id: 104, boothId: 3, imageUrl: IMG('photo-1550547660-d9450f859349'), displayOrder: 1 },
  { id: 105, boothId: 3, imageUrl: IMG('photo-1571091718767-18b5b1457add'), displayOrder: 2 },
  { id: 106, boothId: 4, imageUrl: IMG('photo-1612392061787-2d078b3e573b'), displayOrder: 1 },
];

/** boothId → BoothImage[]. displayOrder 오름차순 정렬은 listBoothImagesMock 이 보장. */
export const mockBoothImagesByBoothId: Record<number, BoothImage[]> = seeds.reduce(
  (acc, img) => {
    (acc[img.boothId] ??= []).push(img);
    return acc;
  },
  {} as Record<number, BoothImage[]>,
);

/** mock add 시 부여할 다음 이미지 id. 시드 최대값 + 1 부터 단조 증가. */
let nextMockImageId = Math.max(0, ...seeds.map((s) => s.id)) + 1;
export const allocateMockBoothImageId = (): number => nextMockImageId++;
