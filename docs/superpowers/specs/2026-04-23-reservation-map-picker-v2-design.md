# 예약 지도 picker v2 — 사각형 핀 + 이미지 좌표계 정합

- **작성일**: 2026-04-23
- **대상 기능**: `/reservations` 진입 화면의 지도 렌더 방식 업그레이드
- **상태**: reviewed, 구현 준비 (리뷰 반영 완료 2026-04-23)
- **전제(prerequisite)**: v1 구현 완료 — [`2026-04-23-reservation-map-picker-design.md`](./2026-04-23-reservation-map-picker-design.md) (상태: implemented)

## 배경

v1 은 `/reservations` 지도+슬라이더 picker 를 실제 운영 가능한 형태로 도입했지만, 두 가지 구조적 한계가 남았다.

1. **핀 좌표계가 canvas(뷰포트) 기준이다.** `<img>` 는 `object-contain` 으로 letterbox 되는데 핀 오버레이는 canvas `inset-0` 에 놓여 있어, 같은 좌표 `(42, 38)` 이 브라우저 창 크기에 따라 이미지의 다른 픽셀에 찍힌다. 섹션별 이미지 종횡비가 크게 다르기 때문에(`global` 1.25, `baekyang` 0.28, `hangeul` 1.25) 리사이즈·해상도 변화에서 핀 위치가 어긋나는 문제가 두드러진다.
2. **핀이 원형 점(point)이라 부스 footprint 를 표현하지 못한다.** 실제 축제 부스는 가로/세로가 있는 사각형 텐트 단위이므로, 지도 위에서도 "이 부스가 어느 구역을 차지하는지" 를 직관적으로 보여주는 편이 낫다.

v2 는 두 한계를 한꺼번에 해소한다: (a) 이미지의 **실제 rendered rect** 를 JS 로 측정해 핀 오버레이를 그 rect 에 정확히 얹고, (b) 핀을 **사각형**으로 바꾸고 `width`/`height` 필드를 데이터 모델에 추가한다. 이렇게 하면 운영자가 찍은 좌표가 어느 화면에서 봐도 같은 이미지 픽셀을 가리킨다.

## 범위

**포함**

- `BoothPlacement` (DTO + Model) 에 `width`, `height` 필드 추가 (% 단위, 0–100).
- `BoothMapCanvas` 전면 재작성 — `ResizeObserver` 로 현재 섹션 이미지의 rendered rect 측정, 핀 overlay 를 그 rect 에 고정.
- 핀 비주얼을 원형 → **사각형**(`rounded-md` + 반투명 fill + border) 로 교체. 상태는 **3 + 1** — v1 의 3 상태(focused / isMine / default) 에 v2 에서 추가되는 `!canEnter` 잠금 오버레이까지 (D9).
- 시드 데이터(`mockBoothPlacements`) 에 임의의 `width`, `height` 값 채워 UI 동작 확인용.

**제외 (non-goals)**

- 좌표 편집기(클릭으로 사각형 찍기) — 별도 후속 스펙.
- 사각형 간 **겹침 해소** UX — 시드/운영 측에서 올바른 좌표를 주입하는 책임. 충돌 감지 없음.
- 작은 부스에서의 라벨 **outside fallback** — v2 MVP 는 라벨을 무조건 사각형 **안쪽** 중앙에 배치. 읽기 어려우면 hover tooltip 은 유지.
- `fullmap.png` 전체 개요도 통합.
- v1 의 슬라이더·카드·DateSelector 외부 계약은 변경하지 않는다. **`BoothMapPicker → BoothMapCanvas` 는 `canEnter(boothId): boolean` 을 새로 전달**해 핀 lock 상태 표시에 쓴다 (D9). `BoothMapPicker` 자체는 v1 에서 이미 `canEnter` 를 props 로 받으므로 위쪽 계약 변경은 없음.

## 설계 결정 요약

