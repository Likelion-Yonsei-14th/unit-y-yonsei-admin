# 예약 목록 자동 갱신 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예약 관리 화면이 새 PENDING 예약을 운영자 개입 없이 최대 15초 안에 뱃지·토스트로 반영한다.

**Architecture:** 예약 관리 화면이 전체 풀 대신 부스별 엔드포인트를 15초 주기로 폴링한다(TanStack Query `refetchInterval`). 폴링 결과의 예약 id 집합을 직전과 비교해 새로 등장한 PENDING 건을 토스트로 알리고, `대기자 목록` 탭에는 미처리 건수 뱃지를 단다. 백엔드 변경 없음.

**Tech Stack:** React 19, TanStack Query v5, sonner(toast), Vite, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-17-reservation-auto-refresh-design.md`

**테스트 러너 주의:** 이 레포는 테스트 러너가 없다(CLAUDE.md). 각 태스크의 검증은 `pnpm typecheck` 통과 + `pnpm dev`(`VITE_USE_MOCK=true`) 수동 확인으로 한다. 커밋 전 `pnpm typecheck`가 깨끗해야 한다.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/features/reservations/api.ts` | 예약 데이터 fetch (mock/real 분기) | 부스별 조회 함수 + mock 신규 예약 주입 추가 |
| `src/features/reservations/hooks.ts` | TanStack Query 래퍼 + 알림 훅 | 폴링 훅 + 신규 예약 토스트 훅 추가 |
| `src/pages/reservation-management.tsx` | 예약 관리 화면 | 폴링 훅 전환, 뱃지 렌더, 토스트 훅 연결 |

`dashboard.tsx`·`reservation-booth-picker.tsx`·뮤테이션·백엔드는 변경하지 않는다.

---

### Task 1: 부스별 예약 조회 API + mock 신규 예약 주입

**Files:**
- Modify: `src/features/reservations/api.ts`

- [ ] **Step 1: mock 주입기 + `listBoothReservationsMock` 추가**

`api.ts`에서 `setReservationsStatusBulkMock` 함수 정의가 끝난 직후(주석 `// ---- list / mutations (real) ----` 바로 위)에 아래를 삽입한다:

```ts
// ---- mock: 새 예약 도착 시뮬레이션 ----
// 정적 mock 만으로는 폴링해도 뱃지·토스트가 동작하지 않아 QA 가 불가능하다.
// 부스별로 벽시계 ~20초마다 합성 PENDING 예약을 1건씩, 최대 3건까지 주입한다.
const mockInjectBaseline = new Map<number, number>();
const mockInjectCount = new Map<number, number>();

function maybeInjectMockReservation(boothId: number): void {
  const now = Date.now();
  // 첫 호출은 기준 시각만 잡고 주입하지 않는다 — 진입 직후 토스트 방지.
  if (!mockInjectBaseline.has(boothId)) {
    mockInjectBaseline.set(boothId, now);
    return;
  }
  const count = mockInjectCount.get(boothId) ?? 0;
  if (count >= 3) return;
  if (now - (mockInjectBaseline.get(boothId) ?? now) < 20_000) return;

  mockInjectBaseline.set(boothId, now);
  mockInjectCount.set(boothId, count + 1);
  memory.push({
    id: `MOCKNEW-${boothId}-${count + 1}`,
    boothId,
    time: '',
    name: `신규예약자${count + 1}`,
    people: 2,
    contact: '010-0000-0000',
    status: 'waiting',
  });
}

async function listBoothReservationsMock(boothId: number): Promise<Reservation[]> {
  await new Promise((r) => setTimeout(r, 100));
  maybeInjectMockReservation(boothId);
  return memory.filter((r) => r.boothId === boothId);
}
```

- [ ] **Step 2: `listBoothReservationsReal` 추가**

`api.ts`에서 `listReservationsReal` 함수 정의 바로 아래에 삽입한다:

