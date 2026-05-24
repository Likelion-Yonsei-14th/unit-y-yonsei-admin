import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockMenusByBooth } from '@/mocks/menus';
import { toMenu } from './mapper';
import type { CreateMenuInput, Menu, MenuDTO, UpdateMenuInput } from './types';

const byOrder = (a: Menu, b: Menu) => a.displayOrder - b.displayOrder;

/** 부스 내 다음 표시 순서 — 현재 최대 + 1. 백엔드 displayOrder 가 부스 단위 UNIQUE 라 새 메뉴는 끝에 붙인다. */
const nextDisplayOrder = (menus: Menu[]): number =>
  menus.reduce((max, m) => Math.max(max, m.displayOrder), 0) + 1;

// ---- Mock ----

const memory: Record<number, Menu[]> = Object.fromEntries(
  Object.entries(mockMenusByBooth).map(([k, list]) => [k, list.map((m) => ({ ...m }))]),
);
let mockSeq = 1000;

async function listMenusMock(boothId: number): Promise<Menu[]> {
  await new Promise((r) => setTimeout(r, 100));
  return (memory[boothId] ?? []).slice().sort(byOrder);
}

async function createMenuMock(boothId: number, input: CreateMenuInput): Promise<Menu> {
  await new Promise((r) => setTimeout(r, 100));
  const list = (memory[boothId] ??= []);
  const menu: Menu = {
    id: ++mockSeq,
    boothId,
    name: input.name,
    description: input.description,
    price: input.price,
    imageUrl: input.imageUrl ?? null,
    isSoldOut: input.isSoldOut,
    displayOrder: nextDisplayOrder(list),
  };
  list.push(menu);
  return { ...menu };
}

async function updateMenuMock(
  boothId: number,
  menuId: number,
  patch: UpdateMenuInput,
): Promise<Menu> {
  await new Promise((r) => setTimeout(r, 100));
  const list = memory[boothId] ?? [];
  const idx = list.findIndex((m) => m.id === menuId);
  if (idx < 0) throw new Error(`mock: menu ${menuId} 을(를) 찾을 수 없습니다.`);
  list[idx] = { ...list[idx], ...patch };
  return { ...list[idx] };
}

async function deleteMenuMock(boothId: number, menuId: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  const list = memory[boothId];
  if (list) memory[boothId] = list.filter((m) => m.id !== menuId);
}

async function reorderMenusMock(boothId: number, menuIds: number[]): Promise<Menu[]> {
  await new Promise((r) => setTimeout(r, 120));
  const byId = new Map((memory[boothId] ?? []).map((m) => [m.id, m]));
  const reordered = menuIds.map((id, i) => {
    const m = byId.get(id);
    if (!m) throw new Error(`mock: menu ${id} 을(를) 찾을 수 없습니다.`);
    return { ...m, displayOrder: i + 1 };
  });
  memory[boothId] = reordered;
  return reordered.map((m) => ({ ...m }));
}

// ---- Real ----

async function listMenusReal(boothId: number): Promise<Menu[]> {
  const dtos = await api.get<MenuDTO[]>(`/booths/${boothId}/menus`);
  return dtos.map(toMenu).sort(byOrder);
}

async function createMenuReal(boothId: number, input: CreateMenuInput): Promise<Menu> {
  // displayOrder 는 부스 단위 UNIQUE — 현재 목록을 읽어 최대 + 1 로 채운다.
  const existing = await listMenusReal(boothId);
  const dto = await api.post<MenuDTO>(`/admin/booths/${boothId}/menus`, {
    name: input.name,
    description: input.description,
    price: input.price,
    imageUrl: input.imageUrl,
    isSoldOut: input.isSoldOut,
    displayOrder: nextDisplayOrder(existing),
  });
  return toMenu(dto);
}

async function updateMenuReal(
  boothId: number,
  menuId: number,
  patch: UpdateMenuInput,
): Promise<Menu> {
  const dto = await api.patch<MenuDTO>(`/admin/booths/${boothId}/menus/${menuId}`, patch);
  return toMenu(dto);
}

async function deleteMenuReal(boothId: number, menuId: number): Promise<void> {
  await api.delete(`/admin/booths/${boothId}/menus/${menuId}`);
}

/** 메뉴 순서 일괄 재배정 — menuIds 순서대로 displayOrder 1..N 재부여. */
async function reorderMenusReal(boothId: number, menuIds: number[]): Promise<Menu[]> {
  const dtos = await api.put<MenuDTO[]>(`/admin/booths/${boothId}/menus/order`, { menuIds });
  return dtos.map(toMenu).sort(byOrder);
}

// ---- 분기 export ----

export const listMenus = env.USE_MOCK ? listMenusMock : listMenusReal;
export const createMenu = env.USE_MOCK ? createMenuMock : createMenuReal;
export const updateMenu = env.USE_MOCK ? updateMenuMock : updateMenuReal;
export const deleteMenu = env.USE_MOCK ? deleteMenuMock : deleteMenuReal;
export const reorderMenus = env.USE_MOCK ? reorderMenusMock : reorderMenusReal;
