# 모바일 반응형 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 SPA의 모바일 반응형을 페이지별 등급(1급=부스/공연팀 진입 폴리시, 2급=운영진 깨짐 차단, 3급=데스크톱-only fallback)으로 일괄 정리.

**Architecture:** 모든 변경은 className 조정. spec(`docs/superpowers/specs/2026-05-07-mobile-responsive-design.md`)이 정의한 표준 어휘(`p-4 md:p-8`, `flex flex-wrap`, `grid-cols-1 sm:grid-cols-2`, `overflow-x-auto + min-w-[NNNpx]`)만 사용. 새 컴포넌트/추상화 안 만듦.

**Tech Stack:** Tailwind v4 (sm 640 / md 768 / lg 1024), React 19, shadcn/ui (수정 금지). 검증은 `pnpm typecheck` + `pnpm dev` 시각 확인.

**Spec 출처:** `docs/superpowers/specs/2026-05-07-mobile-responsive-design.md` (commit 62d5519)

**참고**: 본 작업에는 TDD 단위 테스트가 적합하지 않음 — 모든 변경이 className 이라 단위 테스트로 검증할 의미가 없고, 시각 회귀 테스트도 본 프로젝트에 없음. 검증은 (1) `pnpm typecheck` 통과, (2) `pnpm dev` 띄우고 mock 계정으로 실 진입해 시각 확인, 두 단계로만.

---

## 사전 셋업 (Task 시작 전 1회)

```bash
pnpm install
cp .env.example .env.local  # 이미 있으면 생략. VITE_USE_MOCK=true 확인
pnpm dev                     # 다른 터미널에서 띄워두면 모든 task 의 visual verify 에 재사용
```

브라우저 DevTools Device Toolbar 에서 다음 폭 토글 가능하게:
- **375px** (iPhone SE, 가장 좁은 현행 폰)
- **414px** (iPhone Pro Max)
- **768px** (md breakpoint 경계)
- **1024px** (lg breakpoint 경계)

---

## Phase 1 — Mobile-1급 폴리시

### Task 1: login mock 힌트 박스 가독 보강

**Files:**
- Modify: `src/pages/login.tsx:95-120`

**상황:** `VITE_USE_MOCK=true` 일 때만 노출되는 힌트 박스. `font-mono` + 약 16줄. iPhone SE(375px) 에서 한국어 + 영어 + `· 인기 · 다일 운영` 같이 길어진 줄이 양옆으로 잘릴 위험. 운영 환경에선 안 보이므로 비파괴적.

- [ ] **Step 1: Read 현재 mock 힌트 박스**

이미 spec/플랜 작성 시 확인 — `src/pages/login.tsx:95-120`. font-mono 텍스트 16줄 모음. 폭 변환 외 변경 불필요.

- [ ] **Step 2: text size 와 word-break 보강**

```tsx
// src/pages/login.tsx:99-119 의 <div className="ds-caption text-warning... font-mono"> 블록 className
// 기존:
//   <div className="ds-caption text-ds-warning-pressed space-y-0.5 font-mono">
// 변경:
//   <div className="text-[11px] sm:text-xs text-ds-warning-pressed space-y-0.5 font-mono break-words">
```

Edit:
```
old_string: <div className="ds-caption text-ds-warning-pressed space-y-0.5 font-mono">
new_string: <div className="text-[11px] sm:text-xs text-ds-warning-pressed space-y-0.5 font-mono break-words">
```

- [ ] **Step 3: typecheck**

Run: `pnpm typecheck`
Expected: clean (no errors)

- [ ] **Step 4: visual verify**

브라우저에서 `http://localhost:5173/login` 을 375px / 414px 로 보고:
- 힌트 박스 안 텍스트가 양쪽으로 잘리지 않는지
- 너무 빽빽하지 않은지 (sm 이상에선 기존 size 유지)

- [ ] **Step 5: Commit**

```bash
git add src/pages/login.tsx
git commit -m "fix(responsive): login mock 힌트 박스 좁은 폭 가독성

text-[11px] sm:text-xs + break-words — 375px 폰에서 한·영 혼용 줄이
양옆으로 잘리던 문제 해결. 운영 환경(VITE_USE_MOCK=false)에선 미노출이라
영향 없음."
```

---

### Task 2: booth-management — 폼 헤더 wrap + 메뉴 행 stack

