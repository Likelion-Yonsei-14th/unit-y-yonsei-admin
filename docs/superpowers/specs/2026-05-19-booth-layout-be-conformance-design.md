# booth-layout 백엔드 정합 설계

- 작성일: 2026-05-19
- 대상: `src/features/booth-layout/` 전체 + 소비처 2곳
- 상태: 설계 확정, 구현 플랜 대기

## 1. 배경 / 문제

프론트 `booth-layout` feature 는 백엔드에 **존재하지 않는 `BoothPlacement` 엔티티**를 가정하고 작성됐다. 백엔드 실제 모델은 `MapLocation`(범용 지도 마커) + `Booth.locationId`(FK) 다. 매퍼 교체로 메울 수 없는 모델 설계 차이이며, feature 를 백엔드 계약에 맞춰 재작성한다.

### 현재 FE 가정 (`BoothPlacement`) vs 백엔드 (`MapLocation`)

| 항목 | FE `BoothPlacement` | 백엔드 `MapLocation` |
|---|---|---|
| 소유 방향 | placement 가 `booth_id` 보유 | location 은 독립, `Booth.locationId` 가 FK |
| 카디널리티 | 부스 1:N placement | 부스 N:1 location (이번 정합에서 **1:1 로 고정**) |
| 날짜 | placement 마다 `date` | 없음 |
| 엔드포인트 | `/booth-placements*` | `/api/admin/map-locations` |
| 수정 메서드 | `PUT` | `PATCH` |
| 케이싱 | snake_case | camelCase |
| 좌표 필드 | `x`, `y` | `mapX`, `mapY` |
| 부스 번호 | `booth_number`(문자열) | 없음 (`displayOrder` Integer) |
| copy / reset | 있음 | 없음 |

## 2. 백엔드 계약 (정합 기준, 수정 불가)

### `MapLocation` (테이블 `map_locations`)

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | Long | PK |
| `locationName` | String(≤100) | 생성 시 `@NotBlank` |
| `sector` | String(≤10) | 생성 시 `@NotBlank` — **본 정합에서 enum 화 권장(§12)** |
| `mapX` / `mapY` | BigDecimal(10,4) | 생성 시 `@NotNull` |
| `width` / `height` | BigDecimal(6,3) | nullable, `@PositiveOrZero` |
| `locationType` | enum `STAGE\|BOOTH\|ENTRANCE\|FACILITY\|OTHER` | 생성 시 `@NotNull` |
| `displayOrder` | Integer | 생략 시 0 |
| `displayStatus` | enum `VISIBLE\|HIDDEN` | 생성 시 `@NotNull` |
| `createdAt` / `updatedAt` | LocalDateTime | 응답 전용 |

### 엔드포인트 — `/api/admin/map-locations`

| 동작 | 메서드 | 권한 | 응답 |
|---|---|---|---|
| 생성 | `POST` | SUPER / MASTER | 201 · `ApiResponse<MapLocationResponse>` |
| 수정(부분) | `PATCH /{id}` | SUPER / MASTER | 200 · `ApiResponse<MapLocationResponse>` |
| 삭제 | `DELETE /{id}` | SUPER / MASTER | 200 · `ApiResponse<MapLocationDeleteResponse>` · 참조 중이면 409 |
| 목록 | `GET` | 모든 어드민 | `ApiResponse<PageResponse<MapLocationResponse>>` |
| 단건 | `GET /{id}` | 모든 어드민 | `ApiResponse<MapLocationResponse>` |

- 목록 쿼리 파라미터(snake_case): `sector`, `location_type`, `display_status`, `page`(기본 0), `size`(기본 20, 최대 100).
- `PageResponse` = `{ content, page, size, totalElements, totalPages, hasNext }`.
- `api-client` 는 `{success,data,error}` 봉투를 언랩해 `data` 를 반환 → 목록 호출은 `PageResponse` 객체를 받고 FE 가 `.content` 추출.

### 부스↔위치 연결

