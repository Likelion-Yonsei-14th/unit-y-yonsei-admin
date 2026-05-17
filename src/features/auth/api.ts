import { api, ApiError } from '@/lib/api-client';
import { authStrategy } from '@/lib/auth-strategy';
import { env } from '@/lib/env';
import { roleFromBackend } from '@/types/role';
import type { AdminAuthDTO, CurrentUser, CurrentUserDTO, LoginPayload } from './types';

// ---- DTO → Model 매퍼 ----

/** mock 사용자 DTO(snake_case) → CurrentUser. */
const toCurrentUser = (d: CurrentUserDTO): CurrentUser => ({
  id: d.id,
  userId: d.user_id,
  role: d.role,
  name: d.name,
  boothId: d.booth_id,
  performanceTeamId: d.performance_team_id,
});

/** 실제 백엔드 인증 응답(AdminAuthDTO) → CurrentUser. */
const toCurrentUserFromAuth = (d: AdminAuthDTO): CurrentUser => ({
  id: d.adminUserId,
  userId: d.loginId,
  role: roleFromBackend(d.role),
  name: d.representativeName,
  // boothId / performanceTeamId 는 백엔드 인증 응답에 아직 없음 (백엔드 추가 요청 항목).
});

// ---- Mock 구현 (USE_MOCK=true일 때 사용) ----
// 백엔드 없이 개발하기 위한 가짜 응답.
//
// booth_id / performance_team_id 는 mocks/booth-profile.ts / mocks/performances.ts
// 의 ID 와 매칭되어야 한다 — 로그인 시 picker / 좌표 / 예약 페이지가 같은 ID 로
// 데이터를 join 한다. 다양한 시나리오 QA 를 위해 booth/performer 마다 특성이
// 다른 계정을 골라 로그인 가능하게 둔다.

const MOCK_USERS: Record<string, { password: string; user: CurrentUserDTO }> = {
  super: {
    password: 'super1234',
    user: { id: 1, user_id: 'super', role: 'Super', name: '슈퍼어드민' },
  },
  master: {
    password: 'master1234',
    user: { id: 2, user_id: 'master', role: 'Master', name: '마스터어드민' },
  },
  // ---- Booth 운영자 — 다양한 케이스로 9종 ----
  booth1: {
    // 작성 완료 + 인기 부스 (예약 13건). 5/27 송도 + 5/28 백양로 등 다일 운영.
    password: 'booth1234',
    user: { id: 10, user_id: 'booth1', role: 'Booth', name: '문헌정보학과', booth_id: 1 },
  },
  booth2: {
    // 작성 전 상태 데모용 — 프로필 빈 + 5/28~29 백양로 자리만 잡혀있음.
    password: 'booth1234',
    user: { id: 11, user_id: 'booth2', role: 'Booth', name: '미입력', booth_id: 2 },
  },
  booth3: {
    // 작성 완료 + 다른 부스 (5/28 한글탑 + 5/29 한글탑).
    password: 'booth1234',
    user: { id: 12, user_id: 'booth3', role: 'Booth', name: '경영학과', booth_id: 3 },
  },
  booth5: {
    // 인기 부스 (와플 12건). 5/27 송도 + 5/28~29 백양로.
    password: 'booth1234',
    user: { id: 13, user_id: 'booth5', role: 'Booth', name: '디자인학부', booth_id: 5 },
  },
  booth7: {
    // 인기 부스 (닭강정 10건). 5/27~29 모두 운영.
    password: 'booth1234',
    user: { id: 14, user_id: 'booth7', role: 'Booth', name: '사회복지학과', booth_id: 7 },
  },
  booth13: {
    // 인기 부스 (아이스크림 10건). 5/27 송도 + 5/28 한글탑.
    password: 'booth1234',
    user: { id: 15, user_id: 'booth13', role: 'Booth', name: '화학과', booth_id: 13 },
  },
  booth15: {
    // 별빛 카페 — booth-placements 에 없던 부스. 다중 자리/없는 자리 케이스 테스트.
    password: 'booth1234',
    user: { id: 16, user_id: 'booth15', role: 'Booth', name: '천문우주학과', booth_id: 15 },
  },
  booth28: {
    // 학생복지 안전 부스 — 모든 날짜에 자리 운영. 다중 placement 케이스.
    password: 'booth1234',
    user: { id: 17, user_id: 'booth28', role: 'Booth', name: '학생복지위원회', booth_id: 28 },
  },
  booth30: {
    // 비활성 부스. 운영 OFF 시 어떻게 보이는지 데모용.
    password: 'booth1234',
    user: { id: 18, user_id: 'booth30', role: 'Booth', name: '체육교육학과', booth_id: 30 },
  },
  // ---- Performer — 다양한 스테이지/날짜 4종 ----
  performer1: {
    // 멋쟁이사자처럼 — 5/28 백양로 14:00.
    password: 'perf1234',
    user: {
      id: 20,
      user_id: 'performer1',
      role: 'Performer',
      name: '멋쟁이사자처럼',
      performance_team_id: 1,
    },
  },
  performer2: {
    // 송도노인정양로원 — 5/27 송도 19:00. 다른 캠퍼스/날짜.
    password: 'perf1234',
    user: {
      id: 21,
      user_id: 'performer2',
      role: 'Performer',
      name: '송도노인정양로원',
      performance_team_id: 2,
    },
  },
  performer16: {
    // BTL — 5/28 백양로 18:00 헤드라이너. 셋리스트 풍부.
    password: 'perf1234',
    user: {
      id: 22,
      user_id: 'performer16',
      role: 'Performer',
      name: 'BTL',
      performance_team_id: 16,
    },
  },
  performer23: {
    // KOMI Squad — 5/29 백양로 18:00. 다른 날짜 케이스.
    password: 'perf1234',
    user: {
      id: 23,
      user_id: 'performer23',
      role: 'Performer',
      name: 'KOMI Squad',
      performance_team_id: 23,
    },
  },
};

