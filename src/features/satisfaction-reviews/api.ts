import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockSatisfactionReviews } from '@/mocks/satisfaction-reviews';
import { toSatisfactionReviews } from './mapper';
import type { SatisfactionReviews, SatisfactionReviewsDTO } from './types';

// ---- Mock ----

async function getSatisfactionReviewsMock(): Promise<SatisfactionReviews> {
  await new Promise((r) => setTimeout(r, 150));
  return toSatisfactionReviews(mockSatisfactionReviews);
}

// ---- Real ----

async function getSatisfactionReviewsReal(): Promise<SatisfactionReviews> {
  // 어드민 단일 화면용 — size=100 으로 한 번에 전부 받아 페이지네이션 없이 보여준다.
  // 후기가 100건을 넘으면 page 순회로 확장 필요(현 단계 범위 밖).
  const dto = await api.get<SatisfactionReviewsDTO>('/admin/info/reviews?page=0&size=100');
  return toSatisfactionReviews(dto);
}

// ---- 분기 export ----

export const getSatisfactionReviews = env.USE_MOCK
  ? getSatisfactionReviewsMock
  : getSatisfactionReviewsReal;
