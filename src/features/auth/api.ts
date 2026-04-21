import { api } from '@/lib/api-client';
import { authStrategy } from '@/lib/auth-strategy';
import { env } from '@/lib/env';
import type { CurrentUser, CurrentUserDTO, LoginPayload, LoginResultDTO } from './types';

// ---- DTO → Model 매퍼 ----

const toCurrentUser = (d: CurrentUserDTO): CurrentUser => ({
  id: d.id,
  userId: d.user_id,
  role: d.role,
  name: d.name,
  boothId: d.booth_id,
  performanceTeamId: d.performance_team_id,
});

// ---- Mock 구현 (USE_MOCK=true일 때 사용) ----
// 백엔드 없이 개발하기 위한 가짜 응답.

const MOCK_USERS: Record<string, { password: string; user: CurrentUserDTO }> = {
  super: {
    password: 'super1234',
    user: { id: 1, user_id: 'super', role: 'Super', name: '슈퍼어드민' },
  },
  master: {
    password: 'master1234',
    user: { id: 2, user_id: 'master', role: 'Master', name: '마스터어드민' },
  },
  booth1: {
    password: 'booth1234',
    user: {
      id: 10, user_id: 'booth1', role: 'Booth',
      name: '부스운영자1', booth_id: 1,
    },
  },
  booth2: {
    // 작성 전 상태 데모용 — 프로필 필드가 전부 비어있는 mock 부스
    password: 'booth1234',
    user: {
      id: 11, user_id: 'booth2', role: 'Booth',
      name: '부스운영자2', booth_id: 2,
    },
  },
  performer1: {
    password: 'perf1234',
    user: {
      id: 20, user_id: 'performer1', role: 'Performer',
      name: '공연팀1', performance_team_id: 1,
    },
  },
};

const MOCK_TOKEN_KEY = 'daedongje.mock.user_id';

async function loginMock(payload: LoginPayload): Promise<CurrentUser> {
  await new Promise(r => setTimeout(r, 300)); // 네트워크 흉내
  const record = MOCK_USERS[payload.userId];
  if (!record || record.password !== payload.password) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  localStorage.setItem(MOCK_TOKEN_KEY, payload.userId);
  authStrategy.persistLogin({ accessToken: `mock-token-${payload.userId}` });
  return toCurrentUser(record.user);
}

async function fetchMeMock(): Promise<CurrentUser> {
  await new Promise(r => setTimeout(r, 100));
  const userId = localStorage.getItem(MOCK_TOKEN_KEY);
  if (!userId || !MOCK_USERS[userId]) {
    throw new Error('로그인이 필요합니다.');
  }
  return toCurrentUser(MOCK_USERS[userId].user);
}

async function logoutMock(): Promise<void> {
  localStorage.removeItem(MOCK_TOKEN_KEY);
  authStrategy.clearAuth();
}

// ---- 실제 구현 ----

async function loginReal(payload: LoginPayload): Promise<CurrentUser> {
  const result = await api.post<LoginResultDTO>('/auth/login', {
    user_id: payload.userId,
    password: payload.password,
  });
  authStrategy.persistLogin({
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
  });
  return toCurrentUser(result.user);
}

async function fetchMeReal(): Promise<CurrentUser> {
  const dto = await api.get<CurrentUserDTO>('/auth/me');
  return toCurrentUser(dto);
}

async function logoutReal(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    authStrategy.clearAuth();
  }
}

// ---- 분기 export ----

export const login = env.USE_MOCK ? loginMock : loginReal;
export const fetchMe = env.USE_MOCK ? fetchMeMock : fetchMeReal;
export const logout = env.USE_MOCK ? logoutMock : logoutReal;

/** 현재 저장된 토큰이 있는지 (라우팅 초기화 전 빠른 체크용) */
export function hasStoredToken(): boolean {
  if (env.USE_MOCK) {
    return !!localStorage.getItem(MOCK_TOKEN_KEY);
  }
  return !!authStrategy.getStoredToken();
}
