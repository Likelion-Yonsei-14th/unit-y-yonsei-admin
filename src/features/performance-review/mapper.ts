import type { Review, ReviewDTO } from './types';

export const toReview = (d: ReviewDTO): Review => ({
  id: d.id,
  performanceTeam: d.performanceName,
  // null(셋리스트 미선택)을 그대로 보존 — 표시 라벨/통계 제외는 화면 레이어 책임.
  favoriteSong: d.songTitle,
  message: d.message,
  createdAt: d.createdAt,
  isHidden: d.displayStatus === 'HIDDEN',
});
