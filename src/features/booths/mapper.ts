import type { Booth, BoothDTO, BoothUpdateDTO } from './types';

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
  instagram: d.instagram,
  isReservable: d.isReservable,
  account: d.account,
  locationId: d.locationId,
  profileComplete: d.profileComplete,
  representativeMenus: d.representativeMenus ?? [],
  waitingCount: d.waitingCount ?? 0,
  thumbnailUrl: d.thumbnailUrl ?? null,
  // 백엔드 tags 도입 전: 응답에 tags 없음 → 빈 배열로 방어.
  tags: d.tags ?? [],
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
  instagram: b.instagram,
  isReservable: b.isReservable,
  account: b.account,
  locationId: b.locationId,
  representativeMenus: b.representativeMenus,
  tags: b.tags,
});
