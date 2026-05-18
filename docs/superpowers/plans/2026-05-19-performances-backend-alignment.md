# Performances 백엔드 정합 재작성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/performances` 프론트 도메인을 백엔드 실제 구현(`origin/dev`의 performance 도메인)에 정합시킨다.

**Architecture:** 프론트가 만든 `PerformanceDetail`(상상 스키마)을 폐기하고, 백엔드 응답 DTO를 미러링하는 `Performance` 모델로 교체한다. 백엔드가 camelCase라 DTO↔Model 매핑은 가볍다(시간 정규화·SNS 방어만). 이미지·셋리스트는 임베디드가 아니라 항목별 sub-resource 엔드포인트로 다룬다. 라이브 기능과 SNS 필드는 백엔드 추가 예정이라 프론트에 유지하되 방어 코드를 둔다.

**Tech Stack:** React + TanStack Query + Zustand + dnd-kit, `lib/api-client.ts`(`{success,data,error}` 봉투 자동 언랩). 테스트 러너 없음 → 검증은 `pnpm typecheck` + `VITE_USE_MOCK=true` 수동 스모크.

---

## 배경 — 백엔드 ground truth (`origin/dev`, 2026-05-19 감사)

전부 camelCase JSON, `{success,data,error}` 봉투. `LocalTime` 직렬화는 `"HH:mm:ss"` → 매퍼에서 `HH:mm`으로 정규화.

**enum:**
- `PerformanceCategory`: `ARTIST | CLUB`
- `PerformanceStatus`: `SCHEDULED | ONGOING | ENDED | CANCELED | HIDDEN`
- `PerformanceImageType`: `PROFILE | DETAIL`

**엔드포인트:**

| 메서드·경로 | 응답 | 비고 |
|---|---|---|
| `GET /performances` | `PerformanceListResponse[]` | 공개 |
| `GET /performances/{id}` | `PerformanceDetailResponse` | 공개 |
| `GET /performances/current` | `PerformanceCurrentResponse` | 공개 — ONGOING 첫 공연(파생) |
| `GET /api/admin/performances/me` | `PerformanceMyResponse` | Performer/Super |
| `PATCH /api/admin/performances/me` | `PerformanceMyResponse` | body `PerformanceUpdateRequest` |
| `DELETE /api/admin/performances/me` | 204 | |
| `GET /api/performances/{id}/images` | `PerformanceImageResponse[]` | 공개 |
| `POST /api/admin/performances/me/images` | `PerformanceImageResponse` | body `PerformanceImageCreateRequest` |
| `DELETE /api/admin/performances/me/images/{imageId}` | 204 | |
| `GET /api/performances/{id}/setlists` | `PerformanceSetlistResponse[]` | 공개 |
| `POST /api/admin/performances/me/setlists` | `PerformanceSetlistResponse` | body `PerformanceSetlistCreateRequest` |
| `PATCH /api/admin/performances/me/setlists/{setlistId}` | `PerformanceSetlistResponse` | body `PerformanceSetlistUpdateRequest` |
| `DELETE /api/admin/performances/me/setlists/{setlistId}` | 204 | |

> ⚠️ **백엔드 경로 불일치 (별도 수정 필요):** `PerformanceReadController`는 `@RequestMapping("/performances")`로 **`/api` 프리픽스가 빠져 있음.** 다른 컨트롤러는 전부 `/api/...`. 프론트 `api-client` base URL이 `.../api`라, 프론트가 `/performances`를 호출하면 `.../api/performances`로 가는데 백엔드는 `.../performances`에 있어 매칭 안 됨. 백엔드 `PerformanceReadController`를 `/api/performances`로 맞춰야 한다(BE 리드 수정 항목). 이 plan 의 프론트 경로는 일관 형태(`/performances*` → base 합쳐 `/api/performances*`)를 쓴다.

