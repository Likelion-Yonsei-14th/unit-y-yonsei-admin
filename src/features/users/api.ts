import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockUsers } from '@/mocks/users';
import {
  fromCreateUserFormValues,
  toAdminUser,
  toCreatedUser,
  toResetPasswordResult,
} from './mapper';
import type { CreateUserFormValues } from './schema';
import type {
  AdminUser,
  AdminUserDTO,
  CreatedUser,
  CreatedUserDTO,
  ResetPasswordDTO,
  ResetPasswordResult,
} from './types';

/**
 * Mock 임시 비밀번호 생성기.
 * 12자 영숫자 — 헷갈리는 글자(0/O, 1/l/I) 제외해 운영자가 사용자에게 구두/메신저로
 * 전달할 때 오해 줄임. 백엔드 정책 확정 전 임시값.
 */
function generateMockTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const memory: AdminUser[] = mockUsers.map((u) => ({ ...u }));

// ---- list / mutations (mock) ----

async function listAdminUsersMock(): Promise<AdminUser[]> {
  await new Promise((r) => setTimeout(r, 100));
  return memory.slice();
}

async function resetUserPasswordMock(input: { id: number }): Promise<ResetPasswordResult> {
  await new Promise((r) => setTimeout(r, 200));
  const idx = memory.findIndex((u) => u.id === input.id);
  if (idx < 0) throw new Error(`mock: user ${input.id} 을(를) 찾을 수 없습니다.`);
  return { tempPassword: generateMockTempPassword() };
}

async function createUserMock(values: CreateUserFormValues): Promise<CreatedUser> {
  await new Promise((r) => setTimeout(r, 300));
  const id = Date.now();
  // mock 환경에서도 invalidate 후 새 항목이 목록에 보이도록 in-memory 풀에 반영.
  const newAdminUser: AdminUser = {
    id,
    userId: values.userId,
    role: values.permissionType,
    affiliation: values.affiliation,
    boothId: null,
    boothName: values.permissionType === 'Booth' ? (values.boothName?.trim() ?? '') : '-',
    performanceTeamId: null,
    performanceTeamName:
      values.permissionType === 'Performer' ? (values.performanceTeamName?.trim() ?? '') : '-',
    representative: values.representativeName,
    email: '',
    phone: values.representativePhone,
    infoCompleted: false,
  };
  memory.unshift(newAdminUser);
  return { id, userId: values.userId };
}

async function deleteUserMock(input: { id: number }): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  const idx = memory.findIndex((u) => u.id === input.id);
  if (idx >= 0) memory.splice(idx, 1);
}

// ---- list / mutations (real) ----

async function listAdminUsersReal(): Promise<AdminUser[]> {
  const dtos = await api.get<AdminUserDTO[]>('/admin/users');
  return dtos.map(toAdminUser);
}

async function createUserReal(values: CreateUserFormValues): Promise<CreatedUser> {
  const dto = await api.post<CreatedUserDTO>('/admin/users', fromCreateUserFormValues(values));
  return toCreatedUser(dto);
}

async function resetUserPasswordReal(input: { id: number }): Promise<ResetPasswordResult> {
  // body 없음. 백엔드 reset-password 엔드포인트는 현재 구현 중.
  const dto = await api.post<ResetPasswordDTO>(`/admin/users/${input.id}/reset-password`);
  return toResetPasswordResult(dto);
}

/**
 * 계정 삭제 — Super 가 Master/Booth/Performer 계정을 제거.
 * ⚠️ 백엔드 Swagger 에 DELETE /admin/users/{id} 가 아직 없음 (백엔드 추가 요청 항목).
 */
async function deleteUserReal(input: { id: number }): Promise<void> {
  await api.delete(`/admin/users/${input.id}`);
}

// ---- 분기 export ----

export const listAdminUsers = env.USE_MOCK ? listAdminUsersMock : listAdminUsersReal;
export const createUser = env.USE_MOCK ? createUserMock : createUserReal;
export const resetUserPassword = env.USE_MOCK ? resetUserPasswordMock : resetUserPasswordReal;
export const deleteUser = env.USE_MOCK ? deleteUserMock : deleteUserReal;
