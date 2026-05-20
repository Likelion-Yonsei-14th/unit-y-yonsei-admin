# 로그인 응답에 `boothId`/`performanceTeamId` 추가 spec

> 작성일: 2026-05-20 · 대상 레포: `unit-y-yonsei-server` (백엔드)
> 관련: `AdminLoginResponse`, `CurrentAdminUserResponse`, 프론트 `features/auth`,
> `features/booths` (`useMyBooth`)

## 배경 / 증상

운영 중 보고: **Booth 역할 계정으로 첫 로그인 시 `/booth` 페이지가 무한 로딩,
새로고침하면 정상.**

원인 확인(2026-05-20, Railway 기준):

```
POST /api/admin/auth/login (booth1)
→ {"adminUserId":2,"loginId":"booth1","organization":"컴과","role":"BOOTH",
   "status":"ACTIVE","representativeName":"우우우"}
   (boothId·performanceTeamId 없음)

GET /api/admin/auth/me (같은 세션)
→ {... "boothId":1, "performanceTeamId":null}
   (boothId 있음)
```

→ **`AdminLoginResponse` 와 `CurrentAdminUserResponse` 가 다른 shape.**

프론트 영향:

- 프론트는 두 응답을 같은 DTO(`AdminAuthDTO`)로 다룬다(타입 코멘트에 "동일 형태"라
  명시) → 로그인 응답으로 받은 user 의 `boothId` 가 `null`.
- `useMyBooth` 의 `enabled: user.role === 'Booth' && user.boothId != null` gate 가
  영원히 false → TanStack Query v5 가 `isPending: true` 유지 → 무한 스피너.
- 새로고침 시 앱 부트스트랩이 `/me` 를 호출해 `boothId` 가 채워지면서 해결.

> 프론트엔 방어 패치를 먼저 적용함(dev `<commit>`): 로그인 mutation 안에서
> `/me` 를 한 번 더 호출해 완전한 user 로 store 채움. 동작은 회복되지만, 백엔드가
> 두 응답을 정렬하면 이 추가 round-trip 이 불필요해진다 — 본 spec 의 목적.

## 변경 대상

`AdminLoginResponse` (`domain/auth/dto/AdminLoginResponse.java`) 한 파일이면 충분.
구조적으로 `CurrentAdminUserResponse` 와 동일하게 맞춘다.

### 1) 필드 추가

```java
private String representativeName;
@Schema(description = "Booth 역할일 때 본인 부스 ID, 아니면 null", example = "1", nullable = true)
private Long boothId;
@Schema(description = "Performer 역할일 때 본인 공연팀 ID, 아니면 null", example = "1", nullable = true)
private Long performanceTeamId;
```

`@AllArgsConstructor(access = PRIVATE)` 라 생성자는 필드 순서대로 자동 갱신.

### 2) `from(...)` 팩토리

`CurrentAdminUserResponse.from` 이 이미 `boothId`/`performanceTeamId` 를 채우는
로직(어드민에 연결된 Booth/Performance 조회)을 갖고 있을 것 — 그 로직을 그대로
재사용한다. 두 응답이 같은 데이터를 같은 방식으로 채우게 정렬.

가장 간단한 방법은 **두 클래스를 통합**(둘 다 같은 필드라 분리 의의가 없음)
또는 `AdminLoginResponse.from(...)` 시그니처를 `CurrentAdminUserResponse.from(...)`
과 동일하게 맞추고 호출부(`AdminAuthController` 의 login service)에서 같은
booth/performance lookup 결과를 넘긴다.

선호: **통합**. 두 응답이 의미상 같다(현재 로그인한 어드민의 스냅샷). 클래스 둘로
유지할 이유가 없고 향후 또 한쪽만 필드가 추가되는 drift 도 방지된다.

### 3) (선택) 클래스 통합 시

`AdminLoginResponse` 를 `CurrentAdminUserResponse` 로 대체하거나, 공통 부모/별칭으로.
컨트롤러 반환 타입과 OpenAPI 스키마만 갱신.

## 검증

- 호환성: 필드 **추가**라 기존 소비자에 비파괴적.
- `@JsonInclude(NON_NULL)` 가 클래스에 걸려 있다면 Super/Master 처럼 boothId/
  performanceTeamId 가 null 인 응답에선 키 자체가 빠질 수 있다 — 프론트는 이미
  `?? null` 로 방어.
- 권한·엔드포인트 변경 없음. `POST /api/admin/auth/login` 그대로.

## 응답 예시 (적용 후)

```json
// booth1 로그인
{
  "adminUserId": 2,
  "loginId": "booth1",
  "organization": "컴과",
  "role": "BOOTH",
  "status": "ACTIVE",
  "representativeName": "우우우",
  "boothId": 1,
  "performanceTeamId": null
}
```

## 프론트 정합 (백엔드 머지 후)

`features/auth` 는 **변경 불필요** — 이미 `boothId ?? null`/`performanceTeamId ?? null`
로 매핑 중. 백엔드가 정렬되면 `useLogin` 의 `/me` 추가 round-trip 은 사실상 redundant
가 된다 — 그대로 둬도 동작은 정상(보험), 제거하고 싶으면 `useLogin.mutationFn` 의
`fetchMe()` 호출만 빼면 된다.

## 후속 (선택)

- `Authenticated*` 응답 통일: `LogoutResponse` 등 다른 인증 응답도 한 번 훑어
  같은 drift 가 없는지 확인.
