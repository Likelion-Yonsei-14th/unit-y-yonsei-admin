# 어드민 목록 응답에 `representativePhone` 추가 spec

> 작성일: 2026-05-20 · 대상 레포: `unit-y-yonsei-server` (백엔드)
> 관련: `AdminUserListResponse`, 프론트 `features/users`, `user-management.tsx`

## 배경

어드민(유저) 관리 페이지의 테이블은 **전화번호 컬럼**을 노출한다. 하지만 그
화면이 쓰는 목록 응답 `AdminUserListResponse`에는 전화번호 필드가 없다.

- 목록 응답: `GET /api/admin/users` → `AdminUserListResponse` — `representativeName`만 있고
  `representativePhone` **없음**.
- 상세 응답: `GET /api/admin/users/{id}` → `AdminUserDetailResponse` — `representativePhone`
  **있음**.
- 그 결과 프론트 `toAdminUser` 매퍼는 `phone`을 빈 문자열로 채울 수밖에 없어
  테이블의 전화번호 칸이 항상 비어 보인다.

유저 관리 화면은 행마다 상세를 따로 부르지 않는 **평면 테이블**이라, 전화번호를
보여주려면 목록 응답이 그 값을 함께 내려줘야 한다. 상세 응답엔 이미 있으므로
엔티티엔 데이터가 있다 — 목록 DTO에 한 필드만 추가하면 된다.

## 변경 대상

`AdminUserListResponse` (`domain/auth/dto/AdminUserListResponse.java`) 한 파일.

### 1) 필드 추가

`representativeName` 다음에 `representativePhone` 필드를 추가한다.

```java
private String representativeName;
@Schema(description = "대표자 전화번호", example = "010-1234-5678")
private String representativePhone;
@Schema(description = "정보 작성 완료 여부", example = "false")
private boolean infoCompleted;
```

`@AllArgsConstructor(access = PRIVATE)`라 생성자는 필드 순서대로 자동 갱신된다.

### 2) `from()` 팩토리에 매핑 추가

생성자 인자 순서에 맞춰 `adminUser.getRepresentativePhone()`을 끼워 넣는다.

```java
return new AdminUserListResponse(
        adminUser.getId(),
        adminUser.getLoginId(),
        adminUser.getOrganization(),
        adminUser.getRole().name(),
        adminUser.getStatus().name(),
        adminUser.getRepresentativeName(),
        adminUser.getRepresentativePhone(),   // ← 추가
        infoCompleted,
        linkedBooths == null ? null : linkedBooths.stream()
                .map(LinkedBoothSummary::from)
                .toList(),
        linkedPerformance == null ? null : LinkedPerformanceSummary.from(linkedPerformance)
);
```

`AdminUser` 엔티티에 `getRepresentativePhone()`은 이미 있다(상세 응답
`AdminUserDetailResponse.from`이 동일하게 쓰고 있음).

## 응답 예시

```json
{
  "id": 1,
  "loginId": "munjeong_01",
  "organization": "문헌정보학과",
  "role": "BOOTH",
  "status": "ACTIVE",
  "representativeName": "정민호",
  "representativePhone": "010-1234-1234",
  "infoCompleted": true,
  "linkedBooths": [{ "id": 1, "name": "문헌정보학과 부스" }]
}
```

## 검증 / 영향

- 호환성: 필드 **추가**라 기존 소비자에 비파괴적.
- `@JsonInclude(NON_NULL)`이 클래스에 걸려 있으므로, `representativePhone`이
  `null`인 계정은 키가 생략된다 — 프론트는 이미 `?? ''`로 방어한다.
- 권한·엔드포인트 변경 없음. `GET /api/admin/users` 그대로.

## 프론트 정합 (백엔드 머지 후)

`features/users`는 **변경 불필요** — 이미 배선돼 있다.

- `AdminUserDTO.representativePhone?: string` 필드 존재(2026-05-20 dev `c717fbf`).
- `toAdminUser`가 `phone: d.representativePhone ?? ''`로 읽는다.

백엔드가 이 필드를 내려주기 시작하면 유저 관리 테이블의 전화번호가 곧바로
채워진다 — 프론트 배포 없이 동작한다.

## 후속 (선택)

- `memo`도 같은 사정(목록엔 없고 상세엔 있음)이다. 유저 관리 테이블이 memo를
  쓰지 않으므로 이번 범위에선 제외 — 목록 카드/툴팁에 memo를 노출할 계획이
  생기면 같은 패턴으로 추가하면 된다.