**DTO 필드 (전부 camelCase):**
- `PerformanceListResponse`: `id, performanceName, performanceDate(Integer), startTime(LocalTime), endTime(LocalTime), performanceCategory, lineupName, performanceStatus, locationId(nullable), locationName(nullable)`
- `PerformanceDetailResponse`: 위 + `performanceDescription`
- `PerformanceMyResponse`: `PerformanceDetailResponse` 필드 + `createdAt, updatedAt`
- `PerformanceCurrentResponse`: `id, performanceName, startTime, endTime, performanceStatus, performanceCategory, locationId, locationName`
- `PerformanceUpdateRequest`(PATCH, 전 필드 nullable): `locationId, performanceName, performanceDescription, performanceDate, startTime, endTime, performanceCategory, lineupName, performanceStatus`
- `PerformanceImageResponse`: `id, performanceId, imageUrl, imageOrder, imageType`
- `PerformanceImageCreateRequest`: `imageUrl, imageOrder, imageType`
- `PerformanceSetlistResponse`: `id, performanceId, songTitle, singerName, songOrder, note(nullable)`
- `PerformanceSetlistCreateRequest`: `songTitle, singerName, songOrder, note(nullable)`
- `PerformanceSetlistUpdateRequest`: `songTitle, singerName, songOrder, note(nullable)`

**백엔드에 아직 없음 (프론트 유지 + 방어):**
- `instagramUrl` / `youtubeUrl` — Performance 엔티티에 SNS 필드 없음. 백엔드 추가 예정. 모델 유지, 매퍼 `?? ''`, 업데이트 요청에 optional 포함(백엔드가 무시).
- **라이브 수동 지정** — 백엔드엔 파생형 `GET /performances/current`만 있고 "수동 지정" 엔드포인트 없음. 백엔드 추가 예정. 프론트 `getLivePerformance`/`setLivePerformance`(`/performances/live`)와 ON AIR UI 유지. 백엔드 스펙 요청 항목(아래 "범위 외" 참고).

## 결정 사항 (확정 — 2026-05-19)

- 모델 필드를 백엔드 이름으로 정합: `teamId`→`id`, `teamName`→`performanceName`(+`lineupName`), `description`→`performanceDescription`, `date`(문자열)→`performanceDate`(정수 1~4), `stage`(enum)→`locationId`/`locationName`.
- `PerformanceStage`/`PERFORMANCE_STAGES` 상수 폐기. 리스트 필터는 `performanceDate`(1~4) 기준으로 전환, 스테이지 필터는 `locationName` 기준(값이 있을 때).
- `instagramUrl`/`youtubeUrl` → 유지 (백엔드 추가 예정).
- 라이브 기능 → 유지 (백엔드 추가 예정, 스펙 문서화).
- 이미지·셋리스트 → 임베디드 폐기, 항목별 sub-resource 엔드포인트로 재작성. **이번 범위 포함.**
- `performanceCategory`/`performanceStatus`/`lineupName` → 신규 필드, UI 편입.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/features/performances/types.ts` | `Performance`/`PerformanceListItem`/`PerformanceImage`/`SetlistItem`·DTO·enum·요청 타입 | 전면 교체 |
| `src/features/performances/mapper.ts` | `to*` / `from*` 매퍼 | 전면 교체 |
| `src/features/performances/api.ts` | 공연·이미지·셋리스트·라이브 엔드포인트 | 전면 교체 |
| `src/features/performances/hooks.ts` | TanStack Query 래퍼 | 전면 교체 |
| `src/mocks/performances.ts` | mock 시드 | 새 모델로 재작성 |
| `src/features/performances/components/draggable-setlist-item.tsx` | 셋리스트 항목 | 필드 리네임 |
| `src/pages/performance-management.tsx` | 공연 상세/편집 | 모델 정합 + 이미지·셋리스트 항목별 mutation |
| `src/pages/performance-list.tsx` | 공연 목록 + ON AIR | 모델 리네임 + 필터(date 기준) |
| `src/pages/dashboard.tsx` `src/pages/create-admin.tsx` | performances 소비처 | 필드 리네임 대응 |

---

## Task 1: 타입 교체

**Files:** Modify(전면): `src/features/performances/types.ts`

- [ ] **Step 1: `types.ts` 전체를 아래로 교체**

```ts
/**
 * 공연(Performance) 도메인 모델 — 백엔드 performance 도메인 응답 미러.
 * 필드/케이싱은 백엔드(`~/Desktop/unit-y-yonsei-server` origin/dev)와 1:1.
 */

export type PerformanceCategory = 'ARTIST' | 'CLUB';
export type PerformanceStatus = 'SCHEDULED' | 'ONGOING' | 'ENDED' | 'CANCELED' | 'HIDDEN';
export type PerformanceImageType = 'PROFILE' | 'DETAIL';

