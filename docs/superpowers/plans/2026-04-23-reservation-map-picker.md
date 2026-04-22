# 예약 관리 지도+슬라이더 Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/reservations` 진입 화면을 풀블리드 지도 + 하단 오버레이 슬라이더 UX 로 교체하고, 모든 역할이 같은 화면을 보되 `canEnter` 로 진입 권한만 분기한다.

**Architecture:** `src/features/booth-layout/` 하위에 순수 재사용 컴포넌트 세트(`BoothMapPicker` / `Canvas` / `Slider` / `Card` / `DateSelector`)를 두고, 페이지는 역할·데이터 바인딩만 담당한다. 좌표는 이미지 0–100 백분율 시드 JSON, 상태는 `focusedBoothId` 하나를 single source of truth 로 삼아 섹션·pan·슬라이더 스냅을 모두 파생한다.

**Tech Stack:** React + TypeScript (strict), Tailwind v4, TanStack Query, React Router v7, Zustand (`useAuth`), Lucide icons.

**Spec:** [docs/superpowers/specs/2026-04-23-reservation-map-picker-design.md](../specs/2026-04-23-reservation-map-picker-design.md)

---

## 테스트 전략 참고

이 프로젝트에는 테스트 러너가 없다 (CLAUDE.md). 표준 TDD 사이클은 다음으로 대체:

- **"실패 테스트 → 통과 테스트"** → **"코드 작성 → `pnpm typecheck` 통과"**
- 컴포넌트 단위의 단위 테스트는 **작성하지 않는다**
- 모든 Task 후 **Task 9 (수동 QA 패스)** 에서 spec 의 QA 체크리스트를 일괄 수행
- 각 커밋 전 `pnpm typecheck` 는 반드시 깨끗해야 한다 (CLAUDE.md 의 강제 규칙)

## 파일 구조

**신규 파일:**

```
src/features/booth-layout/
├── types.ts                       # Task 1
├── sections.ts                    # Task 1
├── mapper.ts                      # Task 2
├── api.ts                         # Task 2
├── hooks.ts                       # Task 2
└── components/
    ├── date-selector.tsx          # Task 3
    ├── booth-slider-card.tsx      # Task 4
    ├── booth-slider.tsx           # Task 5
    ├── booth-map-canvas.tsx       # Task 6
    └── booth-map-picker.tsx       # Task 7

src/mocks/
└── booth-placements.ts            # Task 1
```

**변경 파일:**

```
src/pages/reservation-booth-picker.tsx   # Task 8 (전면 재작성)
src/routes/index.tsx                      # Task 8 (Booth 자동 리다이렉트 제거)
```

각 파일은 한 가지 책임만 갖는다. 상태는 `BoothMapPicker` 한 군데에 집중, 하위 컴포넌트는 props 만 받는다.

---

## Task 1: 데이터 모델 + 시드 (types + sections + mock)

**Files:**
- Create: `src/features/booth-layout/types.ts`
- Create: `src/features/booth-layout/sections.ts`
- Create: `src/mocks/booth-placements.ts`

- [ ] **Step 1: `src/features/booth-layout/types.ts` 작성**

```ts
/**
 * 섹션 = 지도 이미지 1 장 단위의 물리적 구획.
 * - global  → 국제캠 (5/27 전용)
 * - baekyang → 백양로 (5/28, 5/29 공유)
 * - hangeul  → 한글탑 (5/28, 5/29 공유)
 */
export type MapSectionId = 'global' | 'baekyang' | 'hangeul';

export interface MapSection {
  id: MapSectionId;
  label: string;
  imageUrl: string;
  validDates: string[];
}

/**
 * 백엔드 응답 (snake_case).
 * 좌표 (x, y) 는 이미지 기준 0–100 백분율 — 리사이즈/해상도에 안전.
 */
export interface BoothPlacementDTO {
  booth_id: number;
  date: string;
  section: MapSectionId;
  booth_number: string;
  x: number;
  y: number;
}

/** 프론트 모델 (camelCase). 매퍼를 거쳐 변환. */
export interface BoothPlacement {
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
}

/**
 * 슬라이더 카드 렌더용 머지 결과.
 * 페이지 레벨에서 placement + BoothProfile(이름·단체명) + 예약 카운트 집계를 합쳐서 생성.
 */
export interface PickerBooth {
  placement: BoothPlacement;
  profile: { name: string; organizationName: string };
  counts: { waiting: number; completed: number; cancelled: number };
}
```

- [ ] **Step 2: `src/features/booth-layout/sections.ts` 작성**

