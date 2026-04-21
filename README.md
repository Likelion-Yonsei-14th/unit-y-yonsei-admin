# 2026 연세대 대동제 어드민

멋쟁이사자처럼 연세대학교 14기가 운영하는 **2026 대동제(축제) 어드민 SPA**.

> 현재 **스캐폴딩 단계** — 인프라(인증/권한/API 레이어)와 엔트리·라우팅은 들어가 있으며, 도메인 페이지를 점진적으로 이전 중입니다. 상세 진행 상황은 [`PROGRESS.md`](./PROGRESS.md).

## Stack

- **Vite 6** + **React 18** + **TypeScript**
- **Tailwind v4** (`@theme inline`, oklch) + **shadcn/ui** (48개 컴포넌트)
- **React Router v7** (data router)
- **TanStack Query** (서버 상태) + **Zustand** (클라이언트 전역)
- **react-hook-form** + **zod** (폼)
- 패키지 매니저: **pnpm**

## Quick start

```bash
pnpm install
cp .env.example .env.local   # 최초 1회
pnpm dev
```

기본값은 `VITE_USE_MOCK=true` — 백엔드 없이도 아래 Mock 계정으로 로그인해 바로 돌려볼 수 있습니다.

### Scripts

| Command | 설명 |
|---|---|
| `pnpm dev` | Vite 개발 서버 |
| `pnpm build` | `tsc -b`로 project reference(`tsconfig.node.json`)까지 빌드해 `dist-types/`에 `.d.ts`를 생성한 뒤, `vite build`로 프로덕션 번들 생성 |
| `pnpm typecheck` | `tsc -p tsconfig.json --noEmit` — src 타입 체크만 (emit X) |
| `pnpm preview` | 빌드 결과 로컬 프리뷰 |

### Mock 로그인 계정 (`VITE_USE_MOCK=true`)

| user_id | password | role |
|---|---|---|
| `super` | `super1234` | Super |
| `master` | `master1234` | Master |
| `booth1` | `booth1234` | Booth (booth_id=1) — 프로필 작성 완료 상태 |
| `booth2` | `booth1234` | Booth (booth_id=2) — 프로필 빈 상태 (작성 전 플로우) |
| `performer1` | `perf1234` | Performer (team_id=1) |

## 환경변수

`.env.example`을 `.env.local`로 복사 후 필요 시 수정. Zod로 검증되므로 누락·오타 시 앱이 즉시 에러로 알려줍니다.

| Key | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | 백엔드 엔드포인트 |
| `VITE_APP_NAME` | `대동제 어드민` | 앱 표시 이름 |
| `VITE_USE_MOCK` | `true` | `true`면 mock 모드 |

## 폴더 구조

```
src/
├── pages/          라우트 레벨 페이지
├── features/       도메인별 로직 (auth, booths, performances, ...)
│                    └ 각 도메인에 types · api(mock/real 분기) · hooks · mapper · schema
├── components/
│   ├── ui/         shadcn/ui (수정 금지, 재사용만)
│   ├── figma/      Figma 원본 유틸
│   ├── layout/     자체 레이아웃 (작성 예정)
│   └── common/     자체 공통 컴포넌트 (작성 예정)
├── routes/         react-router 트리
├── lib/            api-client, auth-strategy, env, query-client
├── config/         permissions(권한 매트릭스), nav(사이드바 정의)
├── styles/         theme.css, fonts.css (디자인 시스템)
└── types/          공통 타입 (Role, API)
```

자세한 레이어 원칙·인증 방식·규칙은 [`ARCHITECTURE.md`](./ARCHITECTURE.md)와 [`CLAUDE.md`](./CLAUDE.md) 참고.

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

## 디자인 시스템

- 브랜드 컬러 **Primary Blue `#1E53FF`**, 폰트 **SUIT Variable**, letter-spacing **-2%** 전역
- 색상은 **시맨틱 토큰**(`bg-primary`, `text-muted-foreground`, `border-border`) 우선 → 예외적으로 `bg-ds-*` 원시 토큰 → `bg-blue-500` 같은 Tailwind 기본 색상 **금지**
- 토큰 목록과 매핑 가이드는 [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)
- `theme-preview.html`을 브라우저에서 열면 토큰이 실제로 어떻게 보이는지 확인 가능

## 문서

| 파일 | 내용 |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 전체 설계 (레이어, 인증/권한, 데이터 흐름) |
| [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) | 디자인 토큰 가이드 |
| [`PROGRESS.md`](./PROGRESS.md) | 작업 진행 상황 / 남은 작업 |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code 작업 지침 |
| [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) | 외부 산출물(shadcn/ui, Figma Make) 라이선스 |

## 라이선스

내부 프로젝트. 외부 산출물의 라이선스는 [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) 참고.