**Files:**
- Modify: `src/features/booths/components/booth-info-form.tsx:125`
- Modify: `src/features/booths/components/menu-list-form.tsx:92`
- Modify: `src/features/booths/components/menu-list-form.tsx:178` (view-mode 메뉴 행)
- Modify: `src/features/booths/components/draggable-menu-item.tsx:46-49` (edit-mode 메뉴 행)

**상황:**
- BoothInfoForm/MenuListForm 의 inner 헤더(line 125, 92): H2 + 편집/저장 + 이전으로 버튼 — `flex items-center justify-between` 만 있어 좁은 폰에서 H2 와 버튼 그룹이 충돌.
- MenuListForm view-mode 메뉴 행(line 178): `flex items-center gap-4` 안에 순번 / 썸네일(w-20 h-20) / flex-1 컨텐츠 / 품절 버튼. 좁은 폰에서 컨텐츠가 너무 압축됨.
- DraggableMenuItem(line 47): drag handle / 순번 / 썸네일(w-20 h-20) / flex-1 inputs / sold-out toggle / delete 버튼 — 한 줄에 6열. iPhone SE 폭에서 거의 사용 불가.

- [ ] **Step 1: BoothInfoForm 헤더 wrap**

Edit `src/features/booths/components/booth-info-form.tsx`:
```
old_string:       <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">부스 상세 정보</h2>
new_string:       <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-foreground">부스 상세 정보</h2>
```

- [ ] **Step 2: MenuListForm 헤더 wrap**

Edit `src/features/booths/components/menu-list-form.tsx`:
```
old_string:       <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">메뉴 리스트</h2>
new_string:       <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-foreground">메뉴 리스트</h2>
```

- [ ] **Step 3: MenuListForm view-mode 메뉴 행 — sm 이하 stack**

좁은 폭에서는 종방향 stack 하고 sm 이상에서만 가로 정렬.

Edit `src/features/booths/components/menu-list-form.tsx`:
```
old_string:             <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted">
new_string:             <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg bg-muted">
```

같은 파일 thumbnail 박스의 `flex-shrink-0` 는 stack 시 중앙 정렬에 어울리지 않으므로 wrapper 만 변경. 내부 구조는 `flex-1` 등이 그대로 작동.

- [ ] **Step 4: DraggableMenuItem 행 — sm 이하 stack**

Edit `src/features/booths/components/draggable-menu-item.tsx:45-49`:
```
old_string:     <div
      ref={(node) => preview(drop(node))}
      className={`flex items-center gap-4 p-4 border border-border rounded-lg transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:border-primary`}
    >
new_string:     <div
      ref={(node) => preview(drop(node))}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-border rounded-lg transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:border-primary`}
    >
```

- [ ] **Step 5: typecheck**

Run: `pnpm typecheck`
Expected: clean

- [ ] **Step 6: visual verify**

`booth1` / `booth1234` 로 로그인 → `/booth` → "부스 상세 정보" 카드 클릭 → 편집 모드. 그 다음 "메뉴 리스트" 카드 클릭 → 편집 모드.

375px 에서 확인:
- 두 폼 헤더(H2 + 버튼들)가 두 줄로 자연스럽게 wrap
- 메뉴 리스트 view 모드 / 편집 모드 모두 메뉴 한 행이 종방향 stack 되는지
- 썸네일 + 입력 + 컨트롤이 겹치지 않는지

- [ ] **Step 7: Commit**

```bash
git add src/features/booths/components/booth-info-form.tsx src/features/booths/components/menu-list-form.tsx src/features/booths/components/draggable-menu-item.tsx
git commit -m "fix(responsive): 부스 폼 헤더 wrap + 메뉴 행 모바일 stack

