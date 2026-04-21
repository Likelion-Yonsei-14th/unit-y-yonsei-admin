# 2026 대동제 어드민 - 아키텍처 설계 (Vite + React)

> 기획자가 Figma Make로 만든 프로토타입(Vite + React + Tailwind v4 + shadcn/ui)을
> 확장하여 실제 운영 가능한 어드민으로 만드는 것이 목표.

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 빌드 | **Vite 6** | 피그마 산출물 그대로 |
| 프레임워크 | **React 18** | 피그마 산출물 그대로 |
| 언어 | TypeScript | |
| 스타일링 | **Tailwind v4** | `@theme inline` 새 문법 사용 중 |
| UI | **shadcn/ui + Radix** | 거의 풀셋 설치됨 |
| 라우팅 | **react-router v7** | 이미 의존성에 있음 |
| 폼 | react-hook-form + Zod | zod는 추가 필요 |
| 서버 상태 | **TanStack Query** | 추가 필요 (필수) |
| 클라 상태 | Zustand | 필요시 추가 |
| HTTP | fetch 래퍼 (자체) | 가볍게 |
| 테이블 | TanStack Table | 추가 필요 |
| 차트 | recharts | 이미 있음 |
| 토스트 | sonner | 이미 있음 |
| 애니메이션 | motion | 이미 있음 |
| 날짜 | date-fns | 이미 있음 |
| 인증 | 추상화 레이어로 격리 | 백엔드 방식 미정 |

**추가로 설치할 것:**
```bash
npm i zod @tanstack/react-query @tanstack/react-table zustand
npm i -D @types/node
```

---

## 2. 폴더 구조

Vite + react-router 기준. `app/` 디렉토리 라우팅 대신 **routes 객체**로 중앙 관리.

```
daedongje-admin/
├── src/
│   ├── main.tsx                      # 진입점 (Provider들 + RouterProvider)
│   ├── App.tsx                       # 기존 파일 존재 예상
│   ├── index.css                     # Tailwind v4 + 테마 변수
│   │
│   ├── routes/                       # ⭐ 라우팅 정의
│   │   ├── index.tsx                 # createBrowserRouter 설정
│   │   ├── root-layout.tsx           # 로그인 후 공통 레이아웃
│   │   └── auth-layout.tsx           # 로그인 전 레이아웃
│   │
│   ├── pages/                        # 페이지 컴포넌트
│   │   ├── login.tsx
│   │   ├── dashboard.tsx
│   │   ├── booths/{list,new,detail}.tsx
│   │   ├── performances/
│   │   ├── notices/
│   │   ├── users/
│   │   ├── stats/
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (피그마에서 온 것)
│   │   ├── layout/                   # Sidebar, Header, Breadcrumb
│   │   ├── forms/                    # 재사용 폼
│   │   ├── tables/                   # DataTable 래퍼
│   │   └── common/
│   │
│   ├── features/                     # ⭐ 도메인별 로직
│   │   ├── auth/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts              # useAuth, useLogin, useLogout
│   │   │   ├── guard.tsx             # RequireAuth, RequireRole
│   │   │   ├── store.ts              # Zustand (current user)
│   │   │   └── types.ts
│   │   ├── booths/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── schema.ts             # Zod
│   │   │   ├── mapper.ts             # DTO ↔ Model
│   │   │   └── types.ts
│   │   ├── performances/
│   │   ├── notices/
│   │   ├── users/
│   │   ├── stats/
│   │   └── uploads/
│   │
│   ├── lib/
│   │   ├── api-client.ts             # ⭐ fetch 래퍼
│   │   ├── auth-strategy.ts          # ⭐ 인증 전략 인터페이스 + 구현체
│   │   ├── query-client.ts           # TanStack Query 설정
│   │   ├── env.ts                    # 환경변수
│   │   └── utils.ts                  # cn(), 포맷터 (이미 있을 것)
│   │
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-debounce.ts
│   │
│   ├── config/
│   │   ├── nav.ts                    # 사이드바 메뉴 정의
│   │   └── permissions.ts            # 역할별 권한 매트릭스
│   │
│   ├── types/
│   │   ├── api.ts                    # API 공통 응답 타입
│   │   └── role.ts
│   │
│   └── assets/                       # figma:asset/... 이미지
│
├── public/
├── .env.local
├── .env.example
├── index.html
├── vite.config.ts                    # figmaAssetResolver 유지
├── package.json
└── tsconfig.json
```

