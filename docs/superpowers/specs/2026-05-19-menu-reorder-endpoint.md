# 메뉴 순서 일괄 변경 엔드포인트 spec — `PUT /api/admin/booths/{boothId}/menus/order`

> 작성일: 2026-05-19 · 대상 레포: `unit-y-yonsei-server` (백엔드) + `unit-y-yonsei-admin` (프론트)
> 관련: `MenuAdminController`, 프론트 `features/menus`

## 배경

부스 메뉴 관리 화면(`MenuListForm`)에 **메뉴 순서 변경(드래그 앤 드롭)**을 붙이려 한다.
현재는 새 메뉴가 `displayOrder` 최대 + 1 로 끝에만 추가되고, 재정렬 수단이 없다.

단건 `PATCH /admin/booths/{boothId}/menus/{menuId}` 로는 재정렬이 안 된다 —
`menus` 테이블에 `uk_menus_booth_display_order UNIQUE (booth_id, display_order)`
제약이 있어, 두 메뉴 순서를 맞바꾸려고 A를 B의 순서로 PATCH 하는 순간 아직 그
순서를 쥔 B와 충돌(`MENU_002 DUPLICATE_MENU_DISPLAY_ORDER`)한다. 단건 PATCH 의
순열 재배치는 중간에 반드시 한 번은 UNIQUE 위반이 난다.

→ **부스의 메뉴 순서를 한 번에 재배정하는 엔드포인트**를 신설한다.

## 엔드포인트

```
PUT /api/admin/booths/{boothId}/menus/order
```

- 컨트롤러: `MenuAdminController` 에 메서드 추가
- 권한: 클래스 레벨 `@RequireAdminRole({SUPER, MASTER, BOOTH})` 그대로 적용
- `BOOTH` 역할은 본인 담당 부스만 — 기존 create/update/delete 와 동일하게
  `@CurrentAdmin` 으로 부스 소유 검증. 타 부스면 403.

### 요청

```json
{ "menuIds": [12, 9, 27, 5] }
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `menuIds` | `Long[]` | 원하는 순서대로 나열한 메뉴 id. 배열 index 0 이 첫 번째. |

`menuIds` 는 해당 부스 메뉴 id 집합의 **완전한 순열**이어야 한다 —
- 부스에 속하지 않은 id 포함 → `400` (또는 `404 MENU_001`)
- 부스 메뉴 중 누락된 id 존재 → `400` (부분 재정렬은 순서가 모호하므로 불허)
- 중복 id → `400`

배정 규칙: `menuIds[i]` 의 메뉴는 `displayOrder = i + 1` (1-based) 을 받는다.
메뉴가 0개인 부스는 `menuIds: []` → `200`, no-op.

### 응답

공통 봉투 `ApiResponse<T>`. `data` 는 재정렬된 메뉴 목록(새 `displayOrder` 반영,
`displayOrder` 오름차순).

```json
{
  "success": true,
  "data": [
    { "id": 12, "boothId": 3, "name": "...", "price": 5000, "displayOrder": 1, ... },
    { "id": 9,  "boothId": 3, "name": "...", "price": 6000, "displayOrder": 2, ... }
  ],
  "error": null
}
```

`MenuResponse` 형태 그대로 — 프론트가 응답으로 캐시를 통째 갱신한다.

## 구현 메모 (백엔드)

- **트랜잭션 1개**로 부스의 모든 메뉴 `displayOrder` 를 재배정한다.
- ⚠️ 트랜잭션 안이라도 MySQL UNIQUE 제약은 행 단위로 즉시 검사된다 — 1..N 을
  곧바로 재배정하면 중간에 `uk_menus_booth_display_order` 위반이 난다.
  **2단계 쓰기**로 회피한다:
  1. 부스 전체 메뉴를 현재 범위와 겹치지 않는 임시 값으로 이동
     (예: `displayOrder = -(i + 1)` 또는 `1000 + i`).
  2. 그다음 최종 `displayOrder = i + 1` 로 이동.
  음수 임시값은 INT 컬럼에 안전하고 정상 범위(1..N)와 절대 겹치지 않아 권장.
- `menuIds` 검증: 부스 메뉴 id 집합과 정확히 일치(크기·원소)하는지 먼저 확인,
  불일치 시 위 규약대로 4xx.

## 프론트 정합 (백엔드 머지 후)

`features/menus`:

1. `api.ts` — `reorderMenus(boothId, menuIds)` 가 `PUT /admin/booths/{boothId}/menus/order`
   호출. mock 도 in-memory 목록을 `menuIds` 순서로 재배열 + `displayOrder` 재부여.
2. `hooks.ts` — `useReorderMenus(boothId)` 신설. `onSuccess` 시 `['menus', boothId]`
   캐시를 응답으로 교체(또는 invalidate).
3. `components/menu-list-form.tsx` — 메뉴 행에 드래그 핸들 추가. `react-dnd`
   (이미 의존성에 있음 — 배치도 편집기에서 사용 중)로 행 재배치, drop 시 새
   `menuIds` 순서를 만들어 `useReorderMenus` 호출. 드래그 중 낙관적 재배열 후
   실패 시 롤백(또는 invalidate 로 단순 복원).

## 미해결 / 후속

- 낙관적 업데이트 적용 여부는 프론트 정합 단계에서 결정 — 메뉴 수가 적어
  `onSuccess` 후 캐시 교체만으로도 체감 지연은 크지 않다.
- 드래그 앤 드롭은 데스크톱 기준. 모바일 터치 DnD 까지 필요하면 `react-dnd`
  touch backend 를 추가 검토 — 별도 항목.
