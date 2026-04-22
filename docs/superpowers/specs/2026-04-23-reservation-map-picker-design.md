# 예약 관리 진입 — 지도 + 슬라이더 Picker

- **작성일**: 2026-04-23
- **대상 기능**: `/reservations` 진입 화면을 지도 + 하단 슬라이더 구조로 재설계
- **상태**: implemented (2026-04-23, `dev` 브랜치 / 커밋 `10acb4c`..`cb1583b`). v2 (정확 좌표 + 사각형 핀) 은 후속 별도 스펙.

## 배경

현재 `/reservations` 진입은 두 갈래다:

- **Booth 계정**: `/reservations/:myBoothId` 로 자동 리다이렉트되어 picker 를 보지 않는다.
- **Super/Master 계정**: `ReservationBoothPicker` 가 **부스 카드 그리드** 를 보여주고, 카드를 클릭하면 해당 부스의 예약 관리 화면으로 이동한다.

이 구조는 부스가 많아지거나 "물리적 위치 → 예약 진입" 의 맥락이 필요할 때 약하다. 축제장에서 "백양로 12번 부스 상황 봐야 해" 같은 요청에 이름으로 역조회하기가 불편하다. 또한 `src/assets/map/` 에 섹션별 배치도 이미지 3종(`global`, `baekyang`, `hangeul`)이 준비돼 있지만 UI 에 연결되지 않아 방치돼 있다.

이 스펙은 현 picker 를 **지도 + 하단 슬라이더** UX 로 교체한다. 슬라이더 카드를 좌우로 넘기면 그 부스의 핀이 지도 중앙에 오고, 필요 시 섹션 이미지가 자동 스왑된다. Booth 계정도 picker 를 보지만 본인 부스만 실제 예약 진입이 가능하다.

## 범위

**포함**

- `/reservations` 화면의 UI 전면 교체 (지도 canvas + 슬라이더 + 날짜 필터).
- Booth 계정의 자동 리다이렉트 제거 — 모든 역할이 picker 를 본다.
- `features/booth-layout/` 하위에 순수 재사용 가능한 `BoothMapPicker` 컴포넌트 세트 신설.
- `BoothPlacement` 타입/매퍼/API/훅 세트 (CLAUDE.md 의 feature 레이어 패턴).
- 시드 좌표 파일 `src/mocks/booth-placements.ts` (UI 동작 확인용 임의값).

**제외 (non-goals)**

- **배치 에디터** — Super/Master 가 섹션 이미지 위에서 좌표를 찍는 UI. 별도 후속 스펙.
- **`mockMappings` ↔ `mockBoothPlacements` 통합** — 기존 `src/pages/booth-layout.tsx` 어드민 페이지와 `src/mocks/booth-mappings.ts` 는 이 스펙에서 건드리지 않는다. 배치 에디터 스펙에서 통합.
- **URL 공유 상태** (`?date=`, `?focus=`) — 컴포넌트 내부 상태로 충분. 운영 니즈가 생기면 후속.
- **다일자 운영 부스 정식 지원** — 현재는 "1 부스 = 1 일" 이 기본. 드문 다일자 케이스는 운영상 별개 부스로 수동 등록.
- **`fullmap.png` 활용** — 현재 미사용 자산. 필요 시 별도 스펙.
- **모바일 대응** — 어드민은 데스크탑 전제 (CLAUDE.md).

## 브레인스토밍 결정 요약

이전 대화에서 확정된 축들:

| # | 질문 | 결정 |
|---|---|---|
| Q1 | 이 기능의 주 사용자 | (c) 전 역할 공유, 역할별 분기 |
| Q2 | Booth 계정 뷰 | (B) 전체 지도/슬라이더 보이되 본인 부스만 인터랙션 |
| Q3 | 섹션 전환 방식 | (A) 슬라이더가 지도의 리모컨 — 자동 섹션 스왑 |
| Q4 | 부스 일자 카디널리티 | (A) 1 부스 = 1 일, 다일자는 수동 분리 등록 |
| Q5 | 좌표 데이터 소스 | (B) 시드 JSON/TS 파일, 이 스펙은 읽기만 |
| Q6 | 전체 레이아웃 | (A) 풀블리드 지도 + 하단 오버레이 슬라이더 |
| Q7 | 인터랙션 모델 | (A) 포커스 = 중앙, 진입은 명시적 클릭 (2 단계) |
| Q8 | 구현 접근법 | (B) 컴포넌트 추출 — `BoothMapPicker` 를 재사용 단위로 |