export const PERFORMANCE_CATEGORY_LABEL: Record<PerformanceCategory, string> = {
  ARTIST: '아티스트',
  CLUB: '동아리',
};

export const PERFORMANCE_STATUS_LABEL: Record<PerformanceStatus, string> = {
  SCHEDULED: '예정',
  ONGOING: '진행 중',
  ENDED: '종료',
  CANCELED: '취소',
  HIDDEN: '비공개',
};

// ---- 서브 엔티티 (별도 sub-resource) ----

export interface SetlistItem {
  id: number;
  performanceId: number;
  songTitle: string;
  singerName: string;
  /** 노출 순서 (1부터). */
  songOrder: number;
  note: string;
}

export interface PerformanceImage {
  id: number;
  performanceId: number;
  imageUrl: string;
  /** 노출 순서 (1부터). */
  imageOrder: number;
  imageType: PerformanceImageType;
}

// ---- 프론트 모델 ----

/** 리스트 카드용 경량 모델. */
export interface PerformanceListItem {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDate: number | null;
  startTime: string | null; // 'HH:mm'
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
}

/** 공연 상세/내 공연. images·setlist 는 별도 쿼리로 로드 — 이 모델에 포함하지 않는다. */
export interface Performance {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDescription: string;
  performanceDate: number | null;
  startTime: string | null;
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
  /** 백엔드 Performance 엔티티에 아직 없음(추가 예정) — 매퍼에서 ?? '' 방어. */
  instagramUrl: string;
  youtubeUrl: string;
}

// ---- 백엔드 DTO (camelCase — 모델과 거의 동일) ----

export interface PerformanceListItemDTO {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDate: number | null;
  startTime: string | null;
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
}

export interface PerformanceDTO {
  id: number;
  performanceName: string;
  lineupName: string;
  performanceDescription: string;
  performanceDate: number | null;
  startTime: string | null;
  endTime: string | null;
  performanceCategory: PerformanceCategory | null;
  performanceStatus: PerformanceStatus;
  locationId: number | null;
  locationName: string | null;
  /** 백엔드 SNS 필드 도입 전엔 응답에 없음. */
  instagramUrl?: string;
  youtubeUrl?: string;
}

export interface PerformanceImageDTO {
  id: number;
  performanceId: number;
  imageUrl: string;
  imageOrder: number;
  imageType: PerformanceImageType;
}

export interface SetlistItemDTO {
  id: number;
  performanceId: number;
  songTitle: string;
  singerName: string;
  songOrder: number;
  note: string | null;
}

// ---- 요청 DTO ----

/** PATCH /api/admin/performances/me — 전 필드 optional. */
export interface PerformanceUpdateDTO {
  performanceName?: string;
  performanceDescription?: string;
  performanceDate?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  performanceCategory?: PerformanceCategory | null;
  performanceStatus?: PerformanceStatus;
  lineupName?: string;
  locationId?: number | null;
  /** 백엔드 SNS 도입 후 활성. 도입 전엔 백엔드가 무시. */
  instagramUrl?: string;
  youtubeUrl?: string;
}

export interface PerformanceImageCreateDTO {
  imageUrl: string;
  imageOrder: number;
  imageType: PerformanceImageType;
}

export interface SetlistCreateDTO {
  songTitle: string;
  singerName: string;
  songOrder: number;
  note: string | null;
}

export type SetlistUpdateDTO = SetlistCreateDTO;
```

- [ ] **Step 2: 검증** — `pnpm typecheck`. mapper/api/페이지가 옛 타입을 참조해 에러가 남 — Task 8까지 완료 후 깨끗해진다.

---

## Task 2: 매퍼 교체

**Files:** Modify(전면): `src/features/performances/mapper.ts`

- [ ] **Step 1: `mapper.ts` 전체를 아래로 교체**

```ts
import type {
  Performance,
  PerformanceDTO,
  PerformanceImage,
  PerformanceImageDTO,
  PerformanceListItem,
  PerformanceListItemDTO,
  PerformanceUpdateDTO,
  SetlistItem,
  SetlistItemDTO,
} from './types';

/** 'HH:mm:ss' / 'HH:mm' → 'HH:mm'. null 통과. */
const toHm = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