(1) BoothInfoForm/MenuListForm inner 헤더 flex-wrap + gap-3
(2) 메뉴 행(view+edit) 모바일에선 flex-col, sm 이상에서만 row
375px 에서 한 줄에 5~6 열을 욱여넣던 cramped 케이스 해결."
```

---

### Task 3: performance-management — 헤더 알림 영역 분리 + setlist 행 stack

**Files:**
- Modify: `src/pages/performance-management.tsx:298-353` (헤더 우측 영역)
- Modify: `src/pages/performance-management.tsx:687-722` (셋리스트 행)

**상황:**
- 헤더 우측 그룹(line 298): `flex items-center gap-3` 안에 편집/저장/취소 버튼 + mutation 에러 alert + 성공 토스트 모두 inline. parent 헤더 행이 이미 `flex-wrap` 이지만 우측 그룹 자체가 alert 박스를 inline 으로 들고 있어 좁은 폭에서 자기 자식들끼리 충돌.
- 셋리스트 행(line 687-722): `flex items-center gap-4` — 인덱스 카드(w-10 h-10) + flex-1(grid 1/2 cols) + 삭제 버튼. 좁은 폭에서 grid 가 1열로 stack 되긴 하지만, 인덱스 카드 + 삭제 버튼이 좌우에 단단해 cramped.

- [ ] **Step 1: 헤더 우측 그룹 — 알림은 별도 줄로**

mutation 알림(에러/성공) 박스를 헤더와 같은 행에 두지 않도록 격리. 우측 버튼 그룹만 헤더 우측에 두고, 알림은 헤더 행 아래로 이동.

먼저 헤더 우측의 alert/toast 두 블록을 헤더 외부, "공연팀 프로필" 카드 위로 분리. 헤더 마크업은 버튼만 남긴다.

Edit (헤더 알림/토스트 두 블록 제거):
```
old_string:           {/* 저장 실패 — toast 가 거짓말하지 않도록, 실제 mutation 결과만 노출. */}
          {updateMutation.isError && (
            <div
              role="alert"
              className="flex items-center gap-2 px-4 py-3 bg-ds-error-subtle border border-destructive text-destructive rounded-lg shadow-lg"
            >
              <X size={14} />
              <span className="font-medium">저장에 실패했습니다. 잠시 후 다시 시도해주세요.</span>
            </div>
          )}

          {/* Save Success Toast — 실 mutation 성공 시에만 발화 */}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-ds-success-subtle border border-ds-success text-ds-success-pressed rounded-lg shadow-lg animate-fade-in">
              <div className="w-6 h-6 bg-ds-success rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
              <span className="font-medium">저장이 완료되었습니다!</span>
            </div>
          )}
        </div>
      </div>
new_string:         </div>
      </div>

      {/* 저장 실패/성공 알림 — 헤더와 별도 줄로 분리. flex-wrap 의 우측 그룹 안에 alert
          박스를 넣으면 좁은 폰에서 버튼+alert 가 같은 줄에 욱여 들어가 가독성↓. */}
      {updateMutation.isError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-ds-error-subtle border border-destructive text-destructive rounded-lg shadow-sm"
        >
          <X size={14} />
          <span className="font-medium">저장에 실패했습니다. 잠시 후 다시 시도해주세요.</span>
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-ds-success-subtle border border-ds-success text-ds-success-pressed rounded-lg shadow-sm animate-fade-in">
          <div className="w-6 h-6 bg-ds-success rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
          <span className="font-medium">저장이 완료되었습니다!</span>
        </div>
      )}
```

- [ ] **Step 2: 셋리스트 행 — 모바일 stack**

Edit `src/pages/performance-management.tsx` 셋리스트 행 (line 688-690 부근):
```
old_string:             <div
              key={item.id}
              className="flex items-center gap-4 p-4 border border-border rounded-lg hover:border-primary transition-colors"
            >
new_string:             <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-border rounded-lg hover:border-primary transition-colors"
            >
```

- [ ] **Step 3: typecheck**

Run: `pnpm typecheck`
Expected: clean

- [ ] **Step 4: visual verify**

`performer1` / `perf1234` 로 로그인 → `/performance/me` 자동 이동. 편집 모드 진입.

375px 에서 확인:
- 페이지 헤더의 H1 + 편집/저장/취소 버튼이 wrap 자연스러움
- 저장 시도 실패 알림(저장 한 번 누르고 mutation 강제 fail 시뮬레이션 어려우면 시각만 확인)이 헤더 아래 별도 줄로 떨어지는지
- 셋리스트 한 행이 stack — 인덱스 + 곡명/원곡자 + 삭제 버튼 종방향

- [ ] **Step 5: Commit**

```bash
git add src/pages/performance-management.tsx
git commit -m "fix(responsive): 공연 관리 헤더 알림 분리 + 셋리스트 행 stack

