import { api, ApiError } from '@/lib/api-client';
import { authStrategy } from '@/lib/auth-strategy';
import { env } from '@/lib/env';
import { mockUsers } from '@/mocks/users';
import type { ApiResponse } from '@/types/api';
import { fromCreateUserFormValues, toAdminUser, toCreatedUser } from './mapper';
import type { CreateUserFormValues } from './schema';
import type {
  AdminUser,
  AdminUserBulkCreateResult,
  AdminUserBulkCreateResultDTO,
  AdminUserDTO,
  CreatedUser,
  CreatedUserDTO,
  ResetPasswordResult,
} from './types';

/**
 * 임시 비밀번호 생성기.
 * 12자 영숫자 — 헷갈리는 글자(0/O, 1/l/I) 제외해 운영자가 사용자에게 구두/메신저로
 * 전달할 때 오해를 줄인다. 백엔드가 "클라이언트가 보낸 비밀번호로 설정" 방식이라
 * mock·real 양쪽 모두 이 생성기로 임시값을 만든다.
 */
function generateTempPassword(): string {
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
  return { tempPassword: generateTempPassword() };
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

async function bulkCreateUsersMock(file: File): Promise<AdminUserBulkCreateResult> {
  await new Promise((r) => setTimeout(r, 400));
  // 업로드한 파일은 mock 에서 실제로 파싱하지 않는다 — 인자만 받고 고정된 결과를
  // 돌려줘 결과 UI(성공/실패 + 1회 비번 노출)의 end-to-end 플로우를 닫는다.
  void file;
  return {
    successCount: 2,
    failCount: 1,
    successList: [
      { loginId: 'booth_kingfood', password: generateTempPassword(), name: '김부스' },
      { loginId: 'perf_band_unity', password: generateTempPassword(), name: '이공연' },
    ],
    failList: [{ role: 'BOOTH', name: '박중복', reason: '이미 존재하는 로그인 ID 입니다.' }],
  };
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
  // 백엔드는 클라이언트가 새 비밀번호를 보내는 방식(PATCH .../password { password }).
  // 프론트가 임시 비번을 생성해 설정하고, 운영자에게 보여줄 수 있게 그 값을 반환한다.
  const tempPassword = generateTempPassword();
  await api.patch(`/admin/users/${input.id}/password`, { password: tempPassword });
  return { tempPassword };
}

/**
 * 계정 삭제 — Super 가 Master/Booth/Performer 계정을 제거.
 * ⚠️ 백엔드 Swagger 에 DELETE /admin/users/{id} 가 아직 없음 (백엔드 추가 요청 항목).
 */
async function deleteUserReal(input: { id: number }): Promise<void> {
  await api.delete(`/admin/users/${input.id}`);
}

/** 응답 본문이 백엔드 공통 봉투({ success, data, error }) 형태인지 판별. */
function isApiEnvelope(x: unknown): x is ApiResponse<unknown> {
  return typeof x === 'object' && x !== null && 'success' in x;
}

/**
 * CSV 일괄 생성 — multipart/form-data 한 part(`file`)로 CSV 를 보낸다.
 *
 * ⚠️ 공용 `api-client` 를 거치지 않고 fetch 를 직접 쓴다. api-client 는 multipart
 * body 와 봉투 파싱을 동시에 지원하지 못하기 때문이다 (raw 모드는 봉투를 안 벗기고,
 * 비-raw 모드는 Content-Type 을 JSON 으로 강제해 multipart boundary 를 망친다).
 * 대신 여기서 base URL · 인증 · 봉투 처리를 api-client 와 동일하게 재현한다:
 *  - URL  : `${env.API_BASE_URL}${path}`
 *  - 인증  : authStrategy.attachAuth(headers) (세션 쿠키 전략은 헤더 무변경)
 *  - 쿠키  : credentials = needsCredentials ? 'include' : 'same-origin'
 *  - 401  : 봉투 파싱 없이 ApiError(401) — 전역 onUnauthorized 핸들러는 api-client
 *           쪽에만 있으므로 여기선 호출하지 않고, 다음 일반 요청에서 자연히 트리거된다.
 *
 * Content-Type 은 절대 직접 세팅하지 않는다 — 브라우저가 multipart boundary 를
 * 포함해 자동으로 채우게 둬야 한다.
 */
async function bulkCreateUsersReal(file: File): Promise<AdminUserBulkCreateResult> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  authStrategy.attachAuth(headers);

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${env.API_BASE_URL}/admin/users/bulk`, {
    method: 'POST',
    headers,
    credentials: authStrategy.needsCredentials ? 'include' : 'same-origin',
    body: form,
  });

  if (res.status === 401) {
    throw new ApiError(401, 'Unauthorized', null);
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // 빈 응답 또는 JSON 이 아닌 응답 — payload 는 null 로 둔다.
  }
  const envelope = isApiEnvelope(payload) ? payload : null;

  if (!res.ok) {
    const err = envelope?.error ?? null;
    throw new ApiError(
      res.status,
      err?.message ?? res.statusText ?? `HTTP ${res.status}`,
      err ? { message: err.message, code: err.code } : null,
    );
  }

  if (envelope) {
    if (!envelope.success) {
      const err = envelope.error;
      throw new ApiError(
        res.status,
        err?.message ?? '일괄 생성에 실패했습니다.',
        err ? { message: err.message, code: err.code } : null,
      );
    }
    return envelope.data as AdminUserBulkCreateResultDTO;
  }

  // 봉투가 없는 JSON 응답은 그대로 (호환성) — api-client 와 동일한 폴백.
  return payload as AdminUserBulkCreateResultDTO;
}

// ---- 분기 export ----

export const listAdminUsers = env.USE_MOCK ? listAdminUsersMock : listAdminUsersReal;
export const createUser = env.USE_MOCK ? createUserMock : createUserReal;
export const resetUserPassword = env.USE_MOCK ? resetUserPasswordMock : resetUserPasswordReal;
export const deleteUser = env.USE_MOCK ? deleteUserMock : deleteUserReal;
export const bulkCreateUsers = env.USE_MOCK ? bulkCreateUsersMock : bulkCreateUsersReal;
