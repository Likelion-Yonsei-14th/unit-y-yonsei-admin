/**
 * 만족도 후기 mock fixture.
 * 백엔드 GET /admin/info/reviews 응답 형태(features/satisfaction-reviews/types.ts
 * SatisfactionReviewsDTO)와 동일. avg ~4.2, 1~5점 분포, 8건의 다양한 후기.
 * createdAt 은 백엔드처럼 타임존 없는 ISO LocalDateTime 문자열.
 */
import type { SatisfactionReviewsDTO } from '@/features/satisfaction-reviews/types';

export const mockSatisfactionReviews: SatisfactionReviewsDTO = {
  totalCount: 8,
  averageRating: 4.25,
  ratingDistribution: {
    oneStarCount: 0,
    twoStarCount: 1,
    threeStarCount: 1,
    fourStarCount: 1,
    fiveStarCount: 5,
  },
  reviews: {
    content: [
      {
        rating: 5,
        content: '백양로 부스 진짜 알차고 먹거리도 다양했어요. 내년에도 꼭 올게요!',
        createdAt: '2026-05-29T21:42:11.204',
      },
      {
        rating: 5,
        content: '워터슬라이드 너무 재밌었습니다. 송도캠 액티비티 최고였어요 ㅎㅎ',
        createdAt: '2026-05-27T18:05:33.870',
      },
      {
        rating: 4,
        content: '공연 라인업이 좋았어요. 다만 대기줄 안내가 조금만 더 명확했으면 좋겠습니다.',
        createdAt: '2026-05-28T20:13:47.012',
      },
      {
        rating: 5,
        content: '예약 시스템 덕분에 줄 안 서고 편하게 즐겼습니다. 운영진 감사합니다!',
        createdAt: '2026-05-28T16:28:09.553',
      },
      {
        rating: 3,
        content: '전반적으로 만족하지만 부스 위치 찾기가 좀 헷갈렸어요. 배치도가 더 잘 보였으면.',
        createdAt: '2026-05-29T14:51:22.318',
      },
      {
        rating: 5,
        content: 'UNIT:Y 테마 너무 예뻤어요. 사진 찍을 곳이 많아서 좋았습니다.',
        createdAt: '2026-05-29T19:37:55.640',
      },
      {
        rating: 2,
        content: '저녁 시간대에 사람이 너무 몰려서 동선이 복잡했어요. 인원 분산이 아쉬웠습니다.',
        createdAt: '2026-05-28T21:09:14.781',
      },
      {
        rating: 5,
        content: '블루런부터 마지막 공연까지 다 챙겨봤네요. 3일 내내 즐거웠습니다 :)',
        createdAt: '2026-05-26T10:22:40.197',
      },
    ],
    page: 0,
    size: 100,
    totalElements: 8,
    totalPages: 1,
    hasNext: false,
  },
};