## 설계

### 1. 아키텍처 · 파일 배치

신규·변경 파일 트리:

```
src/features/booth-layout/
├── types.ts                  (신규) BoothPlacement · MapSection · PickerBooth 등
├── sections.ts               (신규) MAP_SECTIONS 상수 + 이미지 import + FESTIVAL_DATES
├── mapper.ts                 (신규) DTO ↔ Model 변환
├── api.ts                    (신규) listPlacements / getPlacementByBoothId (mock/real 분기)
├── hooks.ts                  (신규) usePlacements / useMyBoothPlacement (TanStack Query)
└── components/
    ├── booth-map-picker.tsx     (신규) 루트 — 상태 소유 + canvas/slider 조립
    ├── booth-map-canvas.tsx     (신규) 섹션 이미지 + 핀 + pan + 섹션 크로스페이드
    ├── booth-slider.tsx         (신규) 하단 오버레이 카드 리스트 + 스크롤 스냅
    ├── booth-slider-card.tsx    (신규) 카드 1 장 (focused / isMine / !canEnter 상태)
    └── date-selector.tsx        (신규) 날짜 필터 pill 그룹 (1 개면 레이블 렌더)

src/mocks/
└── booth-placements.ts          (신규) 좌표 시드 데이터

src/pages/
└── reservation-booth-picker.tsx (변경) 내부를 <BoothMapPicker/> 로 교체

src/routes/index.tsx             (변경) Booth 자동 리다이렉트 제거
```

레이어 원칙 (CLAUDE.md 재확인):

- `pages` 는 역할/권한/네비게이션만 담당 — map/slider 렌더 로직 없음.
- `components/*` 는 props 로 모든 데이터를 받고 React Router · fetch 에 직접 의존하지 않음 (재사용 가능).
- `hooks.ts` 는 TanStack Query 래퍼. 컴포넌트는 fetch 를 직접 호출하지 않음.
- `api.ts` 는 `env.USE_MOCK` 분기로 mock/real 구현을 동시에 보유.

### 2. 데이터 모델

**타입 정의** (`features/booth-layout/types.ts`):

```ts
export type MapSectionId = 'global' | 'baekyang' | 'hangeul';

export interface MapSection {
  id: MapSectionId;
  label: string;          // '국제캠' | '백양로' | '한글탑'
  imageUrl: string;       // bundled — src/assets/map/*
  validDates: string[];   // global → ['2026-05-27'], 나머지 → ['2026-05-28','2026-05-29']
}

// 좌표는 이미지 기준 0–100 백분율. 리사이즈/해상도 변경에 안전.
export interface BoothPlacementDTO {
  booth_id: number;       // BoothProfile.id FK
  date: string;           // 'YYYY-MM-DD'
  section: MapSectionId;
  booth_number: string;   // '12' 같은 표기용 문자열
  x: number;              // 0–100
  y: number;              // 0–100
}

export interface BoothPlacement {
  boothId: number;
  date: string;
  section: MapSectionId;
  boothNumber: string;
  x: number;
  y: number;
}

// 슬라이더 카드 렌더 시점의 머지 결과 (페이지에서 계산)
export interface PickerBooth {
  placement: BoothPlacement;
  profile: { name: string; organizationName: string };
  counts: { waiting: number; completed: number; cancelled: number };
}
```

**섹션 상수** (`features/booth-layout/sections.ts`):

```ts
import globalImg from '@/assets/map/global-section.jpg';
import baekyangImg from '@/assets/map/baekyang-section.jpg';
import hangeulImg from '@/assets/map/hangeul-section.jpg';

export const MAP_SECTIONS: Record<MapSectionId, MapSection> = {
  global:   { id: 'global',   label: '국제캠', imageUrl: globalImg,   validDates: ['2026-05-27'] },
  baekyang: { id: 'baekyang', label: '백양로', imageUrl: baekyangImg, validDates: ['2026-05-28','2026-05-29'] },
  hangeul:  { id: 'hangeul',  label: '한글탑', imageUrl: hangeulImg,  validDates: ['2026-05-28','2026-05-29'] },
};

export const FESTIVAL_DATES = ['2026-05-27','2026-05-28','2026-05-29'] as const;
```