| # | 주제 | 결정 |
|---|---|---|
| D1 | 좌표 anchor | (x, y) = 사각형 **중심**. v1 의 `-translate-x-1/2 -translate-y-1/2` 패턴 유지해 x, y 값 그대로 재사용 가능. |
| D2 | 좌표 단위 | 전부 백분율 (0–100). 리사이즈·해상도 무관. |
| D3 | `width`/`height` 필수 여부 | **required**. optional 로 두면 시드 누락 시 0×0 핀이 렌더됨. 누락 방지 위해 타입 레벨에서 강제. |
| D4 | 오버레이 위치 기준 | 이미지의 **rendered rect**. `<img>.getBoundingClientRect()` 로 측정. `ResizeObserver` 는 **container 에 attach** — img 직접 관찰 시 섹션 스왑마다 unobserve/observe 필요(섹션별 img 엘리먼트가 바뀜). container 크기 변화가 곧 `object-contain` img 의 rect 변화를 유발하므로 container 관찰로 충분. |
| D5 | 사각형 비주얼 | `rounded-md border-2` + 반투명 배경. solid fill 은 하단 이미지 가림, outline-only 는 약해서 간과됨 → 중간. |
| D6 | 라벨 위치 | 항상 사각형 **안쪽 중앙**, `text-xs`. v2 MVP 범위. |
| D7 | Pan 동작 | v1 과 동일 — `translate((50 - x)%, (50 - y)%)` 를 overlay 에 적용. overlay 가 이미지 rect 안에 있으므로 pan 도 이미지 기준으로 정확. |
| D8 | 섹션 스왑 | v1 의 2-레이어 opacity 크로스페이드 유지. observer 는 container 고정이므로 섹션 변경에서 재연결 불필요. rect 재측정은 (a) 현재 섹션 `<img>` 의 `onLoad`, (b) `section` 의존 `useEffect` 의 `requestAnimationFrame` 폴백 2-layer 로 보장 — 캐시된 이미지로 `onLoad` 가 뜨지 않는 경우까지 커버. |
| D9 | 핀 상태 | 기본 3 상태(focused / isMine / default) **+ `!canEnter` 잠금 오버레이**. 잠금은 `opacity-50 cursor-not-allowed` + 🔒 아이콘 — **시각 힌트일 뿐 클릭은 막지 않는다**. 핀 클릭은 여전히 focus 이동만 유발하고 진입(commit) 은 슬라이더 카드에서만 일어나는 v1 정책을 유지. 🔒 는 "지도에서 미리 진입 불가 부스를 구분" 하는 affordance. |

## 설계

### 1. 데이터 모델 (`features/booth-layout/types.ts`)

```ts
export interface BoothPlacementDTO {
  booth_id: number;
  date: string;
  section: MapSectionId;
  booth_number: string;
  x: number;        // 0–100, 이미지 가로 대비 %
  y: number;        // 0–100, 이미지 세로 대비 %
  width: number;    // 신규. 0–100.
  height: number;   // 신규. 0–100.
}

export interface BoothPlacement {
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
  width: number;    // 신규
  height: number;   // 신규
}

// PickerBooth 는 그대로 — placement 필드가 위 타입이므로 자동 확장
```

`mapper.ts` 는 `width: d.width, height: d.height` 2 줄 추가.

> **백엔드 선행 작업 (별도 PR)** — `booth_placements` 테이블에 `width NUMERIC(5,2) NOT NULL` / `height NUMERIC(5,2) NOT NULL` 컬럼 추가. CHECK: `width > 0 AND width <= 100 AND height > 0 AND height <= 100`. 기존 레코드는 임시 default(예: 5.0) 백필. 프론트 DTO 가 required 이므로 v2 프론트 머지 **이전**에 응답 payload 가 새 필드를 포함해야 함 — 누락 시 런타임 에러. 어드민 백엔드 리드(= 본인)가 마이그레이션 스크립트 + 시드 업데이트를 선행 PR 로 내고, 본 프론트 PR 은 그 뒤에 체이닝.

### 2. 시드 업데이트 (`src/mocks/booth-placements.ts`)

```ts
export const mockBoothPlacements: BoothPlacementDTO[] = [
  { booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38, width: 5,  height: 6 },
  { booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52, width: 7,  height: 3 },
  { booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40, width: 8,  height: 10 },
];
```

좌표값은 UI 동작 확인용 임의값. 실배치 좌표는 추후 별도 작업.

### 3. Canvas 재작성 (`features/booth-layout/components/booth-map-canvas.tsx`)

```tsx
export function BoothMapCanvas({ section, boothsInSection, focusedBoothId, myBoothId, onPinClick }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentImgRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<{left:number; top:number; width:number; height:number} | null>(null);

  // 섹션 스왑 크로스페이드 (v1 과 동일 로직)
  const [layers, setLayers] = useState<MapSection[]>([section]);
  const prev = usePrevious(section);
  useEffect(() => { /* v1 로직 동일 */ }, [section, prev]);

  // 현재 이미지 rect 측정
  const measureImage = useCallback(() => {
    const img = currentImgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const imgBox = img.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    if (imgBox.width === 0 || imgBox.height === 0) return;  // 아직 로드 전
    setImageRect({
      left: imgBox.left - containerBox.left,
      top: imgBox.top - containerBox.top,
      width: imgBox.width,
      height: imgBox.height,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measureImage());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureImage]);

  // 섹션 변경 시 재측정 — 캐시된 이미지는 onLoad 가 안 뜨므로 rAF 로 다음 paint 에 강제 측정
  useEffect(() => {
    const raf = requestAnimationFrame(() => measureImage());
    return () => cancelAnimationFrame(raf);
  }, [section, measureImage]);

  const focused = boothsInSection.find((b) => b.placement.boothId === focusedBoothId);
  const translateX = focused ? 50 - focused.placement.x : 0;
  const translateY = focused ? 50 - focused.placement.y : 0;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted">
      {/* 2-레이어 이미지 크로스페이드 (v1 과 동일) */}
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

      {/* 핀 overlay — 이미지 rendered rect 에 정합, 내부 0-100% = 이미지 0-100% */}
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
          {boothsInSection.map((b) => <BoothPin ... />)}
        </div>
      )}
    </div>
  );
}
```