export const toPerformanceListItem = (d: PerformanceListItemDTO): PerformanceListItem => ({
  id: d.id,
  performanceName: d.performanceName,
  lineupName: d.lineupName,
  performanceDate: d.performanceDate,
  startTime: toHm(d.startTime),
  endTime: toHm(d.endTime),
  performanceCategory: d.performanceCategory,
  performanceStatus: d.performanceStatus,
  locationId: d.locationId,
  locationName: d.locationName,
});

export const toPerformance = (d: PerformanceDTO): Performance => ({
  id: d.id,
  performanceName: d.performanceName,
  lineupName: d.lineupName,
  performanceDescription: d.performanceDescription,
  performanceDate: d.performanceDate,
  startTime: toHm(d.startTime),
  endTime: toHm(d.endTime),
  performanceCategory: d.performanceCategory,
  performanceStatus: d.performanceStatus,
  locationId: d.locationId,
  locationName: d.locationName,
  // 백엔드 SNS 도입 전: 응답에 없음 → 빈 문자열 방어.
  instagramUrl: d.instagramUrl ?? '',
  youtubeUrl: d.youtubeUrl ?? '',
});

export const toPerformanceImage = (d: PerformanceImageDTO): PerformanceImage => ({
  id: d.id,
  performanceId: d.performanceId,
  imageUrl: d.imageUrl,
  imageOrder: d.imageOrder,
  imageType: d.imageType,
});

export const toSetlistItem = (d: SetlistItemDTO): SetlistItem => ({
  id: d.id,
  performanceId: d.performanceId,
  songTitle: d.songTitle,
  singerName: d.singerName,
  songOrder: d.songOrder,
  note: d.note ?? '',
});

/** Performance 부분 patch → PATCH 요청 바디. 전송된 필드만 매핑. */
export const fromPerformancePatch = (patch: Partial<Performance>): PerformanceUpdateDTO => {
  const dto: PerformanceUpdateDTO = {};
  if ('performanceName' in patch) dto.performanceName = patch.performanceName;
  if ('performanceDescription' in patch) dto.performanceDescription = patch.performanceDescription;
  if ('performanceDate' in patch) dto.performanceDate = patch.performanceDate;
  if ('startTime' in patch) dto.startTime = patch.startTime;
  if ('endTime' in patch) dto.endTime = patch.endTime;
  if ('performanceCategory' in patch) dto.performanceCategory = patch.performanceCategory;
  if ('performanceStatus' in patch) dto.performanceStatus = patch.performanceStatus;
  if ('lineupName' in patch) dto.lineupName = patch.lineupName;
  if ('locationId' in patch) dto.locationId = patch.locationId;
  if ('instagramUrl' in patch) dto.instagramUrl = patch.instagramUrl;
  if ('youtubeUrl' in patch) dto.youtubeUrl = patch.youtubeUrl;
  return dto;
};
```

- [ ] **Step 2: 검증** — `pnpm typecheck` (api/hooks/페이지 에러 정상).

---

## Task 3: API 교체

**Files:** Modify(전면): `src/features/performances/api.ts`

핵심: `getMyPerformance`/`updateMyPerformance`는 백엔드의 `/me` 단수 엔드포인트를 쓴다(공연 id 불필요). 이미지·셋리스트는 항목별 함수. 라이브는 백엔드 미구현이라 mock 위주 + real 은 미래 엔드포인트 가정.

- [ ] **Step 1: `api.ts` 전체를 아래로 교체** — mock 구현은 `mocks/performances.ts`의 in-memory 헬퍼를 사용(Task 6에서 정의). real 구현은 아래 경로:

```ts
import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import {
  fromPerformancePatch,
  toPerformance,
  toPerformanceImage,
  toPerformanceListItem,
  toSetlistItem,
} from './mapper';
import type {
  Performance,
  PerformanceDTO,
  PerformanceImage,
  PerformanceImageCreateDTO,
  PerformanceImageDTO,
  PerformanceListItem,
  PerformanceListItemDTO,
  SetlistCreateDTO,
  SetlistItem,
  SetlistItemDTO,
  SetlistUpdateDTO,
} from './types';
import * as mock from '@/mocks/performances';

// ---- real 구현 ----
// 주의: 백엔드 PerformanceReadController 가 /api 프리픽스 누락 상태 → 백엔드 수정 후 동작.

async function listPerformancesReal(): Promise<PerformanceListItem[]> {
  const dtos = await api.get<PerformanceListItemDTO[]>('/performances');
  return dtos.map(toPerformanceListItem);
}

