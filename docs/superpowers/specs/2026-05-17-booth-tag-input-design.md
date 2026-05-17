# 부스 태그 입력 기능 설계

작성일: 2026-05-17

## 배경

부스 상세 정보(어드민, `booth-info-form.tsx`)에 부스를 분류·검색하기 위한 태그를
입력받는다. 태그는 이용자 페이지에서 부스 성격을 빠르게 파악하게 하는 메타데이터다.

대응 백엔드 작업(별도, BE 고선태): `BoothProfileDTO`에 `tags` 필드 추가,
저장 시 각 태그가 `#`로 시작하는지 문자열 검사 로직 추가.

## 요구사항

- 부스당 태그 **최대 3개**.
- 각 태그 내용(`#` 제외)은 **1~6자**. 저장/표시값은 `#` 포함 최대 7자.
- 입력 시 자동으로 `#` 접두사 부착. 저장값은 `#` 포함 문자열(예: `"#먹거리"`).
- 태그는 **선택 항목** — 작성 완료 판정(`isBoothInfoCompleted`)에 포함하지 않는다.

## 데이터 모델 — `features/booths/types.ts`

- `BoothProfile`에 `tags: string[]` 추가. 각 원소는 `#` 포함 문자열.
- `BoothProfileDTO`에 `tags: string[]` 추가 (snake/camel 동일 → 변환 불필요).
- `mapper.ts`의 `toBoothProfile`에 `tags: d.tags` 추가.
- `isBoothInfoCompleted` 변경 없음.

## 신규 컴포넌트 — `features/booths/components/booth-tag-input.tsx`

Controlled 컴포넌트.

```
interface Props {
  value: string[];                       // #포함 태그 배열
  onChange: (next: string[]) => void;
}
```

### 레이아웃

- 칩(chip) 목록 + 텍스트 입력창이 같은 영역에 흐른다.
- 각 칩: 태그 문자열 + `✕` 제거 버튼.
- 입력창 옆/아래에 `현재개수/3` 카운터.
- 태그 3개가 차면 입력창 비활성 + 안내 문구.

### 확정(commit) 동작

- 구분자 **Enter / 쉼표(`,`) / 스페이스** 입력 시 현재 텍스트를 칩으로 확정.
- 붙여넣기도 같은 구분자로 토큰 분리해 일괄 처리.
- blur 시점 확정은 하지 않는다 (Enter/구분자만).

### 정규화 & 검증 (토큰 단위)

1. 토큰 앞쪽의 `#`·공백을 모두 제거해 **내용**을 얻는다.
2. 내용이 비어 있으면 → 조용히 무시.
3. 내용 길이 > 6자 → 거부 + `toast.error`.
4. 내용에 단일 `#`를 붙여 최종 태그 생성 (`#내용`).
5. 기존 태그와 완전일치(중복) → 무시 + `toast`.
6. 총 개수가 3을 초과하게 되면 → 3개까지만 수용, 나머지는 `toast`로 알림.
- 입력창 자체에 `maxLength`(여유 포함)로 1차 방어, 토큰 분리 시 길이를 재검증한다.
- 스페이스가 구분자이므로 태그 내부 공백은 불가능. 그 외 문자는 제한하지 않는다.

## `booth-info-form.tsx` 통합

- `tags` state 추가: `useState<string[]>(booth.tags)`.
- `booth` refetch hydrate `useEffect`에 `setTags(booth.tags)` 추가.
- **부스 소개글 다음, 부스 이미지 앞**에 태그 섹션 배치.
  - 편집 모드: `<BoothTagInput value={tags} onChange={setTags} />`.
  - 읽기 모드: 칩 나열. 비어 있으면 `"등록된 태그가 없습니다."` (다른 빈 필드와 동일 톤).
- `handleSave`의 mutation payload에 `tags` 추가.

## Mock — `mocks/booth-profile.ts`

- 30개 `BoothProfile` 리터럴 전부에 `tags` 추가 (`reservationEnabled` 줄 뒤 삽입).
- 데모 부스에는 실제 태그를 채운다:
  - id 1 (`filledBooth`): `["#먹거리", "#치킨"]`
  - id 3 (`secondFilledBooth`, 경영학과 푸드트럭): `["#먹거리", "#햄버거"]`
  - id 2 (`emptyBooth`): `[]`.
  - 그 외: `[]`.

## 스타일

- DS 시맨틱 토큰만 사용 (Tailwind 기본 색상 금지).
- 칩: `bg-muted text-foreground` 둥근 pill.
- 제거 버튼: `text-muted-foreground hover:text-destructive`.
- 입력창은 폼의 다른 input과 동일한 `border-border` / `focus:ring-ring` 스타일.

## 범위 밖

- 태그 기반 검색/필터 UI.
- 태그 자동완성·추천.
- 이용자 페이지 렌더링 (별도 작업).
