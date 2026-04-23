# 예약 지도 picker v2 구현 플랜 — 사각형 핀 + 이미지 rect 정합

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/reservations` 지도 picker 의 핀 좌표계를 이미지 rendered rect 기준으로 전환하고, 핀 비주얼을 사각형(+width/height) 으로 교체해 부스 footprint 를 표현한다.

**Architecture:** `BoothPlacement` DTO/Model 에 `width` · `height` (% 단위) 를 추가하고, `BoothMapCanvas` 를 전면 재작성한다. 핀 오버레이 컨테이너를 `<img>.getBoundingClientRect()` 로 측정한 픽셀 rect 에 고정해 리사이즈·종횡비 차이에서도 좌표가 같은 이미지 픽셀을 가리키게 한다. 핀은 원형 → `rounded-md` 사각형 `<BoothPin>` 컴포넌트로 교체. `canEnter` 를 `BoothMapPicker → BoothMapCanvas → BoothPin` 으로 전달해 잠금 시각 힌트(🔒 + opacity)를 표시하되 **클릭은 막지 않는다** (v1 "canvas 클릭 = focus 이동만, commit = 슬라이더 카드" 정책 유지).

**Tech Stack:** React 18 + TypeScript, TanStack Query, Tailwind v4, lucide-react (`Star`, `Lock`), Vite.

**Spec 참조:** [`docs/superpowers/specs/2026-04-23-reservation-map-picker-v2-design.md`](../specs/2026-04-23-reservation-map-picker-v2-design.md)

**선행 조건 (백엔드, 본 플랜 범위 밖):** `booth_placements` 테이블에 `width NUMERIC(5,2) NOT NULL` / `height NUMERIC(5,2) NOT NULL` 컬럼 추가 마이그레이션이 별도 PR 로 선행되어야 함. 본 플랜은 mock 기준으로 완결되며 실서버 응답 payload 에 신규 필드가 포함된 뒤에 머지.

---

## 파일 구조

수정만, 신규 파일 없음.

- **Modify** `src/features/booth-layout/types.ts` — DTO + Model 에 `width`, `height: number` 추가
- **Modify** `src/features/booth-layout/mapper.ts` — pass-through 2 줄
- **Modify** `src/mocks/booth-placements.ts` — 시드 레코드에 w/h 채움
- **Modify** `src/features/booth-layout/components/booth-map-canvas.tsx` — 전면 재작성 (ResizeObserver + rect 측정 + 사각형 `BoothPin`). `canEnter` prop 신설
- **Modify** `src/features/booth-layout/components/booth-map-picker.tsx` — canvas 에 `canEnter` 전달

테스트 러너 없음 → 각 태스크 끝에 `pnpm typecheck` + 커밋, 마지막 Task 에서 브라우저 수동 QA.

---

## Task 1: 데이터 모델 확장 (types + mapper + seed)

**Files:**
- Modify: `src/features/booth-layout/types.ts`
- Modify: `src/features/booth-layout/mapper.ts`
- Modify: `src/mocks/booth-placements.ts`

- [ ] **Step 1: DTO/Model 에 width/height 추가**

`src/features/booth-layout/types.ts` 의 `BoothPlacementDTO` 와 `BoothPlacement` 각각에 2 필드 추가.

```ts
// src/features/booth-layout/types.ts

/**
 * 백엔드 응답 (snake_case).
 * 좌표 (x, y) 는 이미지 기준 0–100 백분율 — 리사이즈/해상도에 안전.
 * (width, height) 는 사각형 footprint — 0–100 % 단위, 이미지 기준.
 */
