import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockLostItems } from '@/mocks/lost-items';
import { fromLostItem, toLostItem } from './mapper';
import type { CreateLostItemInput, LostItem, LostItemDTO, UpdateLostItemInput } from './types';

const memory: LostItem[] = mockLostItems.map((item) => ({ ...item }));

const todayString = () => new Date().toISOString().slice(0, 10);

async function listLostItemsMock(): Promise<LostItem[]> {
  await new Promise((r) => setTimeout(r, 100));
  return memory.slice();
}

async function createLostItemMock(input: CreateLostItemInput): Promise<LostItem> {
  await new Promise((r) => setTimeout(r, 150));
  const nextId = memory.reduce((max, n) => Math.max(max, n.id), 0) + 1;
  const created: LostItem = {
    id: nextId,
    name: input.name.trim(),
    location: input.location.trim(),
    description: input.description?.trim() || undefined,
    imageUrl: input.imageUrl,
    date: todayString(),
  };
  memory.unshift(created);
  return created;
}

async function updateLostItemMock(input: UpdateLostItemInput): Promise<LostItem> {
  await new Promise((r) => setTimeout(r, 150));
  const idx = memory.findIndex((n) => n.id === input.id);
  if (idx < 0) throw new Error(`mock: lost item ${input.id} 을(를) 찾을 수 없습니다.`);
  const next: LostItem = {
    ...memory[idx],
    name: input.name.trim(),
    location: input.location.trim(),
    description: input.description?.trim() || undefined,
    imageUrl: input.imageUrl,
  };
  memory[idx] = next;
  return next;
}

async function deleteLostItemMock(id: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((n) => n.id === id);
  if (idx >= 0) memory.splice(idx, 1);
}

// ---- 실제 구현 ----

async function listLostItemsReal(): Promise<LostItem[]> {
  const dtos = await api.get<LostItemDTO[]>('/lost-items');
  return dtos.map(toLostItem);
}

async function createLostItemReal(input: CreateLostItemInput): Promise<LostItem> {
  const dto = await api.post<LostItemDTO>('/admin/lost-items', fromLostItem(input));
  return toLostItem(dto);
}

async function updateLostItemReal(input: UpdateLostItemInput): Promise<LostItem> {
  const { id, ...patch } = input;
  const dto = await api.put<LostItemDTO>(`/admin/lost-items/${id}`, fromLostItem(patch));
  return toLostItem(dto);
}

async function deleteLostItemReal(id: number): Promise<void> {
  await api.delete(`/admin/lost-items/${id}`);
}

// ---- 분기 export ----

export const listLostItems = env.USE_MOCK ? listLostItemsMock : listLostItemsReal;
export const createLostItem = env.USE_MOCK ? createLostItemMock : createLostItemReal;
export const updateLostItem = env.USE_MOCK ? updateLostItemMock : updateLostItemReal;
export const deleteLostItem = env.USE_MOCK ? deleteLostItemMock : deleteLostItemReal;
