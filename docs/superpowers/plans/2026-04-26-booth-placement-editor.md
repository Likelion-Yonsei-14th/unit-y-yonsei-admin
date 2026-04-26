# 부스 배치 편집기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Super 권한 어드민이 지도 위에서 부스 자리를 시각적으로 찍어 좌표를 만들고, 백엔드 시드용 JSON으로 export하며 동시에 기존 view 페이지에 즉시 반영되는 편집기를 구축한다.

**Architecture:** 기존 view-mode 컴포넌트는 손대지 않고 `features/booth-layout/components/placement-*` 하위에 평행 컴포넌트를 두되, letterbox 정합 계산은 `useImagePaintedRect` 훅으로 추출해 공유. mock 환경은 localStorage로 영속화하고, mutation은 TanStack Query로 invalidate해 view 페이지가 즉시 따라옴. PK는 surrogate `id`로 변경해 1 운영자 ↔ N 자리 케이스를 모델에 반영.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind v4 + shadcn/ui, TanStack Query, react-router. 테스트 러너 미설정 — 검증은 `pnpm typecheck` + 수동 브라우저 QA.

**연관 문서:** `docs/superpowers/specs/2026-04-26-booth-placement-editor-design.md`

---

## 작업 환경 메모

- 현재 브랜치 `dev` 위에서 직접 진행 (CLAUDE.md 컨벤션상 작은 단위 커밋을 dev에 누적).
- 매 task = 1 commit. 커밋 메시지 한국어 50자 내외 + Conventional Commits prefix.
- 타입 변경/리팩토링이 view 페이지 호출부에 파급되는 경우, 호출부는 `data[0] ?? null` 같은 최소 패치로 회귀만 막고 본격적인 다중 자리 UX는 follow-up.
- 라우트는 새 top-level `/booth-layout/edit` (`/general/booth-layout`은 기존 텍스트 폼이라 별개로 유지).

---

## Phase 0 — Foundation: 데이터 모델·스토리지·API·훅

### Task 0.1: `BoothPlacement` 타입에 `id` 필드 추가

**Files:**
- Modify: `src/features/booth-layout/types.ts`
- Modify: `src/features/booth-layout/mapper.ts`
- Modify: `src/mocks/booth-placements.ts`

- [ ] **Step 1: `types.ts` 수정** — DTO/Model 양쪽에 `id` 추가

```ts
// src/features/booth-layout/types.ts (변경 부분)

/**
 * 백엔드 응답 (snake_case).
 * 좌표·크기는 모두 이미지 기준 0–100 % (리사이즈/해상도에 안전).
 * - id = surrogate PK. 한 운영자(booth_id)가 같은 (date, section)에 자리 여러 개 가능.
 * - (x, y) = 사각형 핀의 **중심점** 좌표.
 * - (width, height) = 사각형 footprint.
 */
export interface BoothPlacementDTO {
  id: number;
  booth_id: number;
  date: string;
  section: MapSectionId;
  booth_number: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 프론트 모델 (camelCase). 매퍼를 거쳐 변환. */
export interface BoothPlacement {
  id: number;
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 2: `mapper.ts` 수정** — id 매핑 추가

```ts
// src/features/booth-layout/mapper.ts (전체)
import type { BoothPlacement, BoothPlacementDTO } from './types';

export const toBoothPlacement = (d: BoothPlacementDTO): BoothPlacement => ({
  id: d.id,
  boothId: d.booth_id,
  date: d.date,
  section: d.section,
  boothNumber: d.booth_number,
  x: d.x,
  y: d.y,
  width: d.width,
  height: d.height,
});

export const fromBoothPlacement = (m: BoothPlacement): BoothPlacementDTO => ({
  id: m.id,
  booth_id: m.boothId,
  date: m.date,
  section: m.section,
  booth_number: m.boothNumber,
  x: m.x,
  y: m.y,
  width: m.width,
  height: m.height,
});
```

(`fromBoothPlacement`는 후속 task에서 mutation 호출부가 사용)

- [ ] **Step 3: `mocks/booth-placements.ts` 시드 갱신** — 각 row에 id 추가

```ts
// src/mocks/booth-placements.ts (전체)
import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * UI 동작 확인용 시드. 좌표·크기 모두 임의값.
 * 정식 좌표는 placement editor (/booth-layout/edit) 로 시딩.
 */
export const mockBoothPlacements: BoothPlacementDTO[] = [
  { id: 1, booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38, width: 5, height: 6 },
  { id: 2, booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52, width: 7, height: 3 },
  { id: 3, booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40, width: 8, height: 10 },
];
```

- [ ] **Step 4: typecheck**

Run: `pnpm typecheck`
Expected: 통과 (현재 호출부는 `id`를 안 쓰지만 추가는 호환됨).

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/types.ts src/features/booth-layout/mapper.ts src/mocks/booth-placements.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): placement DTO/Model 에 surrogate id 추가

운영자(booth_id) 1명이 같은 (date, section) 에 자리 여러 개를 가질 수 있어
복합키 (booth_id, date) 만으로는 row 식별이 불가. surrogate id 도입 + 매퍼에
fromBoothPlacement 추가해 mutation 호출부에서 사용.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 0.2: localStorage persistence layer 작성

**Files:**
- Create: `src/features/booth-layout/storage.ts`

- [ ] **Step 1: `storage.ts` 작성**

```ts
// src/features/booth-layout/storage.ts
import type { BoothPlacementDTO, MapSectionId } from './types';
import { mockBoothPlacements } from '@/mocks/booth-placements';

/**
 * mock 환경의 placement persistence.
 * 백엔드 붙는 시점엔 api.ts 의 real 구현이 대체하므로 view-layer 는
 * storage 의 존재를 모른다.
 *
 * 키 versioned (`:v1`) — 스키마 변경 시 키 bump 으로 안전 마이그레이션.
 */
const STORAGE_KEY = 'unit-y:placements:v1';

function readRaw(): BoothPlacementDTO[] {
  if (typeof window === 'undefined') return [...mockBoothPlacements];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeRaw(mockBoothPlacements);
      return [...mockBoothPlacements];
    }
    const parsed = JSON.parse(raw) as BoothPlacementDTO[];
    return Array.isArray(parsed) ? parsed : [...mockBoothPlacements];
  } catch {
    return [...mockBoothPlacements];
  }
}

function writeRaw(rows: BoothPlacementDTO[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    // 한도 초과/private mode 등 — 호출부 mutation 에서 toast 처리.
    throw err;
  }
}

export const placementStorage = {
  loadAll(): BoothPlacementDTO[] {
    return readRaw();
  },

  /** id 가 있으면 update, 없으면 throw — create 는 createOne 사용. */
  upsertOne(dto: BoothPlacementDTO): BoothPlacementDTO {
    const rows = readRaw();
    const idx = rows.findIndex((r) => r.id === dto.id);
    if (idx < 0) {
      throw new Error(`placement id ${dto.id} 가 존재하지 않습니다.`);
    }
    // (date, section, booth_number) 중복 검사 — 자기 자신 제외.
    const conflict = rows.find(
      (r) =>
        r.id !== dto.id &&
        r.date === dto.date &&
        r.section === dto.section &&
        r.booth_number === dto.booth_number,
    );
    if (conflict) {
      throw new Error(
        `이미 ${dto.date} ${dto.section} 에 부스번호 "${dto.booth_number}" 가 존재합니다.`,
      );
    }
    rows[idx] = dto;
    writeRaw(rows);
    return dto;
  },

  createOne(input: Omit<BoothPlacementDTO, 'id'>): BoothPlacementDTO {
    const rows = readRaw();
    const conflict = rows.find(
      (r) =>
        r.date === input.date &&
        r.section === input.section &&
        r.booth_number === input.booth_number,
    );
    if (conflict) {
      throw new Error(
        `이미 ${input.date} ${input.section} 에 부스번호 "${input.booth_number}" 가 존재합니다.`,
      );
    }
    const nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const dto: BoothPlacementDTO = { ...input, id: nextId };
    rows.push(dto);
    writeRaw(rows);
    return dto;
  },

  deleteOne(id: number): void {
    const rows = readRaw();
    writeRaw(rows.filter((r) => r.id !== id));
  },

  /**
   * fromDate × section 의 모든 row 를 toDate 로 복제.
   * toDate × section 기존 row 는 삭제(덮어쓰기 시맨틱).
   */
  copyAcrossDates(fromDate: string, toDate: string, section: MapSectionId): BoothPlacementDTO[] {
    if (fromDate === toDate) return [];
    const rows = readRaw();
    const sources = rows.filter((r) => r.date === fromDate && r.section === section);
    if (sources.length === 0) return [];
    const filtered = rows.filter((r) => !(r.date === toDate && r.section === section));
    let nextId = filtered.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const created: BoothPlacementDTO[] = sources.map((s) => ({ ...s, id: nextId++, date: toDate }));
    writeRaw([...filtered, ...created]);
    return created;
  },

  /** 특정 (date, section) 의 모든 row 삭제. */
  resetSection(date: string, section: MapSectionId): void {
    const rows = readRaw();
    writeRaw(rows.filter((r) => !(r.date === date && r.section === section)));
  },
};
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/storage.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): mock placement localStorage 영속화 모듈 추가

