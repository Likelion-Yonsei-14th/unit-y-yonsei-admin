#!/usr/bin/env node
/**
 * 예약 end-to-end 플로우 검증.
 *
 * 방문객 예약 생성 → Booth 어드민 리스트에 잡힘 → 상태 전이(완료/취소) 까지
 * 실제 백엔드에 대해 한 사이클 돌려 단계별 PASS/FAIL 을 보고한다. 단위 테스트
 * (vitest)와 별개로, 통합 회귀 검증용.
 *
 * 사용:
 *   BOOTH_ID=1 \
 *   BOOTH_ADMIN_LOGIN_ID=... \
 *   BOOTH_ADMIN_PASSWORD=... \
 *     node scripts/e2e-reservation-flow.mjs
 *
 * 기본 BASE_URL 은 EC2(`api.jellyu-yonsei.com`). 다른 백엔드는 BASE_URL 환경변수로 오버라이드.
 *
 * 단계:
 *   1) POST /booths/{boothId}                   방문객이 공개 엔드포인트로 예약 생성
 *   2) POST /admin/auth/login                   Booth 어드민 로그인(세션 쿠키)
 *   3) GET  /admin/reservations/booths/{boothId}    리스트에서 방금 생성한 예약을 찾고 status=PENDING 확인
 *   4) PATCH /admin/reservations/{id}/status (PENDING→CONFIRMED)
 *   5) PATCH /admin/reservations/{id}/status (CONFIRMED→CANCELLED)
 *   6) 최종 리스트 재조회로 상태 확정 확인
 *
 * ⚠️ 실제 백엔드에 예약 행을 만든다. bookerName 에 'E2E-TEST-' 접두사 + ISO
 * 타임스탬프를 박아 사후 수동 정리/식별이 쉽도록 한다. 백엔드에 reservation
 * 삭제 엔드포인트가 없어 스크립트는 cancelled 상태로 두고 끝낸다.
 */

const BASE_URL = process.env.BASE_URL ?? 'https://api.jellyu-yonsei.com/api';
const BOOTH_ID = Number(process.env.BOOTH_ID ?? '');
const LOGIN_ID = process.env.BOOTH_ADMIN_LOGIN_ID ?? '';
const PASSWORD = process.env.BOOTH_ADMIN_PASSWORD ?? '';

if (!BOOTH_ID || !LOGIN_ID || !PASSWORD) {
  console.error(
    'BASE_URL, BOOTH_ID, BOOTH_ADMIN_LOGIN_ID, BOOTH_ADMIN_PASSWORD 환경변수가 필요합니다.',
  );
  process.exit(2);
}

const cookieJar = new Map();

/** ApiResponse 봉투를 풀어 data 만 돌려준다. 실패면 throw. */
async function call(method, path, { body } = {}) {
  const cookieHeader = [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { Cookie: cookieHeader }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // 응답이 보낸 세션 쿠키를 jar 에 보관.
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/(DDJ_ADMIN_SESSION)=([^;]+)/);
    if (m) cookieJar.set(m[1], m[2]);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const code = json?.error?.code ?? '';
    const msg = json?.error?.message ?? res.statusText;
    throw new Error(`${method} ${path} → HTTP ${res.status} ${code} ${msg}`);
  }
  return json?.data;
}

let stepIndex = 0;
function step(label) {
  stepIndex += 1;
  process.stdout.write(`  ${stepIndex}) ${label} ... `);
}
function pass(extra = '') {
  console.log(`\x1b[32m✓\x1b[0m ${extra}`);
}
function fail(err) {
  console.log(`\x1b[31m✗\x1b[0m\n     ${err.message}`);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) throw new Error(`assertion 실패 — ${msg}`);
}

const testMarker = `E2E-TEST-${new Date().toISOString()}`;

