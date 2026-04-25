# Backend 요청사항

프론트(어드민 SPA) 기준으로 필요한 백엔드 엔드포인트 · 데이터 모델 · 정책을 한 곳에 모은 문서. 프론트에 하드코딩된 mock 이 실제로 어떤 계약을 기대하는지 snapshot. 스키마가 바뀌면 `src/features/<domain>/types.ts` 의 DTO 만 맞춰주면 UI 는 그대로 동작.

## 0. 공통 규칙

- **Base URL**: `.env` 의 `VITE_API_BASE_URL`. 기본값 `http://localhost:8080/api`.
- **응답 명명**: 전부 `snake_case`. 프론트는 `features/<domain>/mapper.ts` 에서 camelCase 모델로 변환.
- **시간 포맷**
  - 날짜: `YYYY-MM-DD` (예: `2026-05-28`)
  - 시각: `HH:mm` (예: `14:30`)
  - 타임스탬프: `YYYY-MM-DD HH:mm` 혹은 ISO8601 — 확정 필요
- **에러 응답 바디** (src/types/api.ts `ErrorBody`)
  ```json
  { "message": "잘못된 요청", "code": "VALIDATION_FAILED",
    "details": { "email": ["이메일 형식이 아닙니다"] } }
  ```
  프론트는 `ApiError.fieldErrors` 를 react-hook-form `setError` 에 바로 주입.
- **페이지네이션 응답** (필요 시)
  ```json
  { "items": [...], "total": 123, "page": 1, "size": 20 }
  ```
- **401 처리**: 프론트의 `api-client.ts` 가 401 수신 시 `authStrategy.clearAuth()` + `/login` 리다이렉트.
- **CORS**: `VITE_API_BASE_URL` 오리진에 대해 `Access-Control-Allow-Credentials: true` 필요(세션 쿠키 채택 시).

## 1. 인증 방식 결정

- 현재 프론트는 **인증 전략 추상화** 상태 (`src/lib/auth-strategy.ts`). `JwtStrategy` / `SessionCookieStrategy` 구현체 2 종이 준비됨. 백엔드 확정되면 그 파일 맨 아래 한 줄만 교체.
- 백엔드 리드(본인) 방향은 **세션 쿠키**. 그렇다면 다음이 필요:
  - `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax`
  - 모든 요청은 `credentials: 'include'` 로 나감 — CORS 설정에 `Access-Control-Allow-Origin` 정확히 반영, `*` 안 됨.
  - `/auth/login` 응답 바디에 토큰 필드 불필요.
- JWT 로 갈 경우: 응답 바디에 `access_token`, `refresh_token?`. 프론트는 `Authorization: Bearer <token>` 헤더 부착.

## 2. 유저 & 인증 엔드포인트

### 2.1 DB 스키마 힌트

- `users` 테이블에 `id`(PK, auto) + `user_id`(display_code, UNIQUE, 영문+숫자) 분리.
- 역할별 프로필은 **1:1 FK + UNIQUE + CHECK**
  - `booths.user_id` UNIQUE, `CHECK (user.role = 'Booth')`
  - `performance_teams.user_id` UNIQUE, `CHECK (user.role = 'Performer')`
- 비밀번호 리셋(`reset-not-set`) 은 고도화 단계에서 붙임. 1차 릴리스 범위 밖.

### 2.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| POST | `/auth/login` | 로그인. body: `{ user_id, password }` | 누구나 |
| POST | `/auth/logout` | 로그아웃 | 로그인 필요 |
| GET  | `/auth/me` | 현재 사용자 정보 | 로그인 필요 |

### 2.3 응답 DTO (`CurrentUserDTO`)

```ts
{
  id: number,              // PK
  user_id: string,         // 로그인 display code
  role: 'Super' | 'Master' | 'Booth' | 'Performer',
  name: string,
  booth_id?: number,               // role=Booth 일 때만
  performance_team_id?: number     // role=Performer 일 때만
}
```

### 2.4 Mock 로그인 계정

```
super      / super1234    (Super)
master     / master1234   (Master)
booth1     / booth1234    (Booth, booth_id=1, 프로필 작성 완료)
booth2     / booth1234    (Booth, booth_id=2, 프로필 빈 상태)
performer1 / perf1234     (Performer, performance_team_id=1)
```

## 3. 유저 관리

