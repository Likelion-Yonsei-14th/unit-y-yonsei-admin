import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockSatisfactionReviews } from '@/mocks/satisfaction-reviews';
import { toSatisfactionReviews } from './mapper';
import type {
  SatisfactionReviewItemDTO,
  SatisfactionReviews,
  SatisfactionReviewsDTO,
} from './types';

// ---- Mock ----

async function getSatisfactionReviewsMock(): Promise<SatisfactionReviews> {
  await new Promise((r) => setTimeout(r, 150));
  return toSatisfactionReviews(mockSatisfactionReviews);
}

// ---- Real ----

async function getSatisfactionReviewsReal(): Promise<SatisfactionReviews> {
  // 어드민 단일 화면용 — 페이지 순회로 후기를 전부 수집해 한 번에 보여준다.
  // 응답이 집계({totalCount, averageRating, ratingDistribution}) + reviews 페이지로
  // 구성돼있어 집계는 첫 페이지 응답을 정본으로 쓰고 content 만 이어붙인다.
  // listBoothsReal·listMapLocationsReal 와 동일한 가드(totalPages 상한 + MAX_PAGES
  // + content 빈 응답) 로 잘못된 응답에서의 요청 폭주를 차단한다. 이전엔 size=100
  // 단일 페이지 고정이라 후기가 100건을 넘으면 뒤쪽이 조용히 누락됐다.
  const PAGE_SIZE = 100;
  const MAX_PAGES = 50; // 안전 상한(후기 5000개)
  const allItems: SatisfactionReviewItemDTO[] = [];
  let first: SatisfactionReviewsDTO | null = null;
  let pageIdx = 0;
  let totalPages = 1;
  while (pageIdx < totalPages && pageIdx < MAX_PAGES) {
    const res = await api.get<SatisfactionReviewsDTO>(
      `/admin/info/reviews?page=${pageIdx}&size=${PAGE_SIZE}`,
    );
    if (first === null) first = res;
    allItems.push(...res.reviews.content);
    totalPages = res.reviews.totalPages;
    if (!res.reviews.hasNext || res.reviews.content.length === 0) break;
    pageIdx += 1;
  }
  // MAX_PAGES >= 1 이라 first 가 null 일 수 없지만, 타입상 가드.
  if (first === null) {
    return toSatisfactionReviews(
      await api.get<SatisfactionReviewsDTO>('/admin/info/reviews?page=0&size=1'),
    );
  }
  // 집계는 첫 페이지 응답 그대로, reviews.content 만 누적본으로 갈아끼운다.
  return toSatisfactionReviews({
    ...first,
    reviews: { ...first.reviews, content: allItems },
  });
}

// ---- 분기 export ----

export const getSatisfactionReviews = env.USE_MOCK
  ? getSatisfactionReviewsMock
  : getSatisfactionReviewsReal;
