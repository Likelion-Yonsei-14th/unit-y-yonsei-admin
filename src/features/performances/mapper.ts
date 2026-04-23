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