const MOCK_TOKEN_KEY = 'daedongje.mock.user_id';

async function loginMock(payload: LoginPayload): Promise<CurrentUser> {
  await new Promise((r) => setTimeout(r, 300)); // 네트워크 흉내
  const record = MOCK_USERS[payload.userId];
  if (!record || record.password !== payload.password) {
    // real 분기와 동일한 에러 타입을 던져 호출자(폼 onError, instanceof 분기 등) 가
    // mock/real 구분 없이 같은 코드로 처리할 수 있게 한다.
    throw new ApiError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  localStorage.setItem(MOCK_TOKEN_KEY, payload.userId);
  authStrategy.persistLogin({ accessToken: `mock-token-${payload.userId}` });
  return toCurrentUser(record.user);
}

async function fetchMeMock(): Promise<CurrentUser> {
  await new Promise((r) => setTimeout(r, 100));
  const userId = localStorage.getItem(MOCK_TOKEN_KEY);
  if (!userId || !MOCK_USERS[userId]) {
    // 401 — api-client.ts 의 onUnauthorized 가 발화되도록 status 까지 맞춤.
    throw new ApiError(401, '로그인이 필요합니다.');
  }
  return toCurrentUser(MOCK_USERS[userId].user);
}

async function logoutMock(): Promise<void> {
  localStorage.removeItem(MOCK_TOKEN_KEY);
  authStrategy.clearAuth();
}

// ---- 실제 구현 ----

async function loginReal(payload: LoginPayload): Promise<CurrentUser> {
  // 세션 쿠키 방식 — 응답 바디에 토큰 없음. 서버가 Set-Cookie 로 처리.
  const dto = await api.post<AdminAuthDTO>('/admin/auth/login', {
    loginId: payload.userId,
    password: payload.password,
  });
  return toCurrentUserFromAuth(dto);
}

async function fetchMeReal(): Promise<CurrentUser> {
  const dto = await api.get<AdminAuthDTO>('/admin/auth/me');
  return toCurrentUserFromAuth(dto);
}

async function logoutReal(): Promise<void> {
  try {
    await api.post('/admin/auth/logout');
  } finally {
    authStrategy.clearAuth();
  }
}

// ---- 분기 export ----

export const login = env.USE_MOCK ? loginMock : loginReal;
export const fetchMe = env.USE_MOCK ? fetchMeMock : fetchMeReal;
export const logout = env.USE_MOCK ? logoutMock : logoutReal;

/**
 * 앱 시작 시 `/me` 로 세션 복원을 시도할지 여부 (라우팅 초기화 전 빠른 체크용).
 * - mock: 저장된 mock user_id 가 있을 때.
 * - 세션 쿠키 전략(real): 클라이언트가 HttpOnly 쿠키를 못 읽으므로 항상 시도하고,
 *   로그인 여부는 서버 응답(200 / 401)으로 판정한다.
 * - JWT 전략: 저장된 토큰이 있을 때만.
 */
export function shouldRestoreSession(): boolean {
  if (env.USE_MOCK) {
    return !!localStorage.getItem(MOCK_TOKEN_KEY);
  }
  return authStrategy.needsCredentials || !!authStrategy.getStoredToken();
}
