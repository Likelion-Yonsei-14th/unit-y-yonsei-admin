import type {
  Performance,
  PerformanceDTO,
  PerformanceImage,
  PerformanceImageDTO,
  PerformanceListItem,
  PerformanceListItemDTO,
  PerformanceUpdateDTO,
  SetlistItem,
  SetlistItemDTO,
} from './types';

/** 'HH:mm:ss' / 'HH:mm' → 'HH:mm'. null 통과. */
const toHm = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

export const toPerformanceListItem = (d: PerformanceListItemDTO): PerformanceListItem => ({
  id: d.id,
  performanceName: d.performanceName,
  lineupName: d.lineupName,
  performanceDate: d.performanceDate,
  startTime: toHm(d.startTime),
  endTime: toHm(d.endTime),
  performanceCategory: d.performanceCategory,
  performanceStatus: d.performanceStatus,
  locationId: d.locationId,
  locationName: d.locationName,
});

export const toPerformance = (d: PerformanceDTO): Performance => ({
  id: d.id,
  performanceName: d.performanceName,
  lineupName: d.lineupName,
  performanceDescription: d.performanceDescription,
  performanceDate: d.performanceDate,
  startTime: toHm(d.startTime),
  endTime: toHm(d.endTime),
  performanceCategory: d.performanceCategory,
  performanceStatus: d.performanceStatus,
  locationId: d.locationId,
  locationName: d.locationName,
  // 미설정 시 백엔드가 null → 빈 문자열로 정규화.
  instagramUrl: d.instagramUrl ?? '',
  youtubeUrl: d.youtubeUrl ?? '',
});

export const toPerformanceImage = (d: PerformanceImageDTO): PerformanceImage => ({
  id: d.id,
  performanceId: d.performanceId,
  imageUrl: d.imageUrl,
  imageOrder: d.imageOrder,
  imageType: d.imageType,
});

export const toSetlistItem = (d: SetlistItemDTO): SetlistItem => ({
  id: d.id,
  performanceId: d.performanceId,
  songTitle: d.songTitle,
  singerName: d.singerName,
  songOrder: d.songOrder,
  note: d.note ?? '',
});

/** Performance 부분 patch → PATCH 요청 바디. 전송된 필드만 매핑. */
export const fromPerformancePatch = (patch: Partial<Performance>): PerformanceUpdateDTO => {
  const dto: PerformanceUpdateDTO = {};
  if ('performanceName' in patch) dto.performanceName = patch.performanceName;
  if ('performanceDescription' in patch) dto.performanceDescription = patch.performanceDescription;
  if ('performanceDate' in patch) dto.performanceDate = patch.performanceDate;
  if ('startTime' in patch) dto.startTime = patch.startTime;
  if ('endTime' in patch) dto.endTime = patch.endTime;
  if ('performanceCategory' in patch) dto.performanceCategory = patch.performanceCategory;
  if ('performanceStatus' in patch) dto.performanceStatus = patch.performanceStatus;
  if ('lineupName' in patch) dto.lineupName = patch.lineupName;
  if ('locationId' in patch) dto.locationId = patch.locationId;
  if ('instagramUrl' in patch) dto.instagramUrl = patch.instagramUrl;
  if ('youtubeUrl' in patch) dto.youtubeUrl = patch.youtubeUrl;
  return dto;
};
