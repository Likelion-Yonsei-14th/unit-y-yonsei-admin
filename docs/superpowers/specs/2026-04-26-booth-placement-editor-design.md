# 부스 배치 편집기 (Booth Placement Editor) 설계

작성일: 2026-04-26
상태: 설계 완료, 구현 계획 단계 진입 예정
연관 작업: 후속 — view 페이지 다중 자리(`useMyBoothPlacement` array화 등) 리팩토링

## 목적

축제 지도 위에 각 부스(운영자)의 물리적 자리를 시각적으로 찍어 좌표를 만들고, 만든 좌표를 즉시 view 페이지에 반영하며 백엔드 시드용 JSON으로 export하는 어드민 도구.

기존 mock placements는 임의 좌표 3개만 있고 실제 지도 그림과 정합되지 않는다. 좌표를 손으로 측정해 하드코딩하는 대신 picker로 한 번에 찍어내고, 동일한 컴포넌트를 운영 단계에서 정식 어드민 기능으로 재활용한다.

## 수명·승격 전략

dev-only 시딩 툴이 아니라 **처음부터 Super 권한 정식 어드민 라우트**로 작성. 이유:

- mock 환경에서도 결국 정식 라우트로 가야 하는데 dev-only 게이트로 시작하면 라우터·권한·nav 작업을 두 번 함.
- Super-only 권한이면 운영 중에도 켜둬도 안전(Master/Booth/Performer는 못 봄).
- 2026 정식 지도 이미지가 들어왔을 때 좌표를 갈아엎기에도 같은 도구를 그대로 쓸 수 있음. 작업이 끝나면 `permissions.ts`에서 빈 배열로 비활성화도 가능.

## 데이터 모델 변경

### 핵심 발견: 1 운영자 ↔ N 자리

한 부스 운영자(booth account, `booth_id`)가 같은 (date, section)에 자리(`booth_number`) 여러 개를 가질 수 있다. 예: 문헌정보학과(booth_id=1)가 백양로에서 1·2·3·4 연달아 4자리 운영.

기존 가정 "1 (booth_id, date) → 1 row"가 깨진다.

### PK 결정: surrogate id

```ts
export interface BoothPlacementDTO {
  id: number;                // ★ 새 필드: surrogate PK
  booth_id: number;          // 운영자 (FK)
  date: string;
  section: MapSectionId;
  booth_number: string;      // 물리적 자리 번호
  x: number;
  y: number;
  width: number;
  height: number;
}
```

DB 인덱스로 `UNIQUE(date, section, booth_number)`. 운영자(booth_id)는 한 (date, section)에 N row 가능.

이유:
- ORM/감사/소프트삭제와의 호환성, 사용자 메모리에 정리된 "id PK + display_code" 원칙과 일치.
- CRUD URL이 `/:placementId`로 단순.

### API 모양

```
이미 있음 (반환형 변경):
  GET    /booth-placements?date=YYYY-MM-DD          → BoothPlacementDTO[]
  GET    /booth-placements/by-booth/:boothId        → BoothPlacementDTO[]   ★ array

새로 추가:
  POST   /booth-placements                          → create (body: BoothPlacementDTO 전체 - id)
  PUT    /booth-placements/:placementId             → update (body: 변경 가능 필드)
  DELETE /booth-placements/:placementId
  POST   /booth-placements/copy                     → 일괄 복제
         body: { from_date, to_date, section }
```

`getPlacementByBoothId`/`useMyBoothPlacement` 반환형은 이번 PR에서 array로 바꾼다(타입 일관성 유지). 그러나 호출부(`reservation-booth-picker.tsx` 등)에서 array를 제대로 펼쳐 쓰는 **다중 자리 UX**(여러 핀 동시 강조, 자리 선택 picker 등)는 **이번 PR 범위 밖** — 호출부는 일단 `data[0] ?? null`로 최소 패치만 넣어 회귀 막고, 본격적인 다중 자리 처리는 follow-up 커밋으로 분리.

## 라우트·권한·진입

- 새 라우트: `/booth-layout/edit` (root-layout 트리 아래)
- `permissions.ts`: `'booth-layout.edit': ['Super']` 추가
- `<RequirePermission permission="booth-layout.edit">` 가드 적용
- `nav.ts`: "지도 편집" 항목 등록 (`requires: 'booth-layout.edit'`, lucide `MapPin` 또는 `Pencil`)
- `/booth-layout` view 페이지에 Super일 때만 보이는 "편집" 버튼을 우상단에 두어 빠른 진입도 보장

## 컴포넌트 구조

기존 view-mode 코드(`booth-map-canvas.tsx`, `booth-map-picker.tsx`)는 손대지 않고 편집용 컴포넌트를 평행으로 둔다. 단, 이미지 letterbox 정합 계산처럼 양쪽이 동일하게 필요한 로직은 hook으로 추출해 공유.

### 새 파일

