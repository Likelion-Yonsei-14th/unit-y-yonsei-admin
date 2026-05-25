import type {
  Booth,
  BoothCreateDTO,
  BoothCreateInput,
  BoothDTO,
  BoothImage,
  BoothImageDTO,
  BoothUpdateDTO,
} from './types';

/** 'HH:mm:ss' / 'HH:mm' 어느 쪽이든 'HH:mm' 으로 정규화. null 통과. */
const toHm = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

export const toBooth = (d: BoothDTO): Booth => ({
  id: d.id,
  adminId: d.adminId,
  name: d.name,
  organization: d.organization,
  description: d.description,
  date: d.date,
  openTime: toHm(d.openTime),
  closeTime: toHm(d.closeTime),
  sector: d.sector,
  location: d.location,
  status: d.status,
  isFood: d.isFood,
  isFoodTruck: d.isFoodTruck ?? false,
  instagram: d.instagram,
  isReservable: d.isReservable,
  account: d.account,
  notice: d.notice ?? null,
  // 백엔드는 평탄 locationId 가 아니라 중첩 mapLocation 객체로 내려준다.
  locationId: d.mapLocation?.id ?? null,
  profileComplete: d.profileComplete,
  representativeMenus: d.representativeMenus ?? [],
  waitingCount: d.waitingCount ?? 0,
  thumbnailUrl: d.thumbnailUrl ?? null,
  // 백엔드 tags 도입 전: 응답에 tags 없음 → 빈 배열로 방어.
  tags: d.tags ?? [],
});

/**
 * BoothCreateInput → POST /admin/booths 요청 바디.
 * 폼에서 비운 optional 필드는 null/빈배열로 정규화(백엔드는 생략값을 nullable 로 받음).
 * 빈 문자열도 null 로 보정해 update 흐름(fromBooth)과 동일한 round-trip 의미를 맞춘다.
 */
export const fromBoothCreate = (input: BoothCreateInput): BoothCreateDTO => ({
  adminId: input.adminId,
  name: input.name,
  organization: input.organization?.trim() ? input.organization : null,
  description: input.description?.trim() ? input.description : null,
  date: input.date ?? null,
  openTime: input.openTime ?? null,
  closeTime: input.closeTime ?? null,
  sector: input.sector ?? null,
  location: input.location ?? null,
  status: input.status,
  isFood: input.isFood,
  instagram: input.instagram?.trim() ? input.instagram : null,
  isReservable: input.isReservable,
  account: input.account?.trim() ? input.account : null,
  locationId: input.locationId ?? null,
  representativeMenus: input.representativeMenus ?? [],
  isFoodTruck: input.isFoodTruck,
  notice: input.notice ?? null,
});

/** 백엔드 BoothImageResponse → 프론트 BoothImage 모델. */
export const toBoothImage = (d: BoothImageDTO): BoothImage => ({
  id: d.id,
  boothId: d.boothId,
  imageUrl: d.imageUrl,
  displayOrder: d.displayOrder,
});

/** Booth 모델 → PUT /admin/booths/{id} 요청 바디. id/adminId/profileComplete 는 전송 제외. */
export const fromBooth = (b: Booth): BoothUpdateDTO => ({
  name: b.name,
  organization: b.organization || null,
  description: b.description,
  date: b.date,
  openTime: b.openTime,
  closeTime: b.closeTime,
  sector: b.sector,
  location: b.location,
  status: b.status,
  isFood: b.isFood,
  isFoodTruck: b.isFoodTruck,
  instagram: b.instagram,
  isReservable: b.isReservable,
  account: b.account,
  locationId: b.locationId,
  representativeMenus: b.representativeMenus,
  notice: b.notice,
  tags: b.tags,
});