- `Booth.locationId` (`booths` 도메인, 이미 정합 완료) FK → `map_locations.id`.
- DB 제약: `fk_booths_map_location` + 비유니크 `idx_booths_location_id` (UNIQUE 아님).

## 3. 확정 결정 (브레인스토밍 결과)

1. **feature 정의** — 부스 중심 편집기 유지. 에디터가 `MapLocation` 좌표와 `Booth.locationId` 를 둘 다 다룬다.
2. **편집 모델** — 부스-먼저. 부스를 지도로 드래그하면 `MapLocation` 자동 생성, locationId 설정.
3. **sector 어휘** — `한글탑 / 백양로 / 송도` (= `BoothSector`). FE 는 이 값으로 지도 이미지를 고른다.
4. **부스↔슬롯 = 1:1 고정** — 한 슬롯에 부스 둘(다른 날 포함)이 붙는 케이스 없음. 슬롯 공유/재사용 로직 전부 제거.
5. **날짜** — `MapLocation` 에 날짜 없음. 편집기/예약 picker 의 일차 선택은 `Booth.date` 기준 FE 필터로만 잔존.
6. **편집 범위** — 편집기는 `locationType=BOOTH` 만 다룬다. STAGE 등은 범위 밖(공연 도메인 V22 시드가 STAGE 사용).
7. **다일차 부스 표현 불가 수용** — BE `Booth` 는 `date` 1개 → 3일 운영 벤더는 Booth 행 3개. BE 모델 한계로 수용.
8. **페이지네이션** — 슬롯 100개 미만 전제, `size=100` 단일 페이지 조회.

## 4. 데이터 모델 — `booth-layout/types.ts`

`BoothPlacement` / `BoothPlacementDTO` 폐기. 다음으로 교체:

```ts
export type MapLocationType = 'STAGE' | 'BOOTH' | 'ENTRANCE' | 'FACILITY' | 'OTHER';
export type MapDisplayStatus = 'VISIBLE' | 'HIDDEN';
// sector 는 booths 도메인의 BoothSector 를 재사용 import.

/** 프론트 모델. */
export interface MapLocation {
  id: number;
  locationName: string;
  sector: BoothSector;            // 한글탑 | 백양로 | 송도
  mapX: number;
  mapY: number;
  width: number | null;
  height: number | null;
  locationType: MapLocationType;
  displayOrder: number;
  displayStatus: MapDisplayStatus;
}

/** 백엔드 MapLocationResponse 미러. 좌표는 BigDecimal → JSON 에서 number|string 가능. */
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
```

- `MapSectionId`(`global|baekyang|hangeul`)는 지도 이미지 키로만 잔존. `sectionForSector: Record<BoothSector, MapSectionId>`(`송도→global`, `백양로→baekyang`, `한글탑→hangeul`) 매핑을 `sections.ts` 에 추가.
- `PickerBooth` 는 유지하되 `placement: BoothPlacement` 필드를 `location: MapLocation` 로 교체.
- `booths/types.ts:38` 의 `locationId` 주석("이번 범위에선 읽기만")을 정정 — `fromBooth` 가 이미 전송 중.

## 5. 매퍼 — `booth-layout/mapper.ts`

```ts
toMapLocation(d: MapLocationDTO): MapLocation   // Number() 정규화, sector 는 BoothSector 로 단언
// 생성/수정 요청 바디는 camelCase 그대로 → 별도 fromXxx 불필요, api.ts 에서 직접 구성
```

## 6. API 레이어 — `booth-layout/api.ts`

mock/real 분기 유지 (`env.USE_MOCK`).

| 함수 | real 구현 |
|---|---|
| `listMapLocations(filter?)` | `GET /api/admin/map-locations?location_type=BOOTH&size=100` → `PageResponse.content` → `toMapLocation` |
| `getMapLocation(id)` | `GET /api/admin/map-locations/{id}` |
| `createMapLocation(input)` | `POST /api/admin/map-locations` (locationType=BOOTH, displayStatus=VISIBLE 기본) |
| `updateMapLocation(id, patch)` | `PATCH /api/admin/map-locations/{id}` — 부분 바디 |
| `deleteMapLocation(id)` | `DELETE /api/admin/map-locations/{id}` |