editor 가 만든 좌표가 새로고침에도 유지되고 view 페이지로도 즉시 반영되도록
storage layer 분리. UNIQUE(date, section, booth_number) 제약 enforce.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 0.3: 기존 mock api 를 storage 로 교체 + 신규 CRUD/copy 추가

**Files:**
- Modify: `src/features/booth-layout/api.ts`

- [ ] **Step 1: `api.ts` 전체 재작성**

```ts
// src/features/booth-layout/api.ts (전체)
import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { placementStorage } from './storage';
import { toBoothPlacement, fromBoothPlacement } from './mapper';
import type { BoothPlacement, BoothPlacementDTO, MapSectionId } from './types';

// ---- listPlacements(date) ----

const listPlacementsMock = async (date: string): Promise<BoothPlacement[]> =>
  placementStorage.loadAll().filter((p) => p.date === date).map(toBoothPlacement);

const listPlacementsReal = async (date: string): Promise<BoothPlacement[]> => {
  const qs = new URLSearchParams({ date }).toString();
  const data = await api.get<BoothPlacementDTO[]>(`/booth-placements?${qs}`);
  return data.map(toBoothPlacement);
};

export const listPlacements = env.USE_MOCK ? listPlacementsMock : listPlacementsReal;

// ---- getPlacementsByBoothId(boothId) ----
// 한 운영자가 자리 여러 개를 가질 수 있어 array 반환.

const getPlacementsByBoothIdMock = async (boothId: number): Promise<BoothPlacement[]> =>
  placementStorage.loadAll().filter((p) => p.booth_id === boothId).map(toBoothPlacement);

const getPlacementsByBoothIdReal = async (boothId: number): Promise<BoothPlacement[]> => {
  const data = await api.get<BoothPlacementDTO[]>(`/booth-placements/by-booth/${boothId}`);
  return data.map(toBoothPlacement);
};

export const getPlacementsByBoothId = env.USE_MOCK
  ? getPlacementsByBoothIdMock
  : getPlacementsByBoothIdReal;

// ---- createPlacement ----

export interface CreatePlacementInput {
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const createPlacementMock = async (input: CreatePlacementInput): Promise<BoothPlacement> => {
  const dto = placementStorage.createOne({
    booth_id: input.boothId,
    date: input.date,
    section: input.section,
    booth_number: input.boothNumber,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  });
  return toBoothPlacement(dto);
};

const createPlacementReal = async (input: CreatePlacementInput): Promise<BoothPlacement> => {
  const data = await api.post<BoothPlacementDTO>('/booth-placements', {
    booth_id: input.boothId,
    date: input.date,
    section: input.section,
    booth_number: input.boothNumber,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  });
  return toBoothPlacement(data);
};

export const createPlacement = env.USE_MOCK ? createPlacementMock : createPlacementReal;

// ---- updatePlacement ----

const updatePlacementMock = async (placement: BoothPlacement): Promise<BoothPlacement> => {
  const dto = placementStorage.upsertOne(fromBoothPlacement(placement));
  return toBoothPlacement(dto);
};

const updatePlacementReal = async (placement: BoothPlacement): Promise<BoothPlacement> => {
  const data = await api.put<BoothPlacementDTO>(
    `/booth-placements/${placement.id}`,
    fromBoothPlacement(placement),
  );
  return toBoothPlacement(data);
};

export const updatePlacement = env.USE_MOCK ? updatePlacementMock : updatePlacementReal;

// ---- deletePlacement ----

const deletePlacementMock = async (id: number): Promise<void> => {
  placementStorage.deleteOne(id);
};

const deletePlacementReal = async (id: number): Promise<void> => {
  await api.delete(`/booth-placements/${id}`);
};

export const deletePlacement = env.USE_MOCK ? deletePlacementMock : deletePlacementReal;

// ---- copyPlacements ----

export interface CopyPlacementsInput {
  fromDate: string;
  toDate: string;
  section: MapSectionId;
}

const copyPlacementsMock = async (input: CopyPlacementsInput): Promise<BoothPlacement[]> => {
  const created = placementStorage.copyAcrossDates(input.fromDate, input.toDate, input.section);
  return created.map(toBoothPlacement);
};

const copyPlacementsReal = async (input: CopyPlacementsInput): Promise<BoothPlacement[]> => {
  const data = await api.post<BoothPlacementDTO[]>('/booth-placements/copy', {
    from_date: input.fromDate,
    to_date: input.toDate,
    section: input.section,
  });
  return data.map(toBoothPlacement);
};

export const copyPlacements = env.USE_MOCK ? copyPlacementsMock : copyPlacementsReal;

// ---- resetSection ----
// real 백엔드는 `DELETE /booth-placements?date=&section=` 같은 컬렉션 삭제로 매핑하면 된다.
// 시딩 단계에서 mock 만 의미 있어 real 은 동일 의미로 stub.

const resetSectionMock = async (date: string, section: MapSectionId): Promise<void> => {
  placementStorage.resetSection(date, section);
};

const resetSectionReal = async (date: string, section: MapSectionId): Promise<void> => {
  const qs = new URLSearchParams({ date, section }).toString();
  await api.delete(`/booth-placements?${qs}`);
};

export const resetSection = env.USE_MOCK ? resetSectionMock : resetSectionReal;
```

- [ ] **Step 2: `api.delete` / `api.post` / `api.put` 메서드가 존재하는지 확인**

Run: `grep -n "delete\|post\|put" src/lib/api-client.ts`
Expected: get/post/put/delete 모두 존재. 없으면 다음 step 으로 추가.

- [ ] **Step 3: 누락된 메서드가 있으면 `api-client.ts` 에 추가**

만약 누락이면 (예: delete 가 없으면):

```ts
// src/lib/api-client.ts 의 ApiClient 클래스에 추가
async delete<T>(path: string): Promise<T> {
  return this.request<T>(path, { method: 'DELETE' });
}
```

(delete/post/put 시그니처는 기존 get 과 동일 패턴 — 실제 시그니처는 파일 보고 맞출 것)

- [ ] **Step 4: typecheck**

Run: `pnpm typecheck`
Expected: `getPlacementByBoothId` → `getPlacementsByBoothId` 이름 변경으로 호출부 에러 발생할 수 있음. 다음 task 에서 처리.

만약 에러가 나면 일단 다음 step 으로 진행 — Task 0.4 에서 함께 정리.

- [ ] **Step 5: Commit (다음 task 와 연달아 커밋해도 됨)**

타입체크 통과 시점에만 커밋. 호출부 깨지면 0.4 와 묶어 한 번에.

```bash
git add src/features/booth-layout/api.ts src/lib/api-client.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): placement CRUD/copy/reset api 추가

create/update/delete/copy/resetSection 함수와 mock 구현 (storage 위임).
real 구현은 backend 미정 시점이라 stub 만, env.USE_MOCK 분기.
getPlacementByBoothId 를 getPlacementsByBoothId(array 반환) 로 시그니처 변경.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 0.4: hooks.ts 갱신 — 신규 mutation hooks + 기존 useMyBoothPlacement array 화

**Files:**
- Modify: `src/features/booth-layout/hooks.ts`
- Modify: `src/pages/reservation-booth-picker.tsx` (호출부 최소 패치)

- [ ] **Step 1: `hooks.ts` 전체 재작성**

```ts
// src/features/booth-layout/hooks.ts (전체)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  copyPlacements,
  createPlacement,
  deletePlacement,
  getPlacementsByBoothId,
  listPlacements,
  resetSection,
  updatePlacement,
  type CopyPlacementsInput,
  type CreatePlacementInput,
} from './api';
import type { BoothPlacement, MapSectionId } from './types';

