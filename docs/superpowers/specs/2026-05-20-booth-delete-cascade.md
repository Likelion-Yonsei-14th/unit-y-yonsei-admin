# 부스 삭제 시 자식 행 cascade 정리 spec

> 작성일: 2026-05-20 · 대상 레포: `unit-y-yonsei-server` (백엔드)
> 관련: `BoothService.delete`, `BoothAdminController`, 프론트 `user-management.tsx`

## 증상

유저 관리 페이지에서 Booth 어드민 계정 삭제 → A-014 → "부스도 함께 삭제" cascade
컨펌 진행 → `DELETE /api/admin/booths/{id}` 가 **실패** → FE 토스트 "부스 삭제에
실패해 계정도 삭제하지 못했습니다."

## 원인

`BoothService.delete(id)` 가 자식 행 정리 없이 곧장 `boothRepository.delete(booth)`
호출. 부스 자식 테이블(`Menu`, `Reservation`, `BoothImage`)은 모두
`booth_id NOT NULL FK` 로 Booth 를 참조한다. Booth 엔티티에 `@OneToMany cascade`
도 설정돼 있지 않다.

자식이 1행이라도 있으면 DB 가 `ConstraintViolationException` 을 던지고,
`GlobalExceptionHandler` 의 generic `@ExceptionHandler(Exception.class)` 가 잡아
500 으로 응답.

## 변경 대상

### `BoothService.delete(id)` — 자식 정리 추가

```java
@Transactional
public void delete(Long id) {
    Booth booth = boothRepository.findById(id)
            .orElseThrow(() -> new BusinessException(BoothErrorCode.BOOTH_NOT_FOUND));

    // Booth 엔티티에 cascade 가 없어 자식 행을 직접 정리.
    reservationRepository.deleteByBoothId(id);
    menuRepository.deleteByBoothId(id);
    boothImageRepository.deleteByBoothId(id);

    boothRepository.delete(booth);
}
```

`BoothService` 의 의존성 주입에 `MenuRepository`·`ReservationRepository`·
`BoothImageRepository` 를 추가.

### 각 Repository 에 파생 쿼리 선언 (미존재 시)

```java
// MenuRepository
void deleteByBoothId(Long boothId);

// ReservationRepository
void deleteByBoothId(Long boothId);

// BoothImageRepository
void deleteByBoothId(Long boothId);
```

JPA 가 파생 메서드명에서 자동 구현. `@Modifying @Query` 명시 불필요.

### (선택) 어드민 계정 삭제 cascade 까지 합치는 옵션

FE 가 부스 → 어드민 두 번의 DELETE 요청을 보내는 현재 구조를 유지해도 되지만,
운영상 더 깔끔한 방향은 `AdminUserService.delete(adminUserId)` 가 BOOTH 역할일 때
자동으로 부스도 삭제하는 것 — A-014 자체를 없애고 컨펌만 FE 에서. 이번 spec
범위 외(데이터 손실 위험이 크니 별도 결정).

## 검증

- 메뉴 0개·예약 0개·이미지 0개 부스: 기존에도 삭제 성공 — 회귀 없음.
- 자식 행 있는 부스: 자식 함께 삭제. 트랜잭션 안이라 중간 실패 시 전부 롤백.
- 응답: `200 OK`, `data: null` 그대로.

## 프론트 정합 (백엔드 머지 후)

`features/booths` 는 **변경 불필요** — FE 의 cascade 흐름(부스 → 어드민 순)이
백엔드 자식 정리만 기다리고 있었다. 백엔드 머지 후 유저 관리 페이지의 cascade
삭제가 그대로 동작.

## 후속

- 다른 도메인 동일 패턴 검토: Performance 삭제 시에도 같은 종류의 자식
  (PerformanceImage, Setlist, CheerMessage) 정리가 필요할 수 있다. 본 spec
  범위 외이지만 운영 마지막에 정리하려면 같은 패턴 적용.
