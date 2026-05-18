# booth-layout 백엔드 정합 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `booth-layout` feature 를 백엔드에 없는 `BoothPlacement` 모델에서 실제 `MapLocation` + `Booth.locationId` 계약으로 재작성한다.

**Architecture:** `MapLocation`(type=BOOTH)은 부스 배치의 1:1 위성. 편집기는 부스를 드래그하면 MapLocation 을 생성/이동/삭제하고 `Booth.locationId` 를 설정한다. 날짜는 `Booth.date` 기준 FE 필터로만 잔존. 편집기·예약 picker 두 소비처 모두 새 모델로 옮긴다.

**Tech Stack:** React 19, TanStack Query, TypeScript, Vite. 테스트 러너 없음 → 검증은 `pnpm typecheck` + mock 모드 수동 QA.

**참고 문서:** 설계 배경은 `docs/superpowers/specs/2026-05-19-booth-layout-be-conformance-design.md`.

**중요 — 빌드 깨짐:** Task 1 부터 Task 9 완료 전까지 `pnpm typecheck` 가 깨진다(타입 변경이 컴포넌트로 전파). 정상이다. 각 Task 는 "남은 에러가 다음 파일들에만 국한" 을 검증하고 커밋한다. 전체 클린은 Task 10 에서 확인한다. 로컬 `tsc` 가 iCloud 동기화로 hang 하면(알려진 이슈) IDE TS 서버로 확인하거나 CI 에 위임한다.

---

## Task 1: 데이터 모델 — `types.ts` + `sections.ts`

**Files:**
- Modify (전체 교체): `src/features/booth-layout/types.ts`
- Modify: `src/features/booth-layout/sections.ts`

- [ ] **Step 1: `types.ts` 전체 교체**

```ts
/**
 * 지도 위치(MapLocation) 도메인 — 백엔드 MapLocationResponse 미러.
 * 부스 배치는 MapLocation(type=BOOTH) + Booth.locationId 로 표현된다.
 */
import type { BoothSector } from '@/features/booths/types';

/** 백엔드 MapLocationType enum. 편집기는 BOOTH 만 다룬다. */
export type MapLocationType = 'STAGE' | 'BOOTH' | 'ENTRANCE' | 'FACILITY' | 'OTHER';

/** 백엔드 MapDisplayStatus enum. */
export type MapDisplayStatus = 'VISIBLE' | 'HIDDEN';

/**
 * 섹션 = 지도 이미지 1장 단위의 물리 구획.
 * - global  → 국제캠(송도, 5/27)
 * - baekyang → 백양로(5/28·29 공유)
 * - hangeul  → 한글탑(5/28·29 공유)
 */
export type MapSectionId = 'global' | 'baekyang' | 'hangeul';

export interface MapSection {
  id: MapSectionId;
  label: string;
  imageUrl: string;
  validDates: string[];
  imageAspectRatio: number;
}

/** Spring Data PageResponse 미러 (목록 응답 래퍼). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/** 백엔드 응답 DTO (MapLocationResponse). 좌표는 BigDecimal → JSON 에서 number|string. */
export interface MapLocationDTO {
  id: number;
  locationName: string;
  sector: string;
  mapX: number | string;
  mapY: number | string;
  width: number | string | null;
  height: number | string | null;
  locationType: MapLocationType;
  displayOrder: number;
  displayStatus: MapDisplayStatus;
  createdAt: string;
  updatedAt: string;
}

/** 프론트 모델 (camelCase, 좌표 number 정규화). */
export interface MapLocation {
  id: number;
  locationName: string;
  sector: BoothSector;
  mapX: number;
  mapY: number;
  width: number | null;
  height: number | null;
  locationType: MapLocationType;
  displayOrder: number;
  displayStatus: MapDisplayStatus;
}

/**
 * 편집기 캔버스·예약 picker 가 공유하는 배치 박스 뷰모델.
 * MapLocation + Booth 를 페이지 레벨에서 조인해 만든다.
 * 좌표 필드명이 x/y/width/height 인 이유 — 캔버스 드래그·리사이즈 기하 코드가 이 이름에 의존.
 */
export interface PlacementBox {
  /** MapLocation.id — 좌표 수정·삭제 mutation 키. */
  locationId: number;
  /** 이 슬롯을 점유한 Booth.id. */
  boothId: number;
  /** 핀 라벨 — Booth.location(섹터 내 번호) 문자열화. 없으면 '?'. */
  boothNumber: string;
  section: MapSectionId;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 예약 picker 슬라이더 카드 렌더용 머지 결과. */
export interface PickerBooth {
  placement: PlacementBox;
  profile: { name: string; organization: string };
  counts: { waiting: number; completed: number; cancelled: number };
}

/** width/height 가 null 인 MapLocation 을 PlacementBox 로 만들 때의 기본 크기(%). */
export const DEFAULT_BOX_SIZE = { width: 5, height: 3 } as const;
```

- [ ] **Step 2: `sections.ts` — `BoothSector→MapSectionId` 매핑과 일차 변환 추가**

기존 `sections.ts` 의 `import` 줄 아래에 `BoothSector` import 를 추가:

```ts
import type { BoothSector } from '@/features/booths/types';
```

파일 맨 아래에 다음을 추가한다(기존 `MAP_SECTIONS`, `FESTIVAL_DATES`, `FestivalDate`, `fallbackSectionFor`, `sectionsValidFor` 는 그대로 둔다):

```ts
/** MapLocation.sector(한글탑/백양로/송도) → 지도 이미지 섹션 키. */
export const sectionForSector: Record<BoothSector, MapSectionId> = {
  송도: 'global',
  백양로: 'baekyang',
  한글탑: 'hangeul',
};

/**
 * 축제 일차(Booth.date) ↔ 캘린더 날짜.
 * day 1 = 5/26(블루런, 부스 없음)이라 layout UI 는 day 2~4 만 쓴다.
 */
const DATE_BY_DAY: Record<number, string> = {
  2: '2026-05-27',
  3: '2026-05-28',
  4: '2026-05-29',
};

/** ISO 날짜 → 축제 일차. 매칭 없으면 null. */
export function dayForDate(date: string): number | null {
  const found = Object.entries(DATE_BY_DAY).find(([, iso]) => iso === date);
  return found ? Number(found[0]) : null;
}

/** 축제 일차 → ISO 날짜. 매칭 없으면 null. */
export function dateForDay(day: number | null): string | null {
  return day != null ? (DATE_BY_DAY[day] ?? null) : null;
}
```

- [ ] **Step 3: 검증**

Run: `pnpm typecheck`
Expected: `types.ts`/`sections.ts` 자체는 에러 없음. 남은 에러는 아직 옛 타입을 쓰는 소비처(`mapper.ts`, `api.ts`, `hooks.ts`, `storage.ts`, `components/*`, `pages/reservation-booth-picker.tsx`)에만 — 정상.

- [ ] **Step 4: 커밋**