**Mock 시드** (`src/mocks/booth-placements.ts`):

```ts
// 좌표값은 임의 배치 (UI 동작 확인용). 현장 위치 맞춤은 별도 작업.
export const mockBoothPlacements: BoothPlacementDTO[] = [
  // 5/27 국제캠 — BoothProfile.id=1
  { booth_id: 1, date: '2026-05-27', section: 'global',   booth_number: '1', x: 42, y: 38 },
  // 5/28 백양로 / 한글탑 — id=2, id=3
  { booth_id: 2, date: '2026-05-28', section: 'baekyang', booth_number: '1', x: 28, y: 52 },
  { booth_id: 3, date: '2026-05-28', section: 'hangeul',  booth_number: '1', x: 64, y: 40 },
];
```

**API · Hook**:

```ts
// features/booth-layout/api.ts
const listPlacementsMock = async (date: string) =>
  mockBoothPlacements.filter(p => p.date === date).map(toBoothPlacement);

const listPlacementsReal = async (date: string) => {
  const { data } = await apiClient.get<BoothPlacementDTO[]>('/booth-placements', { params: { date } });
  return data.map(toBoothPlacement);
};
export const listPlacements = env.USE_MOCK ? listPlacementsMock : listPlacementsReal;

const getPlacementByBoothIdMock = async (boothId: number) => {
  const row = mockBoothPlacements.find(p => p.booth_id === boothId);
  return row ? toBoothPlacement(row) : null;
};
const getPlacementByBoothIdReal = async (boothId: number) => {
  const { data } = await apiClient.get<BoothPlacementDTO | null>(`/booth-placements/by-booth/${boothId}`);
  return data ? toBoothPlacement(data) : null;
};
export const getPlacementByBoothId = env.USE_MOCK ? getPlacementByBoothIdMock : getPlacementByBoothIdReal;

// features/booth-layout/hooks.ts
export function usePlacements(date: string) {
  return useQuery({
    queryKey: ['booth-placements', date],
    queryFn: () => listPlacements(date),
    enabled: !!date,
  });
}
export function useMyBoothPlacement(boothId: number | null) {
  return useQuery({
    queryKey: ['booth-placement', 'by-booth', boothId],
    queryFn: () => getPlacementByBoothId(boothId!),
    enabled: boothId != null,
  });
}
```

**기존 데이터와의 관계**:

- `mockBoothsById` (BoothProfile): 변경 없음. 슬라이더 카드 이름/단체명 출처.
- `mockReservations`: 변경 없음. 슬라이더 카드 카운트 배지 출처. 집계는 페이지 내부 `useMemo` 로 `boothId → {waiting,completed,cancelled}` 맵을 만들어 `PickerBooth.counts` 에 주입 (현 `ReservationBoothPicker` 의 `countsByBooth` 패턴 재사용).
- `mockMappings` (기존 booth-layout 어드민 페이지 사용): **이 스펙에서 건드리지 않음**. 별도 소스로 공존. 기술 부채로 명시하며, 후속 "배치 에디터 스펙" 에서 `mockBoothPlacements` 로 통합.

### 3. 컴포넌트 계층 · Props

**BoothMapPicker** (루트, 상태 소유):

```ts
export interface BoothMapPickerProps {
  booths: PickerBooth[];                // 현재 날짜의 부스 (이미 머지)
  selectedDate: string;
  availableDates: readonly string[];    // Super/Master=3, Booth=1
  onDateChange: (date: string) => void;
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  onEnter: (boothId: number) => void;
  initialFocusBoothId?: number;
}
```

**BoothMapCanvas** (지도 렌더):

```ts
export interface BoothMapCanvasProps {
  section: MapSection;
  boothsInSection: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
  onPinClick: (boothId: number) => void;
}
```

- 이미지 위 `position: absolute; left: x%; top: y%` 로 핀 배치.
- 핀 상태: focused (브랜드 색 + 확대), isMine (액센트), 일반 (muted).
- pan: 포커스 핀이 뷰포트 중앙에 오도록 이미지 컨테이너에 CSS `transform: translate((50-x)%, (50-y)%)`.
- 섹션 스왑: 두 이미지를 겹쳐 놓고 opacity 크로스페이드 300ms.