```ts
import globalImg from '@/assets/map/global-section.jpg';
import baekyangImg from '@/assets/map/baekyang-section.jpg';
import hangeulImg from '@/assets/map/hangeul-section.jpg';
import type { MapSection, MapSectionId } from './types';

export const MAP_SECTIONS: Record<MapSectionId, MapSection> = {
  global:   { id: 'global',   label: '국제캠', imageUrl: globalImg,   validDates: ['2026-05-27'] },
  baekyang: { id: 'baekyang', label: '백양로', imageUrl: baekyangImg, validDates: ['2026-05-28', '2026-05-29'] },
  hangeul:  { id: 'hangeul',  label: '한글탑', imageUrl: hangeulImg,  validDates: ['2026-05-28', '2026-05-29'] },
};

/** 축제 운영일. 순서 = 사용자 기본 선택 우선순위 (첫 요소가 default). */
export const FESTIVAL_DATES = ['2026-05-27', '2026-05-28', '2026-05-29'] as const;

export type FestivalDate = typeof FESTIVAL_DATES[number];

/**
 * focusedBooth 가 없을 때(=해당 날짜에 배치 0 개 등) 배경으로 띄울 fallback 섹션.
 * 5/27 → 국제캠, 그 외 → 백양로.
 */
export function fallbackSectionFor(date: string): MapSection {
  if (date === '2026-05-27') return MAP_SECTIONS.global;
  return MAP_SECTIONS.baekyang;
}
```

- [ ] **Step 3: `src/mocks/booth-placements.ts` 작성**

```ts
import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * UI 동작 확인용 시드. 좌표는 임의 배치 — 실제 현장 위치 반영은 운영 준비 단계의 별도 작업.
 * booth_id 는 mockBoothsById 의 키와 매칭 (1: 문헌정보학과, 2: 빈 부스, 3: 경영학과 푸드트럭).
 */
export const mockBoothPlacements: BoothPlacementDTO[] = [
  { booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38 },
  { booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52 },
  { booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40 },
];
```

- [ ] **Step 4: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS — 새 파일이 서로만 참조하고 기존 타입과 충돌 없음.

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/types.ts \
        src/features/booth-layout/sections.ts \
        src/mocks/booth-placements.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): 데이터 모델 · 섹션 상수 · 좌표 시드 도입

예약 관리 지도+슬라이더 picker 의 데이터 레이어 기반:
- MapSectionId / MapSection / BoothPlacement(DTO/Model) / PickerBooth 타입
- MAP_SECTIONS 상수 + FESTIVAL_DATES + fallbackSectionFor 헬퍼
- mockBoothPlacements 시드 3건 (BoothProfile.id FK, 0-100 백분율 좌표)
EOF
)"
```

---

## Task 2: API + 훅 레이어 (mapper + api + hooks)

**Files:**
- Create: `src/features/booth-layout/mapper.ts`
- Create: `src/features/booth-layout/api.ts`
- Create: `src/features/booth-layout/hooks.ts`

- [ ] **Step 1: `src/features/booth-layout/mapper.ts` 작성**

```ts
import type { BoothPlacement, BoothPlacementDTO } from './types';

export const toBoothPlacement = (d: BoothPlacementDTO): BoothPlacement => ({
  boothId: d.booth_id,
  date: d.date,
  section: d.section,
  boothNumber: d.booth_number,
  x: d.x,
  y: d.y,
});
```

- [ ] **Step 2: `src/features/booth-layout/api.ts` 작성**

```ts
import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockBoothPlacements } from '@/mocks/booth-placements';
import { toBoothPlacement } from './mapper';
import type { BoothPlacement, BoothPlacementDTO } from './types';

// ---- listPlacements(date) ----

const listPlacementsMock = async (date: string): Promise<BoothPlacement[]> =>
  mockBoothPlacements.filter((p) => p.date === date).map(toBoothPlacement);

const listPlacementsReal = async (date: string): Promise<BoothPlacement[]> => {
  const qs = new URLSearchParams({ date }).toString();
  const data = await api.get<BoothPlacementDTO[]>(`/booth-placements?${qs}`);
  return data.map(toBoothPlacement);
};

export const listPlacements = env.USE_MOCK ? listPlacementsMock : listPlacementsReal;

// ---- getPlacementByBoothId(boothId) ----
// Booth 계정이 본인 배치(=본인 날짜·섹션)를 resolve 하려고 호출.

const getPlacementByBoothIdMock = async (boothId: number): Promise<BoothPlacement | null> => {
  const row = mockBoothPlacements.find((p) => p.booth_id === boothId);
  return row ? toBoothPlacement(row) : null;
};

const getPlacementByBoothIdReal = async (boothId: number): Promise<BoothPlacement | null> => {
  const data = await api.get<BoothPlacementDTO | null>(`/booth-placements/by-booth/${boothId}`);
  return data ? toBoothPlacement(data) : null;
};

export const getPlacementByBoothId = env.USE_MOCK
  ? getPlacementByBoothIdMock
  : getPlacementByBoothIdReal;
```

- [ ] **Step 3: `src/features/booth-layout/hooks.ts` 작성**

```ts
import { useQuery } from '@tanstack/react-query';
import { getPlacementByBoothId, listPlacements } from './api';

