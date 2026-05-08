import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockNotices } from '@/mocks/notices';
import { fromNotice, toNotice } from './mapper';
import type { CreateNoticeInput, Notice, NoticeDTO, UpdateNoticeInput } from './types';

// ---- Mock 구현 ----
//
// 같은 세션 동안 추가/수정/삭제가 살아있게 in-memory 복사본을 둔다.
// mockNotices 배열을 직접 mutate 하지 않고 한 단계 떼어 놓는 편이 다른
// 화면에서 mockNotices 를 import 하더라도 영향 없음.

const memory: Notice[] = mockNotices.map((n) => ({ ...n }));

const todayString = () => new Date().toISOString().slice(0, 10);

async function listNoticesMock(): Promise<Notice[]> {
  await new Promise((r) => setTimeout(r, 100));
  return memory.slice();
}

async function createNoticeMock(input: CreateNoticeInput): Promise<Notice> {
  await new Promise((r) => setTimeout(r, 150));
  const nextId = memory.reduce((max, n) => Math.max(max, n.id), 0) + 1;
  const created: Notice = {
    id: nextId,
    title: input.title.trim(),
    content: input.content.trim(),
    hasImage: input.hasImage,
    category: input.category,
    date: todayString(),
  };
  memory.unshift(created);
  return created;
}

async function updateNoticeMock(input: UpdateNoticeInput): Promise<Notice> {
  await new Promise((r) => setTimeout(r, 150));
  const idx = memory.findIndex((n) => n.id === input.id);
  if (idx < 0) throw new Error(`mock: notice ${input.id} 을(를) 찾을 수 없습니다.`);
  const next: Notice = {
    ...memory[idx],
    title: input.title.trim(),
    content: input.content.trim(),
    hasImage: input.hasImage,
    category: input.category,
  };
  memory[idx] = next;
  return next;
}

async function deleteNoticeMock(id: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((n) => n.id === id);
  if (idx >= 0) memory.splice(idx, 1);
}

// ---- 실제 구현 ----

async function listNoticesReal(): Promise<Notice[]> {
  const dtos = await api.get<NoticeDTO[]>('/notices');
  return dtos.map(toNotice);
}

async function createNoticeReal(input: CreateNoticeInput): Promise<Notice> {
  const dto = await api.post<NoticeDTO>('/notices', fromNotice(input));
  return toNotice(dto);
}

async function updateNoticeReal(input: UpdateNoticeInput): Promise<Notice> {
  const { id, ...patch } = input;
  const dto = await api.put<NoticeDTO>(`/notices/${id}`, fromNotice(patch));
  return toNotice(dto);
}

async function deleteNoticeReal(id: number): Promise<void> {
  await api.delete(`/notices/${id}`);
}

// ---- 분기 export ----

export const listNotices = env.USE_MOCK ? listNoticesMock : listNoticesReal;
export const createNotice = env.USE_MOCK ? createNoticeMock : createNoticeReal;
export const updateNotice = env.USE_MOCK ? updateNoticeMock : updateNoticeReal;
export const deleteNotice = env.USE_MOCK ? deleteNoticeMock : deleteNoticeReal;