**BoothSlider** (하단 카드 리스트):

```ts
export interface BoothSliderProps {
  booths: PickerBooth[];               // 전체 (섹션 무관)
  focusedBoothId: number | null;
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  onFocus: (boothId: number) => void;  // 중앙 카드 변경
  onCommit: (boothId: number) => void; // 진입 트리거
}
```

- CSS `scroll-snap-type: x mandatory` 로 중앙 스냅.
- 좌우 화살표 버튼 + 키보드 `←/→` + 마우스 드래그(pointer events).
- 중앙 카드 클릭 = commit (canEnter 면), 양 옆 카드 클릭 = focus 이동.

**BoothSliderCard** (단일 카드):

```ts
export interface BoothSliderCardProps {
  booth: PickerBooth;
  isFocused: boolean;
  isMine: boolean;
  canEnter: boolean;
  onClick: () => void;
}
```

카드 상태 시각 규칙:

- `isFocused`: 브랜드 색 테두리, scroll-snap 중앙 대상.
- `isMine`: 액센트 색 뱃지/아이콘 (Booth 계정에서만 의미).
- `!canEnter`: 커서 `not-allowed`, opacity 저하, 🔒 아이콘, title 툴팁 ("본인 부스만 예약 관리 가능").

**DateSelector**:

```ts
export interface DateSelectorProps {
  dates: readonly string[];
  selectedDate: string;
  onChange: (date: string) => void;
}
```

- `dates.length === 1` 이면 읽기 전용 레이블로 렌더 (Booth 자동 처리).
- 그 외 pill button group — 선택은 브랜드 토큰 색.

### 4. 상태 · 동기화 로직

**Single source of truth**: `focusedBoothId`. `activeSection`, `boothsInSection`, canvas pan 위치는 전부 파생.

```ts
const [focusedBoothId, setFocusedBoothId] = useState<number | null>(
  initialFocusBoothId ?? booths[0]?.placement.boothId ?? null
);

const focusedBooth    = booths.find(b => b.placement.boothId === focusedBoothId) ?? null;
const activeSection   = focusedBooth ? MAP_SECTIONS[focusedBooth.placement.section] : null;
const boothsInSection = activeSection
  ? booths.filter(b => b.placement.section === activeSection.id)
  : [];

// 날짜 변경 시 포커스 리셋
useEffect(() => {
  setFocusedBoothId(initialFocusBoothId ?? booths[0]?.placement.boothId ?? null);
}, [selectedDate]);
```

**이벤트 흐름**:

| 입력 | 상태 변경 | 반응 |
|---|---|---|
| 슬라이더 드래그 / ←→ / 옆 카드 클릭 | `setFocusedBoothId` | canvas pan + 섹션 스왑(파생) |
| 지도 핀 클릭 | `setFocusedBoothId` | 슬라이더 `scrollIntoView` center |
| 중앙 카드 클릭 (`canEnter=true`) | — | `onEnter(boothId)` → navigate |
| 중앙 카드 클릭 (`canEnter=false`) | — | no-op + 툴팁 강조 |
| 날짜 버튼 변경 | `onDateChange` → parent refetch → `booths` prop 교체 → `focusedBoothId` 리셋 | 새 섹션/부스 렌더 |

**슬라이더 ↔ 지도 동기화** (외부 트리거 반영):

```ts
const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
useEffect(() => {
  const el = focusedBoothId != null ? cardRefs.current.get(focusedBoothId) : null;
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}, [focusedBoothId]);

const handleScrollEnd = useDebouncedCallback(() => {
  const centerX = container.offsetLeft + container.clientWidth / 2;
  const closest = findClosestCardTo(centerX, cardRefs.current);
  if (closest !== focusedBoothId) onFocus(closest);
}, 80);
```

`scrollend` 이벤트 지원 브라우저에서는 그걸 쓰고 미지원은 debounced `scroll`.

**지도 pan · 섹션 스왑**:

```tsx
<div className="map-viewport" style={{ overflow: 'hidden', aspectRatio: '16/9' }}>
  {/* 섹션 스왑: prev/current 이미지 겹쳐놓고 opacity 전환 */}
  {[prevSection, activeSection].map((s) => (
    <img
      key={s.id}
      src={s.imageUrl}
      className="absolute inset-0 transition-opacity duration-300"
      style={{ opacity: s === activeSection ? 1 : 0 }}
    />
  ))}
  {/* pan: 포커스 핀이 뷰포트 중앙에 오도록 translate */}
  <div
    className="absolute inset-0 transition-transform duration-300"
    style={{
      transform: focusedBooth
        ? `translate(${50 - focusedBooth.placement.x}%, ${50 - focusedBooth.placement.y}%)`
        : 'none',
    }}
  >
    {boothsInSection.map(b => (
      <Pin key={b.placement.boothId} booth={b}
           isFocused={b.placement.boothId === focusedBoothId}
           isMine={b.placement.boothId === myBoothId}
           onClick={() => onPinClick(b.placement.boothId)} />
    ))}
  </div>
</div>
```

섹션이 바뀌면 `usePrevious(activeSection)` 로 prev 값을 잡아 두 이미지 동시 렌더 → opacity 전환.

### 5. 라우트 · 역할 분기

**라우트 (변경 최소)**:

```
/reservations          → ReservationBoothPicker   (모든 역할)
/reservations/:boothId → ReservationManagement    (기존 그대로)

권한: 'reservation.read' → ['Super','Master','Booth']   (기존 그대로, Performer 차단)
```

**`ReservationsEntry` 간소화** (`src/routes/index.tsx:30`):

```tsx
// 변경 전: Booth → /reservations/:myBoothId 자동 리다이렉트
// 변경 후: 모든 역할이 picker 를 본다
function ReservationsEntry() {
  return <ReservationBoothPicker />;
}
```

(`ReservationsEntry` 함수 자체를 제거해 라우트에서 바로 `<ReservationBoothPicker/>` 를 써도 되지만, 이후 gating 추가 여지를 위해 유지.)

**`ReservationBoothPicker` 재작성** (`src/pages/reservation-booth-picker.tsx`):

```tsx
export function ReservationBoothPicker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1) Booth 계정의 초기 날짜·초기 포커스 (Booth 만 호출)
  const myPlacementQuery = useMyBoothPlacement(user?.role === 'Booth' ? user.boothId ?? null : null);

  // 2) 역할별 available dates
  const availableDates = useMemo(() => {
    if (user?.role === 'Booth' && myPlacementQuery.data) {
      return [myPlacementQuery.data.date] as const;
    }
    return FESTIVAL_DATES;
  }, [user, myPlacementQuery.data]);

  // 3) 기본 날짜 (1 회 resolve)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDate != null) return;
    if (user?.role === 'Booth' && myPlacementQuery.data) {
      setSelectedDate(myPlacementQuery.data.date);
    } else if (user?.role && user.role !== 'Booth') {
      setSelectedDate(FESTIVAL_DATES[0]); // 2026-05-27
    }
  }, [user, myPlacementQuery.data, selectedDate]);

  // 4) placements + merge
  const placementsQuery = usePlacements(selectedDate ?? '');
  const booths = useMemo<PickerBooth[]>(() => {
    if (!placementsQuery.data) return [];
    return placementsQuery.data.map((p) => ({
      placement: p,
      profile: {
        name: mockBoothsById[p.boothId]?.name || '이름 미입력 부스',
        organizationName: mockBoothsById[p.boothId]?.organizationName || '-',
      },
      counts: countReservations(p.boothId),
    }));
  }, [placementsQuery.data]);

  // 5) 역할 분기 콜백
  const canEnter = useCallback((boothId: number) => {
    if (user?.role === 'Super' || user?.role === 'Master') return true;
    if (user?.role === 'Booth') return boothId === user.boothId;
    return false;
  }, [user]);

  const onEnter = useCallback((boothId: number) => {
    navigate(`/reservations/${boothId}`);
  }, [navigate]);

  if (user?.role === 'Booth' && myPlacementQuery.data === null) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        소속 부스 정보가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
      </div>
    );
  }

  if (!selectedDate) return <PickerSkeleton />;

  return (
    <BoothMapPicker
      booths={booths}
      selectedDate={selectedDate}
      availableDates={availableDates}
      onDateChange={setSelectedDate}
      myBoothId={user?.role === 'Booth' ? user.boothId : undefined}
      canEnter={canEnter}
      onEnter={onEnter}
      initialFocusBoothId={user?.role === 'Booth' ? user.boothId : undefined}
    />
  );
}
```