| 경로 | 책임 |
|---|---|
| `src/pages/booth-layout-edit.tsx` | 페이지 entrypoint. 헤더 + `<PlacementEditor>` 마운트 |
| `src/features/booth-layout/components/placement-editor.tsx` | 상태 소유자. 날짜·섹션 탭, 좌측 리스트, 우측 캔버스, 상단 툴바 조립 |
| `src/features/booth-layout/components/placement-editor-canvas.tsx` | 인터랙션 캔버스. 클릭 생성, 드래그 이동, 8핸들 리사이즈, 키보드 미세조정 |
| `src/features/booth-layout/components/placement-list.tsx` | 좌측 패널. 운영자 리스트 + "이 (date, section)에 배치된 자리 수" 뱃지 |
| `src/features/booth-layout/components/placement-toolbar.tsx` | 상단 툴바. 날짜·섹션 탭(섹션 탭은 5/28·5/29만 표시, 5/27 global은 단일 섹션이라 숨김), "전날 복제"(5/29 탭에서만 활성), "전체 리셋", "JSON Export" |
| `src/features/booth-layout/hooks/use-image-painted-rect.ts` | view/edit 공유. 현재 `booth-map-canvas`의 `measureImage` 추출 |
| `src/features/booth-layout/storage.ts` | mock localStorage persistence (`unit-y:placements:v1`) |

### 기존 파일 수정

| 경로 | 변경 |
|---|---|
| `src/features/booth-layout/types.ts` | `BoothPlacementDTO`/`BoothPlacement`에 `id: number` 추가 |
| `src/features/booth-layout/mapper.ts` | `id` 매핑 |
| `src/features/booth-layout/api.ts` | `upsertPlacement`/`createPlacement`/`deletePlacement`/`copyPlacements` mock+real 추가, `getPlacementByBoothId` 반환형 array로 변경 |
| `src/features/booth-layout/hooks.ts` | `useUpsertPlacement`/`useDeletePlacement`/`useCopyPlacements` mutation hooks 추가 |
| `src/features/booth-layout/components/booth-map-canvas.tsx` | `measureImage` → `useImagePaintedRect` 호출로 단순화 (행동 변경 없음) |
| `src/mocks/booth-placements.ts` | 각 row에 `id` 추가, storage seed 진입점으로 활용 |
| `src/config/permissions.ts` | `'booth-layout.edit': ['Super']` |
| `src/config/nav.ts` | "지도 편집" 항목 |
| `src/routes/index.tsx` | `/booth-layout/edit` 라우트 + 가드 |

### 파생 결정

- 편집 캔버스는 view 캔버스의 "focus pan"(focus된 부스를 화면 중앙으로 이동) 동작을 **하지 않음**. 편집 중 이미지가 휙휙 움직이면 방해.
- 핀 위에 booth_number 라벨 항상 표시(view도 이미 그렇게 함).
- 좌측 리스트 운영자 행 클릭 = 그 운영자가 selected 상태로 들어감. 지도 빈 곳을 클릭할 때마다 그 운영자 밑으로 placement 생성. Esc 또는 다른 곳 클릭으로 해제.

## 데이터 흐름

```
PlacementEditor (소유)
  ├── selectedDate, selectedSection            (탭 상태)
  ├── selectedBoothId | null                   (좌측 리스트 선택)
  ├── selectedPlacementId | null               (캔버스 선택)
  └── lastUsedSize: {width, height}            (sticky 기본 크기)

  └── usePlacements(selectedDate)              (TanStack Query)
       └── filter by selectedSection           (캔버스/리스트로 분배)

  ├── 좌측 리스트:
  │    Object.values(mockBoothsById)           (운영자 풀)
  │    + (per booth) placements.filter(p => p.boothId === b.id).length

  └── 캔버스:
       placements.filter(p => p.section === selectedSection)
       drag/resize 중엔 로컬 state, mouseup 시 useUpsertPlacement
```

### Mock storage (`storage.ts`)

- localStorage key: `unit-y:placements:v1` (스키마 변경 대비 versioned)
- 최초 로드 시 비어 있으면 `mockBoothPlacements`로 seed
- 함수: `loadAll()`, `upsertOne(dto)`, `deleteOne(id)`, `copy(fromDate, toDate, section)`
- `listPlacementsMock`/`getPlacementByBoothIdMock`도 이 storage를 읽도록 교체 → editor에서 저장한 값이 view 페이지에서 즉시 보임

### Mutation hooks

- `useUpsertPlacement()` — `onSuccess`에서 `['booth-placements', date]` invalidate
- `useDeletePlacement()` — 동일
- `useCopyPlacements()` — `from_date`, `to_date` 둘 다 invalidate
- 낙관적 업데이트 사용 안 함. mutation 실패 시 toast + invalidate로 강제 새로고침(단순화)

### JSON Export

- 툴바 "JSON Export" → `loadAll()` 결과를 `Omit<BoothPlacementDTO, 'id'>[]`로 직렬화 (surrogate id는 백엔드 import 시 재생성)
- `Blob` + `URL.createObjectURL` + `<a download>`로 `booth-placements-2026-{YYYY-MM-DD}.json` 다운로드

