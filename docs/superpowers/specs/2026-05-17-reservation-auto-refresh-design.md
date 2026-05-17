# 예약 목록 자동 갱신 설계

작성일: 2026-05-17

## 배경

예약 관리 화면(`reservation-management.tsx`)에서 새 PENDING 예약이 들어와도 운영자
화면에는 자동으로 뜨지 않는다. 어드민 본인의 입장처리·취소 액션은 뮤테이션의
`invalidateQueries`로 즉시 갱신되지만, **사용자가 새로 넣은 예약**은 운영자가 직접
어떤 액션을 하거나 창을 새로고침해야만 보인다.

축제 당일 부스 예약 보드는 새 예약이 실시간으로 들어오는 화면이므로 이 공백이
실질적 불편이다. 백엔드에는 push 장치(WebSocket/SSE)가 없다.

## 목표

- 예약 관리 화면이 새 PENDING 예약을 운영자 개입 없이 최대 15초 안에 반영한다.
- 운영자가 다른 탭을 보고 있거나 화면을 안 보고 있어도 새 예약을 알아챈다.
- 백엔드 신규 작업 0. 기존 부스별 엔드포인트만 사용한다.

## 비목표

- 진짜 실시간 push(SSE/WebSocket) — 15초 허용오차로 충분. 필요해지면 별도 이슈.
- dashboard·booth-picker 화면의 폴링 — 실시간성이 불필요한 화면이므로 제외.

## 접근

폴링 + 뱃지 + 토스트. 폴링하는 화면은 백엔드에 **이미 있는** 부스별 엔드포인트
`GET /admin/reservations/booths/{boothId}`를 친다.

### 왜 전체 풀이 아니라 부스별 엔드포인트인가

현재 `listReservationsReal`은 전체 부스 예약 풀(`GET /admin/reservations`, 백엔드
미구현 상태)을 가져와 프론트에서 한 부스로 필터한다. 이걸 폴링하면 50개 클라이언트가
15초마다 50개 부스 전체 예약을 통째로 내려받는다 — 페이로드와 풀스캔 쿼리가 망가진다.

부스별 엔드포인트를 폴링하면 매 요청이 `WHERE booth_id = ?` 인덱스 조회 한 번,
한 부스 몇십 행이다.

### 용량 검토

- 부스 50개, 운영자가 각자 예약 페이지를 열어둔 최악 케이스: 50 클라이언트 ×
  (15초당 1회) = 약 3.3 req/s.
- 8시간: 50 × (28,800 ÷ 15) = 약 96,000 요청. 각 요청은 인덱스 단건 조회.
- `refetchIntervalInBackground` 기본값 `false` — 백그라운드 탭은 폴링하지 않으므로
  실제 동시 폴러는 50보다 적다.
- 결론: Spring Boot가 가뿐히 감당. 백엔드 측에 `(booth_id, status)` 복합 인덱스가
  있으면 최적이나 기존 `booth_id` 단일 인덱스로도 충분.

## 설계

### 1. 데이터 레이어 — 폴링을 부스 단위로 분리

**`features/reservations/api.ts`**
- `listBoothReservations(boothId: number)` 추가 (mock/real 분기).
  - real: `GET /admin/reservations/booths/{boothId}` 호출. status 파라미터는 붙이지
    않는다 — 화면의 4개 탭(대기/완료/취소/전체)이 전 상태를 필요로 한다.
  - mock: 아래 3절 참고.

**`features/reservations/hooks.ts`**
- `useBoothReservations(boothId: number)` 추가.
  - queryKey: `['reservations', 'booth', boothId]`
  - queryFn: `() => listBoothReservations(boothId)`
  - `refetchInterval: 15_000`

**`pages/reservation-management.tsx`**
- `useReservations()` → `useBoothReservations(boothId)`로 교체.
- 데이터가 이미 부스 범위이므로 `boothReservations = reservations.filter(boothId)`
  단계가 불필요해진다. 쿼리 데이터를 그대로 `boothReservations`로 사용해 단순화.

**변경하지 않는 것**
- `useReservations()`(전체 풀)은 dashboard·booth-picker가 계속 사용. 폴링 없음.
- 기존 뮤테이션의 `invalidateQueries({ queryKey: ['reservations'] })`는 prefix
  매칭이라 `['reservations', 'booth', N]`도 자동 무효화한다 — 수정 불필요.

### 2. 뱃지 + 토스트

**뱃지** — `대기자 목록` 탭 라벨 옆에 미처리(`waiting`) 건수를 표시. 건수가 0이면
숨김. `boothReservations`에서 파생하는 값이라 새 state 없음. 폴링 갱신 시 자동 증가.

**토스트** — `features/reservations/hooks.ts`에 `useNewReservationAlert` 훅 신설.
- 시그니처: `useNewReservationAlert(boothReservations: Reservation[], boothId: number)`
- 직전 예약 id 집합을 `useRef`로 보관. 데이터가 바뀔 때 현재 id 집합과 비교해
  **새로 등장한 id 중 status가 `waiting`인 것**의 개수를 센다.
- 개수 > 0이면 `toast('새 예약 N건이 들어왔습니다')`. 토스트에 액션 버튼을 달아
  클릭 시 `selectedStatus`를 `'대기자 목록'`으로 전환한다.
- 첫 로드는 토스트를 건너뛴다(ref 초기값 `null` → 첫 채움 시 토스트 없이 ref만
  설정). 그렇지 않으면 기존 예약 전체가 new로 잡힌다.
- `boothId`가 바뀌면 ref를 리셋한다(Super/Master가 부스를 전환하는 경우).

**왜 건수 비교가 아니라 id 집합 비교인가** — `완료 → 대기로 되돌리기` 전이도
waiting 건수를 늘린다. 신규 도착만 정확히 잡으려면 풀에 없던 id를 봐야 한다.

### 3. Mock 테스트 가능성

mock이 정적 데이터만 반환하면 폴링해도 뱃지·토스트가 절대 동작하지 않아 QA가
불가능하다. 따라서 `listBoothReservationsMock`이 새 예약 도착을 시뮬레이션한다.

- 벽시계 기준 약 20초마다 합성 PENDING 예약 1건을 mock `memory`에 주입.
- 부스당 최대 3건까지만 주입(캡) — 무한 증식 방지, dev에서 토스트를 두세 번 확인한
  뒤 안정화.
- `VITE_USE_MOCK=true`에서만 동작(mock 구현 내부이므로 자동).

## 영향 범위

| 파일 | 변경 |
|---|---|
| `features/reservations/api.ts` | `listBoothReservations` 추가 (mock/real) |
| `features/reservations/hooks.ts` | `useBoothReservations`, `useNewReservationAlert` 추가 |
| `pages/reservation-management.tsx` | 폴링 훅으로 교체, 뱃지 렌더, 토스트 훅 연결 |

dashboard·booth-picker·뮤테이션·백엔드는 변경 없음.

## 검증 방법

`pnpm dev`(`VITE_USE_MOCK=true`)로 예약 관리 화면을 연다.
- 약 20초 후 `대기자 목록` 탭 뱃지 건수가 +1 되고 토스트가 뜬다.
- 토스트 액션 버튼 클릭 시 `대기자 목록` 탭으로 전환된다.
- 다른 탭(완료/취소)을 보고 있어도 뱃지·토스트로 새 예약을 인지할 수 있다.
- 부스를 전환해도 직전 부스 예약이 new로 잘못 토스트되지 않는다.
- `pnpm typecheck` 통과.
