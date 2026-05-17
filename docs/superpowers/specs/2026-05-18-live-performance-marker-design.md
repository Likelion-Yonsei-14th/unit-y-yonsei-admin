# 라이브 공연 수동 지정 설계

작성일: 2026-05-18

## 배경

축제 중 아티스트(헤드라이너) 공연이 진행될 때, 관객용 화면이 "지금 공연중: X팀"을
보여줘야 한다. 일반 공연의 라이브 표시는 관객 프론트가 타임테이블 + 현재 시각으로
자동 판정하지만, 아티스트 공연은 진행 순서·시간이 유동적이라 자동 판정이 어렵다.
그래서 Super 관리자가 "현재 라이브 공연"을 수동으로 지정한다.

## 목표

- Super 관리자가 공연팀 하나를 "현재 라이브 공연"으로 지정/해제할 수 있다.
- 지정 상태는 백엔드에 단일 값으로 저장되고, 관객용 앱이 공개 API로 읽을 수 있다.
- 한 번에 한 팀만 라이브 — 새 팀 지정 시 이전 지정은 자동 교체된다.

## 비목표

- 관객용 앱/화면 자체 (별도 소비처).
- 일반 공연의 시각 기반 라이브 자동 판정 (관객 프론트의 별개 영역).
- 아티스트/헤드라이너를 데이터 모델에서 구분하는 플래그 — 현재 `Performance`에 그런
  필드가 없다. 관리자는 기존 공연팀 전체 목록에서 고른다.

## 접근

"현재 라이브 공연"은 개념상 값 하나(한 번에 한 팀)다. 따라서 각 `Performance`에
`isLive` boolean 을 흩뿌리지 않고, **단일 상태 `currentLiveTeamId`** 를 전용
리소스로 둔다. 교체는 PUT 한 번, "단 하나만 라이브" 불변식이 자연히 보장된다.

## 설계

### 1. 백엔드 계약 (제안 — 백엔드 리드가 구현)

performances 백엔드는 아직 없다. 이 기능은 mock-first 로 구현하고, real 경로는
아래 계약을 대상으로 둔다. 이 절이 곧 백엔드 구현 계약서다.

- `GET /performances/live` → `{ teamId: number | null }`
  - 관객용 앱이 읽을 수 있도록 공개 조회. `null` = 현재 지정된 라이브 공연 없음.
- `PUT /performances/live` → 요청 body `{ teamId: number | null }`, **Super 전용**
  - 응답: 갱신된 상태 `{ teamId: number | null }`.
  - `teamId` 는 존재하는 공연팀을 참조해야 한다(백엔드 검증). `null` 은 해제.
- 페이로드는 camelCase — 확정된 백엔드 컨벤션(camelCase + ApiResponse 봉투 +
  세션쿠키)을 따른다. `features/performances/types.ts` 의 기존 snake_case DTO 들은
  performances 백엔드 연동 시 별도 재작업 대상이며 이 스펙 범위 밖이다.

### 2. 프론트 feature (`src/features/performances/`)

기존 performances feature 에 라이브 상태 조회/설정을 추가한다.

**`api.ts`** — mock/real 분기 함수 2개:
- `getLivePerformance(): Promise<number | null>`
  - mock: 모듈 변수 `mockLiveTeamId`(초기값 `null`) 반환.
  - real: `api.get<{ teamId: number | null }>('/performances/live')` → `.teamId`.
- `setLivePerformance(teamId: number | null): Promise<number | null>`
  - mock: `mockLiveTeamId = teamId` 후 반환.
  - real: `api.put<{ teamId: number | null }>('/performances/live', { teamId })` → `.teamId`.
- 단일 `number | null` 값이라 별도 DTO 타입·mapper 파일은 두지 않고 인라인 타입으로 처리.

**`hooks.ts`** — TanStack Query 래퍼 2개:
- `useLivePerformance()` — `useQuery`, queryKey `['performances', 'live']`,
  `refetchInterval: 15_000`. 운영 중 다른 Super 스태프의 변경을 따라잡기 위한 폴링.
- `useSetLivePerformance()` — `useMutation`, `onSuccess` 시
  `setQueryData(['performances','live'], newValue)` 로 즉시 반영.

### 3. UI — `/performance` 목록 페이지 (`src/pages/performance-list.tsx`)

`PerformanceListPage` 는 Super/Master 가 보는 전체 공연 목록이다. 여기에 라이브
컨트롤을 더한다. 라이브 관련 UI는 `can('performance.live')` 일 때만 렌더 — Master 는
목록은 보되 라이브 지정 컨트롤은 보이지 않는다.

- **상단 "현재 라이브 공연" 배너**: 지정된 팀이 있으면 팀명 + `● LIVE` 표시 +
  `라이브 해제` 버튼. 없으면 "지정된 라이브 공연 없음".
- **목록 각 공연팀 행/카드**: `라이브로 지정` 버튼. 현재 라이브인 팀은 `● LIVE`
  배지가 붙고 버튼이 `해제` 로 바뀐다.
- 지정/해제 시 토스트(`sonner`)로 피드백. 라이브 포인터 교체는 파괴적이지 않으므로
  확인 다이얼로그 없이 즉시 반영.

### 4. 권한 (`src/config/permissions.ts`)

- `PERMISSIONS` 맵에 `'performance.live': ['Super']` 추가.
- 목록 페이지 진입 자체는 기존 `performance.read`(Super + Master) 그대로.
- 라이브 컨트롤(배너 버튼·행 버튼)은 `useAuth().can('performance.live')` 로 게이트 →
  Super 만 조작 가능.

### 5. Mock

- `mockLiveTeamId` 초기값 `null`. 관리자가 지정 → 해제하는 end-to-end 플로우가
  mock 모드(`VITE_USE_MOCK=true`)에서 완결돼 데모·QA 가능.

## 영향 범위

| 파일 | 변경 |
|---|---|
| `src/features/performances/api.ts` | `getLivePerformance` / `setLivePerformance` 추가 (mock/real) |
| `src/features/performances/hooks.ts` | `useLivePerformance` / `useSetLivePerformance` 추가 |
| `src/config/permissions.ts` | `'performance.live': ['Super']` 추가 |
| `src/pages/performance-list.tsx` | 라이브 배너 + 행별 지정/해제 컨트롤 (Super 한정) |

`nav.ts`·라우트·관객용 앱·백엔드 코드는 이 스펙 범위 밖이다.

## 검증 방법

`pnpm dev`(`VITE_USE_MOCK=true`) — `super` 계정으로 `/performance` 접속.
- 초기: "지정된 라이브 공연 없음" 배너.
- 한 공연팀의 `라이브로 지정` 클릭 → 배너에 팀명·`● LIVE` 표시, 그 행에 LIVE 배지,
  토스트.
- 다른 팀을 지정 → 라이브가 새 팀으로 교체(이전 팀 배지 사라짐).
- `라이브 해제` → 배너가 "없음"으로, 모든 행 배지 사라짐.
- `master` 계정으로 접속 → 목록은 보이되 라이브 컨트롤은 안 보임.
- `pnpm typecheck` 통과.