```ts
async function listBoothReservationsReal(boothId: number): Promise<Reservation[]> {
  const dtos = await api.get<ReservationDTO[]>(`/admin/reservations/booths/${boothId}`);
  return dtos.map(toReservation);
}
```

- [ ] **Step 3: 분기 export 추가**

`api.ts` 맨 아래 `// ---- 분기 export ----` 블록에서 `export const listReservations = ...` 줄 바로 아래에 삽입한다:

```ts
export const listBoothReservations = env.USE_MOCK
  ? listBoothReservationsMock
  : listBoothReservationsReal;
```

- [ ] **Step 4: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/reservations/api.ts
git commit -m "feat(reservations): 부스별 예약 조회 API + mock 신규 예약 주입"
```

---

### Task 2: 부스 예약 폴링 훅 + 신규 예약 토스트 훅

**Files:**
- Modify: `src/features/reservations/hooks.ts`

- [ ] **Step 1: import 보강**

`hooks.ts` 상단 import 3줄을 아래로 교체한다.

기존:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listReservations, setReservationStatus, setReservationsStatusBulk } from './api';
```

교체 후:
```ts
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listBoothReservations,
  listReservations,
  setReservationStatus,
  setReservationsStatusBulk,
} from './api';
import type { Reservation } from './types';
```

- [ ] **Step 2: `useBoothReservations` 폴링 훅 추가**

`hooks.ts`에서 `useReservations` 함수 정의가 끝난 직후에 삽입한다:

```ts
/**
 * 부스 단위 예약 조회 + 15초 폴링.
 *
 * 예약 관리 화면 전용. 전체 풀(useReservations)을 폴링하면 부스 50여 개 전체를
 * 매 15초 내려받게 되므로, 한 부스만 보는 이 화면은 부스별 엔드포인트를 친다.
 * queryKey 가 ['reservations', ...] prefix 라 기존 뮤테이션의
 * invalidateQueries({ queryKey: ['reservations'] }) 가 그대로 이 쿼리도 무효화한다.
 * refetchIntervalInBackground 는 기본값(false) — 백그라운드 탭은 폴링하지 않는다.
 */
export function useBoothReservations(boothId: number) {
  return useQuery({
    queryKey: ['reservations', 'booth', boothId],
    queryFn: () => listBoothReservations(boothId),
    refetchInterval: 15_000,
    enabled: Number.isFinite(boothId),
  });
}
```

- [ ] **Step 3: `useNewReservationAlert` 토스트 훅 추가**

`hooks.ts` 맨 아래에 삽입한다:

```ts
/**
 * 폴링으로 새 PENDING 예약이 들어오면 토스트로 알린다.
 *
 * 풀에 없던 id 중 status 가 waiting 인 것만 "신규"로 센다 — 단순 건수 비교로는
 * '완료 → 대기로 되돌리기' 전이를 신규 도착으로 오인한다.
 * 첫 데이터 채움과 부스 전환 직후에는 토스트하지 않는다.
 */
export function useNewReservationAlert(
  reservations: Reservation[],
  boothId: number,
  onViewWaiting: () => void,
) {
  // null = 아직 기준 집합 미설정 (첫 로드 토스트 스킵용).
  const prevIdsRef = useRef<Set<string> | null>(null);
  const prevBoothIdRef = useRef(boothId);
  // 콜백을 ref 로 받아 effect deps 에서 제외 — 렌더마다 effect 가 재실행되지 않도록.
  const onViewWaitingRef = useRef(onViewWaiting);
  onViewWaitingRef.current = onViewWaiting;

  useEffect(() => {
    // 부스 전환 시 직전 부스 데이터를 신규로 오인하지 않도록 기준 집합 리셋.
    if (prevBoothIdRef.current !== boothId) {
      prevBoothIdRef.current = boothId;
      prevIdsRef.current = null;
    }

    const currentIds = new Set(reservations.map((r) => r.id));

    // 첫 채움: 토스트 없이 기준 집합만 설정.
    if (prevIdsRef.current === null) {
      prevIdsRef.current = currentIds;
      return;
    }

    const prevIds = prevIdsRef.current;
    const newPendingCount = reservations.filter(
      (r) => r.status === 'waiting' && !prevIds.has(r.id),
    ).length;
    prevIdsRef.current = currentIds;

    if (newPendingCount > 0) {
      toast(`새 예약 ${newPendingCount}건이 들어왔습니다`, {
        action: {
          label: '대기자 목록 보기',
          onClick: () => onViewWaitingRef.current(),
        },
      });
    }
  }, [reservations, boothId]);
}
```