(async () => {
  console.log(`\nbase: ${BASE_URL}`);
  console.log(`booth: ${BOOTH_ID} / admin: ${LOGIN_ID}\n`);

  let reservationId = null;

  // 1) 방문객 예약 생성
  step(`방문객 예약 생성 (POST /booths/${BOOTH_ID})`);
  try {
    const created = await call('POST', `/booths/${BOOTH_ID}`, {
      body: {
        bookerName: testMarker,
        phoneNumber: '010-0000-0000',
        partySize: 1,
        privacyConsent: true,
      },
    });
    assert(created?.id, 'created.id 없음');
    reservationId = created.id;
    pass(`id=${reservationId}`);
  } catch (e) {
    fail(e);
  }

  // 2) Booth 어드민 로그인 + /me 로 boothId 검증
  //    AdminLoginResponse 에 boothId 가 빠진 백엔드 버전을 대비해 /me 로 보강 검증.
  step('Booth 어드민 로그인 + /me 로 boothId 검증');
  try {
    const loginRes = await call('POST', '/admin/auth/login', {
      body: { loginId: LOGIN_ID, password: PASSWORD },
    });
    assert(loginRes?.role === 'BOOTH', `login role 이 BOOTH 가 아님 (${loginRes?.role})`);
    const me = await call('GET', '/admin/auth/me');
    assert(me?.boothId === BOOTH_ID, `/me 의 boothId(${me?.boothId}) 가 대상 BOOTH_ID(${BOOTH_ID}) 와 불일치`);
    pass();
  } catch (e) {
    fail(e);
  }

  // 3) 부스 리스트에서 방금 만든 예약 검증
  step('리스트 조회 + PENDING 상태 확인');
  try {
    const list = await call('GET', `/admin/reservations/booths/${BOOTH_ID}`);
    const found = list.find((r) => r.id === reservationId);
    assert(found, `생성한 예약(id=${reservationId}) 이 리스트에 없음`);
    assert(found.status === 'PENDING', `예상 PENDING, 실제 ${found.status}`);
    assert(found.bookerName === testMarker, '리스트의 bookerName 가 생성 요청과 다름');
    pass(`총 ${list.length}건 중 발견`);
  } catch (e) {
    fail(e);
  }

  // 4) PENDING → CONFIRMED
  step('상태 PATCH PENDING→CONFIRMED');
  try {
    const updated = await call('PATCH', `/admin/reservations/${reservationId}/status`, {
      body: { status: 'CONFIRMED' },
    });
    assert(updated.status === 'CONFIRMED', `PATCH 응답이 CONFIRMED 아님 (${updated.status})`);
    pass();
  } catch (e) {
    fail(e);
  }

  // 5) CONFIRMED → CANCELLED
  step('상태 PATCH CONFIRMED→CANCELLED');
  try {
    const updated = await call('PATCH', `/admin/reservations/${reservationId}/status`, {
      body: { status: 'CANCELLED' },
    });
    assert(updated.status === 'CANCELLED', `PATCH 응답이 CANCELLED 아님 (${updated.status})`);
    pass();
  } catch (e) {
    fail(e);
  }

  // 6) 리스트 재조회로 최종 상태 확정
  step('재조회 + CANCELLED 최종 상태 확인');
  try {
    const list = await call('GET', `/admin/reservations/booths/${BOOTH_ID}`);
    const found = list.find((r) => r.id === reservationId);
    assert(found, '취소된 예약이 리스트에서 사라짐');
    assert(found.status === 'CANCELLED', `재조회 status 가 CANCELLED 아님 (${found.status})`);
    pass();
  } catch (e) {
    fail(e);
  }

  console.log(`\n\x1b[32m전부 통과\x1b[0m — 테스트 예약(id=${reservationId}, name=${testMarker}) 은 CANCELLED 로 남습니다.\n`);
})().catch((e) => {
  console.error(`\n예상치 못한 에러: ${e.stack || e.message}`);
  process.exit(1);
});