부수 효과:

- Booth 가 뒤로가기 시 picker 로 복귀 (기존 자동 리다이렉트의 바운스 해소).
- Super/Master 는 기존 카드 그리드가 사라지고 지도 통일 UX — 멘탈모델 단순화.

### 6. 기본값

- **Super/Master 초기 날짜**: `2026-05-27` (축제 첫날). 오늘 날짜 분기 없음 — 단순성 우선.
- **Booth 초기 날짜**: `myPlacementQuery.data.date`.
- **초기 포커스**: Booth → `myBoothId`. 그 외 → `booths[0]` (있으면).
- **섹션 fallback** (focusedBooth null 일 때): `selectedDate === '2026-05-27'` → `global`, 그 외 → `baekyang`.
- **pan/섹션 스왑 애니메이션**: 300ms ease-out.
- **스크롤 스냅 중앙 감지 debounce**: 80ms.

### 7. 엣지 케이스

| 상황 | 동작 |
|---|---|
| 해당 날짜 배치 0 개 | fallback 섹션 이미지 + "등록된 부스 없음" placeholder, 슬라이더 미렌더 |
| Booth 계정 본인 배치 없음 | "소속 부스 정보 없음" 안내 (기존 문구 재사용) |
| `BoothProfile` 없는 `boothId` 배치 | 카드 이름 "이름 미입력 부스", 단체명 "-" |
| `initialFocusBoothId` 가 현재 booths 에 없음 | `booths[0]` fallback |
| Booth 가 본인 카드 이외 클릭 | focus 이동만, commit 비활성 (커서·툴팁) |
| placements fetch 실패 | 에러 상태 UI — "배치 정보를 불러오지 못했습니다" + 재시도 |
| Performer URL 직접 입력 | `RequirePermission` 가드 차단 (기존) |

### 8. 명시 가정

- 부스는 1 일 운영이 기본. 다일 운영은 별개 부스로 수동 등록.
- 좌표는 이미지 0–100 백분율. 이미지 교체/리사이즈에 안전하되, 섹션별 종횡비는 고정이어야 함.
- Desktop-only (CLAUDE.md). 모바일 대응 미고려.
- Performer 는 `reservation.read` 권한 없음 — 이 스펙 영향 범위 밖.

## 테스트 전략 — 수동 QA

프로젝트에 테스트 러너가 없다. 다음 순서로 수동 확인:

1. **super 로그인** → `/reservations` → 5/27 기본 선택, 국제캠 이미지, 배치된 부스 슬라이더.
2. 5/28 클릭 → 백양로 이미지 먼저 렌더 → 슬라이더 넘겨서 한글탑 부스 도달 시 이미지 크로스페이드로 스왑.
3. 지도 핀 클릭 → 슬라이더 카드 auto-scroll 확인.
4. 중앙 카드 클릭 → `/reservations/:boothId` 이동.
5. 키보드 `←/→` → focus 이동.
6. **booth1 로그인** → picker 가 뜨고 리다이렉트 안 됨, 본인 카드 auto-focus, 본인 핀 강조.
7. booth1 본인 카드 클릭 → `/reservations/1` 진입.
8. (booth1 날짜에 타 부스 있으면) 타 부스 카드 클릭 → 진입 안 되고 툴팁.
9. booth1 날짜 버튼은 본인 날짜 레이블만 (읽기 전용).
10. **booth2 로그인** (시드에 배치 없음 상태) → "소속 부스 정보 없음".
11. **performer1 로그인** → `/reservations` 접근 차단.
12. Super 에서 날짜 전환 시 이전 focus 가 리셋.
13. `pnpm typecheck` 깨끗한지 — 커밋 직전 필수.

## 이후 작업

이 spec 승인 후 `writing-plans` 스킬로 구현 플랜 생성 → 작은 커밋 단위로 분할 구현. 후속 스펙 후보:

- 배치 에디터 (Super/Master 가 섹션 이미지 클릭으로 좌표 등록).
- `mockMappings` ↔ `mockBoothPlacements` 통합 마이그레이션.
- URL 공유 상태 (`?date=`, `?focus=`).
