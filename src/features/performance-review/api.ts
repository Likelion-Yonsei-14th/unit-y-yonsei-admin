import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockReviews } from '@/mocks/performance-reviews';
import { toReview } from './mapper';
import type { Review, ReviewDTO } from './types';

const memory: Review[] = mockReviews.map((r) => ({ ...r }));

async function listReviewsMock(): Promise<Review[]> {
  await new Promise((r) => setTimeout(r, 100));
  return memory.slice();
}

async function setReviewHiddenMock(input: { id: number; isHidden: boolean }): Promise<Review> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((r) => r.id === input.id);
  if (idx < 0) throw new Error(`mock: review ${input.id} 을(를) 찾을 수 없습니다.`);
  memory[idx] = { ...memory[idx], isHidden: input.isHidden };
  return memory[idx];
}

async function deleteReviewMock(id: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((r) => r.id === id);
  if (idx >= 0) memory.splice(idx, 1);
}

// ---- 실제 구현 ----

async function listReviewsReal(): Promise<Review[]> {
  const dtos = await api.get<ReviewDTO[]>('/performance-reviews');
  return dtos.map(toReview);
}

async function setReviewHiddenReal(input: { id: number; isHidden: boolean }): Promise<Review> {
  const dto = await api.patch<ReviewDTO>(`/performance-reviews/${input.id}`, {
    is_hidden: input.isHidden,
  });
  return toReview(dto);
}

async function deleteReviewReal(id: number): Promise<void> {
  await api.delete(`/performance-reviews/${id}`);
}

// ---- 분기 export ----

export const listReviews = env.USE_MOCK ? listReviewsMock : listReviewsReal;
export const setReviewHidden = env.USE_MOCK ? setReviewHiddenMock : setReviewHiddenReal;
export const deleteReview = env.USE_MOCK ? deleteReviewMock : deleteReviewReal;