export interface BoothPlacementDTO {
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

- [ ] **Step 2: mapper pass-through**

`src/features/booth-layout/mapper.ts`:

```ts
import type { BoothPlacement, BoothPlacementDTO } from './types';

export const toBoothPlacement = (d: BoothPlacementDTO): BoothPlacement => ({
  boothId: d.booth_id,
  date: d.date,
  section: d.section,
  boothNumber: d.booth_number,
  x: d.x,
  y: d.y,
  width: d.width,
  height: d.height,
});
```

- [ ] **Step 3: Mock 시드에 w/h 채움**

`src/mocks/booth-placements.ts`:

```ts
import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * UI 동작 확인용 시드. 좌표·크기 모두 임의값 — 실 배치 좌표/크기는 운영 준비 단계의 별도 작업.
 * booth_id 는 mockBoothsById 의 키와 매칭 (1: 문헌정보학과, 2: 빈 부스, 3: 경영학과 푸드트럭).
 */
export const mockBoothPlacements: BoothPlacementDTO[] = [
  { booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38, width: 5, height: 6 },
  { booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52, width: 7, height: 3 },
  { booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40, width: 8, height: 10 },
];
```

- [ ] **Step 4: 타입체크**

Run: `pnpm typecheck`
Expected: `tsc` 에러 0 건. `BoothPlacement` / `BoothPlacementDTO` 의 required 필드가 늘었으므로 (a) mock 시드가 새 필드를 가지고 있고 (b) canvas 에서 placement 를 spread 하는 곳이 없다면 에러 없어야 함. 만약 `booth-map-canvas.tsx` 에서 partial destructuring 외 다른 문제가 뜨면 해당 지점 수정.

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/types.ts \
        src/features/booth-layout/mapper.ts \
        src/mocks/booth-placements.ts
git commit -m "feat(booth-layout): BoothPlacement 에 width/height 필드 추가

v2 사각형 핀을 위해 DTO/Model/mapper/mock 시드에 width·height (0-100 %)
추가. required 로 둬 시드 누락 시 0×0 핀이 렌더되는 것을 타입 레벨에서
차단."
```

---

## Task 2: BoothMapCanvas 전면 재작성

ResizeObserver + rect 측정 기반 오버레이 + 사각형 `BoothPin` 컴포넌트 + `canEnter` prop 신설을 한 번에.

**Files:**
- Modify: `src/features/booth-layout/components/booth-map-canvas.tsx`
- Modify: `src/features/booth-layout/components/booth-map-picker.tsx`

- [ ] **Step 1: Canvas 재작성**

`src/features/booth-layout/components/booth-map-canvas.tsx` 전체를 아래 내용으로 교체.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Star } from 'lucide-react';
import type { MapSection, PickerBooth } from '@/features/booth-layout/types';

interface BoothMapCanvasProps {
  section: MapSection;
  /** 이 섹션에 속한 부스들만 (상위에서 필터링). */
  boothsInSection: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
  /** 핀 lock 시각 힌트(🔒 / opacity) 표시용. 클릭은 막지 않음 — commit 은 슬라이더 카드 책임. */
  canEnter: (boothId: number) => boolean;
  onPinClick: (boothId: number) => void;
}

interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
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
  canEnter,
  onPinClick,
}: BoothMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentImgRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<ImageRect | null>(null);

  // 섹션 스왑 크로스페이드 (v1 과 동일 로직).
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

  // 현재 이미지의 rendered rect 를 container 기준으로 측정.
  const measureImage = useCallback(() => {
    const img = currentImgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const imgBox = img.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    if (imgBox.width === 0 || imgBox.height === 0) return; // 아직 로드 전
    setImageRect({
      left: imgBox.left - containerBox.left,
      top: imgBox.top - containerBox.top,
      width: imgBox.width,
      height: imgBox.height,
    });
  }, []);

  // ResizeObserver 는 container 에 attach — img 직접 관찰 시 섹션 스왑마다 재연결 필요.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measureImage());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureImage]);

  // 섹션 전환: 캐시된 이미지는 onLoad 가 안 뜨므로 rAF 로 다음 paint 에 강제 측정.
  useEffect(() => {
    const raf = requestAnimationFrame(() => measureImage());
    return () => cancelAnimationFrame(raf);
  }, [section, measureImage]);

  const focused = boothsInSection.find((b) => b.placement.boothId === focusedBoothId);
  const translateX = focused ? 50 - focused.placement.x : 0;
  const translateY = focused ? 50 - focused.placement.y : 0;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted">
      {/* 2-레이어 이미지 크로스페이드. object-contain 으로 letterbox. */}
      {layers.map((s) => (
        <img
          key={s.id}
          ref={s.id === section.id ? currentImgRef : undefined}
          src={s.imageUrl}
          alt={s.label}
          aria-hidden={s.id !== section.id}
          onLoad={s.id === section.id ? measureImage : undefined}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            s.id === section.id ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* 핀 오버레이 — 이미지 rendered rect 에 정합. 내부 0-100 % = 이미지 0-100 %. */}
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

interface BoothPinProps {
  booth: PickerBooth;
  isFocused: boolean;
  isMine: boolean;
  canEnter: boolean;
  onClick: () => void;
}

function BoothPin({ booth, isFocused, isMine, canEnter, onClick }: BoothPinProps) {
  const { placement } = booth;
  const stateClass = isFocused
    ? 'border-primary bg-primary/20 ring-2 ring-primary/30 scale-[1.02]'
    : isMine
    ? 'border-ds-success-pressed bg-ds-success-subtle/60'
    : 'border-border bg-background/50 hover:border-ds-border-strong';
  const lockedClass = !canEnter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        !canEnter
          ? `부스 ${placement.boothNumber} — 본인 부스만 예약 관리가 가능합니다`
          : `부스 ${placement.boothNumber}`
      }
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        width: `${placement.width}%`,
        height: `${placement.height}%`,
        minWidth: 8,
        minHeight: 8,
      }}
      className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-md border-2 text-xs font-semibold shadow-sm transition-all ${stateClass} ${lockedClass}`}
      aria-label={`부스 ${placement.boothNumber}`}
    >
      {isMine && <Star size={12} className="mr-1 shrink-0" />}
      <span className="truncate">{placement.boothNumber}</span>
      {!canEnter && <Lock size={10} className="ml-1 shrink-0" />}
    </button>
  );
}
```

- [ ] **Step 2: Picker 에서 canvas 로 canEnter 전달**

`src/features/booth-layout/components/booth-map-picker.tsx` 의 `<BoothMapCanvas ... />` 호출에 `canEnter` prop 추가. 해당 값은 Picker 컴포넌트가 이미 props 로 받고 있음(`canEnter: (boothId: number) => boolean`).

수정 대상: `<BoothMapCanvas>` JSX 블록.

```tsx
<BoothMapCanvas
  section={activeSection}
  boothsInSection={boothsInSection}
  focusedBoothId={focusedBoothId}
  myBoothId={myBoothId}
  canEnter={canEnter}
  onPinClick={setFocusedBoothId}