### 피그마 산출물과의 관계
- `components/ui/` — 피그마에서 만들어진 shadcn 컴포넌트 **그대로 유지**
- `App.tsx`, 기존 페이지들 — src 받은 뒤 재배치 판단
- `vite.config.ts`의 `figmaAssetResolver` — **유지**
- `@/` alias — **유지**

---

## 3. 라우팅 전략

react-router v7의 `createBrowserRouter` 패턴. 중첩 라우트 + 가드.

```typescript
// src/routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: <RequireAuth><RootLayout /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'booths',
        children: [
          { index: true, element: <BoothListPage /> },
          {
            path: 'new',
            element: (
              <RequireRole allow={['SUPER_ADMIN', 'ADMIN']}>
                <BoothNewPage />
              </RequireRole>
            ),
          },
          { path: ':id', element: <BoothDetailPage /> },
        ],
      },
      // notices, users, performances, stats...
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
```

### 가드 컴포넌트
```tsx
// features/auth/guard.tsx
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ allow, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}
```

---

## 4. 권한 모델

### 3단계 역할
```typescript
// types/role.ts
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'BOOTH_OPERATOR';

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: '슈퍼어드민',
  ADMIN: '일반어드민',
  BOOTH_OPERATOR: '부스운영자',
};
```

### 권한 매트릭스
```typescript
// config/permissions.ts
export const PERMISSIONS = {
  'booth.read':        ['SUPER_ADMIN', 'ADMIN', 'BOOTH_OPERATOR'],
  'booth.create':      ['SUPER_ADMIN', 'ADMIN'],
  'booth.update.any':  ['SUPER_ADMIN', 'ADMIN'],
  'booth.update.own':  ['BOOTH_OPERATOR'],
  'booth.delete':      ['SUPER_ADMIN'],

  'performance.read':   ['SUPER_ADMIN', 'ADMIN', 'BOOTH_OPERATOR'],
  'performance.manage': ['SUPER_ADMIN', 'ADMIN'],

  'notice.read':   ['SUPER_ADMIN', 'ADMIN', 'BOOTH_OPERATOR'],
  'notice.manage': ['SUPER_ADMIN', 'ADMIN'],

  'user.read':   ['SUPER_ADMIN', 'ADMIN'],
  'user.manage': ['SUPER_ADMIN'],

  'stats.read': ['SUPER_ADMIN', 'ADMIN'],
} as const;

export type Permission = keyof typeof PERMISSIONS;
```

### 사용
```tsx
// features/auth/hooks.ts
export function useAuth() {
  const user = useAuthStore(s => s.user);
  const can = (p: Permission) =>
    user ? (PERMISSIONS[p] as readonly string[]).includes(user.role) : false;
  return { user, isAuthenticated: !!user, can };
}

// 컴포넌트에서
const { can } = useAuth();
{can('booth.delete') && <DeleteButton />}
```

---

## 5. 인증 추상화 (백엔드 방식 미정 대응)

### 전략 인터페이스
```typescript
// lib/auth-strategy.ts
export interface AuthStrategy {
  attachAuth(headers: Headers): void;
  persistLogin(res: LoginResponse): void;
  clearAuth(): void;
  getStoredToken(): string | null;
}
```

### JWT 구현 (기본값)
```typescript
class JwtStrategy implements AuthStrategy {
  private readonly KEY = 'daedongje.access_token';

  attachAuth(headers: Headers) {
    const token = this.getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  persistLogin(res: LoginResponse) {
    localStorage.setItem(this.KEY, res.accessToken);
  }
  clearAuth() { localStorage.removeItem(this.KEY); }
  getStoredToken() { return localStorage.getItem(this.KEY); }
}

class SessionCookieStrategy implements AuthStrategy {
  attachAuth() { /* 쿠키는 fetch의 credentials: 'include'로 */ }
  persistLogin() { /* 서버 Set-Cookie */ }
  clearAuth() { /* 서버 /logout 호출 */ }
  getStoredToken() { return null; }
}

export const authStrategy: AuthStrategy = new JwtStrategy();
// ↑ 이 한 줄만 교체하면 됨
```

---

## 6. API 레이어

### 원칙
- 컴포넌트는 **직접 fetch 안 함**
- 도메인별 `api.ts` → `hooks.ts`를 통해서만 접근
- DTO ↔ Model 매퍼로 변환

