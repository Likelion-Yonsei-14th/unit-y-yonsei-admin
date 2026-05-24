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
  const dtos = await api.get<ReviewDTO[]>('/admin/performances/cheer-messages');
  return dtos.map(toReview);
}

// TODO(BAC follow-up): 아래 두 mutation 의 SUPER·MASTER 어드민 엔드포인트는 아직 백엔드에
// 없다(현재 백엔드는 PERFORMER 본인 공연용 /me 만 보유). 페이지의 숨김/삭제 버튼은 이 엔드포인트가
// 생기기 전까지 실패 toast 로 떨어진다 — 별도 티켓에서 경로/의미(숨김 토글 vs 영구삭제) 확정.
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