프론트: `src/pages/user-management.tsx`, mock `src/mocks/users.ts`.

### 3.1 모델 (`MockUser`)

```ts
{
  id: number,
  user_id: string,           // display code
  role: Role,
  affiliation: string,       // 소속 (학과/동아리)
  booth_name: string,        // role=Booth 면 부스명, 아니면 빈 문자열/null
  performance_team_name: string,
  representative: string,    // 대표자
  email: string,
  phone: string,
  info_completed: boolean,   // ⚠ 백엔드 계산 필드 (section 3.3 참조)
  active: boolean            // 로그인 차단 여부
}
```

### 3.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/users` | 전체 유저 목록 (페이지네이션 검토) | `user.read` — Super/Master |
| POST  | `/users` | 신규 계정 생성 (ID/패스워드/역할/소속 등) | `admin.create` — Super |
| PATCH | `/users/:id/role` | 역할 변경. body: `{ role }` | `user.update.role` — Super |
| PATCH | `/users/:id/active` | 로그인 활성/비활성. body: `{ active }` | `user.deactivate` — Super/Master |
| DELETE | `/users/:id` | 유저 삭제 | `user.manage` — Super |

### 3.3 `info_completed` 계산 규칙 (백엔드가 계산해 내려주는 필드)

- `role='Booth'` 이면 `booths` 레코드의 필수 필드 + 대표 이미지 1장이 채워졌는지.
  - 필수: `name`, `organization_name`, `description`, `signature_menu`, `operating_hours`, `thumbnails` 중 `is_main=true` 1장.
- `role='Performer'` 이면 `performance_teams` 레코드의 `team_name`, `description`, `date`, `stage`, `start_time`, `end_time`, 대표 이미지 1장.
- `role='Super' | 'Master'` → 항상 `true` 로 처리 가능 (UI 에선 `-` 표기).

### 3.4 추가 고려

- 역할 변경 시 서버에서도 역할 전이 검증 필수. 특히 `Super` ↔ 다른 역할 전이는 프론트에서 차단하지만 서버 이중 가드 필요.
- `user.active=false` 이면 해당 계정 로그인 차단 (`/auth/login` 401 + 한국어 에러 메시지).

## 4. 부스

프론트: `src/pages/booth-management.tsx`, mock `src/mocks/booth-profile.ts`.

### 4.1 모델 (`BoothProfileDTO`)

```ts
{
  id: number,
  name: string,
  organization_name: string,
  description: string,
  signature_menu: string,
  operating_hours: string,
  reservation_enabled: boolean,   // 예약/주문 스위치
  order_notice: string,
  thumbnails: { id, url, is_main }[],
  menu_items: {
    id, order, name, description, price,
    image: string | null,
    sold_out: boolean
  }[]
}
```

- `price` 는 프론트에서 `"5,000원"` 포맷을 그대로 저장/표시. 원시 숫자로 분리할지 결정 필요.

### 4.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/booths/me` | Booth 계정의 자기 부스 조회 | `booth.update.own` — Booth |
| GET   | `/booths` | 전체 부스 목록 | `booth.read` — Super/Master |
| GET   | `/booths/:id` | 단일 부스 상세 | `booth.read` — Super/Master/Booth(본인) |
| POST  | `/booths` | 신규 부스 생성 | `booth.create` — Super/Master |
| PATCH | `/booths/:id` | 부스 정보 수정 | `booth.update.any` or `booth.update.own`(본인) |
| DELETE | `/booths/:id` | 부스 삭제 | `booth.delete` — Super |

### 4.3 서브 리소스 — 메뉴, 이미지

메뉴/이미지는 별도 하위 리소스 혹은 PATCH payload 에 전체 배열로 포함할지 결정 필요.

- 드래그 재정렬이 있어서 `order` 필드 필수.
- 대표 이미지는 한 부스당 `is_main=true` 가 **최대 1개** (DB 제약).

## 5. 부스 배치도 (Booth Placements)

프론트: `src/features/booth-layout/`, mock `src/mocks/booth-placements.ts`.
예약 진입 지도 picker v2 에서 핵심 사용처.

### 5.1 DB 스키마 힌트

