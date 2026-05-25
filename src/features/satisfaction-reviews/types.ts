/**
 * 만족도 후기(satisfaction reviews) 도메인 모델.
 * 백엔드 GET /admin/info/reviews 응답 미러. 응답이 이미 camelCase 라 매핑은 얇지만
 * 다른 도메인과 동일하게 DTO↔Model 레이어를 유지한다.
 */
import type { PageResponse } from '@/types/api';

/** 별점 분포 — 1~5점 각 개수. */
export interface RatingDistributionDTO {
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
}

/** 후기 단건 (백엔드 raw). createdAt 은 타임존 없는 ISO LocalDateTime 문자열. */
export interface SatisfactionReviewItemDTO {
  rating: number;
  content: string;
  /** ISO LocalDateTime (타임존 없음), 예: "2026-05-25T02:10:01.056". */
  createdAt: string;
}

/** GET /admin/info/reviews 응답 (봉투 data). */
export interface SatisfactionReviewsDTO {
  totalCount: number;
  averageRating: number;
  ratingDistribution: RatingDistributionDTO;
  reviews: PageResponse<SatisfactionReviewItemDTO>;
}

// ---- 프론트 모델 ----

/** 별점 분포 — 1~5점 각 개수. */
export interface RatingDistribution {
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
}

/** 후기 단건 (프론트 모델). */
export interface SatisfactionReviewItem {
  rating: number;
  content: string;
  /**
   * 타임존 없는 ISO LocalDateTime 문자열을 그대로 보존.
   * ⚠️ new Date() 로 파싱하면 로컬 타임존이 끼어들어 표시가 어긋난다 — 화면에선 문자열만 정리.
   */
  createdAt: string;
}

/** 만족도 후기 집계 + 목록 (프론트 모델). */
export interface SatisfactionReviews {
  totalCount: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
  reviews: SatisfactionReviewItem[];
}