/** 특정 날짜에 배치된 부스 목록 조회. */
export function usePlacements(date: string) {
  return useQuery({
    queryKey: ['booth-placements', date],
    queryFn: () => listPlacements(date),
    enabled: !!date,
  });
}

/** Booth 단일 부스의 배치 조회 (boothId null 이면 disabled). */
export function useMyBoothPlacement(boothId: number | null) {
  return useQuery({
    queryKey: ['booth-placement', 'by-booth', boothId],
    queryFn: () => getPlacementByBoothId(boothId!),
    enabled: boothId != null,
  });
}
```

- [ ] **Step 4: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/mapper.ts \
        src/features/booth-layout/api.ts \
        src/features/booth-layout/hooks.ts
git commit -m "$(cat <<'EOF'
feat(booth-layout): API · 훅 레이어 추가

- toBoothPlacement (DTO → Model)
- listPlacements(date) / getPlacementByBoothId(id) (env.USE_MOCK 분기)
- usePlacements · useMyBoothPlacement (TanStack Query 래퍼)

컴포넌트는 이 훅만 의존 — fetch 를 직접 호출하지 않는다.
EOF
)"
```

---

## Task 3: DateSelector 컴포넌트

**Files:**
- Create: `src/features/booth-layout/components/date-selector.tsx`

- [ ] **Step 1: 파일 작성**

```tsx
interface DateSelectorProps {
  /** 선택 가능한 날짜 목록. 길이 1 이면 읽기 전용 레이블로 렌더. */
  dates: readonly string[];
  selectedDate: string;
  onChange: (date: string) => void;
}

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function DateSelector({ dates, selectedDate, onChange }: DateSelectorProps) {
  if (dates.length === 0) return null;

  if (dates.length === 1) {
    return (
      <div className="inline-flex items-center rounded-full bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
        {formatDateLabel(dates[0])}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-background/90 p-1 shadow-sm backdrop-blur">
      {dates.map((d) => {
        const active = d === selectedDate;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={active}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {formatDateLabel(d)}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/date-selector.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): DateSelector 컴포넌트 추가

pill 그룹 형태 날짜 필터. dates.length === 1 이면 자동으로 읽기 전용
레이블로 렌더 (Booth 계정 본인 날짜만 노출되는 경우 자연 처리).
EOF
)"
```

---

## Task 4: BoothSliderCard 컴포넌트

**Files:**
- Create: `src/features/booth-layout/components/booth-slider-card.tsx`

- [ ] **Step 1: 파일 작성**