폐기: `listPlacements`, `getPlacementsByBoothId`, `createPlacement`, `updatePlacement`, `deletePlacement`, `copyPlacements`, `resetSection`.

### 부스 수정 API 보강 — `booths/api.ts`

편집기는 **임의 부스**의 `locationId` 를 바꿔야 한다. 현재 `updateMyBooth` 는 본인 부스 전용 → `updateBooth(boothId, booth)` 추가 (`PUT /admin/booths/{id}`). `booths/hooks.ts` 에 `useUpdateBooth` 추가.

## 7. hooks — `booth-layout/hooks.ts`

폐기: `usePlacements`, `useMyBoothPlacements`, `useCreatePlacement`, `useUpdatePlacement`, `useDeletePlacement`, `useCopyPlacements`, `useResetSection`.

신규: `useMapLocations(filter)`, `useCreateMapLocation()`, `useUpdateMapLocation()`, `useDeleteMapLocation()`. 쿼리키 `['map-locations', ...]`. 부스 배정 mutation 은 `booths` 도메인 `useUpdateBooth` 재사용.

## 8. 편집기 동작 — `PlacementEditor` 외 컴포넌트

부스-먼저, 1:1 고정. `MapLocation`(type=BOOTH)은 부스 배치의 1:1 위성 — 좌표만 별도 테이블에 살 뿐 부스와 생사를 같이한다.

- **좌측 슬라이더** = `locationId == null` 부스 (선택 일차 필터 적용) = 미배치 부스.
- **빈 공간에 드롭** → `createMapLocation`(sector=현재 섹션, mapX/mapY=드롭점, width/height=기본값) → 반환 id 로 `useUpdateBooth` 로 부스 `locationId` 설정.
- **배치된 슬롯 드래그 / 리사이즈** → `updateMapLocation`(mapX/mapY 또는 width/height). 공유 없으므로 확인 다이얼로그 불필요.
- **지도에서 제거** → `useUpdateBooth` 로 `locationId=null` → 이어서 `deleteMapLocation(id)`. 순서 필수: 부스 참조를 먼저 끊어야 409 회피.
- **기존 슬롯 위 드롭(재사용)** — 케이스 삭제. 슬롯 위 드롭은 무시.
- 슬롯 표시 번호 = 배정 부스의 `Booth.location`(섹터 내 배치 번호, Integer). `MapLocation.locationName` 은 슬롯 생성 시 `부스명 || '{sector} 부스 슬롯'` 자동 채움.
- 1:1 은 FE 불변식. BE FK 가 UNIQUE 아니므로 한 location 에 부스 2개가 관측되면 첫 부스만 표시 + 콘솔 경고(방어). BE 가 UNIQUE 인덱스를 추가하면(§12) 이 방어 코드 제거 가능.
- 영향 컴포넌트: `placement-editor.tsx`, `placement-editor-canvas.tsx`, `placement-list.tsx`, `placement-toolbar.tsx`, `booth-slider.tsx`, `booth-slider-card.tsx`, `booth-map-canvas.tsx`, `map-section-tabs.tsx`. `use-placement-undo.ts` 는 새 mutation 단위로 리타깃. `use-image-painted-rect.ts`, `utils/clamp.ts`, `utils/pin-radius.ts` 는 순수 기하 — 변경 없음 예상.

## 9. 예약 진입점 — `reservation-booth-picker.tsx` + `BoothMapPicker`