```bash
git add src/features/booth-layout/types.ts src/features/booth-layout/sections.ts
git commit -m "refactor(booth-layout): MapLocation 모델로 타입 정의 교체

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: mock 데이터 — `map-locations.ts` 시드 + `booth-profile.ts` 정합

**Files:**
- Create: `src/mocks/map-locations.ts`
- Delete: `src/mocks/booth-placements.ts`
- Modify: `src/mocks/booth-profile.ts`

배경: `booth-profile.ts` 의 mock 부스는 이미 `locationId` 를 들고 있으나 값이 충돌하고(booth1·booth5 둘 다 5) 대응하는 MapLocation 시드가 없다. 1:1 을 지키도록 **배치 부스의 `locationId` = 그 부스의 `id`** 로 통일하고, 같은 id 의 MapLocation 을 시드한다.

- [ ] **Step 1: `src/mocks/map-locations.ts` 생성**

```ts
import type { MapLocationDTO } from '@/features/booth-layout/types';

/**
 * MapLocation(type=BOOTH) mock 시드.
 * id = 점유 부스의 booth id (1:1). sector 는 그 부스의 Booth.sector 와 일치.
 * 좌표는 이미지 0–100 % 중심점 + 폭/높이.
 */
const now = '2026-05-01T00:00:00';

const loc = (
  id: number,
  sector: string,
  mapX: number,
  mapY: number,
  width: number,
  height: number,
): MapLocationDTO => ({
  id,
  locationName: `${sector} 부스 ${id}`,
  sector,
  mapX,
  mapY,
  width,
  height,
  locationType: 'BOOTH',
  displayOrder: id,
  displayStatus: 'VISIBLE',
  createdAt: now,
  updatedAt: now,
});

export const mockMapLocations: MapLocationDTO[] = [
  // 백양로(baekyang) — 좁고 긴 캔버스. x≈41.6, y 스텝, 좁은 박스.
  loc(1, '백양로', 41.59, 12, 8, 2.4),
  loc(4, '백양로', 41.59, 24, 8, 2.4),
  loc(6, '백양로', 41.59, 36, 8, 2.4),
  loc(7, '백양로', 41.59, 48, 8, 2.4),
  loc(8, '백양로', 41.59, 60, 8, 2.4),
  loc(9, '백양로', 41.59, 72, 8, 2.4),
  loc(10, '백양로', 41.59, 84, 8, 2.4),
  // 한글탑(hangeul)
  loc(3, '한글탑', 35, 30, 8, 9),
  loc(13, '한글탑', 55, 30, 8, 9),
  // 송도(global)
  loc(5, '송도', 50, 45, 6, 7),
];
```

- [ ] **Step 2: `booth-profile.ts` — 배치 부스의 `locationId`·`date`·`sector` 정합**

각 mock 부스의 `locationId` 를 다음과 같이 맞춘다. 배치 부스는 `locationId = id`, 미배치 부스는 `locationId: null`. `date`/`sector` 가 섹션 valid date 와 어긋나면 함께 보정한다(global=5/27=day2, baekyang·hangeul=5/28·29=day3·4).

배치 부스(이 값으로 수정):

| booth id | sector | date | locationId |
|---|---|---|---|
| 1 | 백양로 | 3 | 1 |
| 3 | 한글탑 | 3 | 3 |
| 4 | 백양로 | 3 | 4 |
| 5 | 송도 | 2 | 5 |
| 6 | 백양로 | 3 | 6 |
| 7 | 백양로 | 3 | 7 |
| 8 | 백양로 | 3 | 8 |
| 9 | 백양로 | 3 | 9 |
| 10 | 백양로 | 3 | 10 |
| 13 | 한글탑 | 3 | 13 |

위 표에 없는 나머지 모든 부스(2, 11, 12, 14~30)는 `locationId: null` 로 바꾼다(미배치 — 편집기 좌측 리스트 검증용). booth 5 는 기존 `sector: '송도', date: 3` → `date: 2` 로만 보정(송도는 5/27).

- [ ] **Step 3: `mocks/booth-placements.ts` 삭제**

```bash
git rm src/mocks/booth-placements.ts
```

- [ ] **Step 4: 검증**

Run: `pnpm typecheck`
Expected: `map-locations.ts` 자체 에러 없음. `storage.ts` 가 아직 `booth-placements.ts` 를 import 해 에러 — 정상(Task 3 에서 교체).

- [ ] **Step 5: 커밋**

```bash
git add src/mocks/map-locations.ts src/mocks/booth-profile.ts
git commit -m "refactor(booth-layout): MapLocation mock 시드 + 부스 locationId 1:1 정합

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 매퍼 + mock 스토어

**Files:**
- Modify (전체 교체): `src/features/booth-layout/mapper.ts`
- Modify (전체 교체): `src/features/booth-layout/storage.ts`

- [ ] **Step 1: `mapper.ts` 전체 교체**

```ts
import type { BoothSector } from '@/features/booths/types';
import type { MapLocation, MapLocationDTO } from './types';

/** BigDecimal 직렬화(number|string) → number. null 통과. */
const num = (v: number | string | null): number | null =>
  v == null ? null : typeof v === 'number' ? v : Number(v);

export const toMapLocation = (d: MapLocationDTO): MapLocation => ({
  id: d.id,
  locationName: d.locationName,
  // sector 는 백엔드 enum(한글탑/백양로/송도) 기준. 그대로 단언.
  sector: d.sector as BoothSector,
  mapX: num(d.mapX) ?? 0,
  mapY: num(d.mapY) ?? 0,
  width: num(d.width),
  height: num(d.height),
  locationType: d.locationType,
  displayOrder: d.displayOrder,
  displayStatus: d.displayStatus,
});
```

- [ ] **Step 2: `storage.ts` 전체 교체 (mock MapLocation 스토어)**

```ts
// src/features/booth-layout/storage.ts
import type { MapLocationDTO } from './types';
import { mockMapLocations } from '@/mocks/map-locations';

/**
 * mock 환경의 MapLocation persistence.
 * 백엔드 붙는 시점엔 api.ts 의 real 구현이 대체하므로 view-layer 는 storage 를 모른다.
 * 키 versioned(:v2) — placement(:v1) 스키마와 단절.
 */
const STORAGE_KEY = 'unit-y:map-locations:v2';

function readRaw(): MapLocationDTO[] {
  if (typeof window === 'undefined') return [...mockMapLocations];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeRaw(mockMapLocations);
      return [...mockMapLocations];
    }
    const parsed = JSON.parse(raw) as MapLocationDTO[];
    return Array.isArray(parsed) ? parsed : [...mockMapLocations];
  } catch {
    return [...mockMapLocations];
  }
}

function writeRaw(rows: MapLocationDTO[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export const mapLocationStorage = {
  loadAll(): MapLocationDTO[] {
    return readRaw();
  },

  /** 신규 생성. id 는 max(id)+1. createdAt/updatedAt 은 호출 시각. */
  createOne(input: Omit<MapLocationDTO, 'id' | 'createdAt' | 'updatedAt'>): MapLocationDTO {
    const rows = readRaw();
    const nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const ts = new Date().toISOString();
    const dto: MapLocationDTO = { ...input, id: nextId, createdAt: ts, updatedAt: ts };
    rows.push(dto);
    writeRaw(rows);
    return dto;
  },

  /** 부분 수정. id 없으면 throw. */
  updateOne(id: number, patch: Partial<MapLocationDTO>): MapLocationDTO {
    const rows = readRaw();
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`map location id ${id} 가 존재하지 않습니다.`);
    const updated: MapLocationDTO = {
      ...rows[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    rows[idx] = updated;
    writeRaw(rows);
    return updated;
  },

  deleteOne(id: number): void {
    const rows = readRaw();
    writeRaw(rows.filter((r) => r.id !== id));
  },
};
```

