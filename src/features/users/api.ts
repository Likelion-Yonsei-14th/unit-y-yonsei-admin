import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockUsers } from '@/mocks/users';
import { fromCreateUserFormValues, toAdminUser, toCreatedUser } from './mapper';
import type { CreateUserFormValues } from './schema';
import type { AdminUser, AdminUserDTO, CreatedUser, CreatedUserDTO } from './types';
import type { Role } from '@/types/role';

const memory: AdminUser[] = mockUsers.map((u) => ({ ...u }));

// ---- list / mutations (mock) ----

async function listAdminUsersMock(): Promise<AdminUser[]> {
  await new Promise((r) => setTimeout(r, 100));
  return memory.slice();
}

async function setUserActiveMock(input: { id: number; active: boolean }): Promise<AdminUser> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((u) => u.id === input.id);
  if (idx < 0) throw new Error(`mock: user ${input.id} 을(를) 찾을 수 없습니다.`);
  memory[idx] = { ...memory[idx], active: input.active };
  return memory[idx];
}

async function setUserRoleMock(input: { id: number; role: Role }): Promise<AdminUser> {
  await new Promise((r) => setTimeout(r, 100));
  const idx = memory.findIndex((u) => u.id === input.id);
  if (idx < 0) throw new Error(`mock: user ${input.id} 을(를) 찾을 수 없습니다.`);
  memory[idx] = { ...memory[idx], role: input.role };
  return memory[idx];
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
    active: true,
  };
  memory.unshift(newAdminUser);
  return { id, userId: values.userId };
}

// ---- list / mutations (real) ----

async function listAdminUsersReal(): Promise<AdminUser[]> {
  const dtos = await api.get<AdminUserDTO[]>('/admin/users');
  return dtos.map(toAdminUser);
}

async function setUserActiveReal(input: { id: number; active: boolean }): Promise<AdminUser> {
  const dto = await api.patch<AdminUserDTO>(`/admin/users/${input.id}`, { active: input.active });
  return toAdminUser(dto);
}

async function setUserRoleReal(input: { id: number; role: Role }): Promise<AdminUser> {
  const dto = await api.patch<AdminUserDTO>(`/admin/users/${input.id}`, { role: input.role });
  return toAdminUser(dto);
}

async function createUserReal(values: CreateUserFormValues): Promise<CreatedUser> {
  const dto = await api.post<CreatedUserDTO>('/admin/users', fromCreateUserFormValues(values));
  return toCreatedUser(dto);
}

// ---- 분기 export ----

export const listAdminUsers = env.USE_MOCK ? listAdminUsersMock : listAdminUsersReal;
export const setUserActive = env.USE_MOCK ? setUserActiveMock : setUserActiveReal;
export const setUserRole = env.USE_MOCK ? setUserRoleMock : setUserRoleReal;
export const createUser = env.USE_MOCK ? createUserMock : createUserReal;
