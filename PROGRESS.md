# 대동제 어드민 - 진행 상황

## ✅ 완료된 것

### 프로젝트 설정
- `package.json` — 기존 의존성 + 추가분(zod, @tanstack/react-query, @tanstack/react-table, zustand, @hookform/resolvers, react/react-dom, typescript, @types/node)
- `tsconfig.json`, `tsconfig.node.json` — `@/*` 경로 별칭, composite 충돌 해결
- `vite.config.ts` — 피그마 원본 + `resolveId` 타입 명시
- `.env.example`, `.gitignore`

### 디자인 시스템
- `src/styles/fonts.css` — SUIT Variable, letter-spacing -2%
- `src/styles/theme.css` — 멋쟁이사자처럼 연세대학교 14기 디자인 시스템 토큰 전체 반영
  - 원시 토큰(`--ds-*`) + 시맨틱 토큰(shadcn 호환) 2계층
  - 브랜드 3색 스케일(Blue/Violet/Pink) 50~900
  - Gray Scale 0~900
  - Error/Warning/Success 각 3단계
  - Typography 유틸리티 8종 (`.ds-display` ~ `.ds-label`)
  - 메인 브랜드: Primary Blue `#1E53FF`
- `DESIGN_TOKENS.md` — 토큰 사용 가이드
- `theme-preview.html` — 브라우저에서 확인용 프리뷰

### UI 컴포넌트
- `src/components/ui/` — shadcn/ui 48개 (피그마 원본)
- `src/components/figma/ImageWithFallback.tsx`

### 인프라
- `src/types/role.ts` — 4단계 Role(Super/Master/Booth/Performer)
- `src/types/api.ts` — API 공통 타입
- `src/config/permissions.ts` — 권한 매트릭스 + `hasPermission()`
- `src/config/nav.ts` — 권한 기반 사이드바 네비 정의
- `src/lib/env.ts` — Zod 환경변수 검증
- `src/lib/auth-strategy.ts` — JWT/세션 전략 패턴
- `src/lib/api-client.ts` — fetch 래퍼 + ApiError
- `src/lib/query-client.ts` — TanStack Query 전역 설정

### 인증
- `src/features/auth/types.ts` — CurrentUser
- `src/features/auth/api.ts` — mock/real 병행 (mock 계정 4종)
- `src/features/auth/store.ts` — Zustand 전역 상태
- `src/features/auth/hooks.ts` — `useAuth`, `useLogin`, `useLogout`
- `src/features/auth/guard.tsx` — `RequireAuth`, `RequireGuest`, `RequireRole`, `RequirePermission`
- `src/features/auth/schema.ts` — 로그인 zod 스키마
- `src/features/auth/auth-initializer.tsx` — 앱 시작 시 `/me` 복원

### 엔트리 & 라우팅 ⭐
- `src/main.tsx` — Vite 엔트리
- `src/App.tsx` — Provider 체인 (ThemeProvider + QueryClient + AuthInitializer + Router + Toaster)
- `src/routes/index.tsx` — 라우트 정의, RequireAuth 가드 적용

### 페이지 ⭐
- `src/pages/login.tsx` — 디자인 토큰 기반 로그인 (신규)
- 기존 피그마 11개 페이지 이전 완료 (PascalCase → kebab-case):
  - `user-management.tsx`
  - `inactive-users.tsx`
  - `booth-management.tsx`
  - `reservation-management.tsx`
  - `performance-management.tsx`
  - `general-management.tsx`
  - `notice.tsx`
  - `lost-found.tsx`
  - `booth-layout.tsx`
  - `performance-review.tsx`
  - `create-admin.tsx`

### 레이아웃
- `src/components/layout/app-layout.tsx` — 피그마 원본 기반 재작성
  - 하드코딩 `from-blue-500 to-cyan-500` 그라데이션 → `bg-primary` 단색
  - 권한 기반 네비 필터링 (`config/nav.ts` + `can()`)
  - 로그인 사용자 이름 + 역할 배지 표시
  - 로그아웃 버튼 `useLogout()` 연결

### 에셋
- `src/assets/` — 피그마 `imports/*.png` 12개 이전

---

## 🚧 남은 작업

### 1. 페이지 UI 리팩터 (기능 건드리지 말고 스타일만 점진 교체)
이전된 11개 페이지가 아직 **Tailwind 기본 색상을 하드코딩**한 상태.
디자인 토큰으로 점진 교체:

| 기존 | 교체 |
|---|---|
| `bg-blue-500` | `bg-primary` |
| `from-blue-500 to-cyan-500` | `bg-primary` 단색 |
| `text-slate-600` | `text-muted-foreground` |
| `border-slate-200` | `border-border` |
| `bg-slate-50` | `bg-muted` |
| `bg-red-100 text-red-700` (배지) | `bg-ds-error-subtle text-ds-error-pressed` |

`DESIGN_TOKENS.md`에 전체 가이드 있음.

### 2. 각 feature에 API 레이어 구현 (최대 작업)
11개 feature에 `types.ts`, `api.ts`, `hooks.ts`, `mapper.ts`, `schema.ts` 작성.
현재는 페이지 내부에 mock 배열로 들고 있음 → 점진적으로 훅으로 교체.

권장 순서:
1. `booths` (가장 복잡, 패턴 확정)
2. `notices`, `users` (비슷한 CRUD)
3. 나머지

### 3. 백엔드 명세 확정 후
- `features/*/api.ts`의 `mapper.ts`에서 DTO 이름 보정
- `features/auth/api.ts`의 loginReal 구현 확인
- `.env.local`의 `VITE_USE_MOCK=false` 전환 + `VITE_API_BASE_URL` 설정

### 4. 확인 필요 (기획자와 논의)
- **로그인 디자인** — 피그마 원본에 없었음. 임시로 기본형 생성 → 컨펌 필요
- **대시보드/홈** — 현재 `/` 진입 시 `/booth`로 리디렉트. 별도 대시보드 페이지 필요 여부
- **에러 페이지** (403, 404) — 디자인 유무
- **프로필/비밀번호 변경** 페이지 유무

---

## 🧪 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수
cp .env.example .env.local
# .env.local 확인: VITE_USE_MOCK=true (기본), 나중에 false로

# 3. 개발 서버
npm run dev

# 4. 타입 체크
npm run typecheck
```

**Mock 계정** (로그인 페이지에 힌트 표시됨):
- `super / super1234` — 슈퍼어드민 (모든 권한)
- `master / master1234` — 마스터어드민
- `booth1 / booth1234` — 부스운영자
- `performer1 / perf1234` — 공연팀

---

## 📌 주요 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 스택 | Vite + React + TS | 피그마 산출물 유지 |
| 라우팅 | react-router v7 | 피그마 기존 사용 |
| 권한 | 4단계 (Super/Master/Booth/Performer) | 피그마 CreateAdmin |
| 인증 | 추상화 (JWT 기본) | 백엔드 미정 |
| UI | 기존 유지 + 점진 리팩터 | 빠른 착지 |
| Mock | `VITE_USE_MOCK=true` 기본 | 백엔드 없이 개발 |
| 디자인 시스템 | 멋사연14기 · Primary Blue · SUIT Variable | 제공받음 |
| 토큰 구조 | 원시(ds-\*) + 시맨틱(shadcn) 2계층 | 일관성 + 유연성 |
