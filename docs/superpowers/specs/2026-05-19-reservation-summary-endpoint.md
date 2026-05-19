# 예약 집계 엔드포인트 spec — `GET /api/admin/reservations/summary`

> 작성일: 2026-05-19 · 대상 레포: `unit-y-yonsei-server` (백엔드) + `unit-y-yonsei-admin` (프론트)
> 관련: `ReservationAdminController`, 프론트 `features/reservations`

## 배경

어드민 대시보드(`dashboard.tsx`)와 예약 부스 picker(`reservation-booth-picker.tsx`)는
**예약 행(row)을 화면에 그리지 않고 카운트만 사용**한다.

| 소비처 | 실제 쓰는 값 |
|---|---|
| `dashboard.tsx` | 총 예약 건수 + 대기(`PENDING`) 건수 (KPI 카드) |
| `reservation-booth-picker.tsx` | 부스별 `{waiting, completed, cancelled}` 카운트 |

현재 프론트 `listReservationsReal`은 `GET /admin/reservations`(전체 목록)를 호출하지만
백엔드에 해당 엔드포인트가 없다. 또한 전체 목록을 내려받아 클라이언트에서 `.length`/`.filter()`로
세는 구조는 — 축제 기간 예약이 수백~수천 건이면 행 전체를 전송하는 낭비이고,
페이지네이션이 들어오는 순간 전체 집계와 상충한다.

→ **전체 목록 엔드포인트 대신, 부스별 상태 카운트만 내려주는 집계 엔드포인트**를 신설한다.
부스별 상세 목록은 기존 `GET /api/admin/reservations/booths/{boothId}`가 이미 담당한다.

## 엔드포인트

```
GET /api/admin/reservations/summary
```

- 컨트롤러: `ReservationAdminController`에 메서드 추가
- 권한: 클래스 레벨 `@RequireAdminRole({SUPER, MASTER, BOOTH})` 그대로 적용
- 요청 파라미터: 없음
- 인증: 세션 쿠키(`DDJ_ADMIN_SESSION`). 미인증 시 401 → 프론트 `onUnauthorized` 발화

### 가시 범위 (scoping)

기존 `getListByBooth`의 권한 규약을 그대로 따른다.

| 역할 | 응답 범위 |
|---|---|
| `SUPER` / `MASTER` | 모든 부스의 집계 |
| `BOOTH` | 본인 담당 부스 1건만 |

`BOOTH`가 담당 부스 미배정 상태면 `booths: []`, `totals` 전부 0.

## 응답

봉투는 공통 `ApiResponse<T>={success,data,error}`. `data`는 camelCase.

```json
{
  "success": true,
  "data": {
    "booths": [
      { "boothId": 1, "pending": 12, "confirmed": 30, "cancelled": 3, "total": 45 },
      { "boothId": 2, "pending": 5,  "confirmed": 8,  "cancelled": 1, "total": 14 }
    ],
    "totals": { "pending": 17, "confirmed": 38, "cancelled": 4, "total": 63 }
  },
  "error": null
}
```

### 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `booths[]` | array | 예약이 **1건 이상 있는** 부스만 포함. 0건 부스는 생략 — 소비처가 누락 시 0으로 기본 처리 |
| `booths[].boothId` | number | 부스 id |
| `booths[].pending` | number | `ReservationStatus.PENDING` 건수 (= 프론트 `waiting`) |
| `booths[].confirmed` | number | `ReservationStatus.CONFIRMED` 건수 (= 프론트 `completed`) |
| `booths[].cancelled` | number | `ReservationStatus.CANCELLED` 건수 |
| `booths[].total` | number | 세 상태 합계 — picker가 합산 안 하도록 백엔드가 제공 |
| `totals` | object | 가시 범위 전체 합계. dashboard가 booths 배열을 합산 안 하도록 제공 |

상태 키는 **백엔드 enum 어휘**(`pending/confirmed/cancelled`)를 쓴다. 프론트
`waiting/completed/cancelled` 매핑은 `features/reservations/mapper.ts`가 담당.

## 구현 메모 (백엔드)

- 쿼리 한 방: `SELECT booth_id, status, COUNT(*) FROM reservation GROUP BY booth_id, status`
  후 booth 단위로 접고, 같은 루프에서 `totals` 누산. 행 페이로드·페이지네이션 불필요.
- `BOOTH` 역할은 `WHERE booth_id = :myBoothId` 추가. `currentAdmin`에서 담당 부스 id 추출
  (`getListByBooth`가 이미 하는 방식 재사용).
- 신규 DTO: `ReservationSummaryResponse { List<BoothCount> booths; Totals totals; }`
  - `BoothCount { Long boothId; long pending; long confirmed; long cancelled; long total; }`
  - `Totals { long pending; long confirmed; long cancelled; long total; }`
- 에러 케이스 없음 — 빈 결과도 200(`booths: []`). 404 던지지 않는다.

## 프론트 정합 (백엔드 머지 후)

`features/reservations`:

1. `types.ts` — `ReservationSummary` 모델 + `ReservationSummaryDTO` 추가.
2. `mapper.ts` — `toReservationSummary`: `pending→waiting`, `confirmed→completed`로 키 변환.
3. `api.ts` — `getReservationSummaryReal()`이 `GET /admin/reservations/summary` 호출.
   mock도 부스별 카운트 생성해 동형 반환.
4. `hooks.ts` — `useReservationSummary()` 신설. 기존 `useReservations()`(전체 목록)는 제거.
5. 소비처 교체:
   - `dashboard.tsx` — `reservationCount = data.totals.total`, `waitingCount = data.totals.pending`.
   - `reservation-booth-picker.tsx` — `countsByBooth`를 `data.booths`에서 직접 구성
     (`buildReservationCountsByBooth` 폐기). 누락 부스는 `{waiting:0,completed:0,cancelled:0}` 기본값.

`listReservations`/`listReservationsReal`(`/admin/reservations` 전체 목록)은 이 정합 시점에 삭제.
부스별 상세는 `listBoothReservations`가 계속 담당.

## 미해결 / 후속

- 자동 갱신: 예약 화면은 `2026-05-17-reservation-auto-refresh`로 폴링 중 — summary도 동일 주기 폴링 대상.
  TanStack Query `refetchInterval` 적용은 프론트 정합 단계에서 결정.
- 날짜(축제 일차) 필터는 두지 않는다. picker가 booth 목록의 `date`로 일차를 가르고,
  summary는 `boothId` 키만 제공하면 충분 — 일차 분기는 클라이언트가 booth↔day 매핑으로 처리.
