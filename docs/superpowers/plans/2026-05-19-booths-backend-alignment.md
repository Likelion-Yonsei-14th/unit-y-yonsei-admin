# Booths 백엔드 정합 재작성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/booths` 의 프론트 도메인 모델을 백엔드 실제 구현(`BoothResponse` / `BoothUpdateRequest`)에 정합시킨다.

**Architecture:** 기존 `BoothProfile`(프론트가 만든 스키마 초안)을 폐기하고, 백엔드 `BoothResponse` 필드를 그대로 미러링하는 `Booth` 모델로 교체한다. Booth 운영자는 auth `/me` 응답이 새로 내려줄 `boothId`로 본인 부스를 식별 → `GET /booths/{id}` 조회 + `PUT /admin/booths/{id}` 수정. 임베디드 메뉴(`menuItems`)·이미지(`thumbnails`)·`signatureMenu`·`orderNotice`는 백엔드에 필드가 없어 제거한다. `tags`는 백엔드가 추가 중이라 유지하되 매퍼에서 `?? []`로 방어한다.

**Tech Stack:** React + TanStack Query + Zustand, `lib/api-client.ts`(`{success,data,error}` 봉투 자동 언랩). 테스트 러너 없음 → 검증은 `pnpm typecheck` + `VITE_USE_MOCK=true` 수동 스모크.

---

## 배경 — 백엔드 ground truth (2026-05-19, `~/Desktop/unit-y-yonsei-server` 소스 기준)

`BoothResponse` (camelCase JSON, `{success,data,error}` 봉투 안):
`id, adminId, name, organization, description, date(Integer 1~4), openTime(LocalTime), closeTime(LocalTime), sector(BoothSector), location(Integer), status(BoothStatus), isFood(Boolean), instagram(String), isReservable(Boolean), account(String), locationId(Long), profileComplete(boolean)`

- `BoothSector` enum: `한글탑 | 백양로 | 송도` (JSON 값도 한글 그대로)
- `BoothStatus` enum: `OPEN | CLOSED | PREPARING`
- `LocalTime` 직렬화: `"HH:mm"` 또는 `"HH:mm:ss"` — 매퍼에서 앞 5자(`HH:mm`)로 정규화한다.
- **`tags` 필드는 아직 없음** (백엔드 구현 중) → 매퍼는 `dto.tags ?? []`.

엔드포인트:
- `GET /booths/{id}` → `BoothResponse` (공개)
- `GET /booths?date=&sector=&isFood=` → `BoothResponse[]` (공개)
- `PUT /admin/booths/{id}` body `BoothUpdateRequest` → `BoothResponse`
- `PATCH /admin/booths/{id}/status` body `{status}` → `BoothResponse`
- `PATCH /admin/booths/{id}/reservable` body `{isReservable}` → `BoothResponse`

`BoothUpdateRequest` 필드: `name, organization, description, date, openTime, closeTime, sector, location, status, isFood, instagram, isReservable, account, locationId`.

auth `CurrentAdminUserResponse` / `AdminLoginResponse` 현재 필드: `adminUserId, loginId, organization, role, status, representativeName`. **`boothId` 없음 — 백엔드가 추가 중.** 이 plan 의 Task 5 는 백엔드가 `boothId`(또는 `performanceTeamId`)를 추가했다는 전제로 작성. 추가 전이라면 Task 5 까지는 진행하되 Booth 역할 mock 모드로만 검증.

## 결정 사항 (확정)