async function getPerformanceReal(id: number): Promise<Performance | null> {
  const dto = await api.get<PerformanceDTO>(`/performances/${id}`);
  return toPerformance(dto);
}

async function getMyPerformanceReal(): Promise<Performance | null> {
  const dto = await api.get<PerformanceDTO>('/admin/performances/me');
  return toPerformance(dto);
}

async function updateMyPerformanceReal(patch: Partial<Performance>): Promise<Performance> {
  const dto = await api.patch<PerformanceDTO>('/admin/performances/me', fromPerformancePatch(patch));
  return toPerformance(dto);
}

async function getPerformanceImagesReal(performanceId: number): Promise<PerformanceImage[]> {
  const dtos = await api.get<PerformanceImageDTO[]>(`/performances/${performanceId}/images`);
  return dtos.map(toPerformanceImage);
}

async function addPerformanceImageReal(input: PerformanceImageCreateDTO): Promise<PerformanceImage> {
  const dto = await api.post<PerformanceImageDTO>('/admin/performances/me/images', input);
  return toPerformanceImage(dto);
}

async function deletePerformanceImageReal(imageId: number): Promise<void> {
  await api.delete(`/admin/performances/me/images/${imageId}`);
}

async function getSetlistReal(performanceId: number): Promise<SetlistItem[]> {
  const dtos = await api.get<SetlistItemDTO[]>(`/performances/${performanceId}/setlists`);
  return dtos.map(toSetlistItem);
}

async function addSetlistItemReal(input: SetlistCreateDTO): Promise<SetlistItem> {
  const dto = await api.post<SetlistItemDTO>('/admin/performances/me/setlists', input);
  return toSetlistItem(dto);
}

async function updateSetlistItemReal(
  setlistId: number,
  input: SetlistUpdateDTO,
): Promise<SetlistItem> {
  const dto = await api.patch<SetlistItemDTO>(
    `/admin/performances/me/setlists/${setlistId}`,
    input,
  );
  return toSetlistItem(dto);
}

async function deleteSetlistItemReal(setlistId: number): Promise<void> {
  await api.delete(`/admin/performances/me/setlists/${setlistId}`);
}

// ---- 라이브 (백엔드 수동지정 엔드포인트 미구현 — 추가 예정) ----
// 백엔드가 GET/PUT /performances/live 를 추가하기 전까지 real 은 사실상 미동작.
// 스펙은 plan "범위 외" 절 참고.
async function getLivePerformanceReal(): Promise<number | null> {
  const res = await api.get<{ performanceId: number | null }>('/performances/live');
  return res.performanceId;
}

async function setLivePerformanceReal(performanceId: number | null): Promise<number | null> {
  const res = await api.put<{ performanceId: number | null }>('/performances/live', {
    performanceId,
  });
  return res.performanceId;
}

// ---- 분기 export ----

export const listPerformances = env.USE_MOCK ? mock.listPerformancesMock : listPerformancesReal;
export const getPerformance = env.USE_MOCK ? mock.getPerformanceMock : getPerformanceReal;
export const getMyPerformance = env.USE_MOCK ? mock.getMyPerformanceMock : getMyPerformanceReal;
export const updateMyPerformance = env.USE_MOCK
  ? mock.updateMyPerformanceMock
  : updateMyPerformanceReal;
export const getPerformanceImages = env.USE_MOCK
  ? mock.getPerformanceImagesMock
  : getPerformanceImagesReal;
export const addPerformanceImage = env.USE_MOCK
  ? mock.addPerformanceImageMock
  : addPerformanceImageReal;
export const deletePerformanceImage = env.USE_MOCK
  ? mock.deletePerformanceImageMock
  : deletePerformanceImageReal;
