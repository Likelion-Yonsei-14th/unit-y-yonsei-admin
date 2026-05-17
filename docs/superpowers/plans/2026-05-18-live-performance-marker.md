# 라이브 공연 수동 지정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Super 관리자가 `/performance` 목록에서 현재 라이브 공연팀을 수동으로 지정/해제하고, 그 상태가 백엔드에 단일 값으로 저장되게 한다.

**Architecture:** "현재 라이브 공연"을 각 Performance의 boolean 이 아니라 단일 상태 `currentLiveTeamId`(`number | null`)로 둔다. 전용 엔드포인트 `GET/PUT /performances/live` 계약을 대상으로 mock-first 구현. UI는 기존 `PerformanceListPage`에 라이브 배너 + 행별 컨트롤을 더하고 `performance.live` 권한(Super)으로 게이트한다.

**Tech Stack:** React 19, TanStack Query v5, sonner(toast), TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-18-live-performance-marker-design.md`

**테스트 주의:** 이 레포는 vitest 가 있으나 로컬에선 iCloud 동기화 이슈로 행이 걸린다. 각 태스크 검증은 `pnpm typecheck` + `pnpm dev`(`VITE_USE_MOCK=true`) 수동 확인으로 한다. 커밋 전 `pnpm typecheck` 가 깨끗해야 한다. pre-commit 훅은 prettier 만 돌린다(eslint 는 macOS 데드락으로 훅에서 제거됨 — `--no-verify` 불필요).

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/config/permissions.ts` | 액션→역할 권한 맵 | `performance.live` 권한 추가 |
| `src/features/performances/api.ts` | 공연 데이터 fetch (mock/real) | 라이브 상태 조회/설정 함수 추가 |
| `src/features/performances/hooks.ts` | TanStack Query 래퍼 | 라이브 조회/설정 훅 추가 |
| `src/pages/performance-list.tsx` | Super/Master 공연 목록 페이지 | 라이브 배너 + 행별 지정/해제 컨트롤 (Super 한정) |

라우트·nav·관객용 앱·백엔드 코드는 변경하지 않는다.

---

### Task 1: `performance.live` 권한 추가

**Files:**
- Modify: `src/config/permissions.ts`

- [ ] **Step 1: 권한 항목 추가**

`PERMISSIONS` 맵의 `// 공연` 블록을 아래로 교체한다.

기존:
```ts
  // 공연
  'performance.read': ['Super', 'Master', 'Performer'],
  'performance.manage': ['Super', 'Master'],
  'performance.update.own': ['Performer'],
```

교체 후:
```ts
  // 공연
  'performance.read': ['Super', 'Master', 'Performer'],
  'performance.manage': ['Super', 'Master'],
  'performance.update.own': ['Performer'],
  // 라이브 공연 수동 지정 — 운영 단일 책임이라 Super 만.
  'performance.live': ['Super'],
```

- [ ] **Step 2: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과. (`Permission` 유니온에 `'performance.live'` 가 자동 추가된다.)

- [ ] **Step 3: 커밋**

```bash
git add src/config/permissions.ts
git commit -m "feat(performances): performance.live 권한 추가 (Super 전용)"
```

---

### Task 2: 라이브 공연 API (mock/real)

**Files:**
- Modify: `src/features/performances/api.ts`

- [ ] **Step 1: mock 라이브 함수 추가**

`api.ts` 에서 `updatePerformanceMock` 함수 정의가 끝난 직후(주석 `// ---- 실제 구현 ----` 바로 위)에 삽입한다:

```ts
// ---- 라이브 공연 (현재 공연중 수동 지정) — mock ----
// 단일 상태: 한 번에 한 팀만 라이브. mock 은 모듈 변수로 세션 동안 유지.
let mockLiveTeamId: number | null = null;

async function getLivePerformanceMock(): Promise<number | null> {
  await new Promise((r) => setTimeout(r, 100));
  return mockLiveTeamId;
}

async function setLivePerformanceMock(teamId: number | null): Promise<number | null> {
  await new Promise((r) => setTimeout(r, 120));
  mockLiveTeamId = teamId;
  return mockLiveTeamId;
}
```

- [ ] **Step 2: real 라이브 함수 추가**

`api.ts` 에서 `updatePerformanceReal` 함수 정의가 끝난 직후(주석 `// ---- 분기 export ----` 바로 위)에 삽입한다:

```ts
async function getLivePerformanceReal(): Promise<number | null> {
  const res = await api.get<{ teamId: number | null }>('/performances/live');
  return res.teamId;
}

async function setLivePerformanceReal(teamId: number | null): Promise<number | null> {
  const res = await api.put<{ teamId: number | null }>('/performances/live', { teamId });
  return res.teamId;
}
```

- [ ] **Step 3: 분기 export 추가**

`api.ts` 맨 아래 `// ---- 분기 export ----` 블록에서 `export const updatePerformance = ...` 줄 바로 아래에 삽입한다:

```ts
export const getLivePerformance = env.USE_MOCK ? getLivePerformanceMock : getLivePerformanceReal;
export const setLivePerformance = env.USE_MOCK ? setLivePerformanceMock : setLivePerformanceReal;
```

- [ ] **Step 4: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/performances/api.ts
git commit -m "feat(performances): 라이브 공연 상태 조회/설정 API (mock/real)"
```

---

### Task 3: 라이브 공연 훅

**Files:**
- Modify: `src/features/performances/hooks.ts`

- [ ] **Step 1: import 보강**

`hooks.ts` 상단의 `./api` import 줄을 아래로 교체한다.

기존:
```ts
import { getMyPerformance, getPerformance, listPerformances, updatePerformance } from './api';
```

교체 후:
```ts
import {
  getLivePerformance,
  getMyPerformance,
  getPerformance,
  listPerformances,
  setLivePerformance,
  updatePerformance,
} from './api';
```

- [ ] **Step 2: 라이브 훅 2개 추가**

`hooks.ts` 맨 아래(파일 끝, `useUpdatePerformance` 함수 정의 다음)에 삽입한다:

```ts
/**
 * 현재 라이브로 지정된 공연팀 id 조회 (없으면 null) + 15초 폴링.
 * 운영 중 다른 Super 스태프의 변경을 따라잡기 위한 폴링.
 */
export function useLivePerformance() {
  return useQuery({
    queryKey: ['performances', 'live'],
    queryFn: getLivePerformance,
    refetchInterval: 15_000,
  });
}

/**
 * 라이브 공연 지정/해제. teamId=null 이면 해제.
 * 성공 시 라이브 쿼리 캐시를 즉시 갱신해 화면에 바로 반영.
 */
export function useSetLivePerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setLivePerformance,
    onSuccess: (teamId) => {
      queryClient.setQueryData(['performances', 'live'], teamId);
    },
  });
}
```

(`useQuery`, `useMutation`, `useQueryClient` 는 파일 첫 줄에서 이미 import 돼 있다.)

- [ ] **Step 3: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/features/performances/hooks.ts
git commit -m "feat(performances): useLivePerformance / useSetLivePerformance 훅"
```

---

### Task 4: 공연 목록 페이지에 라이브 컨트롤

**Files:**
- Modify: `src/pages/performance-list.tsx`

- [ ] **Step 1: import 교체**

파일 상단 import 4줄(1~6행)을 아래로 교체한다.

기존:
```ts
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Music, Calendar, MapPin } from 'lucide-react';
import { usePerformances } from '@/features/performances/hooks';
import { PERFORMANCE_STAGES, type PerformanceStage } from '@/features/performances/types';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';
```

교체 후:
```ts
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Music, Calendar, MapPin, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePerformances,
  useLivePerformance,
  useSetLivePerformance,
} from '@/features/performances/hooks';
import { PERFORMANCE_STAGES, type PerformanceStage } from '@/features/performances/types';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';
import { useAuth } from '@/features/auth/hooks';
```

- [ ] **Step 2: 라이브 상태·핸들러 추가**

`const { data, isLoading, isError, refetch } = usePerformances();` 줄 바로 아래에 삽입한다:

```ts
  const { can } = useAuth();
  const canLive = can('performance.live');
  const { data: liveTeamId } = useLivePerformance();
  const setLive = useSetLivePerformance();

  // 라이브로 지정된 팀의 목록 아이템 — 현재 필터(날짜/스테이지)와 무관하게 전체에서 찾는다.
  const liveTeam = useMemo(
    () => (liveTeamId != null ? (data?.find((p) => p.teamId === liveTeamId) ?? null) : null),
    [data, liveTeamId],
  );

  const handleSetLive = (teamId: number | null) => {
    setLive.mutate(teamId, {
      onSuccess: (next) => {
        toast(next == null ? '라이브 공연을 해제했습니다.' : '라이브 공연으로 지정했습니다.');
      },
      onError: () => toast.error('라이브 지정에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    });
  };
```