### 클라이언트
```typescript
// lib/api-client.ts
import { authStrategy } from './auth-strategy';
import { env } from './env';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  authStrategy.attachAuth(headers);

  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include', // 세션 방식 대비
  });

  if (res.status === 401) {
    authStrategy.clearAuth();
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }
  return res.json();
}

export const api = {
  get:    <T>(p: string)             => request<T>(p),
  post:   <T>(p: string, b?: unknown) => request<T>(p, { method: 'POST',   body: b ? JSON.stringify(b) : undefined }),
  put:    <T>(p: string, b: unknown) => request<T>(p, { method: 'PUT',    body: JSON.stringify(b) }),
  patch:  <T>(p: string, b: unknown) => request<T>(p, { method: 'PATCH',  body: JSON.stringify(b) }),
  delete: <T>(p: string)             => request<T>(p, { method: 'DELETE' }),
};
```

### 도메인 예시 (부스)
```typescript
// features/booths/types.ts
export interface BoothDTO {
  booth_id: number;
  booth_name: string;
  category: string;
  owner_user_id: number;
  created_at: string;
}

export interface Booth {
  id: number;
  name: string;
  category: string;
  ownerId: number;
  createdAt: Date;
}

// features/booths/mapper.ts
export const toBooth = (d: BoothDTO): Booth => ({
  id: d.booth_id,
  name: d.booth_name,
  category: d.category,
  ownerId: d.owner_user_id,
  createdAt: new Date(d.created_at),
});

// features/booths/api.ts
export async function fetchBooths() {
  const data = await api.get<BoothDTO[]>('/booths');
  return data.map(toBooth);
}

// features/booths/hooks.ts
export function useBooths() {
  return useQuery({ queryKey: ['booths'], queryFn: fetchBooths });
}
```

백엔드가 필드명을 바꿔도 **`mapper.ts`만 수정**.

---

## 7. 라우트 맵 (권한 포함)

| 경로 | 페이지 | 접근 권한 |
|---|---|---|
| `/login` | 로그인 | 비로그인 |
| `/` | 대시보드 | 전체 (역할별 위젯) |
| `/booths` | 부스 목록 | 전체 |
| `/booths/new` | 부스 생성 | SUPER, ADMIN |
| `/booths/:id` | 부스 상세 | 전체 |
| `/booths/:id/edit` | 부스 수정 | SUPER, ADMIN, OWNER(본인) |
| `/performances` | 공연 목록 | 전체 |
| `/performances/*` | 공연 관리 | SUPER, ADMIN |
| `/notices` | 공지 목록 | 전체 |
| `/notices/*` | 공지 관리 | SUPER, ADMIN |
| `/users` | 사용자 목록 | SUPER, ADMIN |
| `/users/*` | 사용자 관리 | SUPER |
| `/stats` | 통계 | SUPER, ADMIN |
| `/settings` | 설정 | SUPER |

---

## 8. 개발 순서

1. **src/ 받고 현황 파악** — 피그마 산출물 재사용 범위 판단
2. **필수 의존성 추가** — zod, tanstack-query, tanstack-table, zustand
3. **공통 인프라 구축** — `lib/*`, `config/*`, `types/*`
4. **라우팅 재구성** — `routes/index.tsx` 중앙화, 가드 적용
5. **레이아웃 통합** — 피그마 사이드바/헤더 붙이기
6. **로그인 페이지** (목업 인증 먼저)
7. **부스 CRUD** — 패턴 확정 지점
8. 공지 → 사용자 → 공연 → 업로드 → 대시보드/통계

백엔드 없는 단계에서는 **MSW** 또는 간단한 `mock-api.ts`로 가짜 응답.

---

## 9. 환경 변수

Vite에서는 `VITE_` prefix 필수.

```bash
# .env.example
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=대동제 어드민
VITE_USE_MOCK=true
```

```typescript
// lib/env.ts
import { z } from 'zod';

const schema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_NAME: z.string(),
  VITE_USE_MOCK: z.enum(['true', 'false']).transform(v => v === 'true'),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  console.error(parsed.error.format());
  throw new Error('환경변수 검증 실패');
}

export const env = {
  API_BASE_URL: parsed.data.VITE_API_BASE_URL,
  APP_NAME: parsed.data.VITE_APP_NAME,
  USE_MOCK: parsed.data.VITE_USE_MOCK,
};
```

---

## 10. 코드 컨벤션

- 파일명: kebab-case (`booth-table.tsx`)
- 컴포넌트: PascalCase, named export 선호
- 훅: `use-` prefix
- `index.ts` barrel 안 씀
- 경로 별칭: `@/*` (이미 설정됨)
- Tailwind v4 문법 유지 (`@theme inline`, oklch)
- 색상은 **CSS 변수 사용** (`bg-background`, `text-foreground` 등) — 다크모드 자동 대응

---

## 11. 다크모드

`next-themes` 이미 설치됨 → React에서도 동작.

```tsx
// src/main.tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system">
  <App />
</ThemeProvider>
```