- [ ] **Step 3: 검증**

Run: `pnpm typecheck`
Expected: `mapper.ts`/`storage.ts` 자체 에러 없음. 남은 에러는 `api.ts`/`hooks.ts`/`components/*`/`pages/reservation-booth-picker.tsx`.

- [ ] **Step 4: 커밋**

```bash
git add src/features/booth-layout/mapper.ts src/features/booth-layout/storage.ts
git commit -m "refactor(booth-layout): 매퍼·mock 스토어를 MapLocation 으로 교체

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: API 레이어 — `booth-layout/api.ts` + 부스 수정 훅

**Files:**
- Modify (전체 교체): `src/features/booth-layout/api.ts`
- Modify: `src/features/booths/hooks.ts`

- [ ] **Step 1: `booth-layout/api.ts` 전체 교체**

```ts
import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mapLocationStorage } from './storage';
import { toMapLocation } from './mapper';
import type {
  MapLocation,
  MapLocationDTO,
  MapLocationType,
  MapDisplayStatus,
  PageResponse,
} from './types';

const BASE = '/admin/map-locations';

/** 생성 입력. locationType 은 BOOTH 고정, displayStatus 는 VISIBLE 기본. */
export interface CreateMapLocationInput {
  locationName: string;
  sector: string;
  mapX: number;
  mapY: number;
  width: number;
  height: number;
}

/** 수정 입력 — 부분 패치. */
export interface UpdateMapLocationPatch {
  locationName?: string;
  sector?: string;
  mapX?: number;
  mapY?: number;
  width?: number;
  height?: number;
  displayStatus?: MapDisplayStatus;
}

// ---- listMapLocations: BOOTH 타입 전체 ----

const listMapLocationsMock = async (): Promise<MapLocation[]> =>
  mapLocationStorage
    .loadAll()
    .filter((d) => d.locationType === 'BOOTH')
    .map(toMapLocation);

const listMapLocationsReal = async (): Promise<MapLocation[]> => {
  // 슬롯 100개 미만 전제 — 단일 페이지 조회.
  const qs = new URLSearchParams({ location_type: 'BOOTH', size: '100' }).toString();
  const page = await api.get<PageResponse<MapLocationDTO>>(`${BASE}?${qs}`);
  return page.content.map(toMapLocation);
};

export const listMapLocations = env.USE_MOCK ? listMapLocationsMock : listMapLocationsReal;

// ---- createMapLocation ----

const createMapLocationMock = async (input: CreateMapLocationInput): Promise<MapLocation> => {
  const dto = mapLocationStorage.createOne({
    locationName: input.locationName,
    sector: input.sector,
    mapX: input.mapX,
    mapY: input.mapY,
    width: input.width,
    height: input.height,
    locationType: 'BOOTH' as MapLocationType,
    displayOrder: 0,
    displayStatus: 'VISIBLE' as MapDisplayStatus,
  });
  return toMapLocation(dto);
};

const createMapLocationReal = async (input: CreateMapLocationInput): Promise<MapLocation> => {
  const dto = await api.post<MapLocationDTO>(BASE, {
    locationName: input.locationName,
    sector: input.sector,
    mapX: input.mapX,
    mapY: input.mapY,
    width: input.width,
    height: input.height,
    locationType: 'BOOTH',
    displayStatus: 'VISIBLE',
  });
  return toMapLocation(dto);
};

export const createMapLocation = env.USE_MOCK ? createMapLocationMock : createMapLocationReal;

// ---- updateMapLocation (PATCH) ----

const updateMapLocationMock = async (
  id: number,
  patch: UpdateMapLocationPatch,
): Promise<MapLocation> => toMapLocation(mapLocationStorage.updateOne(id, patch));

const updateMapLocationReal = async (
  id: number,
  patch: UpdateMapLocationPatch,
): Promise<MapLocation> => {
  const dto = await api.patch<MapLocationDTO>(`${BASE}/${id}`, patch);
  return toMapLocation(dto);
};

export const updateMapLocation = env.USE_MOCK ? updateMapLocationMock : updateMapLocationReal;

// ---- deleteMapLocation ----

const deleteMapLocationMock = async (id: number): Promise<void> => {
  mapLocationStorage.deleteOne(id);
};

const deleteMapLocationReal = async (id: number): Promise<void> => {
  await api.delete(`${BASE}/${id}`);
};

export const deleteMapLocation = env.USE_MOCK ? deleteMapLocationMock : deleteMapLocationReal;
```

주의: `api.patch` 가 `api-client.ts` 에 있는지 확인한다. 없으면 `api-client.ts` 에 `put` 과 동일 패턴으로 `patch` 메서드를 추가한다(메서드만 `'PATCH'`).

- [ ] **Step 2: `api-client.ts` 에 `patch` 가 없으면 추가**

`src/lib/api-client.ts` 에서 `put` 정의를 찾아, 동일 시그니처로 `patch` 를 추가한다(HTTP 메서드만 `'PATCH'`). 이미 있으면 건너뛴다.

- [ ] **Step 3: `booths/hooks.ts` 에 `useUpdateBooth` 추가**

`src/features/booths/hooks.ts` 의 import 에 이미 있는 `updateMyBooth` 를 재사용한다(`updateMyBooth` 의 real 구현은 `PUT /admin/booths/{booth.id}` 라 임의 부스에도 그대로 동작). 파일 맨 아래에 추가:

```ts
/**
 * 임의 부스 전체 저장 (PUT). 편집기에서 다른 부스의 locationId 를 바꿀 때 사용.
 * api 의 updateMyBooth 는 booth.id 로 PUT 하므로 본인/타인 구분이 없다.
 */