`booth_placements` 테이블:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| booth_id | FK → booths | |
| date | DATE | 운영일 (YYYY-MM-DD) |
| section | ENUM('global','baekyang','hangeul') | 지도 이미지 구획 |
| booth_number | VARCHAR | 구역 내 번호 (UI 표시용) |
| x | NUMERIC(5,2) | 이미지 기준 중심점 x (0–100 %) |
| y | NUMERIC(5,2) | 이미지 기준 중심점 y (0–100 %) |
| width | NUMERIC(5,2) | 사각형 footprint 가로 (0–100 %) |
| height | NUMERIC(5,2) | 사각형 footprint 세로 (0–100 %) |

`width`/`height` 는 v2 설계에서 신규. 마이그레이션 별도 PR.

### 5.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/booth-placements?date=YYYY-MM-DD` | 특정 날짜의 전체 배치 | `boothlayout.read` — Super/Master, 그리고 예약 picker 가 `reservation.read` 컨텍스트에서도 조회 (읽기 권한 완화 검토) |
| GET   | `/booth-placements/by-booth/:boothId` | 특정 부스의 배치(한 부스가 여러 날짜 배치될 수도 있어 응답은 단건/배열 중 결정 필요) | 〃 |
| POST  | `/booth-placements` | 신규 배치 | `boothlayout.manage` |
| PATCH | `/booth-placements/:boothId/:date` | 좌표·크기 수정 | `boothlayout.manage` |
| DELETE | `/booth-placements/:boothId/:date` | 배치 삭제 | `boothlayout.manage` |

## 6. 예약 (Reservations)

프론트: `src/pages/reservation-management.tsx`, `reservation-booth-picker.tsx`, mock `src/mocks/reservations.ts`.

### 6.1 모델

```ts
{
  id: string,                      // 'RES001' 형태 유지 or 숫자 PK 결정 필요
  booth_id: number,
  time: string,                    // 'HH:mm'
  name: string,
  people: number,
  contact: string,                 // '010-xxxx-xxxx'
  status: 'waiting' | 'completed' | 'cancelled'
}
```

### 6.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/booths/:boothId/reservations` | 특정 부스 예약 전체 | `reservation.read` (Booth 는 본인 것만) |
| POST  | `/booths/:boothId/reservations` | 신규 예약 생성 | `reservation.manage` (또는 현장 접수용 별도 endpoint) |
| PATCH | `/reservations/:id/status` | 상태 전이. body: `{ status }` | `reservation.manage` + 본인 부스면 Booth 도 |
| DELETE | `/reservations/:id` | 예약 삭제 | `reservation.manage` |

### 6.3 집계 엔드포인트 (예약 picker v1 에서 사용 중)

picker 는 booth 별 `waiting` / `completed` / `cancelled` 카운트를 카드에 표시. 현재는 프론트에서 `mockReservations` 순회로 집계. 백엔드에서는 리스트 응답에 집계를 포함하거나 별도 엔드포인트로:

```
GET /booths/reservations/summary?date=YYYY-MM-DD
→ [{ booth_id, waiting, completed, cancelled }, ...]
```

## 7. 공연 (Performances)

프론트: `src/pages/performance-list.tsx`, `performance-management.tsx`, mock `src/mocks/performances.ts`.

### 7.1 모델

**리스트 아이템** (`PerformanceListItemDTO`) — 카드 그리드용, 가벼움

```ts
{
  team_id: number,
  team_name: string,
  date: string,                    // 'YYYY-MM-DD'
  stage: 'songdo' | 'baekyang' | 'nocheon',
  start_time: string,              // 'HH:mm'
  end_time: string,                // 'HH:mm'
  main_photo_url: string | null    // 대표 이미지 1장 URL
}
```

**상세** (`PerformanceDetailDTO`) — 편집 폼용

```ts
{
  team_id, team_name, description, instagram_url, youtube_url,
  date, stage, start_time, end_time,
  images: { id, url, is_main }[],
  setlist: { id, order, song_name, artist }[]
}
```

### 7.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/performances` | 전체 공연 리스트 (관객 페이지·admin 리스트 공용) | `performance.read` |
| GET   | `/performances/:teamId` | 단일 상세 | `performance.read` |
| GET   | `/performances/me` | Performer 의 자기 팀 상세 | `performance.update.own` — Performer |
| POST  | `/performances` | 신규 팀 등록 | `performance.manage` |
| PATCH | `/performances/:teamId` | 상세 수정 | 아래 7.3 참조 |
| DELETE | `/performances/:teamId` | 공연팀 삭제 | `performance.manage` |