/** 특정 날짜에 배치된 부스 목록 조회. */
export function usePlacements(date: string) {
  return useQuery({
    queryKey: ['booth-placements', date],
    queryFn: () => listPlacements(date),
    enabled: !!date,
  });
}

/**
 * 한 운영자(booth account) 의 모든 자리 조회.
 * 자리가 여러 개 가능 — array 반환.
 */
export function useMyBoothPlacements(boothId: number | null) {
  return useQuery({
    queryKey: ['booth-placement', 'by-booth', boothId],
    queryFn: () => getPlacementsByBoothId(boothId!),
    enabled: boothId != null,
  });
}

// ---- mutations ----

export function useCreatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlacementInput) => createPlacement(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', created.date] });
      qc.invalidateQueries({ queryKey: ['booth-placement', 'by-booth', created.boothId] });
    },
  });
}

export function useUpdatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placement: BoothPlacement) => updatePlacement(placement),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', updated.date] });
      qc.invalidateQueries({ queryKey: ['booth-placement', 'by-booth', updated.boothId] });
    },
  });
}

export function useDeletePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string; boothId: number }) =>
      deletePlacement(vars.id).then(() => vars),
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.date] });
      qc.invalidateQueries({ queryKey: ['booth-placement', 'by-booth', vars.boothId] });
    },
  });
}

export function useCopyPlacements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyPlacementsInput) => copyPlacements(input),
    onSuccess: (_created, vars) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.fromDate] });
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.toDate] });
    },
  });
}

export function useResetSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { date: string; section: MapSectionId }) =>
      resetSection(vars.date, vars.section).then(() => vars),
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.date] });
    },
  });
}
```

- [ ] **Step 2: 호출부 최소 패치 — `reservation-booth-picker.tsx`**

`useMyBoothPlacement` 가 사라지고 `useMyBoothPlacements` 로 array 반환이 되었으므로 호출부에서 `[0]` 으로 unwrap. 본격적인 다중 자리 처리는 follow-up.

```bash
grep -n "useMyBoothPlacement\b" src/pages/reservation-booth-picker.tsx
```

발견된 라인의 변경 패턴 (정확한 라인은 grep 결과에 따름):

Before:
```ts
import { useMyBoothPlacement, usePlacements } from '@/features/booth-layout/hooks';
...
const myPlacementQuery = useMyBoothPlacement(isBooth ? (myBoothId ?? null) : null);
...
if (isBooth && myPlacementQuery.data) return [myPlacementQuery.data.date];
...
if (isBooth && myPlacementQuery.data) {
  setSelectedDate(myPlacementQuery.data.date);
}
```

After:
```ts
import { useMyBoothPlacements, usePlacements } from '@/features/booth-layout/hooks';
...
const myPlacementsQuery = useMyBoothPlacements(isBooth ? (myBoothId ?? null) : null);
const myFirstPlacement = myPlacementsQuery.data?.[0] ?? null;
...
if (isBooth && myFirstPlacement) return [myFirstPlacement.date];
...
if (isBooth && myFirstPlacement) {
  setSelectedDate(myFirstPlacement.date);
}
```

(다른 호출 지점이 있다면 동일 패턴으로 수정. `initialFocusBoothId` 등에서 `myPlacementQuery.data?.boothId` 같은 사용도 `myFirstPlacement?.boothId` 로 변경.)

- [ ] **Step 3: 다른 호출부 검색**

```bash
grep -rn "useMyBoothPlacement\b" src/
```

Expected: `reservation-booth-picker.tsx` 외 호출 없음. 있으면 동일 패턴으로 수정.

- [ ] **Step 4: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 5: 브라우저 회귀 확인**

Run: `pnpm dev` (background)

- [ ] Booth 계정(`booth1` / `booth1234`) 으로 로그인 → `/reservations` 진입 → 본인 핀 표시되는지 확인
- [ ] Super 계정(`super` / `super1234`) 으로 로그인 → `/reservations` 진입 → 날짜 전환·핀 클릭 정상 동작
- [ ] 콘솔에 에러 없는지 확인

- [ ] **Step 6: Commit**

```bash
git add src/features/booth-layout/hooks.ts src/pages/reservation-booth-picker.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): placement mutation hooks + useMyBoothPlacements array 화

useCreatePlacement/useUpdatePlacement/useDeletePlacement/useCopyPlacements/
useResetSection 추가. 한 운영자가 여러 자리 가질 수 있어 useMyBoothPlacement →
useMyBoothPlacements (array). 호출부는 일단 [0] 으로 최소 패치, 다중 자리
UX 는 follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — 라우팅·권한·스텁 페이지

### Task 1.1: 권한·nav·라우트·스텁 페이지 1셋

**Files:**
- Modify: `src/config/permissions.ts`
- Modify: `src/config/nav.ts`
- Modify: `src/routes/index.tsx`
- Create: `src/pages/booth-layout-edit.tsx`

- [ ] **Step 1: `permissions.ts` 에 `boothlayout.edit` 추가**

```ts
// src/config/permissions.ts 의 PERMISSIONS 객체 내 부스 배치도 영역에 추가
  // 부스 배치도
  'boothlayout.read': ['Super', 'Master'],
  'boothlayout.manage': ['Super', 'Master'],
  'boothlayout.edit': ['Super'],   // ★ 추가 — 시각 좌표 편집기 전용 (Super only)
```

- [ ] **Step 2: `nav.ts` 에 메뉴 항목 추가** — `MAIN_NAV` 의 `/general` 그룹 children 에 추가

```ts
// src/config/nav.ts 의 children 배열에 추가
{ path: '/booth-layout/edit', label: '부스 좌표 편집', icon: Map, requires: 'boothlayout.edit' },
```

(아이콘은 이미 import 된 `Map` 재사용. 별도 항목으로 두기보단 기존 "부스 배치도 매칭" 옆이 가까워 가독성 좋음.)

`/general` 그룹의 children 으로 두면 url 이 `/booth-layout/edit` 인데 부모가 `/general` 인 게 어색 — 더 자연스러운 위치는 `MAIN_NAV` 최상위. 다음 형태로 추가:

```ts
// src/config/nav.ts (MAIN_NAV 배열 끝, 또는 적절한 위치)
{
  path: '/booth-layout/edit',
  label: '부스 좌표 편집',
  icon: Map,
  requires: 'boothlayout.edit',
},
```

- [ ] **Step 3: `pages/booth-layout-edit.tsx` 스텁 작성**

```tsx
// src/pages/booth-layout-edit.tsx
import { Map } from 'lucide-react';

export function BoothLayoutEditPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-6">
        <Map size={32} />
        <h1 className="text-3xl font-bold text-foreground">부스 좌표 편집</h1>
      </header>
      <main className="flex-1 p-8 text-muted-foreground">
        편집기 UI (구현 예정).
      </main>
    </div>
  );
}
```

- [ ] **Step 4: `routes/index.tsx` 에 라우트 등록**

`pages/booth-layout-edit` import + 라우트 객체 추가:

```tsx
// src/routes/index.tsx 의 page imports 영역
import { BoothLayoutEditPage } from '@/pages/booth-layout-edit';

// children 배열 적절한 위치 (예: '/general/booth-layout' 라우트 다음)
{
  path: 'booth-layout/edit',
  element: (
    <RequirePermission permission="boothlayout.edit">
      <BoothLayoutEditPage />
    </RequirePermission>
  ),
},
```

- [ ] **Step 5: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 6: 브라우저 확인**

Run: `pnpm dev`

- [ ] Super 로그인 → 사이드바에 "부스 좌표 편집" 메뉴 보임 → 클릭 시 `/booth-layout/edit` 로 이동, 스텁 페이지 표시
- [ ] Master 로그인 → 사이드바에 메뉴 안 보임 + 직접 URL 입력 시 가드에 차단
- [ ] Booth/Performer 로그인 → 메뉴 안 보임 + URL 차단

- [ ] **Step 7: Commit**

