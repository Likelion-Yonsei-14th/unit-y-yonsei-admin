# 운영진의 임의 공연 삭제 엔드포인트 spec — `DELETE /api/admin/performances/{id}`

> 작성일: 2026-05-20 · 대상 레포: `unit-y-yonsei-server` (백엔드)
> 관련: `PerformanceAdminController`, 프론트 `user-management.tsx` (A-016 cascade)

## 배경 / 증상

운영진(Super)이 유저 관리에서 Performer 어드민 계정을 삭제하려 하면 백엔드가
**A-016 `ADMIN_HAS_OWNED_PERFORMANCES`** 로 거부한다. 부스 어드민의 A-014 와
같은 가드 패턴.

문제는 부스 쪽 흐름은 cascade(`DELETE /admin/booths/{id}` 호출 후 어드민 재
삭제)로 풀려 있는데, 공연 쪽은 **운영진이 임의 공연을 삭제할 엔드포인트
자체가 없다** — 현재 `PerformanceAdminController` 의 DELETE 는
`@DeleteMapping("/me")` 한 개뿐(Performer 본인이 자기 공연 삭제). Super 가
이 경로로 호출하면 Super 자신의 공연을 지우려 들거나(없으면 404), 의도와 다른
대상을 건드린다.

→ 운영진용 임의 공연 삭제 엔드포인트를 신설한다. 부스의 `bac-109` PR 패턴
(자식 가드)도 동일하게 적용.

## 엔드포인트

```
DELETE /api/admin/performances/{id}
```

- 컨트롤러: `PerformanceAdminController` 에 메서드 추가.
- 권한: 클래스 레벨이 `@RequireAdminRole({PERFORMER, SUPER})` 라면 메서드 레벨
  `@RequireAdminRole({SUPER, MASTER})` 로 오버라이드 — 운영진 전용.
- 응답: `ApiResponse<Void>` (204 No Content 또는 200 OK + null).
- 404 P-006 — 존재하지 않는 공연.

## 자식 가드 (부스 B-006/007/008 패턴 재사용)

부스에서 자식 행(예약/메뉴/공지) 있을 때 400 거부하는 패턴을 공연에도 적용.
운영자가 데이터를 먼저 정리한 뒤 재시도하도록.

`PerformanceErrorCode` 에 추가:

```java
PERFORMANCE_HAS_IMAGES(HttpStatus.BAD_REQUEST, "P-009",
    "이미지가 있어 공연을 삭제할 수 없습니다. 먼저 이미지를 정리해주세요."),
PERFORMANCE_HAS_SETLISTS(HttpStatus.BAD_REQUEST, "P-010",
    "셋리스트가 있어 공연을 삭제할 수 없습니다. 먼저 셋리스트를 정리해주세요."),
PERFORMANCE_HAS_CHEER_MESSAGES(HttpStatus.BAD_REQUEST, "P-011",
    "응원 메시지가 있어 공연을 삭제할 수 없습니다. 먼저 응원 메시지를 정리해주세요."),
```

각 child 컬렉션의 어떤 자식이 있는지에 따라 어떤 코드를 던질지 결정.

## 구현 메모 (백엔드)

```java
@Transactional
public void delete(Long id) {
    Performance performance = performanceRepository.findById(id)
            .orElseThrow(() -> new BusinessException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    if (performanceImageRepository.existsByPerformanceId(id)) {
        throw new BusinessException(PerformanceErrorCode.PERFORMANCE_HAS_IMAGES);
    }
    if (setlistRepository.existsByPerformanceId(id)) {
        throw new BusinessException(PerformanceErrorCode.PERFORMANCE_HAS_SETLISTS);
    }
    if (cheerMessageRepository.existsByPerformanceId(id)) {
        throw new BusinessException(PerformanceErrorCode.PERFORMANCE_HAS_CHEER_MESSAGES);
    }

    performanceRepository.delete(performance);
}
```

각 자식 Repository 에 `boolean existsByPerformanceId(Long performanceId)` 파생
쿼리 추가(미존재 시).

## 검증

- 호환성: 기존 `DELETE /admin/performances/me` 와 별개 — 비파괴적 추가.
- 자식 0 개 공연: 삭제 성공 (204 또는 200).
- 자식 있는 공연: 해당 자식 종류에 따라 P-009/010/011 으로 400, 자식 정리 후
  재시도 시 성공.

## 프론트 정합 (백엔드 머지 후)

`features/performances`:

1. `api.ts` — `deletePerformance(id)` real(`DELETE /admin/performances/{id}`) +
   mock 추가.
2. `hooks.ts` — `useDeletePerformance` — 성공 시 `['performances']` invalidate.
3. `user-management.tsx` — `confirmDelete` 의 `onError` 분기에 A-014 와 같은
   패턴으로 A-016 추가:
   ```ts
   if (err.body?.code === 'A-016' && target.performanceTeamId != null) {
     setPendingDeleteWithPerformance(target);
     return;
   }
   ```
   별도 `pendingDeleteWithPerformance` AlertDialog 와 `confirmDeleteWithPerformance`
   핸들러. 토스트는 BE 메시지(P-009/010/011) 그대로 surface — 부스와 동일 패턴.

## 후속 / 선택

- 부스·공연 cascade UX 가 거의 동형이므로 공용 컴포넌트로 추출 가능 — 이번 범위
  외이지만 두 번 더 다루게 되면 묶는 게 깔끔.
- BoothImage·Notice 처럼 공연에서도 자식 종류를 결정할 때 운영진의 정리 동선이
  자연스러운지 점검 필요 — 예약은 부스 관리 페이지에 있지만, 셋리스트는 공연
  편집 페이지의 sub-resource 라 정리하는 흐름이 다를 수 있다.