- [ ] **Step 3: 라이브 배너 추가**

헤더 `<div>` 블록(`<h1>` 을 감싼 `<div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">...</div>`)이 끝난 직후, `{/* Filters */}` 주석 바로 위에 삽입한다:

```tsx
      {/* 현재 라이브 공연 배너 — Super 전용 */}
      {canLive && (
        <div className="bg-background rounded-2xl p-5 mb-6 shadow-sm border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Radio size={20} className="text-destructive" aria-hidden="true" />
            <div>
              <div className="text-sm text-muted-foreground">현재 라이브 공연</div>
              <div className="font-semibold text-foreground">
                {liveTeam ? liveTeam.teamName : '지정된 라이브 공연 없음'}
              </div>
            </div>
          </div>
          {liveTeamId != null && (
            <button
              type="button"
              onClick={() => handleSetLive(null)}
              disabled={setLive.isPending}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors text-sm disabled:opacity-50"
            >
              라이브 해제
            </button>
          )}
        </div>
      )}
```

- [ ] **Step 4: 공연 카드에 LIVE 배지 + 지정 버튼**

목록 렌더 블록의 카드 `map` 을 아래로 교체한다.

기존:
```tsx
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.teamId}
              to={`/performance/${p.teamId}`}
              className="bg-background rounded-2xl p-5 shadow-sm border border-border hover:border-primary hover:shadow-md transition-all flex gap-4"
            >
              <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {p.mainPhotoUrl ? (
                  <img src={p.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={24} className="text-ds-text-disabled" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">{p.teamName}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {PERFORMANCE_STAGES[p.stage].label}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {p.startTime} ~ {p.endTime}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
```

교체 후:
```tsx
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const isLive = p.teamId === liveTeamId;
            return (
              <div
                key={p.teamId}
                className={`bg-background rounded-2xl shadow-sm border transition-all ${
                  isLive
                    ? 'border-destructive'
                    : 'border-border hover:border-primary hover:shadow-md'
                }`}
              >
                <Link to={`/performance/${p.teamId}`} className="flex gap-4 p-5">
                  <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {p.mainPhotoUrl ? (
                      <img src={p.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={24} className="text-ds-text-disabled" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{p.teamName}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex-shrink-0">
                          ● LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {PERFORMANCE_STAGES[p.stage].label}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.startTime} ~ {p.endTime}
                    </div>
                  </div>
                </Link>
                {canLive && (
                  <div className="px-5 pb-4">
                    <button
                      type="button"
                      onClick={() => handleSetLive(isLive ? null : p.teamId)}
                      disabled={setLive.isPending}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        isLive
                          ? 'border border-border bg-background text-foreground hover:bg-muted'
                          : 'bg-primary text-primary-foreground hover:bg-ds-primary-pressed'
                      }`}
                    >
                      {isLive ? '라이브 해제' : '라이브로 지정'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
```

- [ ] **Step 5: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 6: 수동 확인**

`pnpm dev`(`VITE_USE_MOCK=true`) → `super` / `super1234` 로 로그인 → `/performance` 접속.
- 초기: "현재 라이브 공연 / 지정된 라이브 공연 없음" 배너.
- 한 공연 카드의 `라이브로 지정` 클릭 → 토스트, 배너에 팀명, 그 카드에 `● LIVE` 배지 + 빨간 테두리, 버튼이 `라이브 해제` 로.
- 다른 카드 `라이브로 지정` → 라이브가 새 팀으로 교체(이전 카드 배지 사라짐).
- 배너의 `라이브 해제` → 배너 "없음", 모든 카드 배지 사라짐.
- `master` / `master1234` 로 로그인 → `/performance` 에 배너·지정 버튼이 안 보임(목록은 보임).

- [ ] **Step 7: 커밋**

```bash
git add src/pages/performance-list.tsx
git commit -m "feat(performances): 공연 목록에 라이브 지정/해제 컨트롤"
```

---

## 완료 기준

- `pnpm typecheck` 통과.
- `VITE_USE_MOCK=true` 에서 Super 가 `/performance` 에서 라이브 공연을 지정·교체·해제할 수 있고, 한 번에 한 팀만 라이브다.
- Master 는 목록은 보되 라이브 컨트롤은 보이지 않는다.
- real 경로는 `GET/PUT /performances/live` 계약에 연결돼 있어, 백엔드 구현 시 그대로 동작한다.