```bash
git add src/config/permissions.ts src/config/nav.ts src/routes/index.tsx src/pages/booth-layout-edit.tsx
git commit -m "$(cat <<'EOF'
feat(routing): /booth-layout/edit 라우트·권한·nav 항목 추가 (스텁)

Super-only 'boothlayout.edit' 액션 신설. 사이드바 메인 nav 에 항목 등록되며
RequirePermission 가드로 URL 직접 접근도 차단. 페이지 본체는 다음 task 부터.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — 공유 훅 추출

### Task 2.1: `useImagePaintedRect` 훅 추출

**Files:**
- Create: `src/features/booth-layout/hooks/use-image-painted-rect.ts`
- Modify: `src/features/booth-layout/components/booth-map-canvas.tsx`

- [ ] **Step 1: 훅 파일 작성**

```ts
// src/features/booth-layout/hooks/use-image-painted-rect.ts
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UseImagePaintedRectOptions {
  /** 우선 적용할 이미지 종횡비 (W/H). 미지정 시 imgRef 의 naturalWidth/Height 로 fallback. */
  aspectRatio?: number;
  /** aspectRatio 미지정 시 fallback 으로 쓰일 이미지 ref. */
  imgRef?: RefObject<HTMLImageElement | null>;
  /** rect 재계산을 트리거하는 의존성 (예: 활성 섹션 id). */
  reMeasureKey?: unknown;
}

/**
 * object-contain 이미지의 letterbox 제외 painted rect 를 container 기준으로 계산.
 * pin overlay 정합용.
 */
export function useImagePaintedRect(
  containerRef: RefObject<HTMLElement | null>,
  options: UseImagePaintedRectOptions,
): { rect: ImageRect | null; measure: () => void } {
  const { aspectRatio, imgRef, reMeasureKey } = options;
  const [rect, setRect] = useState<ImageRect | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      setRect(null);
      return;
    }
    const img = imgRef?.current;
    const aspect =
      aspectRatio && aspectRatio > 0
        ? aspectRatio
        : img && img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : null;
    if (!aspect) {
      setRect(null);
      return;
    }
    const containerAspect = box.width / box.height;
    let width: number;
    let height: number;
    let left: number;
    let top: number;
    if (containerAspect > aspect) {
      // 가로 letterbox.
      height = box.height;
      width = height * aspect;
      left = (box.width - width) / 2;
      top = 0;
    } else {
      // 상하 letterbox.
      width = box.width;
      height = width / aspect;
      left = 0;
      top = (box.height - height) / 2;
    }
    setRect({ left, top, width, height });
  }, [containerRef, aspectRatio, imgRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, measure]);

  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(raf);
  }, [measure, reMeasureKey]);

  return { rect, measure };
}
```

- [ ] **Step 2: `booth-map-canvas.tsx` 단순화**

기존 `measureImage`, `imageRect` state, ResizeObserver useEffect, useLayoutEffect 를 모두 삭제하고 훅 호출로 대체.

```tsx
// src/features/booth-layout/components/booth-map-canvas.tsx (변경된 부분만)
import { useEffect, useRef, useState } from 'react';
import { Lock, Star } from 'lucide-react';
import {
  useImagePaintedRect,
  type ImageRect,
} from '@/features/booth-layout/hooks/use-image-painted-rect';
import type { MapSection, PickerBooth } from '@/features/booth-layout/types';

// (BoothMapCanvasProps interface 동일)

function usePrevious<T>(value: T): T | undefined {
  // 동일
}