### 4. 사각형 핀 컴포넌트

현재 canvas 내부에 inline 되어 있던 `<button>` 을 별도 `BoothPin` 컴포넌트로 추출(선택적 — 인라인도 가능). 3 + 1 상태:

```tsx
function BoothPin({ booth, isFocused, isMine, canEnter, onClick }) {
  const { placement } = booth;
  const stateClass =
    isFocused ? 'border-primary bg-primary/20 ring-2 ring-primary/30 scale-[1.02]'
    : isMine  ? 'border-ds-success-pressed bg-ds-success-subtle/60'
              : 'border-border bg-background/50 hover:border-ds-border-strong';
  const lockedClass = !canEnter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      title={!canEnter
        ? `부스 ${placement.boothNumber} — 본인 부스만 예약 관리가 가능합니다`
        : `부스 ${placement.boothNumber}`}
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

### 5. Pan 동작

`focusedBoothId` 가 있을 때 overlay 컨테이너를 `translate((50 - focused.x)%, (50 - focused.y)%)` 로 이동시키면, overlay 는 이미지 rect 안에 있기 때문에 pan 도 이미지 기준으로 정확히 동작한다. v1 과 코드 형태 동일.

### 6. 섹션 크로스페이드

v1 의 2-레이어 `setLayers([prev, section])` + 350ms 타이머 로직 그대로. `currentImgRef` 는 `s.id === section.id` 조건부로 붙으므로 섹션 바뀌면 ref 가 새 이미지 가리키고 `onLoad` 에서 `measureImage` 호출해 rect 갱신.

**Effect 실행 순서 주의** — `section` A→B 직후 첫 렌더에서 `layers` 는 아직 `[A]` 이고 B img 는 mount 되지 않은 상태. 이 순간 `currentImgRef.current` 는 이전 A img 를 가리킨다. layers effect 가 실행돼 `[A, B]` 로 바뀐 **두 번째 렌더**에서 B img 가 mount 되며 ref 가 B 로 swap. `section` 의존 `useEffect` 의 `requestAnimationFrame` 은 이 두 번째 렌더 이후 fire 되므로 측정 대상이 정확히 B 의 rect 가 된다. (캐시된 이미지라 `onLoad` 가 안 뜨는 경우의 폴백과 겸용.)

섹션별 이미지 종횡비가 크게 다르면(global 1.25 → baekyang 0.28) overlay rect 가 fade 중에 점프한다. 핀 위치도 함께 점프 — 이미지 위치와 정합은 유지됨. UX 상 "섹션 전환 순간 핀이 새 이미지에 맞춰 재배치" 로 보이는 건 의도된 동작.

## 엣지 케이스

| 상황 | 동작 |
|---|---|
| `<img>` 로드 전 | `imageRect === null` → overlay 미렌더. 이미지 뒤쪽 bg-muted 만 보임. `onLoad` 에서 첫 측정. |
| 창 리사이즈 | `ResizeObserver` 가 container 감지해 `measureImage` 재호출 → overlay rect 갱신. |
| 섹션 전환 직후 | 크로스페이드 동안 `currentImgRef` 는 새 섹션 이미지를 가리킴. 새 이미지 `onLoad` 에서 `measureImage` 호출해 rect 점프. **캐시된 이미지**는 `onLoad` 가 안 뜨므로 `useEffect` + `requestAnimationFrame` 으로 한 번 더 강제 측정 (폴백). |
| `boothsInSection` 0 건 | overlay 는 렌더되지만 핀 없음. 기존 BoothMapPicker 의 "배치된 부스 없음" 안내 카드는 별도 overlay 로 계속 표시. |
| `width` or `height` 이 0 | 타입이 required 이고 DTO 검증은 매퍼가 통과시킴. 렌더상 사각형이 0×0 으로 보이지 않게, 픽셀 단위로 `min-width: 8px; min-height: 8px` 를 보강(점 수준도 최소 클릭 가능 크기 확보). |
| 여러 핀 겹침 | 시드/운영이 올바른 좌표 주입 책임. 겹침은 z-index = 등장 순서 (DOM 순서). focused 핀은 `scale-[1.02]` 로 약간 위로 튐. |
| 이미지 로드 실패 (404 / 네트워크) | `onLoad` 미발동 → `imageRect` null 유지 → overlay 미렌더. 사용자는 bg-muted 위 slider 만 보게 됨. 지도 자산은 `src/assets/map/*` 정적 번들이므로 프로덕션 404 는 빌드 사고 급 — 별도 에러 상태 UI 는 두지 않고 slider fallback 으로 충분. `<img>` 에 `onError` 핸들러는 달지 않음 (YAGNI). |

## 기본값

- overlay pan duration: 300ms ease-out (v1 동일)
- 섹션 fade duration: 300ms, 타이머 350ms 후 이전 레이어 제거 (v1 동일)
- 핀 최소 크기 픽셀 하한: 8 × 8
- 측정 debounce: ResizeObserver 콜백 그대로 (별도 throttle 불필요 — 리사이즈 빈도 낮음)

## 명시 가정

- `<img>` 는 여전히 `object-contain` 으로 letterbox. canvas 바깥으로 튀지 않음.
- 모든 부스의 (x, y, width, height) 는 이미지 내부에 완전히 포함된다고 가정. 가장자리 걸침은 시드/운영이 보정.
- Canvas 의 bg-muted 는 letterbox 여백(이미지 없는 영역) 의 시각적 구분용. overlay 는 이 여백까지 튀지 않음.
- `v1` 의 BoothSlider / BoothSliderCard / DateSelector / BoothMapPicker 는 외부 계약 변경 없음. 하위 컴포넌트 props 그대로.

## 테스트 전략 — 수동 QA

프로젝트에 테스트 러너 없음. 아래 순서로 수동 확인.

**시드값 예상 렌더 크기 참고** — container 800 × 600 기준 대략치. QA 시 핀 크기가 이 범위에서 크게 벗어나면 좌표계/rect 측정 또는 min 크기 보강 로직 의심.

| 섹션 | img aspect | rendered img | seed w × h (%) | 핀 픽셀 |
|---|---|---|---|---|
| global (5/27)   | 1.25 | ~750 × 600 | 5 × 6 | ≈ 38 × 36 px |
| baekyang (5/28) | 0.28 | ~168 × 600 | 7 × 3 | ≈ 12 × 18 px **— min 8 px 하한 경계** |
| hangeul (5/28)  | 1.25 | ~750 × 600 | 8 × 10 | ≈ 60 × 60 px |

1. **super 로그인** → `/reservations` → 5/27 국제캠 이미지 + 사각형 핀 1개, boothNumber 라벨 inside 확인.
2. 5/28 클릭 → 백양로 (종횡비 0.28, 세로 길쭉) 이미지, letterbox 양 옆 회색 여백 보이고 **핀은 이미지 내부에만** 위치.
3. 슬라이더에서 한글탑 부스 넘기면 섹션 크로스페이드 후 핀 위치가 새 이미지 rect 에 정합.
4. **브라우저 창 리사이즈** — 핀이 이미지 따라 함께 이동/축소 확인.
5. 개발자 도구로 `<img>` width 측정 → overlay `<div>` 의 width 와 일치 확인.
6. **booth1 로그인** → 본인 사각형(id=1, 국제캠) auto-focus, ★ 아이콘, border 색 강조.
7. (같은 날짜에 타 부스 있으면) 타 부스 핀 클릭 시 focus 는 이동하되 commit 안 됨, 🔒 뜸.
8. 중앙 focus 상태에서 **슬라이더 카드 tap/Enter** → `/reservations/:boothId` 이동. (D9 정책 — 핀 클릭은 focus 이동만 유발, commit 은 슬라이더 카드 책임.)
9. `pnpm typecheck` 깨끗 확인.

## 이후 작업

진행 순서:

1. **백엔드 선행 PR** — `booth_placements.width / height` 컬럼 추가 마이그레이션 + 시드 업데이트 (§1 노트 참조). 응답 payload 에 신규 필드 포함 확인 후 머지.
2. **프론트 플랜 생성** — 본 스펙 기반으로 `writing-plans` 스킬 호출. 예상 태스크: (a) types + mapper + seed, (b) Canvas 재작성, (c) 수동 QA. 3~4 커밋 수준.
3. **프론트 PR** — 플랜 실행, 로컬 dev 확인 후 merge.

후속 스펙 후보: 배치 에디터(클릭으로 좌표 찍기), overflow/라벨 outside fallback, `fullmap.png` 통합 뷰.
