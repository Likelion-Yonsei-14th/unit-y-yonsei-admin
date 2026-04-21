# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

2026 연세대 대동제(축제) 어드민 SPA. Figma Make가 생성한 Vite + React + Tailwind v4 + shadcn/ui 프로토타입을 실제 운영 가능한 어드민으로 확장 중. 현재는 **스캐폴딩 단계** — 인프라(인증/권한/API 레이어)와 엔트리(`src/main.tsx`) · 라우터(`src/routes/`)까지 들어가 있고 `pnpm dev`·`pnpm build` 모두 동작. 도메인 페이지들은 아직 대부분 이전되지 않은 상태. 더 자세한 설계 배경은 `ARCHITECTURE.md`, 진행 상황은 `PROGRESS.md` 참고.

## Commands

패키지 매니저는 **pnpm** (`pnpm-workspace.yaml` 존재).

```bash
pnpm install              # 의존성 설치
cp .env.example .env.local  # 환경변수 세팅 (최초 1회)
pnpm dev                  # Vite 개발 서버
pnpm build                # tsc --noEmit && vite build (타입 체크 + 번들)
pnpm typecheck            # tsc --noEmit
pnpm preview              # 빌드 결과 로컬 프리뷰
```

테스트 러너는 현재 설정되어 있지 않다.

## Vite 특수 설정 (건드리지 말 것)

`vite.config.ts`에 정의된 **`figmaAssetResolver` 플러그인**은 Figma Make가 만든 `import foo from 'figma:asset/<filename>'` 구문을 `src/assets/<filename>`로 리졸브한다. React/Tailwind 플러그인과 함께 Figma 산출물 호환을 위해 필수 — 제거 금지.

경로 별칭은 `@/* → src/*` (`tsconfig.json`, `vite.config.ts` 양쪽에 설정).

## Styling: Tailwind v4

- Tailwind **v4** (`@tailwindcss/vite`) + `@theme inline`. v3 문법과 다르다.
- 스타일 진입점은 `src/styles/index.css` (fonts → tailwind → theme 순으로 import).
- 테마는 **멋쟁이사자처럼 연세대 14기 디자인 시스템** 기반. `src/styles/theme.css`는 2계층 구조 — (1) `--ds-*` 원시 토큰(브랜드 컬러·그레이·상태·타이포), (2) shadcn 시맨틱 토큰(`--primary`, `--background`, ...)이 원시 토큰을 참조. 폰트는 `src/styles/fonts.css`에서 **SUIT Variable** + `letter-spacing: -0.02em` 전역 적용.
- 색상 사용 우선순위: **1순위 시맨틱 토큰**(`bg-primary`, `text-foreground`, `border-border`, `bg-muted`, `text-destructive`, `bg-sidebar`) → **2순위 `bg-ds-*` 원시 토큰**(`bg-ds-success-subtle` 등) → **3순위 Tailwind 기본 색상은 금지**(`bg-blue-500` 같은 하드코딩 X). 토큰 전체 목록/매핑은 `DESIGN_TOKENS.md`, 실제 렌더 프리뷰는 루트의 `theme-preview.html`을 브라우저로 열어 확인.
- `next-themes`의 `attribute="class"` + `.dark` 클래스로 다크모드 자동 전환 (현재 다크 토큰은 임시 반전 스케일).

## Architecture

### 레이어 원칙

```
pages/페이지 컴포넌트  ──uses──►  features/<domain>/hooks.ts
                                       │
                                       ▼
                             features/<domain>/api.ts  ──►  lib/api-client.ts
                                       │                         │
                                       ▼                         ▼
                             mapper (DTO↔Model)         authStrategy
```

- **컴포넌트는 `fetch`를 직접 호출하지 않는다.** 항상 feature 훅(`useBooths()` 등) → `features/<domain>/api.ts` → `lib/api-client.ts` 경로로 간다.
- **DTO ↔ Model 분리**: 백엔드 응답(`snake_case`, `XxxDTO`)은 `features/<domain>/mapper.ts`에서 프론트 모델(`camelCase`, `Xxx`)로 변환. 백엔드 필드명 변경 시 매퍼만 수정.
- **`VITE_USE_MOCK` 분기**: 각 feature `api.ts`는 mock/real 구현을 모두 두고 `export const login = env.USE_MOCK ? loginMock : loginReal` 식으로 분기한다 (`src/features/auth/api.ts` 가 참고 구현체). 백엔드 없이도 개발 가능.

### 인증/권한

