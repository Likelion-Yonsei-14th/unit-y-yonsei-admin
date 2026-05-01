import type { Review, ReviewDTO } from './types';

export const toReview = (d: ReviewDTO): Review => ({
  id: d.id,
  performanceTeam: d.performance_team,
  favoriteSong: d.favorite_song,
  message: d.message,
  createdAt: d.created_at,
  isHidden: d.is_hidden,
});