export function useUpdateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booth: Booth) => updateMyBooth(booth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booths'] });
    },
  });
}
```

- [ ] **Step 4: 검증**

Run: `pnpm typecheck`
Expected: `api.ts`/`booths/hooks.ts` 자체 에러 없음. 남은 에러는 `booth-layout/hooks.ts` + `components/*` + `pages/reservation-booth-picker.tsx`.

- [ ] **Step 5: 커밋**

```bash
git add src/features/booth-layout/api.ts src/features/booths/hooks.ts src/lib/api-client.ts
git commit -m "refactor(booth-layout): map-locations CRUD API + 부스 수정 훅

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 훅 — `booth-layout/hooks.ts`

**Files:**
- Modify (전체 교체): `src/features/booth-layout/hooks.ts`

- [ ] **Step 1: `hooks.ts` 전체 교체**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMapLocation,
  deleteMapLocation,
  listMapLocations,
  updateMapLocation,
  type CreateMapLocationInput,
  type UpdateMapLocationPatch,
} from './api';

const KEY = ['map-locations'] as const;

/** BOOTH 타입 MapLocation 전체 조회. */
export function useMapLocations() {
  return useQuery({
    queryKey: KEY,
    queryFn: listMapLocations,
  });
}

export function useCreateMapLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMapLocationInput) => createMapLocation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateMapLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; patch: UpdateMapLocationPatch }) =>
      updateMapLocation(vars.id, vars.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMapLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMapLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

- [ ] **Step 2: 검증**

Run: `pnpm typecheck`
Expected: `hooks.ts` 자체 에러 없음. 남은 에러는 `components/*` 6개 + `pages/reservation-booth-picker.tsx` 뿐.

- [ ] **Step 3: 커밋**

```bash
git add src/features/booth-layout/hooks.ts
git commit -m "refactor(booth-layout): map-locations TanStack Query 훅

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 편집기 컴포넌트 — Canvas / Toolbar / SectionTabs / List

**Files:**
- Modify: `src/features/booth-layout/components/placement-editor-canvas.tsx`
- Modify: `src/features/booth-layout/components/placement-toolbar.tsx`
- Modify: `src/features/booth-layout/components/map-section-tabs.tsx`
- Modify: `src/features/booth-layout/components/placement-list.tsx`

이 Task 는 컴포넌트들을 새 타입으로 옮긴다. `PlacementEditor`(Task 7) 가 이들을 묶으므로 이 Task 만으로는 typecheck 가 `placement-editor.tsx` 에서만 에러가 남는다.

- [ ] **Step 1: `placement-editor-canvas.tsx` — `BoothPlacement` → `PlacementBox`**

`react-zoom-pan-pinch` 기반 드래그·리사이즈·줌 기하 로직은 그대로 둔다. 다음만 바꾼다:

1. import: `BoothPlacement` → `PlacementBox`. (`MapSection, MapSectionId` 유지.)
2. `PlacementEditorCanvasProps.placements` 타입: `BoothPlacement[]` → `PlacementBox[]`.
3. 캔버스가 placement 식별에 쓰는 `p.id` 를 전부 `p.locationId` 로 바꾼다. 대상: `onPinMouseDown` 의 `setDragState({ placementId: p.id ...})`, `onClick` 의 `onSelectPlacement(p.id)`, 핀 `key={p.id}`, `placements.map` 내부의 `p.id === selectedPlacementId` 비교. `selectedPlacementId` 라는 prop 이름은 유지하되 의미는 "선택된 locationId" 다.
4. 핀 라벨: `p.boothNumber` 는 `PlacementBox` 에 그대로 있으므로 변경 없음. tooltip 의 `자리 ${p.boothNumber}` 유지.
5. `p.x / p.y / p.width / p.height` 는 `PlacementBox` 에 동일 이름으로 있으므로 변경 없음.
6. `p.boothId` 도 동일 — `isInGroup` 비교 유지.

- [ ] **Step 2: `placement-editor-canvas.tsx` 검증**

Run: `pnpm typecheck`
Expected: 이 파일 에러 없음(아직 다른 컴포넌트 에러는 남음).

- [ ] **Step 3: `map-section-tabs.tsx` — 변경 없음 확인**

`map-section-tabs.tsx` 는 `MapSectionId` 만 쓰고 placement 모델에 의존하지 않는다. 수정 불필요. typecheck 에러 없는지만 확인한다.

- [ ] **Step 4: `placement-toolbar.tsx` — copy/reset/export 버튼 제거**

`PlacementToolbarProps` 에서 `copyFromPreviousAvailable`, `onCopyFromPrevious`, `onResetSection`, `onExportJson` 4개 prop 을 삭제한다. JSX 에서 "전날 복제" / "전체 리셋" / "JSON Export" 버튼 3개를 삭제한다. import 의 `Copy, Download, RotateCcw` 를 제거하고 `Plus` 만 남긴다. "추가 모드" 토글 버튼과 `MapSectionTabs` 는 그대로 둔다.

전체 교체본:

```tsx
import { Plus } from 'lucide-react';
import { FESTIVAL_DATES, type FestivalDate } from '@/features/booth-layout/sections';
import type { MapSectionId } from '@/features/booth-layout/types';
import { MapSectionTabs } from './map-section-tabs';

export interface PlacementToolbarProps {
  selectedDate: FestivalDate;
  selectedSection: MapSectionId;
  /** selectedDate 에 유효한 섹션들. 1개면 섹션 탭 자체를 숨김. */
  availableSections: MapSectionId[];
  onDateChange: (date: FestivalDate) => void;
  onSectionChange: (section: MapSectionId) => void;
  /** 추가 모드 — 빈 곳 클릭으로 새 자리 생성. OFF 일 땐 클릭이 선택 해제만 한다. */
  isAddMode: boolean;
  onToggleAddMode: () => void;
}

export function PlacementToolbar({
  selectedDate,
  selectedSection,
  availableSections,
  onDateChange,
  onSectionChange,
  isAddMode,
  onToggleAddMode,
}: PlacementToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-6 py-3">
      <MapSectionTabs
        availableDates={FESTIVAL_DATES}
        selectedDate={selectedDate}
        onDateChange={(d) => onDateChange(d as FestivalDate)}
        availableSections={availableSections}
        selectedSection={selectedSection}
        onSectionChange={onSectionChange}
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAddMode}
          aria-pressed={isAddMode}
          title={
            isAddMode
              ? '추가 모드 켜짐 — 빈 곳 클릭으로 새 자리 생성'
              : '추가 모드 꺼짐 — 클릭은 선택만'
          }
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            isAddMode
              ? 'border-primary bg-ds-primary-subtle text-ds-primary-pressed'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          <Plus size={14} />
          추가 모드 {isAddMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `placement-list.tsx` — placement 카운트를 단순 배치 여부로**

`PlacementList` 는 booth 풀을 보여주며 "이 (날짜,섹션)에 자리 있는지" 를 카운트한다. 1:1 모델에서는 부스가 `locationId != null` 이면 배치, 아니면 미배치다. 다음으로 바꾼다:

1. import 에서 `BoothPlacement` 제거. `Booth` 만 쓴다.
2. `PlacementListProps` 에서 `placementsAtDate`, `placementsInSection` 두 prop 을 삭제하고 다음 두 prop 으로 교체:
   - `placedBoothIds: Set<number>` — 현재 섹션에 배치된(=이 섹션 슬롯 점유) 부스 id 집합.
   - `selectedDay: number | null` — 선택 일차(`Booth.date` 비교용).
3. `inSectionByBooth` / `inDateByBooth` `useMemo` 두 개를 삭제한다.
4. 카운트 의미 재정의:
   - `isPlaced(b) = placedBoothIds.has(b.id)`
   - `inDate(b) = selectedDay != null && b.date === selectedDay`
   - "이 날짜 운영" = `booths.filter(inDate).length`
   - "이 섹션 배치" = `booths.filter(isPlaced).length`
   - "미배치" = 이 날짜 운영 부스 중 `!isPlaced` 인 수.
5. 정렬 `rank`: 배치됨(0) → 같은 날 미배치(1) → 그 외(2).
6. 필터(`missingOnly`, `showAll`)와 검색은 위 `isPlaced`/`inDate` 로 재작성. 배지: 배치됨 → `success`+"배치", 같은 날 미배치 → `warning`+"미배치", 그 외 → `muted`+"다른 날".
7. 검증 패널·검색창·토글 UI 골격은 유지하되 라벨 문구를 "이 (날짜, 섹션)" → "이 섹션" 으로 정리한다.

> 참고: 이 컴포넌트는 옛 모델의 "한 부스 N자리" 를 전제해 카운트가 복잡했다. 1:1 이 되면서 "N 자리" 배지는 단순 "배치/미배치" 가 된다.

- [ ] **Step 6: 검증**

Run: `pnpm typecheck`
Expected: `placement-editor-canvas.tsx`, `placement-toolbar.tsx`, `placement-list.tsx`, `map-section-tabs.tsx` 에러 없음. 남은 에러는 `placement-editor.tsx` + picker 컴포넌트 4개 + `pages/reservation-booth-picker.tsx`.

- [ ] **Step 7: 커밋**

```bash
git add src/features/booth-layout/components/placement-editor-canvas.tsx src/features/booth-layout/components/placement-toolbar.tsx src/features/booth-layout/components/placement-list.tsx src/features/booth-layout/components/map-section-tabs.tsx
git commit -m "refactor(booth-layout): 편집기 하위 컴포넌트를 MapLocation 모델로 이전

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 편집기 오케스트레이터 — `PlacementEditor` + 페이지

**Files:**
- Modify (전체 교체): `src/features/booth-layout/components/placement-editor.tsx`
- Modify: `src/pages/booth-layout.tsx`

핵심: `PlacementEditor` 가 `useMapLocations()` + `booths`(prop) 를 조인해 `PlacementBox[]` 를 만들고, 생성/이동/리사이즈/삭제를 MapLocation + Booth.locationId mutation 으로 처리한다.

데이터 흐름:
- `useMapLocations()` → 모든 BOOTH MapLocation.
- `booths`(prop, `useBooths()` 결과) → `locationId` 로 MapLocation 과 조인.
- `PlacementBox` = `{ locationId, boothId, boothNumber: String(booth.location ?? '?'), section: sectionForSector[loc.sector], x: loc.mapX, y: loc.mapY, width: loc.width ?? DEFAULT_BOX_SIZE.width, height: loc.height ?? DEFAULT_BOX_SIZE.height }`.
- 현재 (날짜, 섹션) 필터: `box.section === selectedSection` AND 그 부스의 `booth.date === dayForDate(selectedDate)`.

동작:
- **생성**(`handleCreate`): `selectedBoothId` 없으면 toast 경고. 있으면 `createMapLocation({ locationName: booth.name || '${sector} 부스 슬롯', sector, mapX, mapY, width, height })` → 반환 `location.id` 로 `useUpdateBooth().mutateAsync({ ...booth, locationId: location.id })`.
- **이동/리사이즈**(`handleMove`/`handleResize`): `updateMapLocation({ id: locationId, patch: { mapX, mapY } 또는 { mapX, mapY, width, height } })`. 이동·리사이즈는 undo 기록(역 PATCH).
- **삭제**(`confirmDelete`): 먼저 `useUpdateBooth().mutateAsync({ ...booth, locationId: null })` → 이어서 `deleteMapLocation(locationId)`. 순서 필수(부스 참조를 먼저 끊어야 409 회피). create/delete 는 undo 미기록(교차 엔티티 역동작 복잡 → YAGNI).

- [ ] **Step 1: `placement-editor.tsx` 전체 교체**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useMapLocations,
  useCreateMapLocation,
  useUpdateMapLocation,
  useDeleteMapLocation,
} from '@/features/booth-layout/hooks';
import { useUpdateBooth } from '@/features/booths/hooks';
import {
  FESTIVAL_DATES,
  MAP_SECTIONS,
  sectionsValidFor,
  sectionForSector,
  dayForDate,
  type FestivalDate,
} from '@/features/booth-layout/sections';
import {
  DEFAULT_BOX_SIZE,
  type MapLocation,
  type MapSectionId,
  type PlacementBox,
} from '@/features/booth-layout/types';
import type { Booth } from '@/features/booths/types';
import { PlacementToolbar } from './placement-toolbar';
import { PlacementList } from './placement-list';
import { PlacementEditorCanvas } from './placement-editor-canvas';
import { usePlacementUndo } from '@/features/booth-layout/hooks/use-placement-undo';
import { clamp } from '@/features/booth-layout/utils/clamp';

const DEFAULT_SIZE = DEFAULT_BOX_SIZE;

/** MapLocation + Booth → PlacementBox 뷰모델. */
function toBox(loc: MapLocation, booth: Booth): PlacementBox {
  return {
    locationId: loc.id,
    boothId: booth.id,
    boothNumber: String(booth.location ?? '?'),
    section: sectionForSector[loc.sector],
    x: loc.mapX,
    y: loc.mapY,
    width: loc.width ?? DEFAULT_SIZE.width,
    height: loc.height ?? DEFAULT_SIZE.height,
  };
}

export interface PlacementEditorProps {
  /** 운영자(부스 계정) 풀. 페이지에서 useBooths() 로 끌어와 내려준다. */
  booths: Booth[];
}

export function PlacementEditor({ booths }: PlacementEditorProps) {
  const [selectedDate, setSelectedDate] = useState<FestivalDate>(FESTIVAL_DATES[0]);
  const validSections = useMemo(() => sectionsValidFor(selectedDate), [selectedDate]);
  const [selectedSection, setSelectedSection] = useState<MapSectionId>(validSections[0]);
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [hoveredBoothId, setHoveredBoothId] = useState<number | null>(null);
  const [stickySize, setStickySize] = useState<{ width: number; height: number }>(DEFAULT_SIZE);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<PlacementBox | null>(null);

  const onDateChange = (d: FestivalDate) => {
    setSelectedDate(d);
    setSelectedSection(sectionsValidFor(d)[0]);
    setSelectedLocationId(null);
  };

  useEffect(() => {
    if (!validSections.includes(selectedSection)) setSelectedSection(validSections[0]);
  }, [selectedDate, selectedSection, validSections]);

  const locationsQuery = useMapLocations();

  const boothById = useMemo(() => {
    const m = new Map<number, Booth>();
    for (const b of booths) m.set(b.id, b);
    return m;
  }, [booths]);

  /** locationId → Booth 역참조 (1:1). 첫 부스만 채택, 둘 이상이면 경고. */
  const boothByLocationId = useMemo(() => {
    const m = new Map<number, Booth>();
    for (const b of booths) {
      if (b.locationId == null) continue;
      if (m.has(b.locationId)) {
        console.warn(
          `MapLocation ${b.locationId} 를 부스 ${m.get(b.locationId)!.id}, ${b.id} 가 공유 — 1:1 위반. 첫 부스만 표시.`,
        );
        continue;
      }
      m.set(b.locationId, b);
    }
    return m;
  }, [booths]);

  /** 모든 (배치된) PlacementBox. */
  const allBoxes = useMemo<PlacementBox[]>(() => {
    const locs = locationsQuery.data ?? [];
    const boxes: PlacementBox[] = [];
    for (const loc of locs) {
      const booth = boothByLocationId.get(loc.id);
      if (booth) boxes.push(toBox(loc, booth));
    }
    return boxes;
  }, [locationsQuery.data, boothByLocationId]);

  /** 현재 (날짜, 섹션) 박스. */
  const selectedDay = dayForDate(selectedDate);
  const boxesInSection = useMemo(
    () =>
      allBoxes.filter(
        (b) => b.section === selectedSection && boothById.get(b.boothId)?.date === selectedDay,
      ),
    [allBoxes, selectedSection, selectedDay, boothById],
  );

  /** 이 섹션에 배치된 부스 id 집합 — PlacementList 검증 패널용. */
  const placedBoothIds = useMemo(
    () => new Set(boxesInSection.map((b) => b.boothId)),
    [boxesInSection],
  );

  const section = MAP_SECTIONS[selectedSection];

  const createMut = useCreateMapLocation();
  const updateMut = useUpdateMapLocation();
  const deleteMut = useDeleteMapLocation();
  const updateBoothMut = useUpdateBooth();
  const { recordUndo } = usePlacementUndo();

  const handleSelectLocation = (id: number | null) => {
    setSelectedLocationId(id);
    if (id != null) {
      const target = boxesInSection.find((b) => b.locationId === id);
      if (target) setStickySize({ width: target.width, height: target.height });
    }
  };

  const handleCreate = async (input: { x: number; y: number; width: number; height: number }) => {
    if (selectedBoothId == null) {
      toast.warning('좌측에서 운영자를 먼저 선택해 주세요.');
      return;
    }
    const booth = boothById.get(selectedBoothId);
    if (!booth) return;
    if (booth.locationId != null) {
      toast.warning('이미 배치된 부스입니다. 기존 자리를 옮기거나 삭제 후 다시 배치하세요.');
      return;
    }
    setStickySize({ width: input.width, height: input.height });
    try {
      const loc = await createMut.mutateAsync({
        locationName: booth.name || `${booth.sector ?? selectedSection} 부스 슬롯`,
        sector: booth.sector ?? '백양로',
        mapX: input.x,
        mapY: input.y,
        width: input.width,
        height: input.height,
      });
      await updateBoothMut.mutateAsync({ ...booth, locationId: loc.id });
      setSelectedLocationId(loc.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMove = async (id: number, delta: { dxPct: number; dyPct: number }) => {
    const target = boxesInSection.find((b) => b.locationId === id);
    if (!target) return;
    const nextX = clamp(target.x + delta.dxPct, target.width / 2, 100 - target.width / 2);
    const nextY = clamp(target.y + delta.dyPct, target.height / 2, 100 - target.height / 2);
    const before = { mapX: target.x, mapY: target.y };
    try {
      await updateMut.mutateAsync({ id, patch: { mapX: nextX, mapY: nextY } });
      recordUndo(() => updateMut.mutateAsync({ id, patch: before }).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleResize = async (
    id: number,
    box: { x: number; y: number; width: number; height: number },
  ) => {
    const target = boxesInSection.find((b) => b.locationId === id);
    if (!target) return;
    setStickySize({ width: box.width, height: box.height });
    const before = {
      mapX: target.x,
      mapY: target.y,
      width: target.width,
      height: target.height,
    };
    try {
      await updateMut.mutateAsync({
        id,
        patch: { mapX: box.x, mapY: box.y, width: box.width, height: box.height },
      });
      recordUndo(() => updateMut.mutateAsync({ id, patch: before }).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteRequest = (id: number) => {
    const target = boxesInSection.find((b) => b.locationId === id);
    if (target) setPendingDelete(target);
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    const booth = boothById.get(target.boothId);
    try {
      // 순서 필수: 부스 참조를 먼저 끊어야 location 삭제 시 409 가 안 난다.
      if (booth) await updateBoothMut.mutateAsync({ ...booth, locationId: null });
      await deleteMut.mutateAsync(target.locationId);
      setSelectedLocationId(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PlacementToolbar
        selectedDate={selectedDate}
        selectedSection={selectedSection}
        availableSections={validSections}
        onDateChange={onDateChange}
        onSectionChange={(s) => {
          setSelectedSection(s);
          setSelectedLocationId(null);
        }}
        isAddMode={isAddMode}
        onToggleAddMode={() => setIsAddMode((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <PlacementList
          booths={booths}
          placedBoothIds={placedBoothIds}
          selectedDay={selectedDay}
          selectedBoothId={selectedBoothId}
          onSelectBooth={setSelectedBoothId}
          onHoverBooth={setHoveredBoothId}
        />
        <div className="relative flex-1">
          <PlacementEditorCanvas
            section={section}
            placements={boxesInSection}
            selectedPlacementId={selectedLocationId}
            selectedBoothId={selectedBoothId}
            hoveredBoothId={hoveredBoothId}
            boothById={boothById}
            onSelectPlacement={handleSelectLocation}
            onCreatePlacement={handleCreate}
            onMovePlacement={handleMove}
            onResizePlacement={handleResize}
            onNudgePlacement={handleMove}
            onRequestDelete={handleDeleteRequest}
            defaultSize={stickySize}
            isAddMode={isAddMode}
          />
          {boxesInSection.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-background/85 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                {isAddMode
                  ? '운영자를 선택하고 지도를 클릭해 자리를 만드세요.'
                  : '우상단 "추가 모드" 를 켠 뒤 운영자를 선택하고 지도를 클릭하면 자리를 만들 수 있습니다.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              자리 &ldquo;{pendingDelete?.boothNumber}&rdquo; 를 삭제하고 해당 부스의 배치를
              해제합니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: `pages/booth-layout.tsx` — 헤더 문구에서 JSON Export 제거**

`pages/booth-layout.tsx` 의 `<p>` 설명 문구를 다음으로 교체:

```tsx
<p className="text-xs text-muted-foreground">
  부스를 지도 위 자리에 배치합니다. 좌측에서 운영자를 고른 뒤 지도를 클릭하세요.
</p>
```

- [ ] **Step 3: 검증**

Run: `pnpm typecheck`
Expected: 편집기 경로 전부 에러 없음. 남은 에러는 picker 컴포넌트 4개 + `pages/reservation-booth-picker.tsx`.

- [ ] **Step 4: 커밋**

```bash
git add src/features/booth-layout/components/placement-editor.tsx src/pages/booth-layout.tsx
git commit -m "refactor(booth-layout): 편집기를 MapLocation + Booth.locationId 로 재배선

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 예약 picker 컴포넌트 — Canvas / Slider / Card / Picker

**Files:**
- Modify: `src/features/booth-layout/components/booth-map-canvas.tsx`
- Modify: `src/features/booth-layout/components/booth-slider.tsx`
- Modify: `src/features/booth-layout/components/booth-slider-card.tsx`
- Modify: `src/features/booth-layout/components/booth-map-picker.tsx`

이 4개 컴포넌트는 `PickerBooth` 를 소비한다. `PickerBooth.placement` 가 이제 `PlacementBox` 라 필드명이 거의 동일하다(`boothId, boothNumber, section, x, y, width, height`). 변경은 최소다.

- [ ] **Step 1: `booth-map-canvas.tsx`**

`BoothPin` 의 `const { placement } = booth;` 이후 `placement.x / .y / .width / .height / .boothNumber / .boothId` 는 `PlacementBox` 에 동일 이름으로 존재 → 코드 변경 없음. `import type { ... PickerBooth }` 도 그대로. **이 파일은 수정 불필요** — typecheck 만 통과 확인.

- [ ] **Step 2: `booth-slider.tsx` — 변경 없음 확인**

`b.placement.boothId` 사용 → `PlacementBox.boothId` 존재. **수정 불필요.**

- [ ] **Step 3: `booth-slider-card.tsx` — 변경 없음 확인**

`placement.boothId`, `placement.boothNumber` 사용 → 둘 다 `PlacementBox` 에 존재. **수정 불필요.**

- [ ] **Step 4: `booth-map-picker.tsx` — 변경 없음 확인**

`b.placement.section`, `b.placement.boothId` 사용 → `PlacementBox` 에 존재. **수정 불필요.**

> 정리: picker 하위 4개 컴포넌트는 `PickerBooth.placement` 의 필드명을 보존한 설계 덕분에 코드 수정이 없다. 이 Task 는 typecheck 로 그 사실을 확인하는 단계다.

- [ ] **Step 5: 검증**

Run: `pnpm typecheck`
Expected: picker 컴포넌트 4개 에러 없음. 남은 에러는 `pages/reservation-booth-picker.tsx` 하나뿐.

- [ ] **Step 6: 커밋**

picker 컴포넌트에 코드 변경이 없었다면 이 Task 는 커밋할 파일이 없다. 그 경우 커밋을 건너뛰고 Task 9 로 진행한다. 변경이 있었다면:

```bash
git add src/features/booth-layout/components/booth-map-canvas.tsx src/features/booth-layout/components/booth-slider.tsx src/features/booth-layout/components/booth-slider-card.tsx src/features/booth-layout/components/booth-map-picker.tsx
git commit -m "refactor(booth-layout): 예약 picker 컴포넌트 PlacementBox 정합

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 예약 picker 오케스트레이터 — `reservation-booth-picker.tsx`

**Files:**
- Modify (전체 교체): `src/pages/reservation-booth-picker.tsx`

핵심: `usePlacements(date)`/`useMyBoothPlacements` 를 `useMapLocations()` + `useBooths()` + `useMyBooth()` 조합으로 교체. 부스를 `locationId` 슬롯 좌표에 렌더하고 일차(`booth.date`)·섹션으로 필터. Booth 계정은 본인 부스 1개 기준으로 날짜·섹션을 resolve.

- [ ] **Step 1: `reservation-booth-picker.tsx` 전체 교체**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar } from 'lucide-react';
import { BoothMapPicker } from '@/features/booth-layout/components/booth-map-picker';
import { useMapLocations } from '@/features/booth-layout/hooks';
import {
  FESTIVAL_DATES,
  sectionsValidFor,
  sectionForSector,
  dayForDate,
  dateForDay,
} from '@/features/booth-layout/sections';
import {
  DEFAULT_BOX_SIZE,
  type MapLocation,
  type MapSectionId,
  type PickerBooth,
  type PlacementBox,
} from '@/features/booth-layout/types';
import { useAuth } from '@/features/auth/hooks';
import { useBooths, useMyBooth } from '@/features/booths/hooks';
import { useReservations } from '@/features/reservations/hooks';
import type { Booth } from '@/features/booths/types';
import type { Reservation, ReservationState } from '@/features/reservations/types';

/** boothId → 상태별 카운트 집계. */
function buildReservationCountsByBooth(
  reservations: Reservation[],
): Map<number, Record<ReservationState, number>> {
  const m = new Map<number, Record<ReservationState, number>>();
  for (const r of reservations) {
    const cur = m.get(r.boothId) ?? { waiting: 0, completed: 0, cancelled: 0 };
    cur[r.status] += 1;
    m.set(r.boothId, cur);
  }
  return m;
}

/** MapLocation + Booth → PlacementBox. */
function toBox(loc: MapLocation, booth: Booth): PlacementBox {
  return {
    locationId: loc.id,
    boothId: booth.id,
    boothNumber: String(booth.location ?? '?'),
    section: sectionForSector[loc.sector],
    x: loc.mapX,
    y: loc.mapY,
    width: loc.width ?? DEFAULT_BOX_SIZE.width,
    height: loc.height ?? DEFAULT_BOX_SIZE.height,
  };
}

/**
 * 지도+슬라이더 기반 예약 관리 진입점.
 * Super/Master/Booth 모두 같은 화면. canEnter 로 진입 권한만 분기.
 */
export function ReservationBoothPicker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isBooth = user?.role === 'Booth';
  const myBoothId = isBooth ? (user?.boothId ?? undefined) : undefined;

  const locationsQuery = useMapLocations();
  const allBoothsQuery = useBooths();
  const reservationsQuery = useReservations();
  const myBoothQuery = useMyBooth();

  // locationId → MapLocation 조회.
  const locationById = useMemo(() => {
    const m = new Map<number, MapLocation>();
    for (const l of locationsQuery.data ?? []) m.set(l.id, l);
    return m;
  }, [locationsQuery.data]);

  // 모든 배치 부스 → PickerBooth (날짜 무관, 섹션 필터는 BoothMapPicker 내부).
  const countsByBooth = useMemo(
    () => buildReservationCountsByBooth(reservationsQuery.data ?? []),
    [reservationsQuery.data],
  );

  /** boothId → PickerBooth (배치된 부스만). */
  const pickerBoothByDay = useMemo(() => {
    const byDay = new Map<number, PickerBooth[]>();
    for (const booth of allBoothsQuery.data ?? []) {
      if (booth.locationId == null || booth.date == null) continue;
      const loc = locationById.get(booth.locationId);
      if (!loc) continue;
      const pb: PickerBooth = {
        placement: toBox(loc, booth),
        profile: {
          name: booth.name || '이름 미입력 부스',
          organization: booth.organization || '-',
        },
        counts: countsByBooth.get(booth.id) ?? { waiting: 0, completed: 0, cancelled: 0 },
      };
      const list = byDay.get(booth.date) ?? [];
      list.push(pb);
      byDay.set(booth.date, list);
    }
    return byDay;
  }, [allBoothsQuery.data, locationById, countsByBooth]);

  // 역할별 available dates — Booth 계정은 본인 부스 날짜 1개, 그 외 전체.
  const availableDates = useMemo<readonly string[]>(() => {
    if (isBooth) {
      const d = dateForDay(myBoothQuery.data?.date ?? null);
      return d ? [d] : [];
    }
    return FESTIVAL_DATES;
  }, [isBooth, myBoothQuery.data]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDate != null) return;
    if (isBooth) {
      const d = dateForDay(myBoothQuery.data?.date ?? null);
      if (d) setSelectedDate(d);
    } else if (user) {
      setSelectedDate(FESTIVAL_DATES[0]);
    }
  }, [isBooth, myBoothQuery.data, user, selectedDate]);

  const availableSections = useMemo<MapSectionId[]>(
    () => (selectedDate ? sectionsValidFor(selectedDate) : []),
    [selectedDate],
  );

  const [selectedSection, setSelectedSection] = useState<MapSectionId | null>(null);
  useEffect(() => {
    if (availableSections.length === 0) return;
    if (selectedSection != null && availableSections.includes(selectedSection)) return;
    // Booth 계정은 본인 부스 섹션을 default 로.
    const mySector = myBoothQuery.data?.sector;
    const mySection = mySector ? sectionForSector[mySector] : null;
    if (isBooth && mySection && availableSections.includes(mySection)) {
      setSelectedSection(mySection);
    } else {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, isBooth, myBoothQuery.data, selectedSection]);

  // 선택 일차의 PickerBooth 목록.
  const booths = useMemo<PickerBooth[]>(() => {
    const day = selectedDate ? dayForDate(selectedDate) : null;
    return day != null ? (pickerBoothByDay.get(day) ?? []) : [];
  }, [pickerBoothByDay, selectedDate]);

  const canEnter = useCallback(
    (boothId: number) => {
      if (user?.role === 'Super' || user?.role === 'Master') return true;
      if (user?.role === 'Booth') return boothId === user.boothId;
      return false;
    },
    [user],
  );

  const onEnter = useCallback(
    (boothId: number) => {
      navigate(`/reservations/${boothId}`);
    },
    [navigate],
  );

  // Booth 계정 본인 부스 조회 실패.
  if (isBooth && myBoothQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-8 text-sm">
        <div className="text-destructive">본인 부스 정보를 불러오지 못했습니다.</div>
        <button
          type="button"
          onClick={() => myBoothQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Booth 계정인데 본인 부스가 미배치.
  if (
    isBooth &&
    myBoothQuery.isFetched &&
    (myBoothQuery.data == null || myBoothQuery.data.locationId == null)
  ) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        소속 부스의 지도 배치가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
      </div>
    );
  }

  if (locationsQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-8 text-sm">
        <div className="text-destructive">배치 정보를 불러오지 못했습니다.</div>
        <button
          type="button"
          onClick={() => locationsQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!selectedDate || !selectedSection) {
    return <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-border bg-background px-4 py-4 md:px-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <Calendar size={26} aria-hidden="true" />
          예약 관리
        </h1>
      </div>
      <div className="min-h-0 flex-1">
        <BoothMapPicker
          booths={booths}
          selectedDate={selectedDate}
          availableDates={availableDates}
          onDateChange={setSelectedDate}
          selectedSection={selectedSection}
          availableSections={availableSections}
          onSectionChange={setSelectedSection}
          myBoothId={myBoothId}
          canEnter={canEnter}
          onEnter={onEnter}
          initialFocusBoothId={myBoothId}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 검증**

Run: `pnpm typecheck`
Expected: **전체 클린.** 에러 0. (남아있다면 옛 import 누락 — 메시지 따라 수정.)

- [ ] **Step 3: 커밋**

```bash
git add src/pages/reservation-booth-picker.tsx
git commit -m "refactor(booth-layout): 예약 picker 를 MapLocation 모델로 재배선

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 정리 + 전체 검증

**Files:**
- Delete: `src/features/booth-layout/utils/export-placements.ts`

- [ ] **Step 1: 미사용 파일 삭제**

`export-placements.ts` 가 더 이상 import 되지 않는지 확인 후 삭제:

```bash
grep -rn "export-placements" src/ || echo "참조 없음 — 삭제 안전"
git rm src/features/booth-layout/utils/export-placements.ts
```

`utils/clamp.ts`, `utils/pin-radius.ts`, `hooks/use-image-painted-rect.ts`, `hooks/use-placement-undo.ts` 는 계속 쓰이므로 **삭제하지 않는다.**

- [ ] **Step 2: 전체 typecheck**

Run: `pnpm typecheck`
Expected: 에러 0.

- [ ] **Step 3: mock 모드 수동 QA**

`.env.local` 에 `VITE_USE_MOCK=true` 인 상태로 `pnpm dev` 실행 후:

- [ ] `super` / `master` 로그인 → `/booth-layout` (부스 배치도 편집): 추가 모드 ON → 좌측에서 미배치 부스 선택 → 지도 클릭으로 자리 생성 → 핀 드래그 이동 → 리사이즈 → Cmd/Ctrl+Z 로 이동 취소 → 핀 선택 후 Delete 로 삭제 확인.
- [ ] `super` 로그인 → `/reservations` (예약 관리 picker): 날짜·섹션 탭 전환, 슬라이더로 부스 이동, 카드 클릭 → 예약 상세 진입.
- [ ] `booth1` 로그인 → 예약 picker: 본인 부스(백양로, 5/28)가 지도에 표시되고 진입 가능. 다른 부스는 lock.
- [ ] `booth2` 로그인 → 예약 picker: "지도 배치가 설정되지 않았습니다" 안내(미배치 부스).
- [ ] `performer1` 로그인 → 권한상 picker 접근 가능하면 부스 카드가 모두 lock.

- [ ] **Step 4: 커밋**

```bash
git add -A src/features/booth-layout
git commit -m "refactor(booth-layout): 미사용 JSON Export 유틸 제거

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## 부록: 백엔드 권장사항 (이 플랜 범위 밖, 별도 진행)

설계 문서 §12 참조. FE 정합의 전제는 아니지만 적용 시 FE 가 더 단순해진다:

1. `booths.location_id` 에 UNIQUE 인덱스 — 1:1 을 DB 가 강제. 적용 시 `placement-editor.tsx` 의 `boothByLocationId` 1:1 위반 경고 로직을 제거할 수 있다.
2. `MapLocation.sector` 를 `BoothSector` enum 으로 — 적용 시 `mapper.ts` 의 `as BoothSector` 단언이 안전해진다.
