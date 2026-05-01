# 대동제 어드민 - 진행 상황

> 마지막 업데이트: 2026-05-01 (booth-management sub-component 분리 시점)

## ✅ 완료된 것

### 인프라 / 라이브러리
- 빌드: Vite 6 + React 19 + TS 5, `@/*` 별칭, `pnpm-workspace.yaml`
- 라우팅: react-router v7, `createBrowserRouter` (`src/routes/index.tsx`)
- 상태: TanStack Query(서버) + Zustand(클라이언트)
- 폼: react-hook-form + zod (`@hookform/resolvers`)
- DnD: react-dnd (메뉴 리스트 순서 변경)
- 토스트: `sonner`
- 공통: `src/lib/{api-client,auth-strategy,query-client,env}.ts`
- 환경변수: Zod 스키마 검증, `VITE_USE_MOCK` 토글로 mock/real 분기

### 디자인 시스템
- 멋쟁이사자처럼 연세대 14기 토큰 — 원시(`--ds-*`) + 시맨틱(shadcn) 2계층 (`src/styles/theme.css`)
- 폰트: SUIT Variable, letter-spacing -2% 전역
- 다크 모드: `next-themes` + `.dark` 클래스, **현재 다크 토큰은 임시 반전 — 정식화 미정**
- 가이드: `DESIGN_TOKENS.md`, 프리뷰: `theme-preview.html`

### 인증/권한
- 4단계 Role: Super / Master / Booth / Performer
- 권한 매트릭스: `src/config/permissions.ts` + `hasPermission()` / `useAuth().can()`
- 가드 컴포넌트: `<RequireAuth>`, `<RequireGuest>`, `<RequireRole>`, `<RequirePermission>`
- 인증 전략 추상화: `JwtStrategy`(기본) / `SessionCookieStrategy`(예비) — `src/lib/auth-strategy.ts`
- 401 자동 처리: `setUnauthorizedHandler()` → `/login` 리다이렉트
- 로그인 폼: RHF + zod, mock 4종(`super`/`master`/`booth1`/`booth2`/`performer1`)

### 도메인 features (9개)

각 도메인은 `types.ts` / `api.ts`(mock+real 분기) / `hooks.ts` / 필요 시 `mapper.ts` / `schema.ts` / `components/`. 페이지는 mock 직접 import 없이 hooks 경유.

| 도메인 | 모델 | 주요 hook | 비고 |
|---|---|---|---|
| `auth` | `CurrentUser` | `useAuth`, `useLogin`, `useLogout` | mock 에러도 `ApiError` 로 던짐 |
| `booth-layout` | `BoothPlacement` | `usePlacements`, `useMyBoothPlacements` 외 | localStorage 영속 mock + 좌표 편집기 풀세트 (zoom/pan, DnD, 핀 핸들) |
| `booths` | `BoothProfile` | `useBooths`, `useMyBoothProfile`, `useUpdateMyBoothProfile` | sub-components 4개로 페이지 분리 |
| `lost-found` | `LostItem` | `useLostItems` + CRUD | |
| `notices` | `Notice` | `useNotices` + CRUD | |
| `performance-review` | `Review` | `useReviews`, `useSetReviewHidden`, `useDeleteReview` | |
| `performances` | `PerformanceDetail` | `usePerformance`, `useMyPerformance`, `useUpdatePerformance` | DTO patch 매퍼 분리 |
| `reservations` | `Reservation` | `useReservations`, `useSetReservationStatus`, `useSetReservationsStatusBulk` | |
| `users` | `AdminUser` | `useAdminUsers`, `useSetUserActive`, `useSetUserRole`, `useCreateUser` | RHF+zod 폼, mock 도 in-memory 반영 |

### 페이지

라우트 정의는 `src/routes/index.tsx`. 모든 라우트가 `RequireAuth` + 도메인 권한 가드 적용.

| 경로 | 컴포넌트 | 주 권한 |
|---|---|---|
| `/login` | LoginPage | `RequireGuest` |
| `/` | DefaultLanding | 역할별 redirect |
| `/users` | UserManagement | `user.read` |
| `/booth` | BoothManagement | `booth.update.own` |
| `/reservations` | ReservationBoothPicker | `reservation.read` |
| `/reservations/:boothId` | ReservationManagement | `reservation.read` |
| `/performance` | PerformanceList | `performance.read` |
| `/performance/me` | PerformanceManagement | `performance.update.own` |
| `/performance/:teamId` | PerformanceManagement | `performance.manage` |
| `/general/notice` | NoticePage | `notice.manage` |
| `/general/lost-found` | LostFoundPage | `lostfound.read` |
| `/general/booth-layout` | BoothLayoutPage | `boothlayout.manage` |
| `/general/performance-review` | PerformanceReviewPage | `performancereview.read` |
| `/create-admin` | CreateAdmin | `admin.create` |

### 레이아웃 / 공통 UI
- `src/components/layout/app-layout.tsx` — 사이드바 + 메인 outlet
  - 데스크톱: collapse 토글 (w-60 / w-16)
  - 모바일(< md): drawer + 햄버거 + backdrop, 라우트 변경 시 자동 닫힘
- `src/components/common/page-header-action.tsx` — 페이지 우상단 액션 버튼 통일 (tone: blue/purple/green/neutral)
- `src/components/common/cs-floating-button.tsx` — CS 문의 전역 플로팅
- shadcn/ui 48개 (피그마 원본, 수정 금지)