- `signatureMenu`, `orderNotice`, `thumbnails`(부스 이미지) → **드롭**. 백엔드에 필드 없음.
- `menuItems` + 임베디드 메뉴 UI → **드롭**. 메뉴는 백엔드 별도 리소스(`/booths/{id}/menus`)이며 이번 범위 제외.
- `tags` → **유지** (백엔드 추가 중).
- booth-layout(배치 좌표) → **이번 범위 제외**. 백엔드가 별도 구현 중.
- `operatingHours`(문자열) → `openTime`/`closeTime` 2필드로 분리.
- `organizationName`→`organization`, `reservationEnabled`→`isReservable` 리네임.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/features/booths/types.ts` | `Booth` 모델·DTO·enum·완료 헬퍼 | 전면 교체 |
| `src/features/booths/mapper.ts` | `toBooth` / `fromBooth` | 전면 교체 |
| `src/features/booths/api.ts` | 부스 조회/수정 엔드포인트 | 전면 교체 |
| `src/features/booths/hooks.ts` | TanStack Query 래퍼 | 전면 교체 |
| `src/features/auth/types.ts` | `AdminAuthDTO` 에 `boothId` | 1필드 추가 |
| `src/features/auth/api.ts` | `toCurrentUserFromAuth` 에 boothId 매핑 | 1줄 추가 |
| `src/mocks/booth-profile.ts` | mock 시드 | 새 `Booth` 형태로 재작성 |
| `src/features/booths/components/booth-info-form.tsx` | 부스 정보 편집 폼 | 필드 재구성 |
| `src/features/booths/components/booth-status-cards.tsx` | 상태 카드 | 메뉴 카드 제거 |
| `src/features/booths/components/menu-list-form.tsx` | 메뉴 폼 | **삭제** |
| `src/pages/booth-management.tsx` | 부스 관리 페이지 | 메뉴 분기 제거 |
| `src/features/booth-layout/components/*` `src/pages/reservation-management.tsx` `reservation-booth-picker.tsx` `dashboard.tsx` | booths 소비처 | 필드 리네임 대응 |

---

## Task 1: Booth 타입 교체

**Files:** Modify(전면): `src/features/booths/types.ts`

- [ ] **Step 1: `types.ts` 전체를 아래로 교체**

```ts
/**
 * 부스(Booth) 도메인 모델 — 백엔드 BoothResponse 미러.
 * 필드/케이싱은 백엔드(`~/Desktop/unit-y-yonsei-server` BoothResponse)와 1:1.
 */

/** 백엔드 BoothSector enum. JSON 값도 한글 그대로. */
export type BoothSector = '한글탑' | '백양로' | '송도';

/** 백엔드 BoothStatus enum. */
export type BoothStatus = 'OPEN' | 'CLOSED' | 'PREPARING';

export const BOOTH_STATUS_LABEL: Record<BoothStatus, string> = {
  OPEN: '운영 중',
  CLOSED: '운영 종료',
  PREPARING: '준비 중',
};

/** 프론트 모델 (camelCase). */
export interface Booth {
  id: number;
  adminId: number;
  name: string;
  organization: string;
  description: string;
  /** 축제 일차 1~4. 미입력 null. */
  date: number | null;
  /** 'HH:mm'. 미입력 null. */
  openTime: string | null;
  closeTime: string | null;
  sector: BoothSector | null;
  /** 섹터 내 배치 번호. */
  location: number | null;
  status: BoothStatus;
  isFood: boolean;
  instagram: string;
  isReservable: boolean;
  account: string;
  /** 지도 위치 엔티티 ID. booth-layout 연동용 — 이번 범위에선 읽기만. */
  locationId: number | null;
  /** 백엔드 계산값. organization·date·openTime·closeTime·sector·location 모두 입력 시 true. */
  profileComplete: boolean;
  /** 부스 분류 태그. '#' 접두사 포함, 최대 3개. 백엔드 tags 필드 도입 전까지는 항상 []. */
  tags: string[];
}

/** 백엔드 응답 DTO (BoothResponse). tags 는 백엔드 도입 전까지 optional. */
export interface BoothDTO {
  id: number;
  adminId: number;
  name: string;
  organization: string;
  description: string;
  date: number | null;
  openTime: string | null;
  closeTime: string | null;
  sector: BoothSector | null;
  location: number | null;
  status: BoothStatus;
  isFood: boolean;
  instagram: string;
  isReservable: boolean;
  account: string;
  locationId: number | null;
  profileComplete: boolean;
  tags?: string[];
}

/** PUT /admin/booths/{id} 요청 바디 (BoothUpdateRequest). */
export interface BoothUpdateDTO {
  name: string;
  organization: string | null;
  description: string;
  date: number | null;
  openTime: string | null;
  closeTime: string | null;
  sector: BoothSector | null;
  location: number | null;
  status: BoothStatus;
  isFood: boolean;
  instagram: string;
  isReservable: boolean;
  account: string;
  locationId: number | null;
  /** 백엔드 tags 도입 후 활성. 도입 전엔 백엔드가 무시. */
  tags?: string[];
}
```

- [ ] **Step 2: 검증** — `pnpm typecheck` 실행. 이 시점엔 `mapper.ts`·`api.ts` 등이 옛 타입을 참조해 에러가 남 — 정상. Task 4 까지 완료 후 깨끗해진다.

---

## Task 2: 매퍼 교체

**Files:** Modify(전면): `src/features/booths/mapper.ts`

- [ ] **Step 1: `mapper.ts` 전체를 아래로 교체**

```ts
import type { Booth, BoothDTO, BoothUpdateDTO } from './types';

