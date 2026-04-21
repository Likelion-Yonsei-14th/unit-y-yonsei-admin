# 디자인 토큰 가이드

**Source**: 멋쟁이사자처럼 연세대학교 14기 · 2026 대동제 디자인 시스템
**Font**: SUIT Variable · **Letter-spacing**: 전역 -2%

## 사용 원칙

> **1순위**: shadcn 시맨틱 토큰 (`bg-primary`, `text-foreground`, `border`) — 다크모드 자동 대응
> **2순위**: 디자인 시스템 원시 토큰 (`bg-ds-blue-500`) — 의도가 명확할 때
> **3순위**: Tailwind 기본 색상 (`bg-blue-500`) — **지양**. 브랜드 일관성 깨짐.

페이지를 짤 때는 거의 모든 색상이 1순위로 해결돼야 합니다. 예외적으로 상태 구분(error/warning/success)이나 특정 포인트 색상이 필요할 때만 2순위로 내려가세요.

---

## 1. 브랜드 컬러

현재 어드민 **메인 = Primary Blue**. `--primary`가 가리키는 값.

| Token | Hex | Tailwind | 용도 |
|---|---|---|---|
| `--ds-primary` | `#1E53FF` | `bg-ds-primary` | 메인 브랜드, 주요 CTA |
| `--ds-primary-pressed` | `#153BB5` | `bg-ds-primary-pressed` | hover/active 상태 |
| `--ds-primary-subtle` | `#E9EEFF` | `bg-ds-primary-subtle` | 선택 배경, 알림 배경 |

### Secondary A (Violet)
보조 강조 / 일부 포인트 / 차트 2번째 시리즈.

| Token | Hex | Tailwind |
|---|---|---|
| `--ds-secondary-a` | `#7052FF` | `bg-ds-secondary-a` |
| `--ds-secondary-a-pressed` | `#503AB5` | `bg-ds-secondary-a-pressed` |
| `--ds-secondary-a-subtle` | `#F1EEFF` | `bg-ds-secondary-a-subtle` |

### Secondary B (Pink)
행사 활기 강조용. 어드민에서는 **특별 이벤트/통계 하이라이트** 정도에만.

| Token | Hex | Tailwind |
|---|---|---|
| `--ds-secondary-b` | `#FF40A5` | `bg-ds-secondary-b` |
| `--ds-secondary-b-pressed` | `#B52D75` | `bg-ds-secondary-b-pressed` |
| `--ds-secondary-b-subtle` | `#FFECF6` | `bg-ds-secondary-b-subtle` |

---

## 2. 시맨틱 상태

| 상태 | default | pressed | subtle | 용도 |
|---|---|---|---|---|
| Error | `#FF5A36` | `#B52E10` | `#FFF0EC` | 삭제 경고, 에러 메시지, `destructive` |
| Warning | `#FFB020` | `#B57000` | `#FFF8E0` | 주의 필요 항목 |
| Success | `#00C070` | `#007A46` | `#E0FFF3` | 성공 토스트, 완료 배지 |

Tailwind: `bg-ds-error`, `bg-ds-warning-subtle`, `text-ds-success-pressed` …

`destructive` 시맨틱 토큰은 error와 매핑됨 → shadcn Button의 `variant="destructive"` 는 `--ds-error` 사용.

---

## 3. 텍스트

| Token | Hex | Tailwind | 용도 |
|---|---|---|---|
| `--ds-text-primary` | `#1F242C` | `text-foreground` | 본문 기본 |
| `--ds-text-secondary` | `#4A5568` | `text-muted-foreground` | 보조 설명 |
| `--ds-text-disabled` | `#ACB1BA` | `text-ds-text-disabled` | 비활성 텍스트 |
| `--ds-text-inverse` | `#FFFFFF` | `text-primary-foreground` | 진한 배경 위 텍스트 |

---

## 4. 배경 & 테두리

| Role | Token | Hex | Tailwind |
|---|---|---|---|
| 기본 배경 | `--ds-bg-primary` | `#FFFFFF` | `bg-background` |
| 보조 배경 (섹션) | `--ds-bg-secondary` | `#EDEEF0` | `bg-muted` |
| 3차 배경 (비활성 영역) | `--ds-bg-tertiary` | `#C7CAD0` | `bg-ds-bg-tertiary` |
| 기본 테두리 | `--ds-border-default` | `#EDEEF0` | `border` |
| 강조 테두리 | `--ds-border-strong` | `#C7CAD0` | `border-ds-border-strong` |
| 포커스 링 | `--ds-border-focus` | `#1E53FF` | `ring` |

---

## 5. Gray Scale

11단계(0~900). 본격적인 UI 구성보다는 그림자/구분선/보조 텍스트에 쓰세요.

