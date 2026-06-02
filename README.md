# UNIT:Y 어드민

**개교 제141주년 무악대동제 〈UNIT:Y〉** 운영 어드민 SPA. 멋쟁이사자처럼 연세대학교 14기가 만들었습니다.

> **상태**: 기능 빌드는 사실상 완성됐고, **2026년 5월 26~29일 축제 기간 동안 실제 운영에 투입**되어 가동 중입니다. 활발히 유지보수되는 단계이며, 남은 항목(real 모드 백엔드 정합 잔여 블로커, 다크모드 정식화, 테스트 커버리지 확대)은 [`PROGRESS.md`](./PROGRESS.md)에 정리돼 있습니다.

부스·공연·예약·공지·분실물·배치도·후기·유저·시스템 상태까지, 축제 운영진(슈퍼/마스터 어드민)과 부스·공연팀이 각자 권한 범위에서 쓰는 콘솔입니다. 축제 자체의 일정·테마·카피 기준값은 [`CLAUDE.md`](./CLAUDE.md)의 "축제 기본 정보"가 Single Source of Truth입니다.

## Stack

- **Vite 6** + **React 18** + **TypeScript 5**
- **Tailwind v4** (`@theme inline`, oklch) + **shadcn/ui** (48개 컴포넌트, Figma Make 산출물)
- **React Router v7** (data router, `createBrowserRouter`)
- **TanStack Query v5** (서버 상태) + **Zustand v5** (클라이언트 전역, auth만)
- **react-hook-form** + **zod** (폼)
- **Vitest** (단위 테스트) · **ESLint** + **Prettier** (lint-staged pre-commit) · GitHub Actions CI
- 패키지 매니저: **pnpm**

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev`는 커밋된 `.env.development`(EC2 백엔드)를 자동 적용하고 **mock 모드가 기본**입니다. 즉 백엔드 없이도 바로 뜨고, 아래 mock 계정으로 로그인해 전체 플로우를 돌려볼 수 있습니다. 로컬에서 다른 백엔드를 붙이려면 `.env.local`로만 오버라이드하세요 (`.env.example` 참고).

### Scripts

| Command | 설명 |
|---|---|
| `pnpm dev` | Vite 개발 서버 (development mode → `.env.development` + mock 기본) |
| `pnpm build` | `tsc -b`(project reference 포함, `dist-types/`에 `.d.ts`) → `vite build` 프로덕션 번들. prod 빌드는 mock 차단(가드) |
| `pnpm typecheck` | `tsc -p tsconfig.json --noEmit` — src 타입 체크만 |
| `pnpm preview` | 빌드 결과 로컬 프리뷰 |
| `pnpm test` | Vitest 1회 실행 (`test:watch` / `test:ui` 변형 제공) |
| `pnpm e2e:reservation` | 예약 플로우 E2E 스크립트 (`scripts/e2e-reservation-flow.mjs`) |
| `pnpm lint` / `lint:fix` | ESLint (`format` / `format:check`는 Prettier) |

### Mock 로그인 계정 (`VITE_USE_MOCK=true`)

> **비밀번호는 검증하지 않습니다.** mock은 인증 시뮬레이션이 아니라 개발/시연 편의용이라, **알려진 `user_id`에 비어있지 않은 아무 비밀번호**면 로그인됩니다(실제 자격증명을 레포에 두지 않기 위함). 전체 계정 목록은 `src/features/auth/api.ts`의 `MOCK_USERS` 참고.

| user_id | role | 비고 |
|---|---|---|
| `super` | Super | 모든 권한 |
| `master` | Master | |
| `booth1` | Booth (booth_id=1) | 프로필 **작성 완료** 상태 |
| `booth2` | Booth (booth_id=2) | 프로필 **빈 상태** — 작성 전 플로우 확인용 |
| `performer1` | Performer (team_id=1) | |

이 외에 `booth3·5·7·13·15·28·30`, `performer2·16·23` 등 데모용 계정이 더 있습니다.

## 환경변수

환경별 값은 **커밋된 mode env 파일**로 자동 적용됩니다 — `pnpm dev` → `.env.development`(EC2), `pnpm build` → `.env.production`. 로컬 오버라이드는 `.env.local`. 모든 변수는 Zod로 검증되므로 누락·오타 시 앱이 즉시 에러로 알려줍니다. 자세한 주석은 [`.env.example`](./.env.example).

| Key | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 엔드포인트 (dev는 EC2, 비밀 아님 → 커밋됨) |
| `VITE_USE_MOCK` | mock 모드 토글. dev 기본 `true`, prod 기본 `false`(mock 계정 유출 차단) |
| `VITE_ALLOW_MOCK_BUILD` | prod 빌드에서 의도적으로 mock을 쓸 때만 `true`(가드 우회) |
| `VITE_APP_NAME` | 앱 표시 이름 |
| `VITE_KAKAO_CS_URL` | CS 문의 오픈카카오 URL. 비면 플로팅 CS 버튼 미렌더 |
| `VITE_GRAFANA_URL` | 시스템 상태 페이지의 "Grafana 열기" 링크아웃. 비면 버튼 미렌더 |

## 폴더 구조

```
src/
├── pages/          라우트 레벨 페이지 (403 forbidden, 404 not-found 포함)
├── features/       도메인별 로직 (13개)
│                    └ 각 도메인: types · api(mock/real 분기) · hooks · mapper · schema · components
├── components/
│   ├── ui/         shadcn/ui 48개 (Figma 원본, 수정 금지 · 재사용만)
│   ├── figma/      Figma 원본 유틸
│   ├── layout/     app-layout (사이드바 + 반응형 drawer)
│   └── common/     page-header-action · cs-floating-button · markdown · table-skeleton · tag-input · offline-banner
├── routes/         react-router 트리 (모든 라우트 RequireAuth + 권한 가드)
├── lib/            api-client · auth-strategy · env · query-client
├── config/         permissions(권한 매트릭스) · nav(사이드바 정의, 항목별 requires 권한)
├── styles/         theme.css · fonts.css (디자인 시스템)
└── types/          공통 타입 (Role, API)
```

도메인 features(13): `auth` · `booths` · `booth-layout` · `menus` · `reservations` · `performances` · `performance-review` · `satisfaction-reviews` · `notices` · `lost-found` · `users` · `system` · `uploads`. 레이어 원칙(컴포넌트→hooks→api→api-client, DTO↔Model 분리)과 인증/권한 설계는 [`ARCHITECTURE.md`](./ARCHITECTURE.md)·[`CLAUDE.md`](./CLAUDE.md) 참고.

## 권한 체계

4단계 역할: **Super · Master · Booth · Performer**. 권한은 **액션 단위**로 `src/config/permissions.ts`에 정의되며, 라우트 가드·사이드바 필터링이 이 매트릭스를 그대로 사용합니다.

```tsx
// 라우트 보호
<RequirePermission permission="booth.create">
  <BoothCreatePage />