export function BoothMapCanvas({
  section,
  boothsInSection,
  focusedBoothId,
  myBoothId,
  canEnter,
  onPinClick,
}: BoothMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentImgRef = useRef<HTMLImageElement>(null);

  const { rect: imageRect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef: currentImgRef,
    reMeasureKey: section.id,
  });

  // 섹션 스왑 크로스페이드 (동일)
  const [layers, setLayers] = useState<MapSection[]>([section]);
  const prev = usePrevious(section);
  useEffect(() => {
    if (prev && prev.id !== section.id) {
      setLayers([prev, section]);
      const t = setTimeout(() => setLayers([section]), 350);
      return () => clearTimeout(t);
    }
    setLayers([section]);
  }, [section, prev]);

  const focused = boothsInSection.find((b) => b.placement.boothId === focusedBoothId);
  const translateX = focused ? 50 - focused.placement.x : 0;
  const translateY = focused ? 50 - focused.placement.y : 0;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted">
      {layers.map((s) => (
        <img
          key={s.id}
          ref={s.id === section.id ? currentImgRef : undefined}
          src={s.imageUrl}
          alt={s.label}
          aria-hidden={s.id !== section.id}
          onLoad={s.id === section.id ? measure : undefined}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            s.id === section.id ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {imageRect && (
        <div
          className="pointer-events-none absolute transition-transform duration-300 ease-out"
          style={{
            left: imageRect.left,
            top: imageRect.top,
            width: imageRect.width,
            height: imageRect.height,
            transform: `translate(${translateX}%, ${translateY}%)`,
          }}
        >
          {boothsInSection.map((b) => (
            <BoothPin
              key={b.placement.boothId}
              booth={b}
              isFocused={b.placement.boothId === focusedBoothId}
              isMine={b.placement.boothId === myBoothId}
              canEnter={canEnter(b.placement.boothId)}
              onClick={() => onPinClick(b.placement.boothId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// BoothPin 컴포넌트 동일
```

- [ ] **Step 3: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 4: 브라우저 회귀 확인**

Run: `pnpm dev`

- [ ] Super 계정 → `/reservations` 진입 → 5/27/28/29 사이 날짜 전환 시 핀이 정확히 이미지 위에 정합되는지
- [ ] 윈도우 리사이즈 → 핀 위치가 부드럽게 따라오는지

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/hooks/use-image-painted-rect.ts src/features/booth-layout/components/booth-map-canvas.tsx
git commit -m "$(cat <<'EOF'
refactor(booth-layout): useImagePaintedRect 훅으로 letterbox 정합 로직 추출

view/edit 캔버스가 동일하게 필요한 measure/ResizeObserver/useLayoutEffect 묶음을
훅으로 분리. 행동 변경 없음.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — UI 스캐폴딩 (toolbar + list)

### Task 3.1: PlacementToolbar 컴포넌트 (UI 만, 동작 후속)

**Files:**
- Create: `src/features/booth-layout/components/placement-toolbar.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/features/booth-layout/components/placement-toolbar.tsx
import { Copy, RotateCcw, Download } from 'lucide-react';
import { MAP_SECTIONS, FESTIVAL_DATES, type FestivalDate } from '@/features/booth-layout/sections';
import type { MapSectionId } from '@/features/booth-layout/types';

export interface PlacementToolbarProps {
  selectedDate: FestivalDate;
  selectedSection: MapSectionId;
  availableSections: MapSectionId[];   // (selectedDate 에 유효한 섹션들)
  onDateChange: (date: FestivalDate) => void;
  onSectionChange: (section: MapSectionId) => void;
  /** 5/29 백양로/한글탑 같은 "전날 동일 섹션 복제" 가능 여부. */
  copyFromPreviousAvailable: boolean;
  onCopyFromPrevious: () => void;
  onResetSection: () => void;
  onExportJson: () => void;
}

/** 5/27 화 / 5/28 수 / 5/29 목 라벨 */
function dateLabel(d: string): string {
  const day = ['일','월','화','수','목','금','토'][new Date(d).getDay()];
  const m = Number(d.slice(5, 7));
  const dd = Number(d.slice(8, 10));
  return `${m}/${dd} (${day})`;
}

export function PlacementToolbar({
  selectedDate,
  selectedSection,
  availableSections,
  onDateChange,
  onSectionChange,
  copyFromPreviousAvailable,
  onCopyFromPrevious,
  onResetSection,
  onExportJson,
}: PlacementToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-6 py-3">
      {/* 날짜 탭 */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {FESTIVAL_DATES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDateChange(d)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedDate === d
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {dateLabel(d)}
          </button>
        ))}
      </div>

      {/* 섹션 탭 (섹션이 둘 이상일 때만 표시) */}
      {availableSections.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {availableSections.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSectionChange(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSection === s
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {MAP_SECTIONS[s].label}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onCopyFromPrevious}
          disabled={!copyFromPreviousAvailable}
          title={
            copyFromPreviousAvailable
              ? '전날의 동일 섹션 좌표를 그대로 복제합니다'
              : '복제할 전날 좌표가 없거나 5/27 입니다'
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={14} />
          전날 복제
        </button>
        <button
          type="button"
          onClick={onResetSection}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-destructive hover:bg-ds-error-subtle"
        >
          <RotateCcw size={14} />
          전체 리셋
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-ds-primary-pressed"
        >
          <Download size={14} />
          JSON Export
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-toolbar.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): PlacementToolbar 컴포넌트 추가

날짜·섹션 탭과 전날 복제/전체 리셋/JSON Export 버튼을 가진 편집기 상단 툴바.
동작은 다음 task 들에서 wiring.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: PlacementList 컴포넌트 (좌측 운영자 목록)

**Files:**
- Create: `src/features/booth-layout/components/placement-list.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/features/booth-layout/components/placement-list.tsx
import type { BoothProfile } from '@/features/booths/types';
import type { BoothPlacement } from '@/features/booth-layout/types';

export interface PlacementListProps {
  /** 운영자(부스 계정) 풀. */
  booths: BoothProfile[];
  /** 현재 (date, section) 의 placements. boothId 기준 카운트 표시용. */
  placementsInSection: BoothPlacement[];
  selectedBoothId: number | null;
  onSelectBooth: (boothId: number | null) => void;
}

export function PlacementList({
  booths,
  placementsInSection,
  selectedBoothId,
  onSelectBooth,
}: PlacementListProps) {
  const countByBooth = new Map<number, number>();
  for (const p of placementsInSection) {
    countByBooth.set(p.boothId, (countByBooth.get(p.boothId) ?? 0) + 1);
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-background">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">운영자 (부스 계정)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          운영자를 선택한 뒤 지도 빈 곳을 클릭해 자리를 만드세요. Esc 로 해제.
        </p>
      </header>
      <ul className="flex-1 divide-y divide-border overflow-y-auto">
        {booths.map((b) => {
          const count = countByBooth.get(b.id) ?? 0;
          const selected = selectedBoothId === b.id;
          const displayName = b.name || `(이름 미작성, id: ${b.id})`;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelectBooth(selected ? null : b.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  selected
                    ? 'bg-ds-primary-subtle'
                    : 'hover:bg-muted'
                }`}
                aria-pressed={selected}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
                  {b.organizationName && (
                    <div className="truncate text-xs text-muted-foreground">
                      {b.organizationName}
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    count > 0
                      ? 'bg-ds-success-subtle text-ds-success-pressed'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  title={`이 (날짜, 섹션) 에 ${count} 자리 배치됨`}
                >
                  {count} 자리
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-list.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): PlacementList 컴포넌트 추가

좌측 운영자 목록. 클릭으로 단일 운영자 selected 토글, 자리 카운트 뱃지로
누락 방지.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — 인터랙션 캔버스

### Task 4.1: PlacementEditorCanvas — 핀 렌더링 (read-only)

**Files:**
- Create: `src/features/booth-layout/components/placement-editor-canvas.tsx`

이 task 는 캔버스가 (1) 섹션 이미지 표시, (2) 기존 placements 핀으로 표시, (3) 선택된 placement 시각 강조까지만. 클릭/드래그 인터랙션은 다음 task.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/features/booth-layout/components/placement-editor-canvas.tsx
import { useRef } from 'react';
import { useImagePaintedRect } from '@/features/booth-layout/hooks/use-image-painted-rect';
import type { BoothPlacement, MapSection } from '@/features/booth-layout/types';

export interface PlacementEditorCanvasProps {
  section: MapSection;
  placements: BoothPlacement[];
  selectedPlacementId: number | null;
  selectedBoothId: number | null;
  onSelectPlacement: (id: number | null) => void;
}

export function PlacementEditorCanvas({
  section,
  placements,
  selectedPlacementId,
  selectedBoothId,
  onSelectPlacement,
}: PlacementEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { rect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef,
    reMeasureKey: section.id,
  });

  const onBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onSelectPlacement(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted"
      onClick={onBackgroundClick}
    >
      <img
        ref={imgRef}
        src={section.imageUrl}
        alt={section.label}
        onLoad={measure}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {rect && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          {placements.map((p) => {
            const isSelected = p.id === selectedPlacementId;
            const isInGroup = !isSelected && p.boothId === selectedBoothId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacement(p.id);
                }}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.width}%`,
                  height: `${p.height}%`,
                  minWidth: 8,
                  minHeight: 8,
                }}
                className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 text-xs font-semibold shadow-sm transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/30 ring-2 ring-primary/40'
                    : isInGroup
                    ? 'border-ds-success-pressed bg-ds-success-subtle/70'
                    : 'border-border bg-background/60 hover:border-ds-border-strong'
                }`}
                aria-label={`자리 ${p.boothNumber}`}
              >
                <span className="truncate">{p.boothNumber}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-editor-canvas.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): PlacementEditorCanvas 핀 렌더링 (read-only)

view 캔버스의 letterbox 정합 패턴을 따라 placements 를 핀으로 표시.
선택/같은 운영자 그룹 시각 강조. 클릭/드래그 인터랙션은 다음 task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.2: 캔버스 — 빈 곳 클릭으로 placement 생성

**Files:**
- Modify: `src/features/booth-layout/components/placement-editor-canvas.tsx`

- [ ] **Step 1: 클릭 핸들러 + create 콜백 prop 추가**

`PlacementEditorCanvasProps` 에 추가:

```tsx
  onCreatePlacement: (input: { x: number; y: number; width: number; height: number }) => void;
  /** 마지막에 만든 placement 크기 sticky default. */
  defaultSize: { width: number; height: number };
```

`onBackgroundClick` 을 캔버스 빈 곳 클릭 = 생성으로 교체. 클릭 위치는 image rect 기준 0–100 % 변환:

```tsx
  const onContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) {
      // 핀 클릭은 자식 button 의 stopPropagation 으로 처리됨.
      // 여기 도달했다면 background 클릭.
    }
    if (!rect) return;
    if (selectedBoothId == null) {
      // 운영자 미선택 — 부모에서 좌측 리스트 강조 처리. 여기선 무시.
      onSelectPlacement(null);
      return;
    }
    const containerBox = containerRef.current?.getBoundingClientRect();
    if (!containerBox) return;
    const px = e.clientX - containerBox.left - rect.left;
    const py = e.clientY - containerBox.top - rect.top;
    const x = (px / rect.width) * 100;
    const y = (py / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    onCreatePlacement({
      x: clamp(x, defaultSize.width / 2, 100 - defaultSize.width / 2),
      y: clamp(y, defaultSize.height / 2, 100 - defaultSize.height / 2),
      width: defaultSize.width,
      height: defaultSize.height,
    });
  };

  function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
```

container 의 `onClick` 을 `onContainerClick` 으로 변경.

`핀 클릭의 stopPropagation` 은 이미 들어 있음.

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과 (호출부 stub 페이지에선 prop 안 넘기지만 다음 task 에서 wiring).

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-editor-canvas.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): 편집 캔버스 — 빈 곳 클릭으로 placement 생성

이미지 rect 기준 0-100% 좌표 변환 + 사각형 footprint 가 영역을 벗어나지 않도록
중심 좌표 clamp. 운영자 미선택 시엔 무시(부모에서 좌측 리스트 강조 책임).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.3: 캔버스 — 핀 본체 드래그로 이동

**Files:**
- Modify: `src/features/booth-layout/components/placement-editor-canvas.tsx`

- [ ] **Step 1: drag state + handler 추가**

`PlacementEditorCanvasProps` 에 추가:

```tsx
  onMovePlacement: (id: number, delta: { dxPct: number; dyPct: number }) => void;
```

핀 button 을 드래그 가능한 div 로 변경. mousedown → mousemove → mouseup 패턴, 드래그 중엔 로컬 transform 으로 표시, mouseup 시 `onMovePlacement` 호출.

```tsx
import { useEffect, useRef, useState } from 'react';

// PlacementEditorCanvas 내부:
const [dragState, setDragState] = useState<{
  placementId: number;
  startClientX: number;
  startClientY: number;
  dxPct: number;
  dyPct: number;
} | null>(null);

const onPinMouseDown = (e: React.MouseEvent, p: BoothPlacement) => {
  e.stopPropagation();
  e.preventDefault();
  onSelectPlacement(p.id);
  setDragState({
    placementId: p.id,
    startClientX: e.clientX,
    startClientY: e.clientY,
    dxPct: 0,
    dyPct: 0,
  });
};

useEffect(() => {
  if (!dragState || !rect) return;
  const onMove = (e: MouseEvent) => {
    const dxPct = ((e.clientX - dragState.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragState.startClientY) / rect.height) * 100;
    setDragState((s) => (s ? { ...s, dxPct, dyPct } : s));
  };
  const onUp = () => {
    if (Math.abs(dragState.dxPct) > 0.05 || Math.abs(dragState.dyPct) > 0.05) {
      onMovePlacement(dragState.placementId, {
        dxPct: dragState.dxPct,
        dyPct: dragState.dyPct,
      });
    }
    setDragState(null);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
}, [dragState, rect, onMovePlacement]);
```

핀 렌더링 부분에서 `onMouseDown={(e) => onPinMouseDown(e, p)}` 추가하고, 드래그 중인 핀이면 transform 으로 시각화:

```tsx
const isDragging = dragState?.placementId === p.id;
const liveX = isDragging ? p.x + dragState!.dxPct : p.x;
const liveY = isDragging ? p.y + dragState!.dyPct : p.y;

// style.left/top 을 liveX/liveY 로 사용
```

핀 button 을 `<button>` → `<div role="button" tabIndex={0}>` 로 바꾸거나 button 그대로 두되 `onMouseDown` 에서 preventDefault 로 click 동작 충돌 방지.

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-editor-canvas.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): 편집 캔버스 — 핀 드래그 이동

mousedown/mousemove/mouseup 으로 드래그, 마우스 업 시점에만 onMovePlacement
호출 (api 호출 burst 방지). 드래그 중엔 로컬 dxPct/dyPct 로 시각 표시.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.4: 캔버스 — 8핸들 리사이즈

**Files:**
- Modify: `src/features/booth-layout/components/placement-editor-canvas.tsx`

- [ ] **Step 1: 리사이즈 핸들 + 상태 추가**

`PlacementEditorCanvasProps` 에 추가:

```tsx
  onResizePlacement: (
    id: number,
    next: { x: number; y: number; width: number; height: number },
  ) => void;
```

선택된 placement 위에 8개 핸들(NW/N/NE/E/SE/S/SW/W) 렌더링. 각 핸들 mousedown → window mousemove/mouseup 로 리사이즈 처리.

```tsx
type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const [resizeState, setResizeState] = useState<{
  placementId: number;
  handle: HandleId;
  startClientX: number;
  startClientY: number;
  origin: { x: number; y: number; width: number; height: number };
  next: { x: number; y: number; width: number; height: number };
} | null>(null);

const onHandleMouseDown = (
  e: React.MouseEvent,
  p: BoothPlacement,
  handle: HandleId,
) => {
  e.stopPropagation();
  e.preventDefault();
  setResizeState({
    placementId: p.id,
    handle,
    startClientX: e.clientX,
    startClientY: e.clientY,
    origin: { x: p.x, y: p.y, width: p.width, height: p.height },
    next: { x: p.x, y: p.y, width: p.width, height: p.height },
  });
};

useEffect(() => {
  if (!resizeState || !rect) return;
  const MIN = 1; // 최소 1% × 1%
  const onMove = (e: MouseEvent) => {
    const dxPct = ((e.clientX - resizeState.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - resizeState.startClientY) / rect.height) * 100;
    const o = resizeState.origin;

    // 핀은 중심좌표 기준이므로 핸들에 따라 반대편이 고정.
    // (좌상단 모서리 기준 좌표로 변환 후 다시 중심으로 환산)
    let leftPct = o.x - o.width / 2;
    let topPct = o.y - o.height / 2;
    let rightPct = o.x + o.width / 2;
    let bottomPct = o.y + o.height / 2;
    const h = resizeState.handle;
    if (h === 'nw' || h === 'w' || h === 'sw') leftPct = o.x - o.width / 2 + dxPct;
    if (h === 'ne' || h === 'e' || h === 'se') rightPct = o.x + o.width / 2 + dxPct;
    if (h === 'nw' || h === 'n' || h === 'ne') topPct = o.y - o.height / 2 + dyPct;
    if (h === 'sw' || h === 's' || h === 'se') bottomPct = o.y + o.height / 2 + dyPct;

    leftPct = Math.max(0, leftPct);
    topPct = Math.max(0, topPct);
    rightPct = Math.min(100, rightPct);
    bottomPct = Math.min(100, bottomPct);

    let width = Math.max(MIN, rightPct - leftPct);
    let height = Math.max(MIN, bottomPct - topPct);
    let x = leftPct + width / 2;
    let y = topPct + height / 2;
    setResizeState((s) => (s ? { ...s, next: { x, y, width, height } } : s));
  };
  const onUp = () => {
    onResizePlacement(resizeState.placementId, resizeState.next);
    setResizeState(null);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
}, [resizeState, rect, onResizePlacement]);
```

선택된 placement 의 시각 좌표는 `resizeState?.placementId === p.id ? resizeState.next : p` 로 분기.

핸들 렌더링 (선택된 placement 에 한해, drag/resize 중이 아닐 때만 표시):

```tsx
const HANDLE_OFFSETS: Record<HandleId, { dx: string; dy: string; cursor: string }> = {
  nw: { dx: '0%',  dy: '0%',  cursor: 'nwse-resize' },
  n:  { dx: '50%', dy: '0%',  cursor: 'ns-resize' },
  ne: { dx: '100%',dy: '0%',  cursor: 'nesw-resize' },
  e:  { dx: '100%',dy: '50%', cursor: 'ew-resize' },
  se: { dx: '100%',dy: '100%',cursor: 'nwse-resize' },
  s:  { dx: '50%', dy: '100%',cursor: 'ns-resize' },
  sw: { dx: '0%',  dy: '100%',cursor: 'nesw-resize' },
  w:  { dx: '0%',  dy: '50%', cursor: 'ew-resize' },
};

// 핀 내부 (isSelected 일 때만):
{isSelected && !dragState && !resizeState && (
  <>
    {(Object.keys(HANDLE_OFFSETS) as HandleId[]).map((h) => {
      const o = HANDLE_OFFSETS[h];
      return (
        <span
          key={h}
          onMouseDown={(e) => onHandleMouseDown(e, p, h)}
          style={{
            left: o.dx,
            top: o.dy,
            cursor: o.cursor,
            transform: 'translate(-50%, -50%)',
          }}
          className="pointer-events-auto absolute h-2 w-2 rounded-sm border border-primary bg-background"
        />
      );
    })}
  </>
)}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-editor-canvas.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): 편집 캔버스 — 8핸들 리사이즈

선택된 placement 에 NW/N/NE/E/SE/S/SW/W 핸들. 중심좌표 기준 사각형을 좌상단
기준으로 계산해 반대편 모서리 고정 시맨틱 구현. 최소 1%×1%, 이미지 영역 내
clamp.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.5: 캔버스 — 키보드 이동·삭제

**Files:**
- Modify: `src/features/booth-layout/components/placement-editor-canvas.tsx`

- [ ] **Step 1: keyboard 핸들러 + delete prop**

`PlacementEditorCanvasProps` 에 추가:

```tsx
  onNudgePlacement: (id: number, delta: { dxPct: number; dyPct: number }) => void;
  onRequestDelete: (id: number) => void;
```

`useEffect` 로 window keydown 리스너 등록:

```tsx
useEffect(() => {
  if (selectedPlacementId == null) return;
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

    const step = e.shiftKey ? 1 : 0.1;
    let dxPct = 0;
    let dyPct = 0;
    if (e.key === 'ArrowLeft')  dxPct = -step;
    else if (e.key === 'ArrowRight') dxPct = step;
    else if (e.key === 'ArrowUp')    dyPct = -step;
    else if (e.key === 'ArrowDown')  dyPct = step;
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onRequestDelete(selectedPlacementId);
      return;
    } else if (e.key === 'Escape') {
      onSelectPlacement(null);
      return;
    } else {
      return;
    }
    e.preventDefault();
    onNudgePlacement(selectedPlacementId, { dxPct, dyPct });
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [selectedPlacementId, onNudgePlacement, onRequestDelete, onSelectPlacement]);
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/placement-editor-canvas.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): 편집 캔버스 — 키보드 미세조정/삭제/Esc

화살표 0.1%, Shift+화살표 1%, Delete/Backspace 삭제 요청, Esc 선택 해제.
INPUT/TEXTAREA 포커스 시엔 무시.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.6: 1단계 Undo (Cmd/Ctrl+Z)

**Files:**
- Create: `src/features/booth-layout/hooks/use-placement-undo.ts`

Undo 는 마지막 mutation 결과를 메모리에 들고 있다가 한 번 되돌리는 가벼운 형태. 다단계 history 는 YAGNI.

- [ ] **Step 1: undo 훅 작성**

```ts
// src/features/booth-layout/hooks/use-placement-undo.ts
import { useCallback, useEffect, useRef } from 'react';

export type UndoAction = () => Promise<void> | void;

/**
 * 1단계 undo. recordUndo(fn) 로 직전 동작의 역동작을 등록하면
 * Cmd/Ctrl+Z 시 한 번 실행 후 비워진다.
 */
export function usePlacementUndo() {
  const lastUndoRef = useRef<UndoAction | null>(null);

  const recordUndo = useCallback((fn: UndoAction) => {
    lastUndoRef.current = fn;
  }, []);

  const triggerUndo = useCallback(async () => {
    const fn = lastUndoRef.current;
    if (!fn) return;
    lastUndoRef.current = null;
    await fn();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        void triggerUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerUndo]);

  return { recordUndo, triggerUndo };
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/hooks/use-placement-undo.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): 1단계 placement undo 훅 추가

Cmd/Ctrl+Z 로 직전 등록된 역동작 1회 실행. 다단계 history 는 YAGNI.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — 툴바 동작 (export/copy/reset)

### Task 5.1: JSON Export 유틸

**Files:**
- Create: `src/features/booth-layout/utils/export-placements.ts`

- [ ] **Step 1: 유틸 작성**

```ts
// src/features/booth-layout/utils/export-placements.ts
import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * placement 목록을 다운로드 가능한 JSON Blob 으로 export.
 * surrogate id 는 백엔드 import 시 재생성되므로 제외.
 */
export function exportPlacementsAsJson(rows: BoothPlacementDTO[]): void {
  const stripped = rows.map(({ id: _id, ...rest }) => rest);
  const json = JSON.stringify(stripped, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `booth-placements-2026-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/utils/export-placements.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): JSON Export 유틸 추가

surrogate id 를 제외한 BoothPlacementDTO[] 를 다운로드 가능한 JSON 파일로
직렬화. 파일명에 export 일자 stamp.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — 컴포저 (PlacementEditor) + 페이지 wiring

### Task 6.1: PlacementEditor 컴포저

**Files:**
- Create: `src/features/booth-layout/components/placement-editor.tsx`

- [ ] **Step 1: 컴포저 작성**

```tsx
// src/features/booth-layout/components/placement-editor.tsx
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  usePlacements,
  useCreatePlacement,
  useUpdatePlacement,
  useDeletePlacement,
  useCopyPlacements,
  useResetSection,
} from '@/features/booth-layout/hooks';
import {
  FESTIVAL_DATES,
  MAP_SECTIONS,
  type FestivalDate,
} from '@/features/booth-layout/sections';
import type { BoothPlacement, MapSectionId } from '@/features/booth-layout/types';
import { mockBoothsById } from '@/mocks/booth-profile';
import { PlacementToolbar } from './placement-toolbar';
import { PlacementList } from './placement-list';
import { PlacementEditorCanvas } from './placement-editor-canvas';
import { usePlacementUndo } from '@/features/booth-layout/hooks/use-placement-undo';
import { placementStorage } from '@/features/booth-layout/storage';
import { exportPlacementsAsJson } from '@/features/booth-layout/utils/export-placements';
import { fromBoothPlacement } from '@/features/booth-layout/mapper';

const DEFAULT_SIZE = { width: 5, height: 3 };

function previousDateOf(date: FestivalDate): FestivalDate | null {
  const idx = FESTIVAL_DATES.indexOf(date);
  return idx > 0 ? FESTIVAL_DATES[idx - 1] : null;
}

function sectionsValidFor(date: FestivalDate): MapSectionId[] {
  return (Object.values(MAP_SECTIONS) as Array<typeof MAP_SECTIONS[MapSectionId]>)
    .filter((s) => s.validDates.includes(date))
    .map((s) => s.id);
}

function nextAvailableBoothNumber(existing: BoothPlacement[]): string {
  const used = new Set(existing.map((p) => p.boothNumber));
  for (let n = 1; n <= 1000; n++) {
    if (!used.has(String(n))) return String(n);
  }
  return `${Date.now()}`;
}

export function PlacementEditor() {
  const [selectedDate, setSelectedDate] = useState<FestivalDate>(FESTIVAL_DATES[0]);
  const validSections = sectionsValidFor(selectedDate);
  const [selectedSection, setSelectedSection] = useState<MapSectionId>(validSections[0]);
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<number | null>(null);
  const [stickySize, setStickySize] = useState<{ width: number; height: number }>(DEFAULT_SIZE);

  // 날짜 바뀌면 섹션도 첫 유효 섹션으로 리셋.
  const onDateChange = (d: FestivalDate) => {
    setSelectedDate(d);
    const first = sectionsValidFor(d)[0];
    setSelectedSection(first);
    setSelectedPlacementId(null);
  };

  const placementsQuery = usePlacements(selectedDate);
  const placementsInSection = useMemo(
    () => (placementsQuery.data ?? []).filter((p) => p.section === selectedSection),
    [placementsQuery.data, selectedSection],
  );

  const booths = useMemo(() => Object.values(mockBoothsById), []);
  const section = MAP_SECTIONS[selectedSection];

  const createMut = useCreatePlacement();
  const updateMut = useUpdatePlacement();
  const deleteMut = useDeletePlacement();
  const copyMut = useCopyPlacements();
  const resetMut = useResetSection();
  const { recordUndo } = usePlacementUndo();

  const handleCreate = async (input: { x: number; y: number; width: number; height: number }) => {
    if (selectedBoothId == null) {
      toast.warning('좌측에서 운영자를 먼저 선택해 주세요.');
      return;
    }
    const number = nextAvailableBoothNumber(placementsInSection);
    setStickySize({ width: input.width, height: input.height });
    try {
      const created = await createMut.mutateAsync({
        boothId: selectedBoothId,
        date: selectedDate,
        section: selectedSection,
        boothNumber: number,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
      });
      setSelectedPlacementId(created.id);
      recordUndo(() => deleteMut.mutateAsync({
        id: created.id, date: created.date, boothId: created.boothId,
      }).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMove = async (id: number, delta: { dxPct: number; dyPct: number }) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    const next: BoothPlacement = {
      ...target,
      x: clamp(target.x + delta.dxPct, target.width / 2, 100 - target.width / 2),
      y: clamp(target.y + delta.dyPct, target.height / 2, 100 - target.height / 2),
    };
    const before = target;
    try {
      await updateMut.mutateAsync(next);
      recordUndo(() => updateMut.mutateAsync(before).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleResize = async (
    id: number,
    box: { x: number; y: number; width: number; height: number },
  ) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    const next: BoothPlacement = { ...target, ...box };
    setStickySize({ width: box.width, height: box.height });
    const before = target;
    try {
      await updateMut.mutateAsync(next);
      recordUndo(() => updateMut.mutateAsync(before).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleNudge = (id: number, delta: { dxPct: number; dyPct: number }) =>
    handleMove(id, delta);

  const handleDeleteRequest = async (id: number) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    if (!window.confirm(`자리 "${target.boothNumber}" 를 삭제할까요?`)) return;
    try {
      await deleteMut.mutateAsync({ id, date: target.date, boothId: target.boothId });
      setSelectedPlacementId(null);
      recordUndo(() =>
        createMut.mutateAsync({
          boothId: target.boothId,
          date: target.date,
          section: target.section,
          boothNumber: target.boothNumber,
          x: target.x, y: target.y, width: target.width, height: target.height,
        }).then(() => undefined),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCopyFromPrevious = async () => {
    const prev = previousDateOf(selectedDate);
    if (!prev) return;
    if (!window.confirm(
      `${prev} ${section.label} 좌표를 ${selectedDate} 로 덮어쓸까요?\n현재 (${selectedDate}, ${section.label}) 좌표는 모두 사라집니다.`,
    )) return;
    try {
      await copyMut.mutateAsync({ fromDate: prev, toDate: selectedDate, section: selectedSection });
      toast.success('전날 좌표를 복제했습니다.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(
      `${selectedDate} ${section.label} 의 모든 자리를 삭제할까요? 되돌릴 수 없습니다.`,
    )) return;
    try {
      await resetMut.mutateAsync({ date: selectedDate, section: selectedSection });
      setSelectedPlacementId(null);
      toast.success('전체 리셋 완료.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleExport = () => {
    const rows = placementStorage.loadAll();
    if (rows.length === 0) {
      toast.warning('저장된 좌표가 없습니다.');
      return;
    }
    exportPlacementsAsJson(rows);
  };

  const copyFromPreviousAvailable = previousDateOf(selectedDate) != null;

  return (
    <div className="flex h-full flex-col">
      <PlacementToolbar
        selectedDate={selectedDate}
        selectedSection={selectedSection}
        availableSections={validSections}
        onDateChange={onDateChange}
        onSectionChange={(s) => { setSelectedSection(s); setSelectedPlacementId(null); }}
        copyFromPreviousAvailable={copyFromPreviousAvailable}
        onCopyFromPrevious={handleCopyFromPrevious}
        onResetSection={handleReset}
        onExportJson={handleExport}
      />
      <div className="flex flex-1 overflow-hidden">
        <PlacementList
          booths={booths}
          placementsInSection={placementsInSection}
          selectedBoothId={selectedBoothId}
          onSelectBooth={setSelectedBoothId}
        />
        <div className="relative flex-1">
          <PlacementEditorCanvas
            section={section}
            placements={placementsInSection}
            selectedPlacementId={selectedPlacementId}
            selectedBoothId={selectedBoothId}
            onSelectPlacement={setSelectedPlacementId}
            onCreatePlacement={handleCreate}
            onMovePlacement={handleMove}
            onResizePlacement={handleResize}
            onNudgePlacement={handleNudge}
            onRequestDelete={handleDeleteRequest}
            defaultSize={stickySize}
          />
          {placementsInSection.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-background/85 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                운영자를 선택하고 지도를 클릭해 첫 자리를 만드세요.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
```

- [ ] **Step 2: `sonner` toast 가 프로젝트에 이미 있는지 확인**

```bash
grep -rn "from 'sonner'" src/ | head -5
```

Expected: 사용중. 없다면 `import { toast } from '@/components/ui/use-toast'` 같은 프로젝트의 toast 패턴으로 교체. 또는 가장 단순하게 `console.error` + `alert` 로 임시 대체 후 후속 폴리시.

- [ ] **Step 3: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 4: Commit**

```bash
git add src/features/booth-layout/components/placement-editor.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): PlacementEditor 컴포저 — 상태/mutation/단축키 wiring

toolbar/list/canvas 를 묶고 create/move/resize/nudge/delete/copy/reset/export
mutation 핸들러 + recordUndo 등록 + sticky size 기억. 운영자 미선택 클릭 시
toast 안내.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.2: 페이지에 PlacementEditor 마운트 + 최종 QA

**Files:**
- Modify: `src/pages/booth-layout-edit.tsx`

- [ ] **Step 1: 페이지 본체 교체**

```tsx
// src/pages/booth-layout-edit.tsx (전체)
import { Map } from 'lucide-react';
import { PlacementEditor } from '@/features/booth-layout/components/placement-editor';

export function BoothLayoutEditPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-4">
        <Map size={28} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">부스 좌표 편집</h1>
          <p className="text-xs text-muted-foreground">
            지도 위에 자리를 찍어 좌표 데이터를 만듭니다. JSON Export 로 백엔드 시드용 파일을 받을 수 있습니다.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <PlacementEditor />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build`
Expected: 통과 (production 빌드까지 깨끗).

- [ ] **Step 4: 수동 QA 시나리오 — Super 로그인 + 새로고침 흐름**

Run: `pnpm dev`

Super 계정 (`super` / `super1234`) 로그인 후:

- [ ] 사이드바 "부스 좌표 편집" 클릭 → `/booth-layout/edit` 진입
- [ ] 5/27 (global) 탭 선택 → 좌측 운영자 목록 보임 (3명: 문헌정보학과, 빈 부스, 경영학과 푸드트럭)
- [ ] 좌측 "문헌정보학과" 선택 → 지도 빈 곳 클릭 → 자리 1개 생성 (라벨 자동 1번)
- [ ] 새로 만든 핀 클릭 → 8핸들 표시 → 모서리 드래그로 리사이즈 → 마우스 업 시 형태 유지
- [ ] 핀 본체 드래그로 이동 → 마우스 업 시 새 위치 유지
- [ ] 화살표키로 미세 이동 (0.1%), Shift+화살표 (1%)
- [ ] Cmd+Z 로 직전 동작 1번 되돌리기
- [ ] Delete 로 핀 삭제 (확인 다이얼로그)
- [ ] 5/28 baekyang 탭 → 운영자 한 명 선택 → 지도 4번 클릭 → 4자리 자동 생성 (1·2·3·4)
- [ ] 5/29 baekyang 탭 → "전날 복제" → 5/28 4자리가 5/29 로 복제됨 확인
- [ ] "전체 리셋" → 확인 다이얼로그 → 해당 (date, section) 자리 모두 사라짐
- [ ] "JSON Export" → 다운로드된 파일 열어 surrogate id 없이 좌표 row 들 들어 있는지 확인
- [ ] 페이지 새로고침 → localStorage 에서 모든 placement 복구
- [ ] `/reservations` 진입 → 만든 placement 가 view 페이지에서 즉시 핀으로 보임

- [ ] **Step 5: 수동 QA 시나리오 — 권한 회귀**

- [ ] Master 계정 (`master` / `master1234`) 로그인 → 사이드바 "부스 좌표 편집" 안 보임
- [ ] Master 계정에서 직접 URL `http://localhost:5173/booth-layout/edit` 입력 → 가드에 차단(`/users` 등으로 리다이렉트되거나 forbidden)
- [ ] Booth (`booth1` / `booth1234`), Performer (`performer1` / `perf1234`) 도 동일 차단

- [ ] **Step 6: 회귀 — 기존 view 흐름**

- [ ] Super 로 `/reservations` → 핀 정합·날짜 전환 정상
- [ ] Booth (`booth1`) 로 `/reservations` → 본인 핀 1개 보임 (다중 자리 패치는 후속 PR — 첫 placement 만 보이는 게 정상)

- [ ] **Step 7: Commit**

```bash
git add src/pages/booth-layout-edit.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): /booth-layout/edit 페이지에 PlacementEditor 마운트

스텁을 실제 편집기로 교체. 헤더 + PlacementEditor 1줄 마운트.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

| 스펙 항목 | 매핑 task |
|---|---|
| Super-only 정식 라우트 + permission + nav | T1.1 |
| `BoothPlacement` PK = surrogate id | T0.1 |
| API 엔드포인트 (list/getByBooth array/create/update/delete/copy/reset) | T0.3 |
| mock localStorage persistence | T0.2 |
| Mutation hooks + invalidation | T0.4 |
| `useImagePaintedRect` 훅 추출 | T2.1 |
| 좌측 운영자 목록 + selected 토글 + 자리 카운트 | T3.2 |
| 상단 툴바 (탭·복제·리셋·Export) | T3.1 + T6.1 |
| 클릭 생성 (sticky size, 자동 booth_number) | T4.2 + T6.1 |
| 드래그 이동 | T4.3 + T6.1 |
| 8핸들 리사이즈 | T4.4 + T6.1 |
| 키보드 미세조정·삭제·Esc | T4.5 + T6.1 |
| 1단계 Undo (Cmd/Ctrl+Z) | T4.6 + T6.1 |
| 전날 복제 / 전체 리셋 / JSON Export | T5.1 + T6.1 |
| 호출부 최소 패치 (`useMyBoothPlacements` array) | T0.4 |
| 검증 (수동 QA) | T6.2 |

모든 스펙 항목 커버됨.

### 2. Placeholder scan

- "TBD"/"TODO"/"implement later" — 없음.
- 모든 코드 step 에 실제 코드 블록 포함됨.
- 일부 단순 수정(예: nav 메뉴 import 문 위치)은 핵심만 보였지만 정확한 변경 지점은 명시됨.

### 3. Type consistency

- `getPlacementByBoothId` → `getPlacementsByBoothId` (array). T0.3 에서 시그니처 변경, T0.4 에서 호출부 패치.
- `useMyBoothPlacement` → `useMyBoothPlacements` 동일하게 일관 적용.
- `BoothPlacement.id`, `BoothPlacementDTO.id` T0.1 부터 추가되어 이후 모든 task 에서 사용 가능.
- `MapSectionId`, `FestivalDate` 타입 import 일관성 확인됨.

### 4. Scope check

단일 PR 로 처리하기 적절한 크기. 테스트 러너 미설정 환경이라 단위 테스트 없이 수동 QA 만 수행 — 회귀 위험은 (1) 기존 view 페이지 다중 자리 placement 처리 (2) localStorage 마이그레이션 정도이며 둘 다 명시적 회귀 step 으로 커버됨.

---

## 실행 옵션

Plan complete and saved to `docs/superpowers/plans/2026-04-26-booth-placement-editor.md`.

다음 두 가지 실행 방식:

**1. Subagent-Driven (recommended)** — 각 task 마다 fresh subagent 한 명씩 dispatch, 두 단계 review (구현 후 / 커밋 전). 빠른 iteration, main context 보호.

**2. Inline Execution** — 같은 세션에서 batch 로 task 들을 진행하고 정기적인 checkpoint 에서 review.

어느 쪽으로 갈까요?
