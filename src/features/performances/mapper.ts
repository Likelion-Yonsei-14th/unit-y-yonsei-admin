import type {
  PerformanceDetail, PerformanceDetailDTO,
  PerformanceListItem, PerformanceListItemDTO,
  PerformanceImage, PerformanceImageDTO,
  SetlistItem, SetlistItemDTO,
} from './types';

export const toPerformanceListItem = (d: PerformanceListItemDTO): PerformanceListItem => ({
  teamId: d.team_id,
  teamName: d.team_name,
  date: d.date,
  stage: d.stage,
  startTime: d.start_time,
  endTime: d.end_time,
  mainPhotoUrl: d.main_photo_url,
});

const toSetlistItem = (d: SetlistItemDTO): SetlistItem => ({
  id: d.id,
  order: d.order,
  songName: d.song_name,
  artist: d.artist,
});

const toPerformanceImage = (d: PerformanceImageDTO): PerformanceImage => ({
  id: d.id,
  url: d.url,
  isMain: d.is_main,
});

export const toPerformanceDetail = (d: PerformanceDetailDTO): PerformanceDetail => ({
  teamId: d.team_id,
  teamName: d.team_name,
  description: d.description,
  instagramUrl: d.instagram_url,
  youtubeUrl: d.youtube_url,
  date: d.date,
  stage: d.stage,
  startTime: d.start_time,
  endTime: d.end_time,
  images: d.images.map(toPerformanceImage),
  setlist: d.setlist.map(toSetlistItem),
});

const fromSetlistItem = (s: SetlistItem): SetlistItemDTO => ({
  id: s.id,
  order: s.order,
  song_name: s.songName,
  artist: s.artist,
});

const fromPerformanceImage = (i: PerformanceImage): PerformanceImageDTO => ({
  id: i.id,
  url: i.url,
  is_main: i.isMain,
});

/**
 * 부분 업데이트 payload — 전송된 필드만 snake_case 로 매핑.
 * teamId 는 URL 파라미터로만 보내므로 의도적으로 누락한다.
 */
export const fromPerformanceDetailPatch = (
  patch: Partial<PerformanceDetail>,
): Partial<PerformanceDetailDTO> => {
  const dto: Partial<PerformanceDetailDTO> = {};
  if ('teamName' in patch && patch.teamName !== undefined) dto.team_name = patch.teamName;
  if ('description' in patch && patch.description !== undefined) dto.description = patch.description;
  if ('instagramUrl' in patch && patch.instagramUrl !== undefined) dto.instagram_url = patch.instagramUrl;
  if ('youtubeUrl' in patch && patch.youtubeUrl !== undefined) dto.youtube_url = patch.youtubeUrl;
  if ('date' in patch && patch.date !== undefined) dto.date = patch.date;
  if ('stage' in patch && patch.stage !== undefined) dto.stage = patch.stage;
  if ('startTime' in patch && patch.startTime !== undefined) dto.start_time = patch.startTime;
  if ('endTime' in patch && patch.endTime !== undefined) dto.end_time = patch.endTime;
  if ('images' in patch && patch.images !== undefined) dto.images = patch.images.map(fromPerformanceImage);
  if ('setlist' in patch && patch.setlist !== undefined) dto.setlist = patch.setlist.map(fromSetlistItem);
  return dto;
};