/** 'HH:mm:ss' / 'HH:mm' 어느 쪽이든 'HH:mm' 으로 정규화. null 통과. */
const toHm = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

export const toBooth = (d: BoothDTO): Booth => ({
  id: d.id,
  adminId: d.adminId,
  name: d.name,
  organization: d.organization,
  description: d.description,
  date: d.date,
  openTime: toHm(d.openTime),
  closeTime: toHm(d.closeTime),
  sector: d.sector,
  location: d.location,
  status: d.status,
  isFood: d.isFood,
  instagram: d.instagram,
  isReservable: d.isReservable,
  account: d.account,
  locationId: d.locationId,
  profileComplete: d.profileComplete,
  // 백엔드 tags 도입 전: 응답에 tags 없음 → 빈 배열로 방어.
  tags: d.tags ?? [],
});

/** Booth 모델 → PUT /admin/booths/{id} 요청 바디. id/adminId/profileComplete 는 전송 제외. */
export const fromBooth = (b: Booth): BoothUpdateDTO => ({
  name: b.name,
  organization: b.organization || null,
  description: b.description,
  date: b.date,
  openTime: b.openTime,
  closeTime: b.closeTime,
  sector: b.sector,
  location: b.location,
  status: b.status,
  isFood: b.isFood,
  instagram: b.instagram,
  isReservable: b.isReservable,
  account: b.account,
  locationId: b.locationId,
  tags: b.tags,
});
```

- [ ] **Step 2: 검증** — `pnpm typecheck` (여전히 api/hooks 에러 정상).

---

## Task 3: API 교체

**Files:** Modify(전면): `src/features/booths/api.ts`

- [ ] **Step 1: `api.ts` 전체를 아래로 교체**

```ts
import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockBoothsById } from '@/mocks/booth-profile';
import { toBooth, fromBooth } from './mapper';
import type { Booth, BoothDTO, BoothStatus } from './types';

// ---- Mock ----

async function getMyBoothMock(): Promise<Booth | null> {
  await new Promise((r) => setTimeout(r, 150));
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Booth' || user.boothId == null) return null;
  return mockBoothsById[user.boothId] ?? null;
}

async function updateMyBoothMock(booth: Booth): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 200));
  mockBoothsById[booth.id] = { ...booth };
  return mockBoothsById[booth.id];
}

async function listBoothsMock(): Promise<Booth[]> {
  await new Promise((r) => setTimeout(r, 100));
  return Object.values(mockBoothsById);
}

async function setBoothReservableMock(input: {
  boothId: number;
  isReservable: boolean;
}): Promise<Booth> {
  await new Promise((r) => setTimeout(r, 120));
  const cur = mockBoothsById[input.boothId];
  if (!cur) throw new Error(`mock: booth ${input.boothId} not found`);
  mockBoothsById[input.boothId] = { ...cur, isReservable: input.isReservable };
  return mockBoothsById[input.boothId];
}

// ---- Real ----

async function getMyBoothReal(): Promise<Booth | null> {
  const user = useAuthStore.getState().user;
  if (!user || user.boothId == null) return null;
  const dto = await api.get<BoothDTO>(`/booths/${user.boothId}`);
  return toBooth(dto);
}

async function updateMyBoothReal(booth: Booth): Promise<Booth> {
  const dto = await api.put<BoothDTO>(`/admin/booths/${booth.id}`, fromBooth(booth));
  return toBooth(dto);
}

async function listBoothsReal(): Promise<Booth[]> {
  const dtos = await api.get<BoothDTO[]>('/booths');
  return dtos.map(toBooth);
}

async function setBoothReservableReal(input: {
  boothId: number;
  isReservable: boolean;
}): Promise<Booth> {
  const dto = await api.patch<BoothDTO>(`/admin/booths/${input.boothId}/reservable`, {
    isReservable: input.isReservable,
  });
  return toBooth(dto);
}

