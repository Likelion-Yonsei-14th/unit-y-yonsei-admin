import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { fromCreateUserFormValues, toCreatedUser } from './mapper';
import type { CreateUserFormValues } from './schema';
import type { CreatedUser, CreatedUserDTO } from './types';

// ---- Mock 구현 ----
//
// 백엔드 미연결 단계에서 폼 success 흐름까지 검증할 수 있게 한다.
// 실제 영속성은 없음 — 다음 페이지 진입에서는 mock 사용자 목록에 반영되지 않는다.

async function createUserMock(values: CreateUserFormValues): Promise<CreatedUser> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    id: Date.now(),
    userId: values.userId,
  };
}

// ---- 실제 구현 ----

async function createUserReal(values: CreateUserFormValues): Promise<CreatedUser> {
  const dto = await api.post<CreatedUserDTO>('/admin/users', fromCreateUserFormValues(values));
  return toCreatedUser(dto);
}

// ---- 분기 export ----

export const createUser = env.USE_MOCK ? createUserMock : createUserReal;