### 7.3 편집 권한 세분화 (중요)

**타임테이블 필드**(`date`, `stage`, `start_time`, `end_time`)는 축제 운영 전체 스케줄의 절대값. Performer 가 임의로 바꾸면 안 된다.

- **Super/Master (`performance.manage`)**: 모든 필드 수정 가능
- **Performer (`performance.update.own`) — 본인 팀 한정**: `team_name`, `description`, `instagram_url`, `youtube_url`, `images`, `setlist` 만 수정 가능
- Performer 가 PATCH 페이로드에 타임테이블 필드 넣어 오면 **서버가 거절하거나 무시**. 프론트는 input 을 disabled 하지만 이중 가드 필수.

### 7.4 스테이지 정의

현재 프론트의 `PERFORMANCE_STAGES` 는 **임시값**:

| id | 레이블 | 운영일 |
|---|---|---|
| `songdo` | 송도 메인스테이지 | 2026-05-27 |
| `baekyang` | 백양로 메인스테이지 | 2026-05-28, 2026-05-29 |
| `nocheon` | 노천극장 | 2026-05-28, 2026-05-29 |

**실제 무대 구성이 확정되면 알려 주세요.** id/레이블/운영일 맵핑만 맞추면 DB enum + 프론트 union 둘 다 고쳐 배포.

## 8. 공연 후기 (Performance Reviews)

프론트: `src/pages/performance-review.tsx`, mock `src/mocks/performance-reviews.ts`.

### 8.1 모델

```ts
{
  id: number,
  performance_team: string,        // 팀명 (비정규화 저장? 또는 team_id FK?)
  favorite_song: string,
  message: string,
  created_at: string,              // 'YYYY-MM-DD HH:mm'
  is_hidden: boolean               // 운영진이 숨긴 후기
}
```

### 8.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/performance-reviews` | 전체 후기 목록 | `performancereview.read` |
| POST  | `/performance-reviews` | 관객이 후기 작성 (별도 공개 엔드포인트? 결정 필요) | — |
| PATCH | `/performance-reviews/:id/hide` | 숨김 토글. body: `{ is_hidden }` | `performancereview.manage` |
| DELETE | `/performance-reviews/:id` | 후기 삭제 | `performancereview.manage` |

## 9. 공지 (Notices)

프론트: `src/pages/notice.tsx`, mock `src/mocks/notices.ts`.

### 9.1 모델

```ts
{ id, title, content, date, has_image }
```

- 첨부 이미지는 URL 필드로 분리할지 `has_image` 플래그 + 별도 조회로 할지 결정 필요.

### 9.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/notices` | 공지 목록 | `notice.read` — 전체 역할 |
| POST  | `/notices` | 공지 등록 | `notice.manage` — Super/Master |
| PATCH | `/notices/:id` | 공지 수정 | `notice.manage` |
| DELETE | `/notices/:id` | 공지 삭제 | `notice.manage` |

## 10. 분실물 (Lost & Found)

프론트: `src/pages/lost-found.tsx`, mock `src/mocks/lost-items.ts`.

### 10.1 모델

```ts
{
  id, name, location, date,
  has_image: boolean,
  description?: string
}
```

### 10.2 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET   | `/lost-items` | 분실물 목록 | `lostfound.read` — Super/Master |
| POST  | `/lost-items` | 분실물 등록 | `lostfound.manage` |
| PATCH | `/lost-items/:id` | 수정 | `lostfound.manage` |
| DELETE | `/lost-items/:id` | 삭제 (수령 완료 등) | `lostfound.manage` |

## 11. 파일 업로드

부스 이미지, 공연팀 이미지, 공지 이미지, 분실물 이미지 등 여러 곳에서 필요.

- 스토리지 방식 결정 필요: S3 presigned URL · 직접 multipart · base64 임베딩.
- presigned URL 방식 선호 (프론트 payload 경량). 예:
  ```
  POST /uploads/sign  { filename, content_type }
  → { upload_url, public_url, fields }
  ```
- 프론트는 `public_url` 만 DB 에 저장되면 됨.

## 12. 권한 매트릭스 요약

`src/config/permissions.ts` 가 Single Source of Truth. 서버도 동일 매트릭스를 따르고 라우트 데코레이터 / 미들웨어로 강제해야 함.

