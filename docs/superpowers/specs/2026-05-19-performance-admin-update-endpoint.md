# 운영진 공연 수정 엔드포인트 spec — `PATCH /api/admin/performances/{id}`

> 작성일: 2026-05-19 · 대상 레포: `unit-y-yonsei-server` (백엔드) + `unit-y-yonsei-admin` (프론트)
> 관련: `PerformanceAdminController`, 프론트 `features/performances`, `performance-management.tsx`

## 배경

공연 타임테이블(공연일·시작/종료 시간·장소)과 공연 상태(SCHEDULED/ONGOING/
ENDED/CANCELED/HIDDEN)는 축제 운영 스케줄의 핵심인데, **현재 운영진이 이를
수정할 방법이 없다.**

- 백엔드 공연 쓰기 엔드포인트는 `PATCH /admin/performances/me`(공연팀 본인용) 하나뿐.
- 운영진이 *임의 팀*의 공연을 수정하는 엔드포인트가 없다.
- 그래서 프론트 `performance-management.tsx`도 `/performance/:teamId`(운영진이
  특정 팀을 보는 라우트)에서 편집 모드를 못 연다 — `canEdit = isMe && ...` 라
  `:teamId` 라우트에선 항상 false. 타임테이블/상태 필드는 `canEditTimetable`
  (`performance.manage` 게이트)이 사실상 영원히 false 라 읽기 전용.
- 결과: 타임테이블은 **계정 생성 시점**(create-admin 폼의 공연일/스테이지/시간)에만
  입력 가능하고, 그 이후엔 어디서도 못 고친다. 공개(HIDDEN→공개) 전환도 불가.

→ 운영진이 임의 팀 공연을 사후 수정하는 엔드포인트를 신설한다.

## 엔드포인트

```
PATCH /api/admin/performances/{id}
```

- 컨트롤러: `PerformanceAdminController` 에 메서드 추가
- 권한: 클래스 레벨은 `@RequireAdminRole({PERFORMER, SUPER})` 이지만 이 메서드는
  운영진 전용 — 메서드 레벨 `@RequireAdminRole({SUPER, MASTER})` 로 오버라이드.
- `{id}` = 수정할 Performance id. 없으면 `404 P-006 (Performance not found)`.

### 요청

**기존 `PerformanceUpdateRequest` 를 그대로 재사용한다.** `/me` PATCH 와 동일한
부분 갱신(non-null 필드만 반영) 시맨틱.

```
PerformanceUpdateRequest {
  Long            locationId
  String          performanceName          (@Size max 100)
  String          performanceDescription
  Integer         performanceDate           (@Min @Max — 아래 주석)
  LocalTime       startTime
  LocalTime       endTime
  PerformanceCategory performanceCategory
  String          lineupName               (@Size max 100)
  String          hashtag1 / hashtag2 / hashtag3  (@Size max 6, 공백만 불가)
  String          youtubeUrl / instagramUrl
  PerformanceStatus performanceStatus       (SCHEDULED/ONGOING/ENDED/CANCELED/HIDDEN)
}
```

운영진 수정의 핵심 대상은 `performanceDate` · `startTime` · `endTime` ·
`locationId` · `performanceStatus` 지만, DTO 를 분리하지 않고 `/me` 와 동일한
것을 재사용해 매퍼·검증을 일원화한다. (운영진은 콘텐츠 필드도 수정 가능 — 무방.)

> ⚠️ `PerformanceUpdateRequest.performanceDate` 는 현재 `@Min(1) @Max(4)` 인데
> 축제 일차 정의(`FestivalDayService`)는 `2~4` 다. 계정 생성 쪽
> `validatePerformerRequest` 는 `2~4` 로 이미 수정됨(bac-97). 일관성을 위해
> `PerformanceUpdateRequest.performanceDate` 도 `@Min(2) @Max(4)` 로 좁히길 권장.

### 응답

공통 봉투 `ApiResponse<T>`. `data` 는 수정된 공연 — `/me` 와 동일하게
`PerformanceMyResponse`(또는 `PerformanceDetailResponse`) 반환. 프론트가 응답으로
캐시를 갱신한다.

### 권한 / 검증

- `SUPER`, `MASTER` 만 호출 가능 (`performance.manage` 에 대응).
- `{id}` 미존재 → `404 P-006`.
- 시간 검증은 `/me` 와 동일 규칙 — start < end (둘 다 있을 때).

## 구현 메모 (백엔드)

- `PerformanceAdminController` 에 `@PatchMapping("/{id}")` 추가, 메서드 레벨
  `@RequireAdminRole({SUPER, MASTER})`.
- 서비스: 기존 `/me` 업데이트 로직(부분 갱신)을 id 로 조회하는 버전으로 분기 —
  `performanceRepository.findById(id).orElseThrow(P-006)` 후 동일 업데이트 적용.
  `/me` 는 currentAdmin 으로 조회, `{id}` 는 path id 로 조회 — 그 차이만.

## 프론트 정합 (백엔드 머지 후)

`features/performances`:

1. `api.ts` — `updatePerformanceReal(id, patch)` 가 `PATCH /admin/performances/{id}`
   호출. mock 도 동형 반영.
2. `hooks.ts` — `useUpdatePerformance(id)` 신설(`/me` 의 `useUpdateMyPerformance`
   와 별개). `onSuccess` 시 `['performances', id]` 캐시 갱신.
3. `performance-management.tsx` — `/performance/:teamId` 라우트에서 운영진
   (`performance.manage`)이 편집 모드 진입 가능하도록 `canEdit` 조건 확장:
   현재 `canEdit = isMe && canEditPerformance(...)` →
   `isMe` 경로는 `useUpdateMyPerformance`, `:teamId` 경로는 운영진이면
   `useUpdatePerformance(id)` 를 쓰도록 저장 경로 분기.
   - `canEditTimetable` 은 그대로 `performance.manage` 게이트 — 단 이제
     `:teamId` 라우트에서 운영진에게 실제로 true 가 된다.
   - 콘텐츠(본문/이미지/셋리스트) 편집을 운영진에게도 열지는 별도 판단 —
     이미지·셋리스트는 `/me` 전용 sub-resource 엔드포인트라 범위 외. 운영진
     `:teamId` 편집은 **타임테이블·상태 위주**로 한정하는 게 현실적.

## 미해결 / 후속

- 운영진이 `:teamId` 에서 콘텐츠까지 수정하려면 이미지·셋리스트의 운영진용
  엔드포인트(`/admin/performances/{id}/images` 등)도 필요 — 이번 범위 외.
  우선은 타임테이블·상태 수정만 연다.
- HIDDEN↔공개 전환을 공연팀에게도 열지(공연팀 자율 게시)는 제품 결정 —
  열면 공연팀 폼에 "공개 여부" 토글을 별도로 추가. 이 spec 은 운영진 경로만 다룬다.