```tsx
import { Lock, Star } from 'lucide-react';
import type { PickerBooth } from '@/features/booth-layout/types';

interface BoothSliderCardProps {
  booth: PickerBooth;
  isFocused: boolean;
  isMine: boolean;
  canEnter: boolean;
  onClick: () => void;
}

export function BoothSliderCard({
  booth,
  isFocused,
  isMine,
  canEnter,
  onClick,
}: BoothSliderCardProps) {
  const { placement, profile, counts } = booth;
  const displayName = profile.name || '이름 미입력 부스';
  const displayOrg = profile.organizationName || '-';
  const total = counts.waiting + counts.completed + counts.cancelled;

  return (
    <button
      type="button"
      onClick={onClick}
      title={!canEnter ? '본인 부스만 예약 관리가 가능합니다' : undefined}
      data-booth-id={placement.boothId}
      className={`flex w-[280px] shrink-0 flex-col items-start gap-2 rounded-xl border bg-background p-4 text-left shadow-sm transition-all ${
        isFocused
          ? 'border-primary scale-[1.02] ring-2 ring-primary/20'
          : 'border-border hover:border-ds-border-strong'
      } ${!canEnter ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div className="flex w-full items-center gap-2 font-semibold text-foreground">
        {isMine && <Star size={14} className="shrink-0 text-primary" />}
        <span className="truncate" title={displayName}>{displayName}</span>
        {!canEnter && <Lock size={12} className="ml-auto shrink-0 text-muted-foreground" />}
      </div>
      <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate" title={displayOrg}>{displayOrg}</span>
        <span className="shrink-0">· #{placement.boothNumber}</span>
      </div>
      {total === 0 ? (
        <div className="text-xs text-ds-text-disabled">예약 없음</div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center rounded-full bg-ds-primary-subtle px-2 py-0.5 font-medium text-ds-primary-pressed">
            대기 {counts.waiting}
          </span>
          <span className="inline-flex items-center rounded-full bg-ds-success-subtle px-2 py-0.5 font-medium text-ds-success-pressed">
            완료 {counts.completed}
          </span>
          <span className="inline-flex items-center rounded-full bg-ds-error-subtle px-2 py-0.5 font-medium text-ds-error-pressed">
            취소 {counts.cancelled}
          </span>
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/booth-slider-card.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): BoothSliderCard 컴포넌트 추가

단일 부스 카드. isFocused / isMine / canEnter 3 축으로 시각 상태 표현:
- isFocused: 브랜드 테두리 + ring + 약간 확대
- isMine: ★ 아이콘 (Booth 계정의 본인 부스 식별)
- !canEnter: 🔒 + not-allowed + opacity 저하 + title 툴팁
EOF
)"
```

---

## Task 5: BoothSlider 컴포넌트 (스크롤 스냅 + 양방향 동기화)

**Files:**
- Create: `src/features/booth-layout/components/booth-slider.tsx`

- [ ] **Step 1: 파일 작성**

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BoothSliderCard } from './booth-slider-card';
import type { PickerBooth } from '@/features/booth-layout/types';

interface BoothSliderProps {
  /** 전체 부스 (섹션 무관). 섹션 간 이동은 슬라이더 한 스트립에서 연속. */
  booths: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  /** 중앙 카드 변경 시. */
  onFocus: (boothId: number) => void;
  /** 중앙 카드에서 "진입" 트리거 시 (canEnter=true 일 때만 호출 권장). */
  onCommit: (boothId: number) => void;
}

export function BoothSlider({
  booths,
  focusedBoothId,
  myBoothId,
  canEnter,
  onFocus,
  onCommit,
}: BoothSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerCard = useCallback((boothId: number, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(boothId, el);
    else cardRefs.current.delete(boothId);
  }, []);

  // 외부 focus 변경 시 해당 카드로 auto-scroll (pin 클릭 · 화살표 · 키보드 모두 여기로 수렴)
  useEffect(() => {
    if (focusedBoothId == null) return;
    const el = cardRefs.current.get(focusedBoothId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [focusedBoothId]);

  // 스크롤 종료 후 중앙 카드 감지 → onFocus
  const detectCenter = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    let closestId: number | null = null;
    let closestDist = Infinity;
    cardRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    if (closestId != null && closestId !== focusedBoothId) {
      onFocus(closestId);
    }
  }, [focusedBoothId, onFocus]);

  const handleScroll = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(detectCenter, 80);
  };

  const focusByOffset = (delta: -1 | 1) => {
    if (focusedBoothId == null || booths.length === 0) return;
    const idx = booths.findIndex((b) => b.placement.boothId === focusedBoothId);
    if (idx < 0) return;
    const next = idx + delta;
    if (next >= 0 && next < booths.length) {
      onFocus(booths[next].placement.boothId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusByOffset(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusByOffset(1);
    }
  };

  const handleCardClick = (boothId: number) => {
    if (boothId !== focusedBoothId) {
      onFocus(boothId);
      return;
    }
    if (canEnter(boothId)) onCommit(boothId);
  };

  if (booths.length === 0) return null;

  return (
    <div
      className="relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="부스 슬라이더"
    >
      <button
        type="button"
        onClick={() => focusByOffset(-1)}
        aria-label="이전 부스"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md backdrop-blur hover:bg-background"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => focusByOffset(1)}
        aria-label="다음 부스"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md backdrop-blur hover:bg-background"
      >
        <ChevronRight size={18} />
      </button>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden"
        style={{
          // 첫/마지막 카드도 중앙으로 스냅 가능하도록 좌우 여백 확보 (카드 폭 280 / 2 = 140)
          paddingLeft: 'calc(50% - 140px)',
          paddingRight: 'calc(50% - 140px)',
          scrollbarWidth: 'none',
        }}
      >
        {booths.map((b) => {
          const boothId = b.placement.boothId;
          return (
            <div
              key={boothId}
              ref={(el) => registerCard(boothId, el)}
              className="snap-center"
            >
              <BoothSliderCard
                booth={b}
                isFocused={boothId === focusedBoothId}
                isMine={boothId === myBoothId}
                canEnter={canEnter(boothId)}
                onClick={() => handleCardClick(boothId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/booth-slider.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): BoothSlider 컴포넌트 추가

scroll-snap-x + 중앙 카드 스냅. 외부 focus 변경 시 scrollIntoView 로
자동 센터링, 사용자 드래그/스크롤 종료 시 80ms debounce 로 중앙 카드
감지하여 onFocus 발화. 좌우 화살표 버튼 + 키보드 ←/→ + 옆 카드 클릭
으로 포커스 이동, 중앙 카드 재클릭으로 onCommit 발화.
EOF
)"
```

---

## Task 6: BoothMapCanvas 컴포넌트 (지도 + 핀 + pan + 섹션 스왑)

**Files:**
- Create: `src/features/booth-layout/components/booth-map-canvas.tsx`

- [ ] **Step 1: 파일 작성**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { MapSection, PickerBooth } from '@/features/booth-layout/types';

interface BoothMapCanvasProps {
  section: MapSection;
  /** 이 섹션에 속한 부스들만 (상위에서 필터링). */
  boothsInSection: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
  onPinClick: (boothId: number) => void;
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function BoothMapCanvas({
  section,
  boothsInSection,
  focusedBoothId,
  myBoothId,
  onPinClick,
}: BoothMapCanvasProps) {
  const [layers, setLayers] = useState<MapSection[]>([section]);
  const prev = usePrevious(section);

  // 섹션 스왑: 이전 + 현재 이미지 동시 렌더 후 크로스페이드, 전환 후 이전 제거
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
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {layers.map((s) => (
        <img
          key={s.id}
          src={s.imageUrl}
          alt={s.label}
          aria-hidden={s.id !== section.id}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            s.id === section.id ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${translateX}%, ${translateY}%)` }}
      >
        {boothsInSection.map((b) => {
          const isFocused = b.placement.boothId === focusedBoothId;
          const isMine = b.placement.boothId === myBoothId;
          return (
            <button
              key={b.placement.boothId}
              type="button"
              onClick={() => onPinClick(b.placement.boothId)}
              style={{ left: `${b.placement.x}%`, top: `${b.placement.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-xs font-semibold shadow-md transition-all ${
                isFocused
                  ? 'h-10 w-10 scale-110 bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : isMine
                  ? 'h-8 w-8 bg-ds-success-pressed text-background'
                  : 'h-7 w-7 border border-border bg-background text-foreground hover:border-ds-border-strong'
              }`}
              aria-label={`부스 ${b.placement.boothNumber}`}
            >
              {b.placement.boothNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/booth-map-canvas.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): BoothMapCanvas 컴포넌트 추가

섹션 이미지 + 핀 + pan + 섹션 크로스페이드 담당:
- 두 이미지 레이어를 opacity 전환(300ms)으로 섹션 스왑
- 포커스 핀이 뷰포트 중앙에 오도록 CSS transform translate (백분율 기반)
- 핀 3상태 (focused / isMine / 일반)로 시각 구분
EOF
)"
```

---

## Task 7: BoothMapPicker (루트 · 상태 오너)

**Files:**
- Create: `src/features/booth-layout/components/booth-map-picker.tsx`

- [ ] **Step 1: 파일 작성**

```tsx
import { useEffect, useState } from 'react';
import { BoothMapCanvas } from './booth-map-canvas';
import { BoothSlider } from './booth-slider';
import { DateSelector } from './date-selector';
import { MAP_SECTIONS, fallbackSectionFor } from '@/features/booth-layout/sections';
import type { PickerBooth } from '@/features/booth-layout/types';

export interface BoothMapPickerProps {
  /** 현재 선택된 날짜의 부스들 (이미 머지된 PickerBooth). */
  booths: PickerBooth[];
  selectedDate: string;
  availableDates: readonly string[];
  onDateChange: (date: string) => void;
  /** Booth 계정의 본인 부스 id. 시각적 강조 및 canEnter 판정 기준. */
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  onEnter: (boothId: number) => void;
  initialFocusBoothId?: number;
}

/**
 * 상태 소유자.
 * focusedBoothId = single source of truth.
 * activeSection / boothsInSection / canvas pan 은 여기서 파생.
 */
export function BoothMapPicker({
  booths,
  selectedDate,
  availableDates,
  onDateChange,
  myBoothId,
  canEnter,
  onEnter,
  initialFocusBoothId,
}: BoothMapPickerProps) {
  const [focusedBoothId, setFocusedBoothId] = useState<number | null>(
    initialFocusBoothId ?? booths[0]?.placement.boothId ?? null,
  );

  // 날짜 변경 시 포커스 리셋 — 이전 날짜의 booth 가 새 날짜에 없을 수 있음
  useEffect(() => {
    setFocusedBoothId(initialFocusBoothId ?? booths[0]?.placement.boothId ?? null);
    // selectedDate 만 dep — booths 는 selectedDate 에 의해 교체되므로 중복 트리거 회피
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const focusedBooth = booths.find((b) => b.placement.boothId === focusedBoothId) ?? null;
  const activeSection = focusedBooth
    ? MAP_SECTIONS[focusedBooth.placement.section]
    : fallbackSectionFor(selectedDate);
  const boothsInSection = booths.filter((b) => b.placement.section === activeSection.id);

  const handleCommit = (boothId: number) => {
    if (canEnter(boothId)) onEnter(boothId);
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-20">
        <DateSelector dates={availableDates} selectedDate={selectedDate} onChange={onDateChange} />
      </div>
      <BoothMapCanvas
        section={activeSection}
        boothsInSection={boothsInSection}
        focusedBoothId={focusedBoothId}
        myBoothId={myBoothId}
        onPinClick={setFocusedBoothId}
      />
      {booths.length > 0 ? (
        <div className="absolute inset-x-4 bottom-4">
          <BoothSlider
            booths={booths}
            focusedBoothId={focusedBoothId}
            myBoothId={myBoothId}
            canEnter={canEnter}
            onFocus={setFocusedBoothId}
            onCommit={handleCommit}
          />
        </div>
      ) : (
        <div className="absolute inset-x-4 bottom-4 rounded-xl bg-background/90 p-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
          해당 날짜에 배치된 부스가 없습니다.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/booth-layout/components/booth-map-picker.tsx
git commit -m "$(cat <<'EOF'
feat(booth-layout): BoothMapPicker 루트 컴포넌트 추가

focusedBoothId 를 single source of truth 로 소유하고, Canvas / Slider /
DateSelector 를 조립한다. activeSection / boothsInSection / pan 은
focusedBoothId 로부터 파생. 날짜 변경 시 포커스 자동 리셋. booths
0개면 슬라이더 대신 안내 카드 렌더.
EOF
)"
```

---

## Task 8: 페이지 결선 + 라우트 변경 (통합)

이 태스크는 예약 진입 경로를 새 지도 picker 로 전환하는 **원자적 변경**이다. 두 파일을 함께 커밋해 중간 상태를 만들지 않는다.

**Files:**
- Modify: `src/pages/reservation-booth-picker.tsx` (전면 재작성)
- Modify: `src/routes/index.tsx` (Booth 자동 리다이렉트 제거)

- [ ] **Step 1: `src/pages/reservation-booth-picker.tsx` 전면 재작성**

파일 전체를 아래 내용으로 교체:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BoothMapPicker } from '@/features/booth-layout/components/booth-map-picker';
import { useMyBoothPlacement, usePlacements } from '@/features/booth-layout/hooks';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';
import type { PickerBooth } from '@/features/booth-layout/types';
import { useAuth } from '@/features/auth/hooks';
import { mockBoothsById } from '@/mocks/booth-profile';
import { mockReservations, type ReservationState } from '@/mocks/reservations';

/** boothId → 상태별 카운트 집계 (mockReservations 순회 1회). */
function buildReservationCountsByBooth(): Map<number, Record<ReservationState, number>> {
  const m = new Map<number, Record<ReservationState, number>>();
  for (const r of mockReservations) {
    const cur = m.get(r.boothId) ?? { waiting: 0, completed: 0, cancelled: 0 };
    cur[r.status] += 1;
    m.set(r.boothId, cur);
  }
  return m;
}

/**
 * 지도+슬라이더 기반 예약 관리 진입점.
 * Super/Master/Booth 모두 같은 화면을 본다. canEnter 로 진입 권한만 분기.
 */
export function ReservationBoothPicker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isBooth = user?.role === 'Booth';
  const myBoothId = isBooth ? user?.boothId : undefined;

  // Booth 계정의 본인 배치 (초기 날짜·포커스 resolve 용)
  const myPlacementQuery = useMyBoothPlacement(isBooth ? (myBoothId ?? null) : null);

  // 역할별 available dates
  const availableDates = useMemo<readonly string[]>(() => {
    if (isBooth && myPlacementQuery.data) return [myPlacementQuery.data.date];
    if (isBooth) return [];
    return FESTIVAL_DATES;
  }, [isBooth, myPlacementQuery.data]);

  // 초기 날짜 resolve
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDate != null) return;
    if (isBooth && myPlacementQuery.data) {
      setSelectedDate(myPlacementQuery.data.date);
    } else if (!isBooth && user) {
      setSelectedDate(FESTIVAL_DATES[0]);
    }
  }, [isBooth, myPlacementQuery.data, user, selectedDate]);

  const placementsQuery = usePlacements(selectedDate ?? '');

  const booths = useMemo<PickerBooth[]>(() => {
    if (!placementsQuery.data) return [];
    const countsByBooth = buildReservationCountsByBooth();
    return placementsQuery.data.map((p) => ({
      placement: p,
      profile: {
        name: mockBoothsById[p.boothId]?.name || '이름 미입력 부스',
        organizationName: mockBoothsById[p.boothId]?.organizationName || '-',
      },
      counts: countsByBooth.get(p.boothId) ?? { waiting: 0, completed: 0, cancelled: 0 },
    }));
  }, [placementsQuery.data]);

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

  // Booth 계정인데 본인 배치가 없는 경우 (fetch 완료 + null)
  if (isBooth && myPlacementQuery.isFetched && myPlacementQuery.data === null) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        소속 부스 정보가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
      </div>
    );
  }

  if (!selectedDate) {
    return <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="h-full w-full">
      <BoothMapPicker
        booths={booths}
        selectedDate={selectedDate}
        availableDates={availableDates}
        onDateChange={setSelectedDate}
        myBoothId={myBoothId}
        canEnter={canEnter}
        onEnter={onEnter}
        initialFocusBoothId={myBoothId}
      />
    </div>
  );
}
```

- [ ] **Step 2: `src/routes/index.tsx` 의 `ReservationsEntry` 축소**

현재 (`src/routes/index.tsx:30-44`):

```tsx
function ReservationsEntry() {
  const { user } = useAuth();
  if (user?.role === 'Booth') {
    if (user.boothId != null) {
      return <Navigate to={`/reservations/${user.boothId}`} replace />;
    }
    return (
      <div className="p-8 text-sm text-muted-foreground">
        소속 부스 정보가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
      </div>
    );
  }
  return <ReservationBoothPicker />;
}
```

을 아래로 교체:

```tsx
/**
 * `/reservations` 진입 분기.
 * 이전엔 Booth 계정을 `/reservations/:myBoothId` 로 자동 리다이렉트했지만,
 * 지도+슬라이더 picker 가 모든 역할 공통 진입점이 되면서 리다이렉트는 불필요.
 * "소속 부스 정보 없음" 빈 상태 메시지는 ReservationBoothPicker 내부에서 처리.
 */