// ---- 분기 export ----

export const getMyBooth = env.USE_MOCK ? getMyBoothMock : getMyBoothReal;
export const updateMyBooth = env.USE_MOCK ? updateMyBoothMock : updateMyBoothReal;
export const listBooths = env.USE_MOCK ? listBoothsMock : listBoothsReal;
export const setBoothReservable = env.USE_MOCK ? setBoothReservableMock : setBoothReservableReal;

// status enum 은 BoothStatus 타입 재사용 — 별도 status 변경 API 가 필요하면
// PATCH /admin/booths/{id}/status 로 동일 패턴 추가.
export type { BoothStatus };
```

- [ ] **Step 2: 검증** — `pnpm typecheck` (hooks/mock/consumers 에러 정상).

---

## Task 4: 훅 교체

**Files:** Modify(전면): `src/features/booths/hooks.ts`

- [ ] **Step 1: `hooks.ts` 전체를 아래로 교체**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { getMyBooth, listBooths, setBoothReservable, updateMyBooth } from './api';
import type { Booth } from './types';

/** 로그인한 Booth 역할 사용자의 자기 부스 조회. boothId 없으면 enabled=false. */
export function useMyBooth() {
  const user = useAuthStore((s) => s.user);
  const isBoothUser = user?.role === 'Booth' && user.boothId != null;

  return useQuery({
    queryKey: ['booths', 'me', user?.boothId],
    queryFn: getMyBooth,
    enabled: isBoothUser,
  });
}

/** Super/Master 용 전체 부스 목록. */
export function useBooths() {
  return useQuery({
    queryKey: ['booths', 'all'],
    queryFn: listBooths,
  });
}

/** 자기 부스 전체 저장 (PUT — 전체 교체). */
export function useUpdateMyBooth() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (booth: Booth) => updateMyBooth(booth),
    onSuccess: (data) => {
      queryClient.setQueryData(['booths', 'me', user?.boothId], data);
    },
  });
}

/** 부스 운영 ON/OFF (isReservable) 단독 토글. */
export function useSetBoothReservable() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { boothId: number; isReservable: boolean }) => setBoothReservable(input),
    onSuccess: (data) => {
      queryClient.setQueryData(['booths', 'me', user?.boothId], data);
    },
  });
}
```

- [ ] **Step 2: 검증** — `pnpm typecheck`. booths feature 내부 에러는 사라지고, mock·소비처(페이지/컴포넌트) 에러만 남아야 한다.

---

## Task 5: auth 응답에 boothId 매핑

**전제:** 백엔드가 `CurrentAdminUserResponse`/`AdminLoginResponse` 에 `boothId`(Booth 역할일 때) 를 추가했다. 추가 전이면 이 Task 는 코드만 넣고 mock 으로 검증.

**Files:** Modify: `src/features/auth/types.ts` (`AdminAuthDTO`), `src/features/auth/api.ts` (`toCurrentUserFromAuth`)

- [ ] **Step 1: `AdminAuthDTO` 에 optional 필드 추가** — `src/features/auth/types.ts` 의 `AdminAuthDTO` 인터페이스에 추가:

```ts
  /** Booth 역할 계정일 때 본인 부스 ID. 백엔드 도입 전엔 undefined. */
  boothId?: number | null;
  /** Performer 역할 계정일 때 본인 공연팀 ID. */
  performanceTeamId?: number | null;
```

- [ ] **Step 2: `toCurrentUserFromAuth` 에 매핑 추가** — `src/features/auth/api.ts` 의 해당 함수 본문에 두 줄 추가하고 옛 주석 제거:

```ts
const toCurrentUserFromAuth = (d: AdminAuthDTO): CurrentUser => ({
  id: d.adminUserId,
  userId: d.loginId,
  role: roleFromBackend(d.role),
  name: d.representativeName,
  boothId: d.boothId ?? null,
  performanceTeamId: d.performanceTeamId ?? null,
});
```

- [ ] **Step 3: 검증** — `pnpm typecheck`.

- [ ] **Step 4: 커밋** — Task 1~5 를 한 커밋으로 (도메인 레이어 정합):