</RequirePermission>

// 컴포넌트 내부
const { can } = useAuth();
if (can('booth.delete')) { ... }
```

인증 방식은 추상화돼 있어(`src/lib/auth-strategy.ts`) 백엔드 확정 시 `export const authStrategy = ...` 한 줄만 교체합니다. 401 수신 시 `api-client.ts`가 `onUnauthorized()`(기본 `/login` 리다이렉트)를 호출합니다.

## 디자인 시스템

- 멋쟁이사자처럼 연세대 14기 토큰 기반. **Primary Blue `#1E53FF`**, 폰트 **SUIT Variable**, letter-spacing **-2%** 전역.
- 색상은 **시맨틱 토큰**(`bg-primary`, `text-muted-foreground`, `border-border`) 우선 → 예외적으로 `bg-ds-*` 원시 토큰 → `bg-blue-500` 같은 Tailwind 기본 색상 **금지**.
- 다크모드는 `next-themes`로 연결돼 있으나 현재 `.dark` 토큰은 **임시 반전 스케일**(정식 다크 가이드 적용 예정).
- 토큰 목록·매핑은 [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md), 실제 렌더는 루트의 `theme-preview.html`을 브라우저로 열어 확인.

## 테스트

Vitest 단위 테스트 + 예약 플로우 E2E 스크립트가 있습니다. 현재 커버리지는 핵심 부분 위주(권한 매트릭스 `permissions`, `reservations`/`notices` mapper, `reservations` hooks + 회귀, 예약 관리 페이지)이며 점진 확대 중입니다.

```bash
pnpm test                # 1회 실행
pnpm test:watch          # 워치
pnpm e2e:reservation     # 예약 E2E
```

## 문서

| 파일 | 내용 |
|---|---|
| [`CASE_STUDIES.md`](./CASE_STUDIES.md) | 설계·디버깅 케이스 스터디 — 왜 이렇게 만들었나 (STAR) |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 전체 설계 (레이어, 인증/권한, 데이터 흐름) |
| [`API_SPEC.md`](./API_SPEC.md) | 프론트가 기대하는 API 계약 |
| [`backend.md`](./backend.md) | 백엔드 연동/스펙 메모 |
| [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) | 디자인 토큰 가이드 |
| [`PROGRESS.md`](./PROGRESS.md) | 작업 진행 상황 / 남은 작업 |
| [`CLAUDE.md`](./CLAUDE.md) | 축제 기준 메타데이터 + Claude Code 작업 지침 |
| [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) | 외부 산출물(shadcn/ui, Figma Make) 라이선스 |

## 라이선스

내부 프로젝트. 외부 산출물의 라이선스는 [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) 참고.
