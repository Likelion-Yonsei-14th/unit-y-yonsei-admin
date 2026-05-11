# API_SPEC

2026 연세대 대동제 〈UNIT:Y〉 어드민 SPA 가 호출하는 백엔드 API 명세 (1차 초안).

본 문서는 **프론트가 이미 정의해 둔 mock/real 분기 코드**(`src/features/<domain>/api.ts`, `types.ts`)에서 추출한 컨트랙트입니다. 백엔드 구현 시 이 문서를 기준선으로 삼고, 합의된 변경사항만 매퍼(`mapper.ts`)와 함께 갱신합니다.

- **Base URL**: `${VITE_API_BASE_URL}` (환경변수, 예: `/api/v1`)
- **컨벤션**: 요청/응답 바디 키는 모두 `snake_case`. 프론트 모델(`camelCase`)로의 변환은 도메인별 매퍼가 담당.
- **인증 전략**: `JwtStrategy` 가 기본(`Authorization: Bearer <access_token>`). `SessionCookieStrategy` 로 전환 시 쿠키(SameSite=Lax, HttpOnly) + `credentials: 'include'`. 상세 결정 사항은 [§ 인증 전략](#인증-전략) 참고.

---

## 목차

- [공통 규약](#공통-규약)
  - [공통 응답 포맷](#공통-응답-포맷)
  - [에러 포맷](#에러-포맷)
  - [페이지네이션](#페이지네이션)
  - [날짜·시간 표기](#날짜시간-표기)
  - [인증 전략](#인증-전략)
- [엔드포인트 요약](#엔드포인트-요약)
- [도메인별 상세](#도메인별-상세)
  - [Auth](#auth)
  - [Admin Users](#admin-users)
  - [Booths](#booths)
  - [Booth Placements](#booth-placements)
  - [Reservations](#reservations)
  - [Performances](#performances)
  - [Performance Reviews](#performance-reviews)
  - [Notices](#notices)
  - [Lost & Found](#lost--found)
- [권한 매트릭스](#권한-매트릭스)

---

## 공통 규약

### 공통 응답 포맷

성공 응답은 **컨테이너 없이 리소스 자체를 그대로** 반환합니다. (단건 = 객체, 다건 = 배열, 페이징 = `PageResponse<T>`)

```jsonc
// 단건
{ "id": 1, "name": "..." }

// 다건 (현재 미페이지네이션)
[ { "id": 1 }, { "id": 2 } ]

// 페이지네이션 (필요 시 도입)
{ "items": [...], "total": 123, "page": 1, "size": 20 }
```

### 에러 포맷

`src/types/api.ts` 의 `ErrorBody`:

```jsonc
{
  "message": "사람이 읽을 한국어 메시지",
  "code": "BOOTH_NOT_FOUND",            // optional 식별자
  "details": {                          // optional 필드 단위 폼 에러
    "userId": ["이미 사용 중인 ID 입니다."]
  }
}
```

| HTTP | 의미 | 프론트 처리 |
|---|---|---|
| 400 | 요청 형식/검증 오류 | `details` 가 있으면 폼 필드별 에러로 매핑 (`form.setError`) |
| 401 | 인증 만료/없음 | `onUnauthorized()` 콜백 발화 → 로그인 페이지 리다이렉트 |
| 403 | 권한 없음 | toast / 가드 컴포넌트가 빈 상태 |
| 404 | 리소스 없음 | 도메인별 처리 (대개 toast) |
| 409 | 충돌 (중복 등) | `code` 로 분기 |
| 422 | 비즈니스 룰 위반 | `details` + `message` |
| 500 | 서버 오류 | 공통 toast |

### 페이지네이션

현재 어드민 화면은 **부스/예약 수가 수백 건** 수준이라 list 엔드포인트는 **전부 비페이지** 입니다 (TanStack Query 클라이언트 측 필터/정렬). 추후 도입 시 `?page=1&size=20` 쿼리 파라미터 + `PageResponse<T>` 컨테이너로 전환합니다.

### 날짜·시간 표기

- **날짜**: `YYYY-MM-DD` (예: `2026-05-28`)
- **시간**: `HH:mm` (24h, 예: `18:00`)
- **타임스탬프**: ISO 8601 (예: `2026-05-04T12:34:56+09:00`)
- **TZ**: 서버는 KST(`Asia/Seoul`) 가정. 후기 등 통계용은 `created_at` 그대로 노출.
- **운영 일자 인덱스 (`int 1..4`)**: ERD 의 `부스.운영 일자` / `공연.공연 일자` 가 `1=5/26, 2=5/27, 3=5/28, 4=5/29` 매핑.
  - **API 응답은 `YYYY-MM-DD` 문자열로 통일**할지, 인덱스를 그대로 노출할지 합의 필요. (현재 프론트는 `YYYY-MM-DD` 만 사용 — 매퍼에서 변환 권장.)

### 인증 전략

1. **JWT (기본)**
   - 로그인 시 `access_token` (+선택 `refresh_token`) 발급 → 프론트 `JwtStrategy` 가 `localStorage` 에 저장 + 모든 요청에 `Authorization: Bearer ...` 헤더 첨부.
   - 만료 시 401 → `onUnauthorized` 발화 → `/login` 리다이렉트.
2. **세션 쿠키 (대안)**
   - 로그인 시 `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax`.
   - 프론트는 헤더 안 붙임. `credentials: 'include'` 로 자동 전송.
   - CSRF 토큰 별도 헤더(`X-CSRF-Token`) 또는 SameSite=Lax 의존.
   - **메모리상 백엔드 리드 결정 방향: 세션 쿠키.** (`project_auth_design_direction`)
3. 둘 다 `lib/auth-strategy.ts` 의 단일 export 만 바꾸면 프론트 전환 가능.

---

## 엔드포인트 요약

| 메소드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/auth/login` | guest | 로그인 |
| POST | `/auth/logout` | any | 로그아웃 |
| GET | `/auth/me` | any | 현재 사용자 정보 |
| GET | `/admin/users` | Super, Master | 어드민 계정 목록 |
| POST | `/admin/users` | Super | 어드민 계정 생성 |
| PATCH | `/admin/users/:id` | Super* | 역할 변경 |
| POST | `/admin/users/:id/reset-password` | Super, Master | 임시 비밀번호 재발급 |
| GET | `/booths` | Super, Master | 부스 목록 (전체) |
| GET | `/booths/me` | Booth | 내 부스 프로필 |
| PATCH | `/booths/me` | Booth | 내 부스 프로필 수정 |
| GET | `/booth-placements` | Super, Master | 날짜별 좌표 목록 |
| GET | `/booth-placements/by-booth/:boothId` | Super, Master, Booth(self) | 부스별 좌표 |
| POST | `/booth-placements` | Super, Master | 좌표 생성 |
| PUT | `/booth-placements/:id` | Super, Master | 좌표 갱신 |
| DELETE | `/booth-placements/:id` | Super, Master | 좌표 삭제 |
| POST | `/booth-placements/copy` | Super, Master | 날짜 간 복사 |
| DELETE | `/booth-placements` | Super, Master | (date,section) 일괄 삭제 |
| GET | `/reservations` | Super, Master, Booth(self) | 예약 목록 |
| PATCH | `/reservations/:id` | Booth(self), Super, Master | 단건 상태 변경 |
| PATCH | `/reservations` | Booth(self), Super, Master | 일괄 상태 변경 |
| GET | `/performances` | Super, Master, Performer | 공연 목록 |
| GET | `/performances/:teamId` | Super, Master, Performer(self) | 공연 상세 |
| GET | `/performances/me` | Performer | 내 공연 상세 |
| PUT | `/performances/:teamId` | Super, Master, Performer(self) | 공연 수정 |
| GET | `/performance-reviews` | Super, Master | 후기 목록 |
| PATCH | `/performance-reviews/:id` | Super, Master | 후기 숨김 토글 |
| DELETE | `/performance-reviews/:id` | Super, Master | 후기 삭제 |
| GET | `/notices` | any | 공지 목록 |
| POST | `/notices` | Super, Master | 공지 생성 |
| PUT | `/notices/:id` | Super, Master | 공지 수정 |
| DELETE | `/notices/:id` | Super, Master | 공지 삭제 |
| GET | `/lost-items` | Super, Master | 분실물 목록 |
| POST | `/lost-items` | Super, Master | 분실물 등록 |
| PUT | `/lost-items/:id` | Super, Master | 분실물 수정 |
| DELETE | `/lost-items/:id` | Super, Master | 분실물 삭제 |

\* `PATCH /admin/users/:id` 는 현재 `role` 변경 1종만 받음 — Super 단독 (`user.update.role`).

---

## 도메인별 상세

각 도메인은 다음 형식으로 기술합니다:
- **요청**: 메소드 + 경로 + 헤더/바디
- **응답**: HTTP 상태 + 바디 스키마 (`snake_case` DTO)
- **비고**: 권한·제약·관련 ERD 노트

### Auth

#### POST `/auth/login`

```jsonc
// Request
{
  "user_id": "super",
  "password": "super1234"
}

// 200 Response
{
  "access_token": "eyJ...",     // JWT 사용 시
  "refresh_token": "eyJ...",    // optional
  "user": {
    "id": 1,
    "user_id": "super",
    "role": "Super",            // "Super" | "Master" | "Booth" | "Performer"
    "name": "슈퍼어드민",
    "booth_id": 1,              // role=Booth 일 때만
    "performance_team_id": 16   // role=Performer 일 때만
  }
}

// 401 Response
{ "message": "아이디 또는 비밀번호가 올바르지 않습니다." }
```

**비고**
- 세션 쿠키 전략으로 가면 응답 바디에서 `access_token`/`refresh_token` 제거하고 `Set-Cookie` 헤더로 대체.
- `name` 필드는 ERD `관리자용페이지유저.대표자 이름` 으로부터 매핑 (백엔드 결정 시).

#### POST `/auth/logout`

- 헤더만, 바디 없음.
- **204 No Content**.
- 세션 쿠키 전략이면 `Set-Cookie: session=; Max-Age=0` 으로 만료.

#### GET `/auth/me`

```jsonc
// 200
{
  "id": 1,
  "user_id": "super",
  "role": "Super",
  "name": "슈퍼어드민",
  "booth_id": null,
  "performance_team_id": null
}
```

- 401 시 프론트가 자동 로그아웃 처리.

---

### Admin Users

ERD: `관리자용페이지유저` + (Booth 일 때) `부스`, (Performer 일 때) `공연`.

#### GET `/admin/users`

```jsonc
// 200
[
  {
    "id": 10,
    "user_id": "booth1",
    "role": "Booth",
    "affiliation": "문헌정보학과",
    "booth_id": 1,
    "booth_name": "문헌정보학과 호프",
    "performance_team_id": null,
    "performance_team_name": "-",
    "representative": "홍길동",
    "email": "",
    "phone": "010-0000-0000",
    "info_completed": true         // 백엔드가 booth/performance JOIN 으로 계산
  }
]
```

**비고**
- `info_completed` 는 **백엔드 계산 필드**: `role=Booth` 면 부스 프로필 필수 필드 + 대표 이미지 채워졌는지, `role=Performer` 면 공연 정보 채워졌는지.
- ERD `관리자용페이지유저.대표자 전화번호` → `phone` 매핑.

#### POST `/admin/users`

권한: **Super 만**.

```jsonc
// Request
{
  "user_id": "booth42",
  "temp_password": "tempPass1234",
  "affiliation": "전기전자공학부",
  "role": "Booth",                   // 'Super' | 'Master' | 'Booth' | 'Performer'
  "representative_name": "김대표",
  "representative_phone": "010-1234-5678",
  "booth_name": "전전 호프집",          // role=Booth 일 때 필수
  "performance_team_name": null,      // role=Performer 일 때 필수
  "internal_memo": "전기과 학생회"
}

// 201 Response
{ "id": 42, "user_id": "booth42" }

// 409 Response (user_id 중복)
{ "message": "이미 사용 중인 ID 입니다.", "code": "USER_ID_TAKEN" }
```

**비고**
- 백엔드는 `role=Booth/Performer` 인 경우 트랜잭션 안에서 **`booths` / `performances` 행도 함께 생성** 하고 FK 채워줌. (1:1 강제)
- 비밀번호는 임시 발급 후 첫 로그인 시 변경 강제 — 단, 비번 reset 플로우는 현 단계에서 미루기로 합의됨 (`feedback`/메모리).

#### PATCH `/admin/users/:id`

```jsonc
// Request — 역할 변경 (Super 만)
{ "role": "Master" }

// 200 Response
{ /* AdminUserDTO 전체 */ }

// 403 Response (Master 가 시도)
{ "message": "역할 변경은 슈퍼어드민만 가능합니다." }
```

#### POST `/admin/users/:id/reset-password`

권한: Super, Master (`user.password.reset`).

```jsonc
// Request — body 없음

// 200 Response
{ "temp_password": "Aq9KdEx2RtBz" }

// 404 Response
{ "message": "유저를 찾을 수 없습니다." }
```

**비고**
- 서버가 새 임시 비밀번호(예: 12자 영숫자) 를 생성해 해시 저장. 평문은 응답으로만 1회 노출, 운영자가 사용자에게 직접 전달.
- 사용자가 이 임시 비번으로 로그인하면 비밀번호 변경 강제 플래그가 켜진다 (정책 합의 시 컬럼/플로우 확정).
- 본인 자기 비밀번호 재발급 요청은 미지원 — 운영자에게 요청해서 풀리는 모델.

---

### Booths

ERD: `부스` + `부스 이미지` + `메뉴` + `지도 위치` (FK).

> 관리 도메인 `BoothProfile` 은 `부스` 행 + 자식 `부스 이미지[]` + `메뉴[]` 를 한 번에 묶어 내려주는 **집계 응답** 입니다. 부분 갱신은 PATCH 한 번으로 반영(자식 컬렉션 통째로 교체).

#### GET `/booths`

권한: Super, Master.

```jsonc
// 200 — BoothProfileDTO[]
[ { /* see GET /booths/me */ } ]
```

#### GET `/booths/me`

권한: Booth (자기 부스).

```jsonc
// 200
{
  "id": 1,
  "name": "문헌정보학과 호프",
  "organization_name": "문헌정보학과 학생회",
  "description": "...",
  "signature_menu": "단무지 호프",
  "operating_hours": "18:00 ~ 23:00",
  "reservation_enabled": true,
  "order_notice": "현금 결제 우선 안내",
  "thumbnails": [
    { "id": 100, "url": "https://...", "is_main": true }
  ],
  "menu_items": [
    {
      "id": 200,
      "order": 1,
      "name": "감자튀김",
      "description": "바삭한 핸드컷",
      "price": "5,000원",
      "image": "https://...",
      "sold_out": false
    }
  ]
}

// 200 — 작성 전 상태 (대표자 등록 직후)
null
```

#### PATCH `/booths/me`

```jsonc
// Request — 부분 패치 가능. 자식 컬렉션은 통째로 교체.
{
  "description": "변경된 설명",
  "menu_items": [ /* 전체 메뉴 */ ]
}

// 200 — 갱신된 BoothProfileDTO 전체
```

**비고**
- `price` 가 문자열인 이유: "5,000원" 표기를 그대로 보여주는 게 기획 합의 사항. 정수 변환은 결제 도입 시 재논의.
- 대표 이미지는 `thumbnails[].is_main` 가 정확히 0개 또는 1개 이어야 함 (백엔드 검증 필요).

---

### Booth Placements

ERD: 직전 논의대로 `지도 위치` 통합 또는 `booth_placements` 분리. 본 문서는 **분리안** 기준으로 작성. 통합으로 가면 경로/필드만 조정.

#### GET `/booth-placements?date=YYYY-MM-DD`

권한: Super, Master.

```jsonc
// 200
[
  {
    "id": 1,
    "booth_id": 7,
    "date": "2026-05-28",
    "section": "baekyang",        // "global" | "baekyang" | "hangeul"
    "booth_number": "B-12",
    "x": 45.5,                    // 0~100 % (사각형 중심)
    "y": 32.1,
    "width": 6.0,                 // 0~100 %
    "height": 4.5
  }
]
```

#### GET `/booth-placements/by-booth/:boothId`

- 한 부스가 가진 모든 placement (날짜·섹션별 N개).
- 권한: Super/Master 또는 본인 부스 (Booth(self)).

#### POST `/booth-placements`

```jsonc
// Request
{
  "booth_id": 7,
  "date": "2026-05-28",
  "section": "baekyang",
  "booth_number": "B-12",
  "x": 45.5, "y": 32.1, "width": 6.0, "height": 4.5
}

// 201 — BoothPlacementDTO

// 409 — 같은 (date, section) 에 booth_number 중복
{ "message": "이미 2026-05-28 baekyang 에 부스번호 \"B-12\" 가 존재합니다." }
```

#### PUT `/booth-placements/:id`

- 전체 교체 (id 만 path, 나머지 필드는 바디).

#### DELETE `/booth-placements/:id` → 204

#### POST `/booth-placements/copy`

```jsonc
// Request
{ "from_date": "2026-05-28", "to_date": "2026-05-29", "section": "baekyang" }

// 200 — 복사된 placement[]
```

**비고**: `to_date` 의 같은 section 행은 **모두 삭제 후 from_date 의 행으로 덮어쓰기**. 트랜잭션 안에서 처리.

#### DELETE `/booth-placements?date=&section=` → 204

(date, section) 단위 일괄 삭제.

---

### Reservations

ERD: `예약`.

#### GET `/reservations`

권한:
- Super/Master → 전체.
- Booth → 자기 부스 것만 (서버 측 필터).

```jsonc
// 200
[
  {
    "id": "r-1",
    "booth_id": 7,
    "time": "19:00",
    "name": "김예약",
    "people": 4,
    "contact": "010-1111-2222",
    "status": "waiting"           // "waiting" | "completed" | "cancelled"
  }
]
```

#### PATCH `/reservations/:id`

```jsonc
// Request
{ "status": "completed" }

// 200 — ReservationDTO
```

#### PATCH `/reservations` (벌크)

```jsonc
// Request
{ "ids": ["r-1", "r-2"], "status": "cancelled" }

// 200 — ReservationDTO[]
```

**비고**
- 엔드포인트가 단건 PATCH 와 컬렉션 PATCH 를 같은 prefix 로 공유 — 라우팅 충돌 없도록 백엔드는 `:id` 와 컬렉션을 구분해야 함 (Spring 의 경우 `/{id}` vs `/`).
- ERD 권장: `UNIQUE(booth_id, reservation_number)`, `party_size > 0` CHECK, `status` enum.

---

### Performances

ERD: `공연` + `공연 이미지` + `셋리스트`.

#### GET `/performances`

권한: Super, Master, Performer.

```jsonc
// 200 — 경량 리스트 아이템
[
  {
    "team_id": 16,
    "team_name": "BTL",
    "date": "2026-05-28",
    "stage": "baekyang",          // "songdo" | "baekyang" | "nocheon"
    "start_time": "18:00",
    "end_time": "19:00",
    "main_photo_url": "https://..." // null 가능
  }
]
```

**비고**: `stage` enum 은 프론트 임시 — 실제 무대 구성 확정 시 ERD `지도 위치` 의 `위치 구분` 매핑값과 sync 필요.

#### GET `/performances/:teamId`

```jsonc
// 200 — 상세
{
  "team_id": 16,
  "team_name": "BTL",
  "description": "...",
  "instagram_url": "https://...",
  "youtube_url": "https://...",
  "date": "2026-05-28",
  "stage": "baekyang",
  "start_time": "18:00",
  "end_time": "19:00",
  "images": [
    { "id": 1, "url": "https://...", "is_main": true }
  ],
  "setlist": [
    { "id": 1, "order": 1, "song_name": "...", "artist": "..." }
  ]
}
```

**ERD 노트**: 직전 논의에서 `공연 이미지`/`셋리스트` 의 PK 가 `공연 id` 단독이라 1:N 깨짐 — 자체 `id` PK 추가가 선결 조건. 위 응답은 `id` 가 있다고 가정.

#### GET `/performances/me`

- Performer 가 자기 팀 상세 조회.

#### PUT `/performances/:teamId`

- 전체 교체. 프론트는 `Partial<PerformanceDetail>` 을 보내며 `mapper.fromPerformanceDetailPatch` 가 변환.
- 자식 컬렉션 (`images`, `setlist`) 도 통째로 교체.

---

### Performance Reviews

ERD: 별도 테이블 필요 (현재 ERD 미반영 — 추가 필요).

권장 스키마:
```sql
CREATE TABLE performance_reviews (
  id              bigint PRIMARY KEY,
  performance_id  bigint NOT NULL REFERENCES performances(id),
  performance_team varchar(100),    -- 비정규화 캐시 (옵션)
  favorite_song   varchar(100),
  message         text,
  is_hidden       boolean NOT NULL DEFAULT false,
  created_at      datetime NOT NULL
);
```

#### GET `/performance-reviews`

```jsonc
// 200
[
  {
    "id": 1,
    "performance_team": "BTL",
    "favorite_song": "...",
    "message": "최고였어요",
    "created_at": "2026-05-28 19:30",
    "is_hidden": false
  }
]
```

#### PATCH `/performance-reviews/:id`

```jsonc
// Request
{ "is_hidden": true }
```

#### DELETE `/performance-reviews/:id` → 204

---

### Notices

ERD: 신규 테이블 필요. 권장 스키마:

```sql
CREATE TABLE notices (
  id          bigint PRIMARY KEY,
  title       varchar(100) NOT NULL,
  content     text NOT NULL,
  date        date NOT NULL,         -- 등록 일자
  has_image   boolean NOT NULL DEFAULT false,
  created_at  datetime NOT NULL,
  updated_at  datetime NOT NULL
);
```

#### GET `/notices`

```jsonc
// 200
[
  {
    "id": 1,
    "title": "...",
    "content": "마크다운 본문",
    "date": "2026-05-04",
    "has_image": false
  }
]
```

#### POST `/notices`

```jsonc
// Request
{ "title": "...", "content": "...", "has_image": false }

// 201 — NoticeDTO
```

#### PUT `/notices/:id` → NoticeDTO
#### DELETE `/notices/:id` → 204

**비고**
- `content` 는 마크다운 (프론트는 미리보기 렌더링 지원).
- `has_image` 는 카드뉴스 첨부 여부 — 실제 이미지 URL 은 별도 업로드 엔드포인트 + 별도 컬럼/관계로 분리할지 결정 필요.

---

### Lost & Found

ERD: 신규 테이블 필요. 권장 스키마:

```sql
CREATE TABLE lost_items (
  id          bigint PRIMARY KEY,
  name        varchar(100) NOT NULL,
  location    varchar(100) NOT NULL,
  description text,
  date        date NOT NULL,
  has_image   boolean NOT NULL DEFAULT false,
  created_at  datetime NOT NULL,
  updated_at  datetime NOT NULL
);
```

#### GET `/lost-items`

```jsonc
[
  {
    "id": 1,
    "name": "검정색 우산",
    "location": "백양로 중앙무대 앞",
    "date": "2026-05-28",
    "has_image": true,
    "description": "..."
  }
]
```

#### POST `/lost-items` → LostItemDTO
#### PUT `/lost-items/:id` → LostItemDTO
#### DELETE `/lost-items/:id` → 204

---

## 권한 매트릭스

`src/config/permissions.ts` 의 액션 단위 매트릭스를 백엔드 인가 로직의 **단일 진실** 로 사용합니다. 백엔드는 같은 키를 가진 enum/매핑을 두고 컨트롤러에 어노테이션 또는 미들웨어로 적용.

| 액션 키 | Super | Master | Booth | Performer |
|---|:-:|:-:|:-:|:-:|
| `user.read` | ✓ | ✓ | | |
| `user.manage` | ✓ | | | |
| `user.update.role` | ✓ | | | |
| `user.password.reset` | ✓ | ✓ | | |
| `admin.create` | ✓ | | | |
| `booth.read` | ✓ | ✓ | ✓ | |
| `booth.create` | ✓ | ✓ | | |
| `booth.update.any` | ✓ | ✓ | | |
| `booth.update.own` | | | ✓ | |
| `booth.delete` | ✓ | | | |
| `reservation.read` | ✓ | ✓ | ✓(self) | |
| `reservation.manage` | ✓ | ✓ | | |
| `performance.read` | ✓ | ✓ | | ✓ |
| `performance.manage` | ✓ | ✓ | | |
| `performance.update.own` | | | | ✓ |
| `notice.read` | ✓ | ✓ | ✓ | ✓ |
| `notice.manage` | ✓ | ✓ | | |
| `lostfound.read` / `.manage` | ✓ | ✓ | | |
| `boothlayout.read` / `.manage` | ✓ | ✓ | | |
| `performancereview.read` / `.manage` | ✓ | ✓ | | |

`*(self)` 표시는 본인이 보유한 리소스에 한해 허용 — 백엔드는 토큰의 `sub`/`booth_id`/`performance_team_id` 와 path/body 의 식별자를 비교해 검증.

---

## TODO / 합의 필요 항목

> 본 명세 채택 전 백엔드 리드와 결정해야 할 항목.

1. **인증 전략 최종 확정** — JWT vs 세션 쿠키. (메모리상 세션 쿠키 방향)
2. **운영 일자 표기** — API 응답에 `int 1..4` 인덱스 vs `YYYY-MM-DD` 문자열 — 후자 권장.
3. **이미지 업로드 엔드포인트** — `POST /uploads` (multipart) → `{ url }` 반환하는 공통 엔드포인트 둘 것인지. 부스/공지/공연 모두 image_url 만 들고 있음.
4. **공연 stage enum vs ERD `지도 위치` 매핑** — 프론트 `'songdo' | 'baekyang' | 'nocheon'` 와 ERD 의 `지도 위치 id` 어떻게 sync.
5. **`info_completed` 계산 시점** — 매 요청 JOIN vs 캐시 컬럼.
6. **벌크 PATCH `/reservations` 라우팅 충돌** — 단건 `:id` 와 컬렉션 동일 prefix. `/reservations/bulk` 같은 sub-path 분리 권장.
7. **공지/분실물의 has_image 외 실제 이미지 URL 모델** — 별도 테이블 vs 단일 컬럼.