export const getSetlist = env.USE_MOCK ? mock.getSetlistMock : getSetlistReal;
export const addSetlistItem = env.USE_MOCK ? mock.addSetlistItemMock : addSetlistItemReal;
export const updateSetlistItem = env.USE_MOCK ? mock.updateSetlistItemMock : updateSetlistItemReal;
export const deleteSetlistItem = env.USE_MOCK ? mock.deleteSetlistItemMock : deleteSetlistItemReal;
export const getLivePerformance = env.USE_MOCK ? mock.getLivePerformanceMock : getLivePerformanceReal;
export const setLivePerformance = env.USE_MOCK ? mock.setLivePerformanceMock : setLivePerformanceReal;
```

- [ ] **Step 2: 검증** — `pnpm typecheck` (mock·hooks·페이지 에러 정상; `@/mocks/performances`의 mock 함수는 Task 6에서 정의).

---

## Task 4: 훅 교체

**Files:** Modify(전면): `src/features/performances/hooks.ts`

- [ ] **Step 1: `hooks.ts` 전체 교체** — 기존 6개 훅을 새 모델/엔드포인트로. 이미지·셋리스트 훅 추가.

핵심 훅(시그니처):
- `usePerformances()` — `['performances']`, `listPerformances`
- `usePerformance(id)` — `['performances', id]`, `getPerformance`, `enabled` 는 양의 정수일 때
- `useMyPerformance()` — `['performances','me', user?.performanceTeamId]`, `getMyPerformance`, `enabled` = Performer 이고 `performanceTeamId != null`
- `useUpdateMyPerformance()` — `mutationFn: (patch: Partial<Performance>) => updateMyPerformance(patch)`, onSuccess 에서 `['performances','me',...]` setQueryData + `['performances']` invalidate
- `usePerformanceImages(performanceId)` — `['performances', performanceId, 'images']`, `getPerformanceImages`, enabled = 양의 정수
- `useSetlist(performanceId)` — `['performances', performanceId, 'setlists']`, `getSetlist`, enabled = 양의 정수
- 이미지/셋리스트 mutation: `useAddPerformanceImage()`, `useDeletePerformanceImage()`, `useAddSetlistItem()`, `useUpdateSetlistItem()`, `useDeleteSetlistItem()` — 각 onSuccess 에서 해당 `['performances', performanceId, 'images'|'setlists']` invalidate. performanceId 는 훅 인자로 받아 쿼리키 구성.
- `useLivePerformance()` — `['performances','live']`, `getLivePerformance`, `refetchInterval: 15_000` (기존 유지)
- `useSetLivePerformance()` — 기존 유지, `setQueryData(['performances','live'], id)`

기존 `useUpdatePerformance`(teamId+patch 인자)는 제거 — `updateMyPerformance`는 `/me` 라 id 불필요.

- [ ] **Step 2: 검증** — `pnpm typecheck` (페이지 에러만 남아야 함).

---

## Task 5: mock 시드·헬퍼 재작성

**Files:** Modify(전면): `src/mocks/performances.ts`

`api.ts`가 `import * as mock`로 쓰는 mock 함수 전부를 여기서 export 한다. 세션 동안 살아있는 in-memory 구현.

- [ ] **Step 1: 시드 데이터** — `Performance` 25개 내외 + 각 공연의 `PerformanceImage[]`·`SetlistItem[]`. 기존 `mockPerformanceDetails`(`teamId` 1~25)를 새 모델로 변환:
  - `teamId`→`id`, `teamName`→`performanceName`, `description`→`performanceDescription`
  - `date`('YYYY-MM-DD')→`performanceDate`(1=5/26 … 27→2, 28→3, 29→4 등 일차 정수)
  - `stage`→`locationName`(`songdo`→'언기도 앞' 등 기존 라벨), `locationId`는 임의 정수
  - 신규: `lineupName`(공연명과 같거나 빈값), `performanceCategory`(밴드류 'ARTIST', 동아리 'CLUB'), `performanceStatus`(대부분 'SCHEDULED', id=1 은 'ONGOING' 으로 두어 라이브/current 데모)
  - `instagramUrl`/`youtubeUrl` 유지
  - 기존 임베디드 `images`→ 별도 `PerformanceImage` 시드(`imageType:'PROFILE'`, `imageOrder:1`), `setlist`→ 별도 `SetlistItem` 시드(`songName`→`songTitle`, `artist`→`singerName`, `order`→`songOrder`, `note:''`)
- [ ] **Step 2: in-memory mock 함수 export** — 전부 `async`, 100~200ms 지연:
  - `listPerformancesMock(): Promise<PerformanceListItem[]>` — 시드에서 리스트 필드 파생
  - `getPerformanceMock(id): Promise<Performance|null>`
  - `getMyPerformanceMock(): Promise<Performance|null>` — `useAuthStore` user 의 `performanceTeamId` 로 조회
  - `updateMyPerformanceMock(patch): Promise<Performance>` — user 의 본인 공연에 머지
  - `getPerformanceImagesMock(performanceId)` / `addPerformanceImageMock(input)` / `deletePerformanceImageMock(imageId)` — in-memory 이미지 배열 조작. add 는 user 본인 공연에 귀속.
  - `getSetlistMock(performanceId)` / `addSetlistItemMock(input)` / `updateSetlistItemMock(setlistId,input)` / `deleteSetlistItemMock(setlistId)`
  - `getLivePerformanceMock()` / `setLivePerformanceMock(id)` — 모듈 변수로 단일 라이브 id 유지(기존과 동일)
- [ ] **Step 3: 검증** — `pnpm typecheck`. features/performances 내부 에러 사라짐.
- [ ] **Step 4: 커밋** — Task 1~5 (도메인 레이어):

```bash
git add src/features/performances/ src/mocks/performances.ts
git commit -m "$(cat <<'EOF'
refactor(performances): 공연 도메인 모델을 백엔드 구현에 정합