function ReservationsEntry() {
  return <ReservationBoothPicker />;
}
```

`Navigate` import 가 이 파일에서 더 이상 쓰이지 않는다면 import 구문에서 제거. 확인:

Run: `grep -n "Navigate" src/routes/index.tsx`
`Navigate` 를 쓰는 다른 라인이 남아 있으면 import 유지, 전부 사라졌으면 import 제거.

`useAuth` 의 이 함수 내부 사용도 제거. 파일 전체에서 다른 곳에 쓰이지 않으면 import 삭제.

- [ ] **Step 3: `pnpm typecheck` 통과 확인**

Run: `pnpm typecheck`
Expected: PASS — 사용하지 않는 import 에 대한 경고가 없어야 함.

- [ ] **Step 4: 개발 서버 기동 후 스모크 확인**

Run: `pnpm dev`
브라우저에서 `http://localhost:5173` 접속, `super` 로그인 후 `/reservations` 진입.
Expected:
- 풀블리드 지도 (`global-section.jpg`) 렌더
- 좌상단 날짜 pill 3개
- 하단 슬라이더에 카드 1장 (문헌정보학과 부스)

에러 없으면 진행. 에러 있으면 디버깅 후 동일 Task 내 재커밋.

- [ ] **Step 5: Commit**

```bash
git add src/pages/reservation-booth-picker.tsx src/routes/index.tsx
git commit -m "$(cat <<'EOF'
feat(reservations): 예약 진입을 지도+슬라이더 picker 로 전환

ReservationBoothPicker 를 카드 그리드에서 BoothMapPicker 기반으로
전면 재작성. ReservationsEntry 의 Booth 자동 리다이렉트를 제거해
모든 역할이 동일 picker 를 공유하도록 한다. 진입 권한 분기는
canEnter 콜백으로 페이지가 주입 (Super/Master 전부, Booth 본인만).

- Booth 계정 초기 날짜 · 포커스는 useMyBoothPlacement 로 resolve
- Super/Master 초기 날짜 = FESTIVAL_DATES[0] (5/27)
- PickerBooth 는 placements + mockBoothsById + mockReservations 머지
- 본인 부스 미배치 Booth 는 기존 안내 문구 그대로 유지
EOF
)"
```