## 인터랙션 디테일

### 생성
- 좌측에서 운영자 선택 → 빈 곳 클릭 → placement 1개 생성
- 기본 크기 = 마지막에 만든 placement 크기를 sticky하게 기억(없으면 5%×3%)
- booth_number는 해당 (date, section) 내 가장 작은 미사용 양수 자동 할당, 사이드 패널에서 inline 변경 가능

### 선택
- 핀 클릭 = 선택. 8개 핸들(모서리 4 + 엣지 4) 표시
- Esc로 선택 해제

### 이동·리사이즈
- 드래그 중엔 로컬 state로 그리고, `mouseup` 시점에만 mutation 호출
- 좌표는 항상 `[0, 100]` 범위로 clamp(이미지 바깥으로 못 나감)

### 키보드
- 선택 상태에서:
  - ← ↑ ↓ → = 0.1% 이동
  - Shift + 화살표 = 1% 이동
  - Backspace / Delete = 삭제(확인 다이얼로그)
  - Cmd/Ctrl + Z = 1단계 Undo (마지막 mutation 되돌림)
- 다단계 history는 YAGNI

## 2026 지도 이미지 교체 워크플로우

작년 지도여서 올해 갱신될 가능성. 다음 절차:

1. 새 이미지 → `src/assets/map/`에 같은 파일명으로 덮어쓰기 (또는 새 파일명 + `sections.ts` import 변경)
2. `sections.ts`의 `imageAspectRatio` 값을 새 이미지의 W/H로 갱신
3. picker에서 "이 (date, section) placements 전부 리셋" 버튼으로 작년 좌표 갈아엎기 (확인 다이얼로그 1번)
4. picker로 새 좌표 다시 찍기

이미지 업로드 자체는 picker에서 하지 않음(코드 작업으로 처리, 자산 git 커밋의 명시적 흐름 유지).

## 엣지 케이스

| 케이스 | 처리 |
|---|---|
| (date, section)에 placement 0개 | 캔버스 가운데 "운영자를 선택하고 지도를 클릭해 첫 자리를 만드세요" 힌트 |
| 운영자 미선택 상태에서 빈 곳 클릭 | 무시 + 좌측 리스트 영역 강조 애니메이션 |
| 이미지 로드 실패 | muted 배경 + "지도 이미지를 불러오지 못했습니다" |
| mutation 실패 | toast 에러 + `invalidateQueries`로 강제 새로고침 |
| localStorage 한도 초과 | try/catch + 토스트(실 발생 가능성 거의 0이지만 표시) |
| 같은 (date, section)에 동일 booth_number 중복 | storage 단계에서 거부 + 토스트 |

## 검증 (수동 QA)

테스트 러너 미설정. 수동으로:

1. Super 로그인 → `/booth-layout/edit` 진입 가능. Master/Booth/Performer는 가드에서 차단.
2. 5/27 global에 운영자 1개 placement 배치 → `/booth-layout` view 페이지에서 즉시 반영.
3. 5/28 baekyang에 운영자 1개를 4번 클릭으로 4자리 배치. booth_number 자동 1·2·3·4.
4. "5/28 → 5/29 복제" 누르면 5/29 baekyang에 동일 4자리 생성.
5. JSON Export → 파일 안에 9개 row(5/27 1 + 5/28 4 + 5/29 4), surrogate id 없음.
6. 새로고침해도 모든 placement가 localStorage에서 복구.
7. (회귀) 기존 view 페이지(`/reservation`, `/booth-layout`)가 Super/Master/Booth 모두에서 깨지지 않음. `getPlacementByBoothId` array화로 인한 영향만 회귀 확인 — 이 부분은 follow-up 커밋이 들어오기 전에는 single placement만 표시되는 한계 그대로 유지(타입 변경 시 호출부 unwrap 처리).

## 범위 외 (Follow-up)

다음은 별도 PR로:

- `useMyBoothPlacement` array화 + `reservation-booth-picker.tsx` 다중 자리 처리
- 뷰 캔버스 focus 모델 `focusedBoothId` → `focusedPlacementId` 리팩토링
- 어드민 외 다른 역할에 picker view 권한 추가 검토 (현재는 불필요)

## 요약

- Super-only 정식 라우트 `/booth-layout/edit`로 시작 → 시딩 끝나면 권한만 비활성화하면 됨
- PK = surrogate `id`, `UNIQUE(date, section, booth_number)`로 1 운영자 ↔ N 자리 지원
- 클릭 생성 + 드래그 이동·리사이즈 + 키보드 미세조정 + 1단계 Undo
- mock localStorage로 즉시 동작, 같은 컴포넌트가 백엔드 붙는 시점에 그대로 운영 어드민
- "전날 복제" + "전체 리셋" + "JSON Export"로 시딩 작업 가속화
- 뷰 페이지 다중 자리 리팩토링은 follow-up