### 누적된 UX 패턴
- **인라인 편집 진입점**: 공지/분실물 — 제목 클릭 시 수정 폼 진입 (편집 아이콘과 동치)
- **이미지 첨부 미리보기**: object URL 생성 + 폼 재진입/언마운트/교체 시 revoke (notice/lost-found 단일, booth/performance 다중)
- **blob URL 누수 방지**: `blobUrlsRef` Set 으로 추적, 서버 동기화 / 편집 취소 / unmount 시점에 사용 안 하는 URL 즉시 revoke
- **mutation 정직성**: 성공 토스트는 mutation 성공 응답에서만 발화, 실패는 alert 영역으로 노출 (저장 거짓말 방지)
- **AlertDialog vs Dialog**: 파괴적 액션은 AlertDialog (취소 확정/삭제), 일반 정보/액션은 Dialog (포커스 트랩 + ESC + aria-modal)
- **로딩/에러 분기**: `isLoading` → 메시지, `isError` → 다시 시도 버튼 — 도메인 페이지 전반 통일
- **모바일 반응형**: 페이지 외곽 `p-4 md:p-8`, 카드 `p-4 md:p-8`, 폼 grid `grid-cols-1 sm:grid-cols-2`, 테이블 `overflow-x-auto` 래퍼 + `min-w-[NNNpx]`, 페이지 헤더 `flex-wrap gap-3 mb-6 md:mb-8`
- **부스 핀 borderRadius**: 짧은 변의 20% 캡 (백양로 1:3.55 종횡비에서 타원 현상 해결, view+편집기 공유)
- **편집기 핀 핸들**: 폭/높이 < 16px 일 때 변 핸들 자동 숨김 (좁은 자리 가독성)
- **접근성**: 폼 `htmlFor` + `id` 매칭, 동적 리스트는 `aria-label`, 권한 카드 `role=radio`+`aria-checked`

---

## 🚧 다음 작업

### 1. 백엔드 연동 (착수 단계) ⭐
- 본 어드민의 BE 리드는 user 본인. `features/<domain>/types.ts` 의 DTO 가 사실상 스키마 초안 — 그대로 OpenAPI 시드로 이전 가능.
- **단계별 PoC**:
  1. `notices` (가장 단순 CRUD) 부터 `VITE_USE_MOCK=false` 로 한 도메인만 전환해 흐름 검증 — 401 → onUnauthorized → /login, ApiError instanceof, mutation 후 invalidate.
  2. 나머지 도메인 동일 패턴으로 확장.
- 인증 방식 확정 시 `src/lib/auth-strategy.ts` 의 `export const authStrategy = ...` 한 줄만 교체.
- 파일 업로드 (이미지) — 현재 blob URL 미리보기까지 구현. `multipart/form-data` POST 흐름은 백엔드 결정에 맞춰 추가.

### 2. 다크모드 정식화
- 현재 `theme.css` 의 `.dark` 블록은 임시 반전 스케일. 디자인 시스템 14기 다크 가이드 받아 토큰 채우기.
- 라이트/다크 토글 UI 동작은 `next-themes` 로 이미 연결됨.

### 3. 테스트 인프라 (현재 0)
- 우선순위 1: Vitest + React Testing Library 셋업
- 우선순위 2: 단위 테스트 — `permissions.ts` / `hasPermission`, 각 도메인 mapper, zod schemas
- 우선순위 3: E2E (Playwright) — 권한 라우팅, 폼 흐름

### 4. 새로운 사용자 피드백 사이클
- 모바일 실기기 QA — 캠퍼스 일정 임박(2026-05-26~29) 전 PM/사용자 손으로 한 번 더 점검 권장
- 사진 업로드 까맣게/실패 — 백엔드 리드(user) 작업

### 5. 미정/외부 의사결정 대기
- **에러 페이지** (403/404) — 디자인 유무 미정
- **프로필/비밀번호 변경** 페이지 — 현재 미설계 (login.tsx 근거 부재 같은 이유)
- **booth-layout 백양로 동선** — 캔버스/편집기는 나왔으나 실제 운영진의 사용 패턴 검증 필요

---

## 🧪 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수
cp .env.example .env.local
# VITE_USE_MOCK=true (기본), 백엔드 붙으면 false 로

# 3. 개발 서버
pnpm dev

# 4. 타입 체크
pnpm typecheck

# 5. 빌드
pnpm build
```

**Mock 계정** (로그인 페이지에 힌트 표시됨):
- `super / super1234` — 슈퍼어드민 (모든 권한)
- `master / master1234` — 마스터어드민
- `booth1 / booth1234` — 부스운영자 (프로필 작성 완료)
- `booth2 / booth1234` — 부스운영자 (프로필 빈 상태, 작성 전 플로우 확인용)
- `performer1 / perf1234` — 공연팀

---

## 📌 주요 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 스택 | Vite + React 19 + TS | 피그마 산출물 유지 |
| 라우팅 | react-router v7 | 피그마 기존 사용 |
| 권한 | 4단계 (Super/Master/Booth/Performer) | 운영 시나리오 |
| 인증 | 추상화(JwtStrategy 기본) | 백엔드 미정 시점 의사결정 회피 |
| Mock | `VITE_USE_MOCK=true` 기본 | 백엔드 없이 도메인 흐름 완결 |
| 폼 | RHF + zod | 도메인별 schema.ts 로 검증 일원화 |
| 서버 상태 | TanStack Query | 4xx/401 retry off, focus refetch off |
| 클라이언트 상태 | Zustand (auth만) | 다른 도메인은 useState/Query 로 충분 |
| 디자인 시스템 | 멋사연14기 · Primary Blue · SUIT Variable | 제공받음 |
| 토큰 구조 | 원시(ds-\*) + 시맨틱(shadcn) 2계층 | 일관성 + 유연성 |
| Mock 데이터 | `src/mocks/` 별도 디렉터리, feature api 가 in-memory 복사로 mutation 반영 | mock 과 model 분리 |