---

## Task 9: 수동 QA 패스

**Files:** (변경 없음 — 검증 단계)

spec 의 수동 QA 절차를 순서대로 수행한다. 각 항목에서 이슈 발견 시 원인 파악 후 별도 커밋으로 수정.

- [ ] **Step 1: super 계정 — 기본 동작**

  1. 로그인 (`super` / `super1234`) → `/reservations` 진입
  2. 기본 날짜 = 5/27, 국제캠 이미지, 슬라이더 1장 (문헌정보학과 부스)
  3. 날짜 버튼 5/28 클릭 → 백양로 이미지로 전환, 슬라이더에 타코야끼 + 와플 카드
  4. 슬라이더 스와이프/드래그로 와플 카드 이동 → 이미지가 한글탑으로 **크로스페이드 스왑**되는지 확인
  5. 지도 핀 클릭 → 슬라이더 해당 카드로 auto-scroll
  6. 중앙 카드 클릭 → `/reservations/:boothId` 이동
  7. 키보드 `←/→` → 포커스 이동

- [ ] **Step 2: master 계정**

  super 와 동일 동작 재확인 (권한 축이 같음).

- [ ] **Step 3: booth1 계정 — 본인 부스만 진입**

  1. 로그인 (`booth1` / `booth1234`)
  2. `/reservations` 진입 시 **리다이렉트 안 되고** picker 가 뜸
  3. 본인 부스 (id=1, 문헌정보학과) 가 auto-focus, 본인 핀 강조, ★ 아이콘
  4. 본인 카드 클릭 → `/reservations/1` 진입
  5. (같은 5/27 에 타 부스 배치가 없으면 이 항목 생략) 타 부스 카드 클릭 시 진입 불가, 🔒 + 툴팁
  6. 날짜 버튼은 본인 날짜 레이블만 (읽기 전용) — pill 그룹 아님