/>
```

- [ ] **Step 3: 타입체크**

Run: `pnpm typecheck`
Expected: 에러 0 건. 주요 확인 포인트:
- `BoothMapCanvasProps` 에 `canEnter` 가 required 로 추가됐으므로 picker 가 반드시 넘겨야 함.
- `PickerBooth` / `MapSection` 타입 import 경로 유효.
- `lucide-react` 의 `Star`, `Lock` import 해결 (`booth-slider-card.tsx` 에서 이미 쓰고 있으므로 dep 는 존재).

- [ ] **Step 4: 개발 서버로 렌더 스모크 체크**

Run: `pnpm dev`
브라우저에서 `http://localhost:5173` 접속 → super 계정(`super / super1234`) 로그인 → `/reservations` 진입.
**최소 확인 3 가지만** (상세 QA 는 Task 3):
1. 5/27 국제캠 이미지 위에 **사각형 핀 1 개** 렌더, 숫자 `1` 라벨 보임.
2. 콘솔 에러/경고 없음 (특히 React key, ref 관련).
3. 창 리사이즈 시 핀이 이미지와 같이 스케일.

문제 있으면 다음 Step 넘어가기 전에 Step 1 로 돌아가 수정.

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/components/booth-map-canvas.tsx \
        src/features/booth-layout/components/booth-map-picker.tsx
git commit -m "refactor(booth-layout): BoothMapCanvas 를 사각형 핀 + 이미지 rect 정합으로 재작성

- <img>.getBoundingClientRect() 로 측정한 rect 에 핀 오버레이 고정해
  리사이즈·종횡비 차이에서도 좌표가 같은 이미지 픽셀을 가리키게 함.
- 원형 핀 → 사각형 BoothPin 컴포넌트, width/height 를 % 단위 footprint 로
  사용 (min 8×8 px 하한).
- canEnter 를 canvas 까지 전달해 lock 시각 힌트(🔒/opacity) 표시.
  클릭은 여전히 focus 이동만 유발 — commit 은 슬라이더 카드 책임 유지."
```

---

## Task 3: 수동 QA 체크리스트

테스트 러너가 없으므로 체크리스트를 브라우저에서 직접 실행. 실패 시 Task 2 로 돌아가 수정 → 커밋 추가.

**Files:**
- 코드 변경 없음. dev 서버 + 브라우저 devtools.

- [ ] **Step 1: dev 서버 기동**

Run: `pnpm dev`
Expected: Vite dev 서버 기동, `http://localhost:5173` 열림.

- [ ] **Step 2: super 로그인 시나리오**

계정: `super` / `super1234`

- [ ] 1. `/reservations` 진입 → 5/27 국제캠 이미지 + 사각형 핀 1 개. boothNumber 라벨(`1`) 이 사각형 **안쪽 중앙**에 보임. 예상 크기 ≈ 38 × 36 px (container 800 × 600 기준).
- [ ] 2. DateSelector 에서 5/28 클릭 → 백양로 이미지로 크로스페이드. 이미지가 세로 길쭉(aspect 0.28) 해서 letterbox 양 옆 회색 여백이 보여야 함. **핀은 이미지 내부에만** 위치 (letterbox 여백에 튀어나가지 않음). 핀 예상 크기 ≈ 12 × 18 px — min 8 px 하한 경계 확인.
- [ ] 3. 슬라이더를 **한글탑(hangeul)** 부스로 넘김 → 섹션이 baekyang → hangeul 로 크로스페이드. 핀 위치가 새 이미지 rect 에 정확히 정합. 핀 예상 크기 ≈ 60 × 60 px.
- [ ] 4. **브라우저 창 리사이즈** (너비를 절반으로 줄임) → 핀이 이미지와 같이 축소·이동. 이미지-핀 정합 유지.
- [ ] 5. **Devtools 교차 검증**: Elements 패널에서 `<img>` 의 computed `width`/`height` 측정 → overlay `<div>` 의 inline `style.width`/`style.height` 와 일치 (px 단위).