- `usePlacements(date)` → `useMapLocations()` + `useBooths()` 조합. 부스를 자기 `locationId` 슬롯 좌표에 렌더, 선택 일차(`booth.date`)로 필터.
- Booth 계정의 "여러 자리" 로직 단일화 — BE `Booth` 는 `date`·`locationId` 각 1개 → 한 부스 = 한 날 한 자리. `myFirstPlacement`/`availableDates`(다중) 로직을 단일 부스 기준으로 축소.
- `displayStatus=HIDDEN` 슬롯은 예약 picker 에서 숨김(편집기는 표시).

## 10. mock

- `mocks/booth-placements.ts` → `mocks/map-locations.ts` 로 재작성 — `MapLocationDTO[]` 시드.
- `mocks/booth-profile.ts` mock 부스에 `locationId` 부여 — 5개 역할 플로우가 모두 닫히도록(작성완료 부스는 배치됨, 빈 부스는 미배치).
- `booth-layout/storage.ts` localStorage 스토어 → in-memory map-location mock 스토어로 교체(또는 mock api.ts 내부로 흡수).

## 11. 제거 대상 정리

- `BoothPlacement` / `BoothPlacementDTO` / snake_case DTO / `booth_number`.
- 날짜별 배치 · `copyPlacements` · `resetSection`.
- `utils/export-placements.ts` (JSON Export — 실 API 직접 저장으로 불필요). `pages/booth-layout.tsx` 헤더의 "JSON Export" 문구도 정정.
- `storage.ts` 의 placement localStorage 영속화.

## 12. 백엔드 권장사항 (별건, FE 정합과 분리)

1. **`booths.location_id` UNIQUE 인덱스** — 1:1 을 DB 가 강제. 현재 V11 은 비유니크 `idx_booths_location_id`. 신규 마이그레이션으로 UNIQUE 전환 시 FE 방어 코드 불필요. 인증 도메인의 "1:1 FK+UNIQUE" 패턴과 일관.
2. **`MapLocation.sector` enum 화** — `String` → `BoothSector` enum 재사용. 엔티티 `@Enumerated(EnumType.STRING)`, `MapLocationCreateRequest/UpdateRequest/Response` 의 `sector` 타입 변경, 목록 필터 `@RequestParam` 변경. `BoothSector` 가 부스 전용이 아니게 되므로 `Sector` 류 개명도 고려(booths 도메인 DTO 5개 동반 수정 — 선택).

두 권장사항은 FE 정합 작업의 **전제가 아니다**. FE 는 enum/UNIQUE 없이도 동작하되, 적용되면 FE 방어 코드를 후속 제거한다.

## 13. 영향 받는 파일

```
booth-layout/  types.ts mapper.ts api.ts hooks.ts sections.ts storage.ts
               components/ 8개  hooks/use-placement-undo.ts
               (삭제) utils/export-placements.ts
booths/        api.ts(+updateBooth) hooks.ts(+useUpdateBooth) types.ts(주석)
pages/         booth-layout.tsx  reservation-booth-picker.tsx
mocks/         booth-placements.ts→map-locations.ts  booth-profile.ts
```

## 14. 구현 단계

타입 변경이 8개 컴포넌트로 전파돼 중간 빌드가 깨지므로 **한 PR 안에서** 아래 순서로, 각 단위 커밋:

1. 데이터 레이어 — `types.ts` / `mapper.ts` / `api.ts` / `hooks.ts` + `booths` 보강.
2. mock — `map-locations.ts` 재시드, `booth-profile.ts` locationId.
3. 편집기 컴포넌트 8개 + undo 리타깃.
4. `reservation-booth-picker` + `BoothMapPicker`.
5. 정리 — `export-placements.ts` 삭제, `pages/booth-layout.tsx` 문구, `storage.ts`.

## 15. 검증

- `pnpm typecheck` 클린.
- `VITE_USE_MOCK=true` 로 5개 역할 로그인 → 편집기(배치/이동/리사이즈/제거)·예약 picker 진입 플로우가 모두 닫힘.
- real 모드: `/api/admin/map-locations` CRUD 가 PATCH·snake_case 쿼리·PageResponse 언랩까지 백엔드와 일치.