프론트가 만든 PerformanceDetail 초안을 폐기하고 백엔드 performance
도메인 응답(camelCase)을 미러링. 이미지·셋리스트를 임베디드에서
항목별 sub-resource 로 분리. SNS·라이브 기능은 백엔드 추가 예정이라
유지하되 매퍼·api 에 방어 코드. mock 도 새 모델로 재작성.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

> 커밋 주의: Task 1~5 중간 상태는 typecheck 가 안 통과한다(페이지가 옛 타입 참조). **Task 1~8 을 모두 끝내 typecheck 가 깨끗해진 뒤 한 커밋으로** 한다. 위 커밋 블록은 Task 8 까지 끝난 뒤 실행. CLAUDE.md 상 타입 에러 커밋 금지.

---

## Task 6: draggable-setlist-item 필드 리네임

**Files:** Modify: `src/features/performances/components/draggable-setlist-item.tsx`

- [ ] **Step 1:** 이 컴포넌트가 다루는 `SetlistItem` 필드를 리네임: `songName`→`songTitle`, `artist`→`singerName`, `order`→`songOrder`. `note` 표시가 필요하면 추가(선택). props 시그니처와 내부 렌더 모두.
- [ ] **Step 2: 검증** — `pnpm typecheck`.

---

## Task 7: performance-management 페이지 재작성

**Files:** Modify: `src/pages/performance-management.tsx` (773줄 — 기존 파일을 열어 작업)

가장 큰 작업. 기존은 `PerformanceDetail`(임베디드 images/setlist) 한 덩어리를 편집 후 일괄 PUT. 새 구조:

- [ ] **Step 1: 데이터 소스 3분할**
  - 공연 본문: `useMyPerformance()` 또는 `usePerformance(id)` → `Performance`
  - 이미지: `usePerformanceImages(performance.id)`
  - 셋리스트: `useSetlist(performance.id)`
- [ ] **Step 2: 본문 편집** — `editingData: Partial<Performance>` 편집 후 `useUpdateMyPerformance().mutate(patch)`. 필드 교체:
  - `teamName`→`performanceName`, `description`→`performanceDescription`
  - 신규 입력: `lineupName`(텍스트), `performanceCategory`(셀렉트 ARTIST/CLUB, `PERFORMANCE_CATEGORY_LABEL`), `performanceStatus`(셀렉트, `PERFORMANCE_STATUS_LABEL`), `performanceDate`(1~4 셀렉트)
  - `stage` 입력 → `locationId`(숫자) + `locationName`(읽기 표시). 지도 위치 선택 UI 가 없으면 `locationId` 숫자 입력으로.
  - `instagramUrl`/`youtubeUrl` 유지
  - 타임테이블(`performanceDate`/`startTime`/`endTime`) — 기존 권한 분기(`performance.manage`) 유지
- [ ] **Step 3: 이미지 섹션** — 임베디드 일괄저장 제거. 이미지 추가 = 업로드(`uploadImage`) 후 `useAddPerformanceImage().mutate({imageUrl, imageOrder, imageType:'PROFILE'|'DETAIL'})`. 삭제 = `useDeletePerformanceImage().mutate(imageId)`. 대표 이미지 개념은 `imageType: 'PROFILE'` 로 표현. 편집/뷰 모두 항목별 즉시 반영.
- [ ] **Step 4: 셋리스트 섹션** — dnd-kit 재정렬 유지하되, 순서 변경 결과를 각 항목 `songOrder` PATCH(`useUpdateSetlistItem`)로 반영. 항목 추가 = `useAddSetlistItem`, 삭제 = `useDeleteSetlistItem`. 필드: `songTitle`/`singerName`/`note`.
- [ ] **Step 5: 검증** — `pnpm typecheck`.