- [ ] **Step 4: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/reservations/hooks.ts
git commit -m "feat(reservations): 부스 예약 폴링 훅 + 신규 예약 토스트 훅"
```

---

### Task 3: 예약 관리 화면을 부스별 폴링 조회로 전환

**Files:**
- Modify: `src/pages/reservation-management.tsx`

- [ ] **Step 1: import 교체**

import 블록에서 `useReservations`를 `useBoothReservations`로 바꾼다.

기존:
```ts
import {
  useReservations,
  useSetReservationStatus,
  useSetReservationsStatusBulk,
} from '@/features/reservations/hooks';
```

교체 후:
```ts
import {
  useBoothReservations,
  useSetReservationStatus,
  useSetReservationsStatusBulk,
} from '@/features/reservations/hooks';
```

- [ ] **Step 2: 쿼리 호출 교체 + `reservations` 중간 변수 제거**

기존(현재 46~51행):
```ts
  const reservationsQuery = useReservations();
  // useMemo 로 묶어 매 렌더 새 빈 배열이 만들어지지 않게 — 하위 useMemo deps 안정.
  const reservations: Reservation[] = useMemo(
    () => reservationsQuery.data ?? [],
    [reservationsQuery.data],
  );
```

교체 후:
```ts
  const reservationsQuery = useBoothReservations(boothId);
```

- [ ] **Step 3: `boothReservations`를 쿼리 데이터로 직접 사용**

기존(현재 72~75행):
```ts
  const boothReservations = useMemo(
    () => reservations.filter((r) => r.boothId === boothId),
    [reservations, boothId],
  );
```

교체 후:
```ts
  // useBoothReservations 가 이미 부스 단위로 조회하므로 추가 필터가 필요 없다.
  // useMemo 로 묶어 매 렌더 새 빈 배열이 만들어지지 않게 — 하위 useMemo deps 안정.
  const boothReservations: Reservation[] = useMemo(
    () => reservationsQuery.data ?? [],
    [reservationsQuery.data],
  );
```

- [ ] **Step 4: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과. (`reservations` 중간 변수는 제거됐고, `Reservation` 타입·`useMemo` import 는 여전히 다른 곳에서 쓰이므로 미사용 경고가 없어야 한다.)

- [ ] **Step 5: 수동 확인**

`pnpm dev` 실행 후 `super`/`super1234`로 로그인 → `/reservations/1` 접속.
- 부스 1의 예약 13건이 정상 표시되는지 확인.
- 약 20~35초 기다리면 `대기자 목록`에 `신규예약자1` 행이 새로 나타나는지 확인(폴링 동작).

- [ ] **Step 6: 커밋**

```bash
git add src/pages/reservation-management.tsx
git commit -m "refactor(reservations): 예약 관리 화면을 부스별 폴링 조회로 전환"
```

---

### Task 4: 대기자 목록 탭에 미처리 건수 뱃지

**Files:**
- Modify: `src/pages/reservation-management.tsx`

- [ ] **Step 1: 미처리 건수 파생값 추가**

Task 3에서 만든 `boothReservations` useMemo 블록(`[reservationsQuery.data],` 로 끝남) 바로 다음 줄에, 빈 줄 하나를 두고 삽입한다:

```ts
  // 대기자 목록 탭 뱃지용 — 미처리(waiting) 예약 건수.
  const waitingCount = boothReservations.reduce(
    (n, r) => (r.status === 'waiting' ? n + 1 : n),
    0,
  );