(1) mutation 에러/성공 알림을 헤더 우측 inline 에서 헤더 다음 줄로 이동
   — flex-wrap 우측 그룹 안에 alert 박스가 들어가면 좁은 폰에서 충돌
(2) 셋리스트 행 sm 이하 flex-col — 인덱스/입력/삭제가 종방향으로"
```

---

### Task 4: reservation-booth-picker — map-section-tabs / booth-slider 검증

**Files:**
- Verify (no edit expected): `src/pages/reservation-booth-picker.tsx`
- Verify: `src/features/booth-layout/components/booth-map-picker.tsx`
- Verify: `src/features/booth-layout/components/map-section-tabs.tsx`
- Verify: `src/features/booth-layout/components/booth-slider.tsx`
- Possible modify: `src/features/booth-layout/components/booth-map-picker.tsx:70` (px-6 → px-4 md:px-6)

**상황:** map-section-tabs 는 이미 `flex flex-wrap` ✓, booth-slider 는 이미 snap-x scroll ✓, picker 헤더는 `px-6 py-3` 으로 모바일에서 살짝 빡빡할 수 있음.

- [ ] **Step 1: picker 헤더 padding 모바일 축소**

Edit `src/features/booth-layout/components/booth-map-picker.tsx:70`:
```
old_string:       <div className="border-b border-border bg-background px-6 py-3">
new_string:       <div className="border-b border-border bg-background px-4 md:px-6 py-3">
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: clean

- [ ] **Step 3: visual verify — 핵심 UI 동작 점검**

`booth1` / `booth1234` 로 로그인 → 자동으로 `/booth` (DefaultLanding 이 Booth → /booth). 사이드바에서 "예약 관리" → `/reservations` 진입.

375px 에서 확인:
- 상단 날짜 탭(1~3개) + 섹션 탭(있다면) 이 한 줄 또는 두 줄로 wrap
- 캔버스가 화면 폭에 맞춰 종횡비 보존
- 슬라이더가 캔버스 위에 absolute 오버레이로 자연 축소
- 좌/우 chevron 버튼이 화면 가장자리에 잘 닿음
- CS 플로팅 버튼(우하단)과 슬라이더 우측 chevron 이 겹치지 않음 (`right-24` 클리어런스)

`super` / `super1234` 로 로그인 → `/reservations` — 4 캠퍼스/날짜 탭 모두 노출되는지 확인.

- [ ] **Step 4: 슬라이더/캔버스에서 추가 깨짐 발견 시 패치**

발견된 항목만 Edit. 발견 없으면 Step 5 로.

- [ ] **Step 5: Commit**

```bash
git add src/features/booth-layout/components/booth-map-picker.tsx
git commit -m "fix(responsive): 예약 picker 헤더 px 모바일 축소

px-6 → px-4 md:px-6 — 좁은 폰에서 좌우 24px씩 차지하던 padding 회수.
슬라이더/캔버스/탭은 이미 모바일 친화이라 추가 변경 없음."
```

---

### Task 5: reservation-management — 필터/검색 행 wrap

**Files:**
- Modify: `src/pages/reservation-management.tsx:289` (필터 + 검색 행)

**상황:** line 289 `<div className="flex items-center justify-between gap-4 mb-6">` — 4개 필터 pill(대기자/완료/취소/전체, 각 px-5 py-2) + 검색바 w-72(288px). 가장 좁은 폰에서 무조건 가로 넘침.

- [ ] **Step 1: 필터 + 검색 행 wrap + 검색 폭 반응형**

Edit `src/pages/reservation-management.tsx`:
```
old_string:       <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-3">
          {statuses.map((status) => (
new_string:       <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
```

같은 파일에서 검색 컨테이너 폭 반응형으로:
```
old_string:         <div className="relative w-72">
new_string:         <div className="relative w-full sm:w-72">
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: clean

- [ ] **Step 3: visual verify**

`booth1` 로 로그인 → `/reservations/<자기 id>` 진입. 또는 `super` 로 어느 부스든 진입.

375px 에서 확인:
- 4 필터 pill 이 두 줄로 wrap (한 줄 2개씩)
- 검색바가 모바일에선 풀폭, sm 이상에선 w-72 유지
- 헤더 우측 ON/OFF 토글 + "예약 상태 변경" 버튼이 wrap 으로 두 줄
- 테이블은 그대로 가로 스크롤 (min-w-[800px])

- [ ] **Step 4: Commit**

```bash
git add src/pages/reservation-management.tsx
git commit -m "fix(responsive): 예약 관리 필터/검색 행 wrap