| 권한 키 | Super | Master | Booth | Performer |
|---|---|---|---|---|
| `user.read` | ✓ | ✓ | | |
| `user.manage` | ✓ | | | |
| `user.deactivate` | ✓ | ✓ | | |
| `user.update.role` | ✓ | | | |
| `booth.read` | ✓ | ✓ | ✓ | |
| `booth.create` | ✓ | ✓ | | |
| `booth.update.any` | ✓ | ✓ | | |
| `booth.update.own` | | | ✓ | |
| `booth.delete` | ✓ | | | |
| `reservation.read` | ✓ | ✓ | ✓ | |
| `reservation.manage` | ✓ | ✓ | | |
| `performance.read` | ✓ | ✓ | | ✓ |
| `performance.manage` | ✓ | ✓ | | |
| `performance.update.own` | | | | ✓ |
| `notice.read` | ✓ | ✓ | ✓ | ✓ |
| `notice.manage` | ✓ | ✓ | | |
| `lostfound.read` | ✓ | ✓ | | |
| `lostfound.manage` | ✓ | ✓ | | |
| `boothlayout.read` | ✓ | ✓ | | |
| `boothlayout.manage` | ✓ | ✓ | | |
| `performancereview.read` | ✓ | ✓ | | |
| `performancereview.manage` | ✓ | ✓ | | |
| `admin.create` | ✓ | | | |

- **본인 자원 제한**: `*.update.own` 은 자원의 `user_id` 가 로그인 유저와 일치할 때만 허용.
- **Super 1인 고정**: Super 역할은 배포 시점 1명(시스템 오너). UI 에서 승격 경로 없음. DB level 제약 `UNIQUE WHERE role='Super'` 검토.

## 13. 축제 메타데이터 (기본값)

CLAUDE.md 에도 기록되어 있는 Single Source of Truth — 서버 seed/상수에 반영.

| 항목 | 값 |
|---|---|
| 공식 명칭 | 개교 제141주년 무악대동제 |
| 테마명 | `UNIT:Y` |
| 운영일 | 2026-05-26(블루런·화) · 27(송도·수) · 28(신촌·목) · 29(신촌·금) |

공연 스테이지/부스 섹션 운영일도 이 축에 맞춰 고정.

## 14. 우선순위 제안

1. **인증** (`/auth/login`, `/auth/me`, `/auth/logout`) — 로그인 없이 다른 화면 전개 불가
2. **유저 목록 + 로그인 활성/역할 변경** — Super/Master 의 첫 번째 관리 업무
3. **부스 프로필** (`/booths/me`, `/booths/:id`, PATCH) — Booth 계정 온보딩
4. **부스 배치도** — 예약 picker 가 의존. width/height 컬럼 마이그레이션 선행
5. **공연 리스트/상세** — 관객 페이지와 공용 데이터 (admin 은 CRUD 추가)
6. **예약** — 부스 운영 중 핵심 라이브 업무
7. **공지/분실물/공연 후기** — 정적 콘텐츠성. 마지막
8. **파일 업로드** — 2·3·5 에 종속. presigned URL 방식 확정 시점에 일괄 붙임

## 15. 미결정 · 결정 필요 항목 체크리스트

- [ ] 인증 방식: 세션 쿠키 vs JWT (기본 방향은 세션 쿠키)
- [ ] `users` 테이블 `user_id` 명명(로그인 아이디) 규칙 — 영문 최소 길이, 예약어 금지 등
- [ ] `user.active` 와 향후 `active_override` 확장 여부
- [ ] 비밀번호 정책 · 리셋 플로우 (1차 릴리스 범위 밖)
- [ ] 예약 ID 스키마 (`RES001` string vs 숫자 PK)
- [ ] 메뉴 `price` 필드 — 숫자 + 표기 포맷 분리 vs 문자열 유지
- [ ] 공연 스테이지 실제 구성 (현재 프론트는 `songdo`/`baekyang`/`nocheon` 3종 임시값)
- [ ] 공연 후기 `performance_team` 필드 — FK vs 비정규화 이름
- [ ] 이미지 업로드 방식 — S3 presigned URL 선호
- [ ] pagination 기본 `size` 값, 유저/부스/공연 중 적용 범위
- [ ] 타임스탬프 포맷 (ISO8601 vs `YYYY-MM-DD HH:mm`)