```

- [ ] **Step 2: 탭 버튼에 뱃지 렌더**

상태 필터 탭의 `statuses.map(...)` 버튼을 아래로 교체한다.

기존:
```tsx
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`
                px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${
                  selectedStatus === status
                    ? 'bg-foreground text-primary-foreground shadow-lg'
                    : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
                }
              `}
            >
              {status}
            </button>
          ))}
```

교체 후:
```tsx
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`
                inline-flex items-center gap-2
                px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${
                  selectedStatus === status
                    ? 'bg-foreground text-primary-foreground shadow-lg'
                    : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
                }
              `}
            >
              {status}
              {status === '대기자 목록' && waitingCount > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold
                    ${
                      selectedStatus === status
                        ? 'bg-primary-foreground text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }
                  `}
                >
                  {waitingCount}
                </span>
              )}
            </button>
          ))}
```

- [ ] **Step 3: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 4: 수동 확인**

`pnpm dev`에서 `/reservations/1` 접속.
- `대기자 목록` 탭 라벨 옆에 미처리 건수 뱃지가 보이는지 확인.
- 폴링으로 신규 예약이 주입되면(약 20~35초 후) 뱃지 숫자가 +1 되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/pages/reservation-management.tsx
git commit -m "feat(reservations): 대기자 목록 탭에 미처리 건수 뱃지"
```

---

### Task 5: 새 예약 도착 시 토스트 알림 연결

**Files:**
- Modify: `src/pages/reservation-management.tsx`

- [ ] **Step 1: import 에 `useNewReservationAlert` 추가**

import 블록을 아래로 교체한다.

기존:
```ts
import {
  useBoothReservations,
  useSetReservationStatus,
  useSetReservationsStatusBulk,
} from '@/features/reservations/hooks';
```

교체 후:
```ts
import {
  useBoothReservations,
  useNewReservationAlert,
  useSetReservationStatus,
  useSetReservationsStatusBulk,
} from '@/features/reservations/hooks';
```

- [ ] **Step 2: 토스트 훅 호출**

Task 4에서 추가한 `waitingCount` 정의 블록 바로 다음 줄에, 빈 줄 하나를 두고 삽입한다:

```ts
  // 폴링으로 새 PENDING 예약이 들어오면 토스트로 알리고, 클릭 시 대기자 탭으로 이동.
  useNewReservationAlert(boothReservations, boothId, () =>
    setSelectedStatus('대기자 목록'),
  );
```

(이 호출은 모든 early-return 분기보다 위에 있어야 한다 — Rules of Hooks. `waitingCount` 위치가 early-return 위이므로 그 다음 줄도 안전하다.)

- [ ] **Step 3: 타입 검사**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 4: 수동 확인**

`pnpm dev`에서 `/reservations/1` 접속.
- 진입 직후에는 토스트가 뜨지 않는지 확인(첫 로드 스킵).
- 약 20~35초 후 `새 예약 1건이 들어왔습니다` 토스트가 뜨는지 확인.
- 토스트의 `대기자 목록 보기` 버튼 클릭 시 `대기자 목록` 탭으로 전환되는지 확인.
- 완료 목록 탭을 보고 있어도 토스트·뱃지로 신규 예약을 인지할 수 있는지 확인.
- (Super 계정으로) `/reservations/3` 등 다른 부스로 이동했을 때 직전 부스 예약이 신규로 잘못 토스트되지 않는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/pages/reservation-management.tsx
git commit -m "feat(reservations): 새 예약 도착 시 토스트 알림 연결"
```

---

## 완료 기준

- `pnpm typecheck` 통과.
- `pnpm dev`(`VITE_USE_MOCK=true`)에서 예약 관리 화면이 15초 주기로 폴링하며,
  새 예약 주입 시 `대기자 목록` 탭 뱃지가 증가하고 토스트가 뜬다.
- dashboard·booth-picker 화면은 기존과 동일하게 동작한다(폴링 없음).