- [ ] **Step 3: booth1 로그인 시나리오 (본인 부스 강조)**

계정: `booth1` / `booth1234` (booth_id=1)

- [ ] 6. `/reservations` 진입 → 본인 부스(id=1, 국제캠) 에 auto-focus. 사각형에 ★(Star) 아이콘 + `border-primary` + `ring-primary/30` 강조 보임.
- [ ] 7. **핀 클릭은 focus 이동만 유발** (D9 정책 — canvas 는 commit 을 일으키지 않음). 이미 focus 된 본인 부스 핀을 다시 클릭해도 아무 일도 일어나지 않아야 정상. 상세 페이지로 진입하려면 **하단 슬라이더 카드**에서 tap/Enter 로 commit → `/reservations/:boothId` 이동. canvas 변경 범위 밖이지만 v2 이후에도 이 분업이 유지되는지 최종 동작 차원에서 확인.

- [ ] **Step 4: 타 부스 잠금 표시 시나리오**

계정: `booth1` 상태 유지. 같은 날짜(5/27)에 타 부스 배치가 없어 잠금 시각 힌트 직접 확인이 어렵다면 mock 시드에 임시 추가 레코드 넣어 확인. 예: `{ booth_id: 3, date: '2026-05-27', section: 'global', booth_number: '2', x: 60, y: 50, width: 5, height: 6 }` 를 `src/mocks/booth-placements.ts` 에 잠시 추가.

- [ ] 8. 타 부스 핀에 `opacity-50` + 🔒(Lock) 아이콘. 호버 시 tooltip `부스 N — 본인 부스만 예약 관리가 가능합니다` 표시.
- [ ] 9. 타 부스 핀 클릭 → focus 는 이동하나 commit 안 됨. 슬라이더도 그 부스를 선택하되 카드에서 enter 버튼/액션이 disabled.
- [ ] 10. 확인 후 임시 추가한 시드는 **되돌림** (잠금 시나리오는 상시 확인 포인트가 아니므로 커밋에 남기지 않음).

- [ ] **Step 5: 엣지 케이스 확인**

- [ ] 11. **섹션 전환 시 핀 점프**: 5/28 에서 baekyang ↔ hangeul 사이 슬라이더로 넘나들 때 fade 중 핀이 새 이미지 rect 로 점프. 의도된 동작 (spec §6).
- [ ] 12. **브라우저 새로고침 후 캐시 경로**: F5 로 리로드 → 이미지가 캐시된 상태에서도 핀 오버레이가 올바른 rect 에 뜸 (rAF 폴백 검증).
- [ ] 13. **`boothsInSection` 0 건**: 만약 시드를 비우는 상황을 재현해 본다면 canvas 는 bg-muted + 이미지만, picker 하단 "배치된 부스 없음" 안내 카드가 보여야 함.

- [ ] **Step 6: 최종 typecheck**

Run: `pnpm typecheck`
Expected: 에러 0 건.

- [ ] **Step 7: (필요 시) QA 중 수정 사항이 있었다면 커밋**

QA 에서 버그를 발견해 코드 수정이 들어갔다면 해당 단위로 `fix(booth-layout): ...` 커밋. 없으면 Task 3 는 코드 변경 없음 — 커밋 불필요.

---

## 완료 기준

- [ ] `pnpm typecheck` 깨끗
- [ ] Task 1 커밋 1 건 (`feat(booth-layout): BoothPlacement 에 width/height 필드 추가`)
- [ ] Task 2 커밋 1 건 (`refactor(booth-layout): BoothMapCanvas 를 사각형 핀 + 이미지 rect 정합으로 재작성`)
- [ ] Task 3 QA 체크리스트 전 항목 통과 (필요 시 fix 커밋 추가)
- [ ] 브라우저에서 super / booth1 두 계정으로 실제 동작 확인

## 이후 작업 (본 플랜 범위 밖)

- 백엔드 `booth_placements` 마이그레이션 + 실 좌표/크기 시드는 별도 PR
- 좌표 편집기(클릭으로 사각형 찍기), 라벨 outside fallback, `fullmap.png` 통합 뷰는 후속 스펙
