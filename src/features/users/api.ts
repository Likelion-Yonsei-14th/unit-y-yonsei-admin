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
import type { Role } from '@/types/role';

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

async function setUserRoleMock(input: { id: number; role: Role }): Promise<AdminUser> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((u) => u.id === input.id);
  if (idx < 0) throw new Error(`mock: user ${input.id} 을(를) 찾을 수 없습니다.`);
  memory[idx] = { ...memory[idx], role: input.role };
  return memory[idx];
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
  // 백엔드 응답에 없는 필드(boothId/teamId 등) 는 mock 에서 생성 직후 null —
  // 실제 백엔드는 booth/performance_team 행을 같이 만들고 FK 채워서 내려줌.
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

// ---- list / mutations (real) ----

async function listAdminUsersReal(): Promise<AdminUser[]> {
  const dtos = await api.get<AdminUserDTO[]>('/admin/users');
  return dtos.map(toAdminUser);
}

async function setUserRoleReal(input: { id: number; role: Role }): Promise<AdminUser> {
  const dto = await api.patch<AdminUserDTO>(`/admin/users/${input.id}`, { role: input.role });
  return toAdminUser(dto);
}

async function createUserReal(values: CreateUserFormValues): Promise<CreatedUser> {
  const dto = await api.post<CreatedUserDTO>('/admin/users', fromCreateUserFormValues(values));
  return toCreatedUser(dto);
}

async function resetUserPasswordReal(input: { id: number }): Promise<ResetPasswordResult> {
  // body 없음 — API_SPEC / backend.md 컨트랙트와 일치. 일부 백엔드는 빈 객체 `{}`
  // 를 415/400 으로 거부할 수 있어 두 번째 인자 자체를 생략.
  const dto = await api.post<ResetPasswordDTO>(`/admin/users/${input.id}/reset-password`);
  return toResetPasswordResult(dto);
}

// ---- 분기 export ----

export const listAdminUsers = env.USE_MOCK ? listAdminUsersMock : listAdminUsersReal;
export const setUserRole = env.USE_MOCK ? setUserRoleMock : setUserRoleReal;
export const createUser = env.USE_MOCK ? createUserMock : createUserReal;
export const resetUserPassword = env.USE_MOCK ? resetUserPasswordMock : resetUserPasswordReal;