| Token | Hex |
|---|---|
| `ds-gray-0` | `#FFFFFF` |
| `ds-gray-50` | `#EDEEF0` |
| `ds-gray-100` | `#C7CAD0` |
| `ds-gray-200` | `#ACB1BA` |
| `ds-gray-300` | `#868D9A` |
| `ds-gray-400` | `#6E7786` |
| `ds-gray-500` | `#4A5568` |
| `ds-gray-600` | `#434D5F` |
| `ds-gray-700` | `#353C4A` |
| `ds-gray-800` | `#292F39` |
| `ds-gray-900` | `#1F242C` |

Tailwind: `bg-ds-gray-50`, `text-ds-gray-600` 등.

## 6. Brand Color Scale

브랜드 3색 각 50~900 전체 스케일 제공. 차트/하이라이트/gradient에 활용.

- **Blue**: `ds-blue-50` ~ `ds-blue-900` (500이 main `#1E53FF`)
- **Violet**: `ds-violet-50` ~ `ds-violet-900` (500이 main `#7052FF`)
- **Pink**: `ds-pink-50` ~ `ds-pink-900` (500이 main `#FF40A5`)

---

## 7. 타이포그래피

`SUIT Variable` 폰트. Letter-spacing 전역 -2%.

| Token | Size | Weight | Line-height | 유틸리티 클래스 |
|---|---|---|---|---|
| display | 28px | 800 (ExtraBold) | 120% | `.ds-display` |
| heading-1 | 24px | 700 (Bold) | 120% | `.ds-heading-1` |
| heading-2 | 20px | 700 (Bold) | 130% | `.ds-heading-2` |
| heading-3 | 17px | 600 (SemiBold) | 130% | `.ds-heading-3` |
| body-1 | 15px | 500 (Medium) | 150% | `.ds-body-1` |
| body-2 | 14px | 400 (Regular) | 150% | `.ds-body-2` |
| caption | 12px | 400 (Regular) | 150% | `.ds-caption` |
| label | 11px | 500 (Medium) | 150% | `.ds-label` |

**Base font-size**: `--font-size: 15px` (body-1 기준)

사용 예:
```tsx
<h1 className="ds-display">2026 대동제 어드민</h1>
<h2 className="ds-heading-1">부스 관리</h2>
<p className="ds-body-1">참여 부스 목록을 관리합니다.</p>
<span className="ds-caption">최근 수정일 · 2026.04.20</span>
```

---

## 8. Radius (모서리)

shadcn 기본. `--radius: 0.625rem` (10px).

| 유틸리티 | 값 |
|---|---|
| `rounded-sm` | 6px |
| `rounded-md` | 8px |
| `rounded-lg` | 10px |
| `rounded-xl` | 14px |

---

## 9. 실전 예시

### 버튼
```tsx
// 기본 버튼 = Primary Blue
<Button>저장</Button>

// 파괴적 동작 (삭제, 비활성화 등)
<Button variant="destructive">삭제</Button>

// 보조/취소
<Button variant="outline">취소</Button>
```

### 상태 배지
```tsx
<span className="bg-ds-success-subtle text-ds-success-pressed px-2 py-0.5 rounded-md ds-caption">
  활성
</span>
<span className="bg-ds-error-subtle text-ds-error-pressed px-2 py-0.5 rounded-md ds-caption">
  비활성
</span>
<span className="bg-ds-warning-subtle text-ds-warning-pressed px-2 py-0.5 rounded-md ds-caption">
  대기중
</span>
```

### 페이지 헤더
```tsx
<header className="border-b border-border bg-background px-8 py-6">
  <h1 className="ds-heading-1 text-foreground">유저 관리</h1>
  <p className="ds-body-2 text-muted-foreground mt-1">
    대동제 참여 유저를 조회하고 관리합니다
  </p>
</header>
```

### 차트 팔레트
```tsx
const colors = [
  'var(--chart-1)', // Blue 500
  'var(--chart-2)', // Violet 500
  'var(--chart-3)', // Pink 500
  'var(--chart-4)', // Success
  'var(--chart-5)', // Warning
];
```

---

## 10. 다크모드 (잠정)

디자인 시스템에 다크 토큰이 명시되지 않았음 → 현재는 **Gray Scale 반전 + Primary 톤다운**으로 임시 구현.
디자인팀 합의되면 `theme.css`의 `.dark` 블록 업데이트 필요.

## 11. 기여 규칙

- 새로운 색상을 하드코딩하지 말 것 (예: `bg-[#1E53FF]` 금지)
- 매번 먼저 **시맨틱 토큰**으로 해결 가능한지 확인
- 시맨틱으로 안 되면 `bg-ds-*` 원시 토큰
- **디자인 시스템에 없는 값이 필요**하면 `theme.css`의 `:root` 섹션에 `--ds-*` 추가 후 `@theme inline`에 매핑 → 문서에도 추가
