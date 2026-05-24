import type { Review, ReviewDTO } from './types';

export const toReview = (d: ReviewDTO): Review => ({
  id: d.id,
  performanceTeam: d.performanceName,
  // 셋리스트 미선택 메시지는 songTitle 이 null — 모델은 string 이라 라벨로 메움.
  favoriteSong: d.songTitle ?? '(곡 미선택)',
  message: d.message,
  createdAt: d.createdAt,
  isHidden: d.displayStatus === 'HIDDEN',
});