```bash
git add src/features/booths/types.ts src/features/booths/mapper.ts src/features/booths/api.ts src/features/booths/hooks.ts src/features/auth/types.ts src/features/auth/api.ts
git commit -m "$(cat <<'EOF'
refactor(booths): Booth 도메인 모델을 백엔드 BoothResponse 에 정합

프론트가 만든 BoothProfile 초안을 폐기하고 백엔드 실제 구현
(BoothResponse/BoothUpdateRequest)을 미러링. signatureMenu·
orderNotice·thumbnails·menuItems 는 백엔드에 필드가 없어 제거.
tags 는 백엔드 도입 중이라 매퍼에서 ?? [] 로 방어. auth 응답의
boothId 를 매핑해 Booth 운영자가 본인 부스를 식별 가능하게 함.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: mock 시드 재작성

**Files:** Modify(전면): `src/mocks/booth-profile.ts`

기존 30개 `BoothProfile` 시드를 새 `Booth` 형태로 재작성. `mockBoothsById` 는 `Record<number, Booth>` 를 유지하고 `api.ts` 가 직접 import 한다.

- [ ] **Step 1: 새 시드 헬퍼 + id 1/2/3 작성** — 인증 mock 과 묶인 id 1/2/3 의 의미(1=작성완료, 2=빈 부스, 3=작성완료)를 유지:

```ts
/**
 * Booth 역할 사용자의 "내 부스" mock + Super/Master 전체 부스 풀.
 * 백엔드 BoothResponse 형태(features/booths/types.ts Booth)와 동일.
 * id 1/2/3 은 인증 mock(booth1/booth2 등)과 묶여 형태 유지:
 *  1=작성 완료, 2=빈 부스(작성 전 플로우), 3=작성 완료.
 */
import type { Booth, BoothSector, BoothStatus } from '@/features/booths/types';

const booth = (
  id: number,
  over: Partial<Booth> & Pick<Booth, 'name'>,
): Booth => ({
  id,
  adminId: id,
  name: over.name,
  organization: '',
  description: '',
  date: null,
  openTime: null,
  closeTime: null,
  sector: null,
  location: null,
  status: 'PREPARING',
  isFood: false,
  instagram: '',
  isReservable: false,
  account: '',
  locationId: null,
  profileComplete: false,
  tags: [],
  ...over,
});

const seeds: Booth[] = [
  booth(1, {
    name: '문헌정보학과 부스',
    organization: '연세대학교 문헌정보학과',
    description: '문헌정보학과에서 준비한 맛있는 음식과 즐거운 체험을 즐겨보세요!',
    date: 3,
    openTime: '12:00',
    closeTime: '21:00',
    sector: '백양로',
    location: 5,
    status: 'OPEN',
    isFood: true,
    instagram: 'https://instagram.com/yonsei_lis',
    isReservable: true,
    account: '카카오뱅크 1234-5678',
    locationId: 5,
    profileComplete: true,
    tags: ['#먹거리', '#치킨'],
  }),
  booth(2, { name: '미입력 부스' }), // 빈 부스 — 작성 전 플로우
  booth(3, {
    name: '경영학과 부스',
    organization: '연세대학교 경영학과',
    description: '경영학과 학생회가 운영하는 체험 부스입니다.',
    date: 3,
    openTime: '11:00',
    closeTime: '20:00',
    sector: '한글탑',
    location: 12,
    status: 'OPEN',
    isFood: false,
    isReservable: true,
    locationId: 12,
    profileComplete: true,
    tags: ['#체험'],
  }),
];
```

- [ ] **Step 2: id 4~30 시드 추가** — 기존 `booth-profile.ts` 의 4~30 항목을 `booth(N, { ... })` 형태로 옮긴다. 매핑 규칙:
  - `name` 유지, `organizationName`→`organization`, `description` 유지
  - `operatingHours` 문자열 `"HH:mm - HH:mm"` → `openTime`/`closeTime` 두 값으로 분해
  - `reservationEnabled`→`isReservable`
  - `tags` 유지
  - `signatureMenu`/`orderNotice`/`thumbnails`/`menuItems` 폐기(옮기지 않음)
  - 신규: `date`(부스가 운영되는 일차, 알 수 없으면 `3`), `sector`(`'한글탑'|'백양로'|'송도'` 중 운영 위치), `location`(배치 번호, 임의 정수), `status`(`isReservable` 참이면 `'OPEN'` 아니면 `'PREPARING'`), `isFood`(음식 부스면 true), `instagram`/`account`(있으면 채우고 없으면 `''`), `adminId`=id, `locationId`=`location` 값과 동일, `profileComplete`=필수 필드 모두 채웠으면 true
  - 비활성 부스(기존 booth30) 는 `status: 'CLOSED'`, `isReservable: false`

- [ ] **Step 3: export 작성** — 파일 끝:

```ts
export const mockBoothsById: Record<number, Booth> = Object.fromEntries(
  seeds.map((b) => [b.id, b]),
);
```

- [ ] **Step 4: 검증** — `pnpm typecheck`. mock 자체 에러는 사라진다.

- [ ] **Step 5: 커밋**

```bash
git add src/mocks/booth-profile.ts
git commit -m "refactor(booths): mock 부스 시드를 새 Booth 모델로 재작성

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: BoothInfoForm 재작성