- **역할 4단계**: `Super | Master | Booth | Performer` (`src/types/role.ts`). ARCHITECTURE.md에는 3단계로 적혀 있지만 **실제 구현은 4단계** — Performer 포함된 이쪽이 정답.
- **권한은 액션 단위**: `src/config/permissions.ts`의 `PERMISSIONS` 맵(`'booth.create': ['Super', 'Master']` 등)으로 관리. `hasPermission(role, 'x.y')` 또는 `useAuth().can('x.y')` 사용.
- **가드 컴포넌트** (`src/features/auth/guard.tsx`): `<RequireAuth>`, `<RequireGuest>`, `<RequireRole allow={[...]}>`, `<RequirePermission permission="...">`. 라우트 트리에서 감싸 사용.
- **인증 방식은 추상화되어 있음** (`src/lib/auth-strategy.ts`): 기본은 `JwtStrategy`(localStorage + Bearer 헤더), `SessionCookieStrategy` 예비. 백엔드 확정되면 파일 맨 아래 `export const authStrategy = ...` 한 줄만 교체.
- `api-client.ts`는 401 수신 시 `onUnauthorized()` 콜백을 호출(기본은 `/login` 리다이렉트). 라우터 마운트 후 `setUnauthorizedHandler()`로 교체 가능.

### 상태

- **서버 상태**: TanStack Query. 전역 `queryClient`는 `src/lib/query-client.ts` — `refetchOnWindowFocus: false`, 4xx는 retry 안 함, 401은 특히 retry 안 함 (어드민 특성).
- **클라이언트 전역 상태**: Zustand. 현재는 `useAuthStore`만 있음 (`features/auth/store.ts`). user와 초기화 상태만 보관하고 토큰 저장은 `authStrategy`에 위임.
- **폼**: react-hook-form + zod (`@hookform/resolvers`). 폼 스키마는 feature 내부 `schema.ts`.

### 폴더 구조 (요지)

- `src/pages/` — 라우트 레벨 페이지 컴포넌트 (아직 대부분 미이전)
- `src/features/<domain>/` — 도메인별 로직: `types.ts` / `api.ts` / `hooks.ts` / `mapper.ts` / `schema.ts`. 현재 도메인: `auth`, `booths`, `booth-layout`, `lost-found`, `notices`, `performance-review`, `performances`, `reservations`, `uploads`, `users` (대부분 껍데기만 있음).
- `src/components/ui/` — **Figma에서 온 shadcn/ui 48개 컴포넌트**. 수정하지 말고 재사용만.
- `src/components/layout/`, `src/components/common/`, `src/components/figma/` — 자체 작성 / Figma 유틸.
- `src/lib/` — `api-client.ts`, `auth-strategy.ts`, `query-client.ts`, `env.ts` (Zod로 환경변수 검증).
- `src/config/` — `permissions.ts`(권한 매트릭스), `nav.ts`(사이드바 정의, 각 항목에 `requires: Permission`).
- `src/routes/` — `createBrowserRouter` 트리. `index.tsx`(라우트 정의) + `root-layout.tsx`, `auth-layout.tsx`.
- 배럴(`index.ts`) 파일은 쓰지 않는다.

## Conventions

- 파일명 **kebab-case** (`booth-table.tsx`, `use-debounce.ts`). 컴포넌트는 PascalCase + **named export** 선호.
- 훅은 `use-` prefix. import는 항상 `@/` 별칭 사용.
- 사이드바에 새 메뉴를 추가할 때는 `src/config/nav.ts`의 `MAIN_NAV` / `FOOTER_NAV`에 `requires` 권한을 함께 명시해야 자동 필터링된다.
- 새 도메인을 추가할 때는 `features/<domain>/`에 `types.ts`(DTO+Model), `mapper.ts`, `api.ts`(mock/real 분기), `hooks.ts`(TanStack Query 래퍼), 필요 시 `schema.ts`를 세트로 만든다 — `features/auth/`가 레퍼런스.

## Mock 로그인 계정 (`VITE_USE_MOCK=true`)

| user_id | password | role |
|---|---|---|
| `super` | `super1234` | Super |
| `master` | `master1234` | Master |
| `booth1` | `booth1234` | Booth (booth_id=1) |
| `performer1` | `perf1234` | Performer (team_id=1) |

## 외부 산출물 출처

- **Figma Make 프로토타입 원본** — `src/components/ui/*`, `src/components/figma/*`, `src/styles/index.css`, `src/styles/tailwind.css`, `vite.config.ts`, `index.html`, `postcss.config.mjs`. 수정 금지(shadcn/ui MIT, `ATTRIBUTIONS.md` 참고).
- **멋쟁이사자처럼 연세대 14기 디자인 시스템** — `src/styles/theme.css`, `src/styles/fonts.css`, 루트의 `DESIGN_TOKENS.md`, `theme-preview.html`. 토큰 추가/변경은 `DESIGN_TOKENS.md`의 기여 규칙에 따라.
- 기능 추가는 `src/features/`와 `src/pages/`에서 한다.