- [ ] **Step 4: booth2 계정 — 빈 부스**

  1. 로그인 (`booth2` / `booth1234`)
  2. mock 시드에 booth_id=2 배치는 있지만 프로필이 빈 상태 — 본인 부스 카드에 "이름 미입력 부스" 로 표시
  3. 진입 정상 작동

- [ ] **Step 5: performer1 계정 — 접근 차단**

  1. 로그인 (`performer1` / `perf1234`)
  2. URL 직접 `/reservations` 입력 → `RequirePermission` 가드가 차단 (기존과 동일하게 홈/유저 페이지로 리다이렉트)

- [ ] **Step 6: 날짜 전환 시 포커스 리셋 확인**

  super 계정으로 5/28 → 5/27 전환 시 이전 focus 잔상 없이 새 날짜의 첫 부스에 focus.

- [ ] **Step 7: 빈 상태 확인**

  `src/mocks/booth-placements.ts` 에서 임시로 모든 행을 주석 처리 후 super → 5/27 진입 → "해당 날짜에 배치된 부스가 없습니다" 안내 카드 표시 확인. 확인 후 주석 해제 (이 단계는 커밋 대상 아님).

- [ ] **Step 8: typecheck 재확인 + PR 준비**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm build`
Expected: 빌드 성공.

이슈 없으면 Task 종료. spec 의 QA 13 항목이 모두 충족된 상태.

---

## 자체 리뷰 (plan 작성자 내부 체크)

**Spec 커버리지** — spec 각 섹션 대 plan 태스크 맵핑:

| Spec 섹션 | Plan 태스크 |
|---|---|
| 1. 아키텍처 · 파일 배치 | Task 1–8 에 파일별 구현 분할 |
| 2. 데이터 모델 | Task 1 (types/sections/mock) + Task 2 (mapper/api/hooks) |
| 3. 컴포넌트 계층 · Props | Task 3 (DateSelector), 4 (Card), 5 (Slider), 6 (Canvas), 7 (Picker) |
| 4. 상태 · 동기화 로직 | Task 5 (슬라이더 스냅 + 80ms debounce), 6 (pan + 크로스페이드), 7 (focusedBoothId SSOT) |
| 5. 라우트 · 역할 분기 | Task 8 (ReservationsEntry 축소 + 페이지 전면 재작성) |
| 6. 기본값 | Task 1 (fallbackSectionFor), 7 (초기 focus), 8 (Super/Master 5/27 · Booth 자기날짜) |
| 7. 엣지 케이스 | Task 7 (booths 0개 → 안내 카드), Task 8 (Booth 배치 없음 → 안내 문구) |
| 8. 명시 가정 | plan 전반의 기본값 + QA 절차로 반영 |
| 테스트 전략 | Task 9 수동 QA 8 스텝 |

모든 요구사항이 1개 이상의 태스크에 매핑됨 ✓

**Placeholder 스캔** — `grep -nE "TBD|TODO|XXX|FIXME"` 로 검색한 결과, 실제 플랜 본문에 placeholder 없음. 모든 코드 블록이 완전하고 "similar to" 식 생략 없음.

**타입 일관성** — 주요 symbol 체크:

- `BoothPlacement` / `BoothPlacementDTO` — Task 1 정의, Task 2 import, 이후 모든 코드 동일 이름
- `PickerBooth` — Task 1 정의, Task 3–7 import, Task 8 에서 생성 · 주입
- `MAP_SECTIONS` / `FESTIVAL_DATES` / `fallbackSectionFor` — Task 1 정의, Task 7·8 사용
- `listPlacements` / `getPlacementByBoothId` — Task 2 정의, Task 2 훅과 Task 2 hooks.ts 에서 import
- `usePlacements` / `useMyBoothPlacement` — Task 2 정의, Task 8 사용
- `BoothMapPickerProps` / `BoothMapPicker` — Task 7, Task 8 사용
- `BoothSliderCard` / `BoothSlider` / `BoothMapCanvas` / `DateSelector` — 각 태스크 정의, 상위 컴포넌트 태스크에서 import

명명 일관성 ✓

---

## 실행 옵션

Plan complete. 구현은 다음 중 하나를 선택:

**1. Subagent-Driven (권장)** — 태스크마다 별도 subagent 를 띄워 fresh context 로 구현, 각 태스크 완료 후 리뷰. 사이드이펙트 없고 리뷰 고리가 깔끔.

**2. Inline Execution** — 현재 세션에서 직접 실행. 배치 속도 빠르되 컨텍스트가 누적됨.

어느 쪽으로 진행할까요?