**Files:** Modify: `src/features/booths/components/booth-info-form.tsx`

폼 필드를 새 `Booth` 모델로 재구성한다. `TagInput`(`@/components/common/tag-input`)은 이미 분리돼 있어 그대로 재사용.

- [ ] **Step 1: 폼이 다루는 필드 교체**
  - 제거: `signatureMenu`, `operatingHours`(문자열 단일), `orderNotice`, `thumbnails`(이미지 업로드 블록)
  - 유지: `name`, `description`, `tags`(TagInput), `organization`(←organizationName)
  - 신규 입력 UI:
    - `date` — 1~4 일차 선택 (셀렉트 또는 칩). 라벨 "축제 일차"
    - `openTime` / `closeTime` — `<input type="time">` 2개. 라벨 "운영 시작/종료"
    - `sector` — `'한글탑'|'백양로'|'송도'` 셀렉트. 라벨 "구역"
    - `location` — 숫자 입력. 라벨 "배치 번호"
    - `status` — `BoothStatus` 셀렉트, `BOOTH_STATUS_LABEL` 사용. 라벨 "운영 상태"
    - `isFood` — 체크박스/토글. 라벨 "음식 부스"
    - `instagram` — 텍스트. 라벨 "인스타그램 URL"
    - `account` — 텍스트. 라벨 "정산 계좌"
  - `locationId` 는 폼에서 편집하지 않음(지도 연동값). state 에 들고 저장 시 그대로 전송.
- [ ] **Step 2: props·저장 경로 정리**
  - `booth` prop 타입 `BoothProfile` → `Booth`
  - `reservationEnabled`/`onReservationEnabledChange` prop 은 `isReservable` 의미로 유지(이름은 호출부와 함께 `isReservable`로 통일 권장)
  - `updateMutation` 은 `useUpdateMyBooth()` 반환값 — 저장 시 편집 중 `Booth` 전체를 `mutate(booth)` 로 전달(PUT 전체 교체)
- [ ] **Step 3: 검증** — `pnpm typecheck`.

---

## Task 8: BoothStatusCards + booth-management 페이지에서 메뉴 제거

**Files:** Modify: `src/features/booths/components/booth-status-cards.tsx`, `src/pages/booth-management.tsx`

- [ ] **Step 1: `booth-status-cards.tsx`** — "메뉴 리스트" 카드와 `menuListCompleted`/`onOpenMenuList` prop 제거. "부스 정보" 카드만 남긴다. 완료 여부는 `booth.profileComplete`(백엔드 계산값)를 직접 받는다.
- [ ] **Step 2: `booth-management.tsx`** 수정:
  - `useMyBoothProfile`/`useUpdateMyBoothProfile` → `useMyBooth`/`useUpdateMyBooth`
  - `isBoothInfoCompleted`/`isMenuListCompleted` import·사용 제거 → `booth.profileComplete` 사용
  - `MenuListForm` import·`showMenuListForm` state·렌더 분기 제거
  - 헤더 ON/OFF 토글: `reservationEnabled` state → `isReservable`. 토글 즉시 반영이 필요하면 `useSetBoothReservable()` mutation 호출로 전환(현재는 BoothInfoForm 저장에 묶여 있음 — 동작 유지하려면 prop 이름만 `isReservable`로)
  - `booth.organizationName` → `booth.organization`
- [ ] **Step 3: 검증** — `pnpm typecheck`.

---

