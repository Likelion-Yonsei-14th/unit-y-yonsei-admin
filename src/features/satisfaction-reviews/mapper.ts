import type {
  RatingDistribution,
  RatingDistributionDTO,
  SatisfactionReviewItem,
  SatisfactionReviewItemDTO,
  SatisfactionReviews,
  SatisfactionReviewsDTO,
} from './types';

const toRatingDistribution = (d: RatingDistributionDTO): RatingDistribution => ({
  oneStarCount: d.oneStarCount,
  twoStarCount: d.twoStarCount,
  threeStarCount: d.threeStarCount,
  fourStarCount: d.fourStarCount,
  fiveStarCount: d.fiveStarCount,
});

const toReviewItem = (d: SatisfactionReviewItemDTO): SatisfactionReviewItem => ({
  rating: d.rating,
  content: d.content,
  // 타임존 없는 문자열 — 가공하지 않고 그대로 보존(파싱은 표시 단계에서 문자열로만).
  createdAt: d.createdAt,
});

export const toSatisfactionReviews = (d: SatisfactionReviewsDTO): SatisfactionReviews => ({
  totalCount: d.totalCount,
  averageRating: d.averageRating,
  ratingDistribution: toRatingDistribution(d.ratingDistribution),
  reviews: d.reviews.content.map(toReviewItem),
});