---

## Task 8: performance-list 페이지 + 소비처

**Files:** Modify: `src/pages/performance-list.tsx`, `src/pages/dashboard.tsx`, `src/pages/create-admin.tsx`

- [ ] **Step 1: `performance-list.tsx`**
  - 모델 리네임: `teamId`→`id`, `teamName`→`performanceName`, `mainPhotoUrl` 제거(리스트 응답에 없음 — 카드 썸네일은 생략하거나 별도. 일단 제거)
  - 필터 재작성: `PERFORMANCE_STAGES`/`FESTIVAL_DATES` 기반 → `performanceDate`(1~4) 탭 + `locationName` 기준 필터(고유값에서 도출). `PerformanceStage` import 제거
  - 정렬: `startTime` 오름차순 유지(null 은 뒤로)
  - ON AIR/라이브 배너·카드: `liveTeamId` → 라이브 공연 `id` 로 명칭만 정리. `useLivePerformance`/`useSetLivePerformance` 유지. "노천극장만 지정 가능" 같은 stage 의존 로직은 `locationName` 또는 제거로 조정
  - `liveDesignatable` 의 stage 의존 — `locationName` 기준 또는 전체 허용으로 단순화
- [ ] **Step 2: `dashboard.tsx` / `create-admin.tsx`** — `grep -n "performance\|Performance" <file>` 로 사용처 확인 후 필드 리네임 대응(`teamName`→`performanceName` 등). performances 관련 표시만 손본다.
- [ ] **Step 3: 검증** — `pnpm typecheck` 가 **완전히 깨끗**해야 한다.
- [ ] **Step 4: 수동 스모크** — `VITE_USE_MOCK=true`, `pnpm dev`:
  - `performer1` 로그인 → 공연 정보 관리: 본문 편집·저장, 이미지 추가/삭제, 셋리스트 추가/수정/삭제·재정렬
  - Super 로그인 → 공연 목록: 일차 필터, 카드, ON AIR 배너/지정
- [ ] **Step 5: 커밋** — Task 1~8 전체를 typecheck 통과 후 한 커밋으로 (Task 5 Step 4 의 커밋 블록 사용).

---

## 범위 외 (후속 / 백엔드 요청 항목)

- **백엔드 `PerformanceReadController` `/api` 프리픽스 추가** — 현재 `/performances`, 다른 컨트롤러는 `/api/...`. 프론트 동작 전제. (BE 리드 수정)
- **라이브 수동 지정 엔드포인트** — 백엔드에 `GET /api/performances/live` → `{performanceId: number|null}`, `PUT /api/performances/live` body `{performanceId}` 신설 요청. 권한 Super. (현재 프론트는 이 경로를 가정.) 백엔드 파생형 `GET /performances/current` 와는 별개 — 수동 지정본이 우선.
- **Performance SNS 필드** — `instagramUrl`/`youtubeUrl` 를 `Performance` 엔티티 + `PerformanceMyResponse`/`PerformanceUpdateRequest` 에 추가. 추가되면 프론트 매퍼 `?? ''` 방어는 그대로 둬도 무방.
- **auth `performanceTeamId`** — `getMyPerformance`(`/me`)는 세션으로 동작하지만, 프론트 `useMyPerformance` enabled 판정이 `user.performanceTeamId` 에 의존. auth `/me` 응답에 `performanceTeamId` 추가 필요(booth `boothId` 와 동일 건).

## Self-Review 결과

- 스펙 커버리지: 백엔드 13개 엔드포인트 전부 api.ts 에 매핑(라이브 2개는 미구현 가정). 4개 응답 DTO·3개 요청 DTO 전부 types.ts 반영. ✓
- 타입 일관성: `Performance`/`PerformanceListItem`/`PerformanceImage`/`SetlistItem` 및 `to*`/`from*`/`use*` 명칭이 Task 1~8 에서 일관. ✓
- 플레이스홀더: 데이터 레이어(types/mapper/api)는 전체 코드 포함. hooks/mock/페이지는 기존 파일을 열고 작업하는 항목이라 시그니처·매핑 규칙으로 명시. ✓