flex flex-wrap items-center justify-between gap-3 — 4 필터 pill 이
가로로 못 들어가는 좁은 폭에서 두 줄로. 검색바도 w-full sm:w-72."
```

---

## Phase 2 — Mobile-2급 깨짐 차단

### Task 6: user-management — role pill 행 wrap

**Files:**
- Modify: `src/pages/user-management.tsx:251` (필터 + 검색 행)

**상황:** line 251 `<div className="flex items-center justify-between gap-4 mb-6">` 하위에 5개 role pill(전체/Super/Master/Booth/Performer, 각 `min-w-32` = 128px) — 5 × 128 + gap = ~660px 시점에서 무조건 가로 넘침.

- [ ] **Step 1: 필터 + 검색 행 wrap**

Edit `src/pages/user-management.tsx`:
```
old_string:       <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-3">
          {roles.map((role) => (
new_string:       <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: clean

- [ ] **Step 3: visual verify**

`super` 로 로그인 → `/users`. 375px / 414px / 768px 확인:
- 5 pill 이 모바일에서 두 줄(3+2 또는 2+2+1) wrap
- 검색바는 이미 `w-full sm:w-80` 이라 부모 wrap 만 적용되면 자동 풀폭
- 테이블은 그대로 가로 스크롤 (min-w-[1100px])

- [ ] **Step 4: Commit**

```bash
git add src/pages/user-management.tsx
git commit -m "fix(responsive): 유저 관리 role pill/검색 행 wrap

flex flex-wrap items-center justify-between gap-3 — 5 role pill 의
min-w-32 합 660px 가 좁은 폰에서 무조건 넘치던 깨짐 해결."
```

---

### Task 7: 2급 잔여 페이지 시각 audit + 깨짐만 패치

**Files (audit 대상):**
- `src/pages/notice.tsx`
- `src/pages/lost-found.tsx`
- `src/pages/performance-review.tsx`
- `src/pages/performance-list.tsx`
- `src/pages/dashboard.tsx`
- `src/pages/create-admin.tsx`

**상황:** 기 grep 으로 6개 페이지 모두 외곽 `p-4 md:p-8`, 헤더 `flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8`, 폼/카드 grid 1→2/3 cols 까지 적용 확인. 추가 깨짐은 시각으로 잡는다.

- [ ] **Step 1: 6 페이지 시각 sweep**

`super` 로 로그인. 375px 에서 다음 순회:
- `/` (Dashboard) — KPI 카드 1열, 최근 공지/분실물 카드 1열, 인기곡 1열
- `/general/notice` — 목록 + form (편집 모드 진입해 마크다운 textarea + 미리보기 stack 확인)
- `/general/lost-found` — 목록 + form
- `/general/performance-review` — KPI(grid 1/4) + 검색 필터 + 후기 그리드
- `/performance` — 카드 grid 1/2/3
- `/create-admin` — 마법사 폼

각 페이지에서 다음을 점검:
- 페이지 헤더 행이 자연스럽게 wrap 되는지
- 카드/카운터/필터 박스가 가로로 안 넘치는지
- 테이블이 있다면 `overflow-x-auto + min-w-[NNNpx]` 패턴인지
- 액션 버튼 행이 wrap 되는지

- [ ] **Step 2: 발견된 깨짐만 표준 어휘로 패치**

깨짐 없으면 Step 3 으로. 있으면 페이지별로 Edit:
- 헤더 행에 `flex-wrap` 누락 → `flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8`
- 필터/액션 행에 `flex-wrap` 누락 → `flex flex-wrap gap-2`
- 폼 grid 가 단순 `grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2 gap-4`
- 테이블에 `overflow-x-auto` 래퍼 누락 → 추가

각 페이지 패치 후 `pnpm typecheck`.

- [ ] **Step 3: visual verify (재진입)**

수정한 페이지 다시 진입해 깨짐 해소 확인. 수정 없었으면 그대로.

- [ ] **Step 4: Commit (있을 때만)**

발견된 깨짐 페이지 수에 따라 분리 커밋. 예:
```bash
# 깨짐이 1~2 페이지 수준이면 묶음 커밋
git add <파일들>
git commit -m "fix(responsive): 2급 페이지 헤더/필터/grid 잔여 깨짐 패치"
```

깨짐이 없으면 이 task 는 commit 없이 스킵 가능. 다음 task 로 진행.

---

## Phase 3 — Mobile-3급 fallback

### Task 8: booth-layout — 데스크톱 전용 안내 + lg 이상에서만 편집기

**Files:**
- Modify: `src/pages/booth-layout.tsx`

**상황:** 좌표 편집기는 캔버스/DnD/zoom-pan 이 본질이라 모바일 폴리시가 가성비 매우 낮음 + 불완전 모바일 노출은 운영자 판단을 흐림. 명시적으로 차단.

- [ ] **Step 1: lg 이하 안내 + lg 이상 편집기 분기**

Edit `src/pages/booth-layout.tsx` 의 return 블록 전체. 헤더는 그대로 두고 본문(line 21-38) 만 변경 — `lg:hidden` 안내 + `hidden lg:flex h-full` 편집기.

```
old_string:  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-4">
        <Map size={28} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">부스 배치도 편집</h1>
          <p className="text-xs text-muted-foreground">
            지도 위에 자리를 찍어 좌표 데이터를 만듭니다. JSON Export 로 백엔드 시드용 파일을 받을
            수 있습니다.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {boothsQuery.isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>
        ) : boothsQuery.isError ? (
          <div className="flex flex-col items-start gap-3 p-8 text-sm">
            <div className="text-destructive">운영자 목록을 불러오지 못했습니다.</div>
            <button
              type="button"
              onClick={() => boothsQuery.refetch()}
              className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <PlacementEditor booths={booths} />
        )}
      </div>
    </div>
  );
new_string:  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 md:px-8 py-4">
        <Map size={28} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">부스 배치도 편집</h1>
          <p className="text-xs text-muted-foreground">
            지도 위에 자리를 찍어 좌표 데이터를 만듭니다. JSON Export 로 백엔드 시드용 파일을 받을
            수 있습니다.
          </p>
        </div>
      </header>

      {/* 데스크톱 전용 안내 (가로 1024px 미만) — 좌표 편집기는 캔버스 + DnD + zoom-pan
          이 본질이라 좁은 폭에선 핀이 16px 미만으로 줄어 가독성·정확성이 동시에 깨짐.
          모바일 폴리시 대신 명시적으로 차단. */}
      <div className="lg:hidden flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm rounded-2xl border border-border bg-muted p-6 text-center">
          <Map size={32} className="mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground mb-2">데스크톱에서 사용해주세요</h2>
          <p className="text-sm text-muted-foreground">
            부스 배치 편집기는 좌표·드래그·확대축소가 정확해야 하는 작업이라 가로 1024px 이상에서 동작합니다.
          </p>
        </div>
      </div>

      {/* lg 이상에서만 편집기 마운트. */}
      <div className="hidden lg:block flex-1 overflow-hidden">
        {boothsQuery.isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>
        ) : boothsQuery.isError ? (
          <div className="flex flex-col items-start gap-3 p-8 text-sm">
            <div className="text-destructive">운영자 목록을 불러오지 못했습니다.</div>
            <button
              type="button"
              onClick={() => boothsQuery.refetch()}
              className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <PlacementEditor booths={booths} />
        )}
      </div>
    </div>
  );
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: clean

- [ ] **Step 3: visual verify**

`super` 로 로그인 → `/general/booth-layout`.
- 1024px 미만(예: 1023px) — "데스크톱에서 사용해주세요" 카드만 노출
- 1024px 이상 — 편집기(PlacementEditor) 마운트, 기존 동작 그대로

브라우저 폭을 슬라이더로 조절하며 1024 경계에서 자연스럽게 토글되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/pages/booth-layout.tsx
git commit -m "feat(responsive): 좌표 편집기 데스크톱-only fallback

lg(1024) 미만 — 데스크톱 사용 안내 카드, 편집기 미마운트.
lg 이상 — 기존 편집기 그대로. 헤더 padding 도 px-4 md:px-8 로 정합.

이유: 좌표 편집기는 캔버스+DnD+zoom-pan 이 본질이라 좁은 폭에서 핀이
16px 미만으로 줄어 가독성·정확성이 동시 깨짐. 모바일 폴리시 대신
명시적으로 차단해 운영자 혼란 방지."
```

---

## Phase 4 — 최종 검증

### Task 9: 모든 mock 계정 × mobile-1급 5 페이지 종합 시각 검증

**Files:** none (verify only)

**상황:** 페이지별 패치 끝났으니 mock 계정 5종 × 진입 가능 페이지 매트릭스로 한 번 더 종횡 sweep. 페이지 단위로는 맞아도 사용자 흐름에서 깨지는 케이스 잡힘.

- [ ] **Step 1: dev 서버 실행 확인**

`pnpm dev` 가 떠있는지 확인. 안 떠있으면 띄우기.

- [ ] **Step 2: mock 계정 × 1급 페이지 매트릭스 sweep**

브라우저 폭 375px / 414px / 768px 토글하며 다음 순회:

| 계정 | 진입 페이지 | 점검 항목 |
|---|---|---|
| `super` / `super1234` | `/login` → `/` (Dashboard) → 사이드바 모든 메뉴 1회씩 | drawer 토글, 사이드바 자동 닫힘, 페이지 전환 시 깜빡임 없음 |
| `master` / `master1234` | `/login` → `/` → 운영진 페이지 | super 와 같은 흐름이지만 admin.create 메뉴 없음 |
| `booth1` / `booth1234` | `/login` → `/booth` → 폼 두 카드 클릭 → `/reservations` → 자기 부스 → `/reservations/<id>` | 부스 폼/메뉴 폼 편집 가능, map picker 진입, 예약 테이블 가로 스크롤 |
| `booth2` / `booth1234` | `/login` → `/booth` (빈 프로필) | "작성 필요" 카드, 폼 진입 즉시 편집 모드 |
| `performer1` / `perf1234` | `/login` → `/performance/me` (자동 redirect) | 공연 정보 폼/타임테이블/셋리스트 모두 자연스러운 stack |

각 단계에서 발견된 깨짐 메모. 끝까지 다 돈 후 일괄 패치 (작은 항목 위주).

- [ ] **Step 3: 발견된 잔여 깨짐 패치 (있으면)**

표준 어휘로 패치. 페이지 단위 commit.

- [ ] **Step 4: typecheck + 빌드 한 번 확인**

```bash
pnpm typecheck
pnpm build
```

Expected: 둘 다 clean. `pnpm build` 는 `tsc -b` + `vite build` 두 단계 모두 통과해야 dev 머지 가능.

- [ ] **Step 5: dev 머지 (PR 또는 직접 머지)**

CLAUDE.md 의 커밋 규칙대로 작은 단위 커밋으로 dev 에 쌓임. PR 절차가 있으면:

```bash
git push origin <현재 브랜치>
gh pr create --base dev --title "feat(responsive): 모바일 1급/2급/3급 일괄 정리" --body "$(cat <<'EOF'
## Summary
- 모바일 1급 5개 페이지(login/booth/performance/reservation picker+management) 폴리시
- 2급 운영진 페이지 깨짐 차단 (user-management role pill 행 wrap 등)
- 3급 좌표 편집기 lg(1024) 미만 데스크톱-only fallback

## 검증
- [x] pnpm typecheck
- [x] pnpm build
- [x] 모든 mock 계정으로 375/414/768px 시각 sweep

Spec: docs/superpowers/specs/2026-05-07-mobile-responsive-design.md
EOF
)"
```

직접 dev 머지면 `git checkout dev && git merge --no-ff <브랜치> && git push origin dev`.

- [ ] **Step 6: PROGRESS.md 업데이트**

`PROGRESS.md` 의 "다음 작업" 섹션에서 "모바일 실기기 QA" 항목을 "✅ 모바일 반응형 1/2/3급 dev 머지(2026-05-XX) — 실기기 QA 만 잔여" 로 갱신.

```bash
# 직접 Edit 후
git add PROGRESS.md
git commit -m "docs(progress): 모바일 반응형 dev 머지 반영"
```

---

## 후속 (이 플랜 범위 밖)

- 실기기 QA — PM/사용자가 실제 폰으로 한 번 더 점검 (PROGRESS.md 가 명시한 단계)
- 백엔드 연동 작업 (notices 도메인부터 `VITE_USE_MOCK=false` 전환) — 별도 플랜
- 다크모드 토큰 정식화 — 별도 플랜