## Task 9: menu-list-form 삭제

**Files:** Delete: `src/features/booths/components/menu-list-form.tsx`

- [ ] **Step 1:** `git rm src/features/booths/components/menu-list-form.tsx`
- [ ] **Step 2:** `grep -rn "menu-list-form\|MenuListForm\|BoothMenuItem\|menuItems" src` — 남은 참조가 없는지 확인. 있으면 제거(대부분 Task 8 에서 처리됨).
- [ ] **Step 3: 검증** — `pnpm typecheck`.

---

## Task 10: 소비처 필드 리네임 대응

**Files:** Modify: `src/features/booth-layout/components/placement-list.tsx`, `placement-editor-canvas.tsx`, `placement-editor.tsx`, `src/pages/reservation-management.tsx`, `src/pages/reservation-booth-picker.tsx`, `src/pages/dashboard.tsx`

- [ ] **Step 1:** 각 파일에서 booths 심볼 사용처를 찾아 수정:
  - `BoothProfile` 타입 → `Booth`
  - `.organizationName` → `.organization`
  - `.reservationEnabled` → `.isReservable`
  - 제거된 필드(`signatureMenu`/`operatingHours`/`orderNotice`/`thumbnails`/`menuItems`) 참조가 있으면 해당 UI 제거 또는 새 필드로 대체
  각 파일은 `grep -n "Booth\|booth" <file>` 로 사용처를 먼저 확인 후 수정.
- [ ] **Step 2: 검증** — `pnpm typecheck` 가 **완전히 깨끗**해야 한다. 남은 에러는 모두 이 Task 에서 해결.

- [ ] **Step 3: 수동 스모크** — `.env.local` 의 `VITE_USE_MOCK=true` 확인 후 `pnpm dev`:
  - `booth1` 로그인 → 부스 정보 관리 페이지 진입, 정보 카드 표시, 폼 진입·필드 표시·저장
  - `booth2` 로그인 → 빈 부스 작성 전 플로우
  - Super 로그인 → 예약 picker / dashboard 에서 부스 목록 정상

- [ ] **Step 4: 커밋**

```bash
git add src/features/booths/components/ src/pages/booth-management.tsx src/features/booth-layout/ src/pages/reservation-management.tsx src/pages/reservation-booth-picker.tsx src/pages/dashboard.tsx
git commit -m "$(cat <<'EOF'
refactor(booths): 부스 폼·페이지·소비처를 새 Booth 모델로 정합

BoothInfoForm 을 백엔드 필드(date/openTime/closeTime/sector/
location/status/isFood/instagram/account)로 재구성. 메뉴는
백엔드 별도 리소스라 임베디드 메뉴 UI(MenuListForm) 제거.
소비처(booth-layout/예약/대시보드)의 필드명을 일괄 정합.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 범위 외 (후속 작업)

- **booth 메뉴** — 백엔드 `/booths/{id}/menus` 리소스. 별도 feature(`features/booth-menus`)로 신설.
- **booth-layout 정합** — 백엔드가 배치 좌표를 booth 필드(`sector`/`location`/`date`/`locationId`)에 내장. 백엔드 구현 완료 후 별도 plan.
- **booth tags 백엔드** — `BoothResponse`/`BoothUpdateRequest` 에 `tags` 추가(백엔드 진행 중). 추가되면 매퍼의 `?? []` 방어는 그대로 두어도 무방.
- **공연 태그 / 미구현 도메인 스펙 문서** — 별도 작업.

## Self-Review 결과

- 스펙 커버리지: BoothResponse 17필드 전부 `Booth`/`BoothDTO` 에 반영, `BoothUpdateRequest` 14필드 전부 `BoothUpdateDTO`·`fromBooth` 에 반영. ✓
- 타입 일관성: `Booth`/`BoothDTO`/`BoothUpdateDTO`/`BoothSector`/`BoothStatus` 명칭이 Task 1~10 에서 일관. `toBooth`/`fromBooth`/`getMyBooth`/`useMyBooth` 명칭 일관. ✓
- 플레이스홀더: Task 6 Step 2(시드 4~30)와 Task 7/8/10 의 UI 변경은 기존 파일을 열고 작업하는 항목이라 매핑 규칙으로 명시. 결정형 레이어(types/mapper/api/hooks/auth)는 전체 코드 포함. ✓
