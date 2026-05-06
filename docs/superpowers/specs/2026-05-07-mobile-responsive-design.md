# 모바일 반응형 — 페이지별 등급화 + 표준 패턴 정리

- **작성일**: 2026-05-07
- **대상 기능**: 어드민 SPA 의 모바일 반응형 — 부스/공연팀 사용자 시점 폴리시 + 운영진 화면 깨짐 차단
- **상태**: draft, 구현 전
- **리드 타임**: 축제 5/26~29 (D-19) 이전 dev 머지 + 실기기 QA 완료 목표

## 배경

PROGRESS.md 가 "모바일 실기기 QA — 캠퍼스 일정 임박 전 점검 권장"을 다음 작업으로 이미 명시. 일부 페이지는 작업 중간중간 `p-4 md:p-8`, 폼 `grid-cols-1 sm:grid-cols-2`, 테이블 `overflow-x-auto + min-w-[NNNpx]` 같은 패턴이 정착됐고 사이드바도 `app-layout.tsx` 에서 모바일 drawer + 데스크톱 collapse 로 마무리(3ba9c98). 그러나 (1) 부스/공연팀 진입 화면(`/booth`, `/performance/me`, `/reservations*`)의 좁은 폭 정합이 한 번도 통합 검증되지 않았고, (2) 운영진 페이지 중 `user-management.tsx` 의 role pill 행 같이 명확한 가로 넘침 케이스가 잔존한다. 본 spec 은 페이지를 사용자 분포 기준으로 등급화하고, 등급별 작업 정의·표준 패턴·검증 방법을 한 번에 합의해 D-19 안에 끝낼 수 있는 형태로 묶는다.

## 범위

- **포함**
  - 모든 라우트의 `<= 375px` 가로 폭에서의 깨짐 방지 (가로 스크롤 한정 허용)
  - mobile-1급 페이지(부스/공연팀 진입)에서 폼/지도/리스트의 자연스러운 단일 컬럼 동작
  - mobile-3급 1페이지(`/general/booth-layout` 좌표 편집기)의 데스크톱-only fallback 안내
  - 표준 반응형 어휘를 spec 에 명문화해 후속 페이지 작업의 어휘 통일
- **제외 (non-goals)**
  - 운영진 화면(테이블 위주 페이지)을 모바일 카드 레이아웃으로 변환하는 것 — 사용자 분포상 회수가 안 됨
  - 태블릿 전용 분기(중간 사이즈에서 의미 있는 다른 레이아웃) — 기본 `md:` breakpoint 로 충분
  - 다크모드 토큰 정식화 — 별도 작업
  - 새 컴포넌트(`<ResponsiveTable>` 등) 추상화 — 단발 작업 대비 과설계
  - `booth-layout` 좌표 편집기 자체의 모바일 폴리시 — 데스크톱-only 로 명시 차단

## 페이지 등급 분류

권한 매트릭스(`src/config/permissions.ts`)와 라우트 가드(`src/routes/index.tsx`) 교차로 결정. 진입 가능한 사용자가 누구냐에 따라 폴리시 우선순위가 달라진다.

| 등급 | 경로 | 페이지 컴포넌트 | 진입 사용자 | 비고 |
|---|---|---|---|---|
| **1급 — 폴리시 필요** | `/login` | `login.tsx` | 모두 | 카드 max-w 적용. mock 힌트 박스만 좁은 폰 가독 점검 |
| | `/booth` | `booth-management.tsx` | Booth | 자기 프로필 편집(폼·이미지 첨부) |
| | `/performance/me` | `performance-management.tsx` | Performer | 자기 팀 편집(`md:` 12개로 출발선 양호) |
| | `/reservations` | `reservation-booth-picker.tsx` | Booth (+M·S) | **map picker 가 핵심** — 캔버스 + 슬라이더 + 섹션 탭 |
| | `/reservations/:boothId` | `reservation-management.tsx` | Booth (+M·S) | Booth 도 보지만 테이블/벌크 비중↑ — 1급이지만 테이블은 가로 스크롤 허용 |
| **2급 — 깨짐 차단만** | `/` | `dashboard.tsx` | M·S | 이미 grid 단계별 `grid-cols-1 sm: lg:` 적용 |
| | `/users` | `user-management.tsx` | M·S | role pill 행 명확한 가로 넘침 |
| | `/general/notice` | `notice.tsx` | M·S (manage 가드) | 마크다운 편집기 + 미리보기 — 좁은 폭 점검 |
| | `/general/lost-found` | `lost-found.tsx` | M·S | |
| | `/general/performance-review` | `performance-review.tsx` | M·S | |
| | `/performance` | `performance-list.tsx` | M·S | |
| | `/performance/:teamId` | `performance-management.tsx` | M·S | 같은 컴포넌트 — 1급 작업으로 자동 커버 |
| | `/create-admin` | `create-admin.tsx` | S | 마법사 폼 |
| **3급 — 데스크톱 전용** | `/general/booth-layout` | `booth-layout.tsx` | M | 좌표 편집기. 좁은 폭에선 안내 메시지 |
| **0급 — 작업 불필요** | `/forbidden`, `/general` redirect, `*` (NotFound) | | | 이미 단순 |

## 표준 반응형 어휘

이 어휘로 모든 페이지 작업을 통일한다. 새 어휘 도입 금지(다음 작업자가 같은 단어로 같은 결과를 만들 수 있어야 함).

```
페이지 외곽         p-4 md:p-8
페이지 헤더 행      flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8
폼 그리드 (2열까지) grid grid-cols-1 sm:grid-cols-2 gap-4
테이블              <div className="overflow-x-auto">
                      <table className="w-full min-w-[NNNpx] table-fixed"> … </table>
                    </div>
필터/pill 행 (소수)  flex flex-wrap gap-2
필터/pill 행 (다수)  -mx-4 px-4 overflow-x-auto whitespace-nowrap   (모바일 가로 스크롤 허용)
액션 버튼 행        flex flex-wrap gap-2  + 풀폭이 자연스러우면 모바일에 한해 w-full
모달/Dialog         shadcn 기본(viewport 안전), 추가 작업 X
터치 타겟           ≥44px (h-11 / py-2.5 + px-* 합쳐서 보장)
breakpoint 정책     Tailwind 기본만 (sm 640 / md 768 / lg 1024). 커스텀 없음
```

**Mobile-3급 fallback 규칙** (`booth-layout.tsx` 전용):

```tsx
<div className="lg:hidden p-8 ...">
  이 화면은 데스크톱(가로 1024px 이상)에서 사용해주세요. ...
</div>
<div className="hidden lg:block h-full">
  <PlacementEditor ... />
</div>
```

편집기는 캔버스/DnD/zoom-pan 이 본질이라 모바일 폴리시 가성비가 매우 낮음. 명시적으로 차단하고 안내하는 쪽이 정직.

## 페이지별 작업 정의

### Mobile-1급

**1. `login.tsx`** — 페이지 자체는 `min-h-screen flex items-center justify-center + max-w-md` 라 이미 모바일에서 정상 작동. `VITE_USE_MOCK=true` 일 때 노출되는 mock 힌트 박스(font-mono, 작은 폰트, 약 15줄)만 좁은 폰에서 양옆 잘릴 위험. `text-[10px] sm:text-xs` 적용 + 길이 긴 줄(`booth1 — 문헌정보학과 · 인기 · 다일 운영`)에 `break-words` 또는 `truncate`. 운영 환경에선 mock 힌트 자체가 안 보이므로 비파괴적.

**2. `booth-management.tsx`** — 8464423 에서 sub-component 4개로 분리됨. 각 sub 의 다음 항목 점검:
- 페이지 헤더: `flex flex-wrap` 적용
- 운영 정보 폼: `grid-cols-1 sm:grid-cols-2`
- 메뉴 리스트: 모바일에선 가로 스크롤 또는 카드 풀폭
- 이미지 업로드 그리드: `grid-cols-2 sm:grid-cols-3` 정도가 자연스러움
- 액션 버튼(저장/취소): `flex-wrap` + 모바일에서 풀폭 고려

**3. `performance-management.tsx`** — `md:` 12개 적용돼 출발선 양호. 일정/곡 리스트 섹션이 좁은 폰에서 어떻게 깨지는지 확인 후 동일 어휘 적용. Master 가 `/performance/:teamId` 로 들어올 때도 같은 컴포넌트라 2급 작업이 자동 커버됨.

**4. `reservation-booth-picker.tsx` + `BoothMapPicker`** — 가장 까다로운 1급. 결정사항:
- **상단 `MapSectionTabs`**: 날짜 + 섹션 selector. 모바일에선 `flex-wrap` 또는 가로 스크롤 — 컴포넌트 내부 점검 후 결정.
- **캔버스(`BoothMapCanvas`)**: 부모 폭에 맞춰 `width:100%`, 종횡비 보존(이미 SVG 기반이면 문제 없음).
- **슬라이더(`BoothSlider`)**: 현재 `absolute bottom-4 left-4 right-24` 오버레이. 모바일에서도 동일 패턴 유지(폭은 `right-24` 클리어런스 덕에 자연 축소). 카드 내부 텍스트의 `truncate` 만 보강.
- **CS 플로팅 버튼**과 슬라이더 우측 chevron 의 겹침은 이미 `right-24`(=96px) 로 해결됨 — 검증.

**5. `reservation-management.tsx`** — Booth 가 보는 자기 부스 예약 관리. 헤더/필터 행 `flex-wrap`, 테이블은 `overflow-x-auto + min-w` 그대로(가로 스크롤 허용). 벌크 액션 바가 sticky 라면 `sticky bottom-0` + `flex-wrap` 으로 모바일에서 두 줄 허용.

### Mobile-2급

**6. `user-management.tsx`** — 명확한 깨짐 1건:
- role pill 행(line 252): 5개 pill × `min-w-32` (128px) = 640px + gap. 모바일 무조건 가로 넘침.
- 수정안: 외곽 컨테이너에 `flex-wrap` 추가 + pill 의 `min-w-32` 를 `min-w-24` 또는 모바일에 한해 가로 스크롤. **`flex-wrap` 쪽이 단순 — 적용**.
- 검색 input(line 277): `w-full sm:w-80` 이미 정확. 부모 wrap 만 적용되면 자동 해결.

**7. `dashboard.tsx`, `lost-found.tsx`, `notice.tsx`, `performance-review.tsx`, `performance-list.tsx`, `create-admin.tsx`** — `pnpm dev` 띄워 빠른 시각 audit 후 깨진 항목만 위 표준 어휘로 패치. 보통 헤더/필터 wrap 한두 줄로 끝남. notice 마크다운 편집기 + 미리보기는 `grid-cols-1 lg:grid-cols-2` 가 자연스러움(좁은 폭에선 편집/미리보기 종방향 스택).

### Mobile-3급

**8. `booth-layout.tsx`** — 위 fallback 규칙 적용. 안내 메시지 본문:
- 한 문장으로 데스크톱 사용 권장
- 좌표 편집기는 폭이 좁으면 핀이 16px 미만이 되어 가독성·정확성이 동시 깨지므로 명시적 차단이 정직(이미 PROGRESS.md 의 "편집기 핀 핸들 < 16px 자동 숨김" 와 같은 결의 결정).
- 테스트는 `pnpm dev` + 브라우저 폭을 1023/1024px 경계에서 확인.

## 접근법

다음 3안 중 **1번을 본 작업으로, 2번은 mobile-1급 5개 페이지에 한해 보조**.

| | 1. 정적 audit + 패치 (채택) | 2. 브라우저 QA 루프 (보조) | 3. 재사용 프리미티브 (불채택) |
|---|---|---|---|
| 방식 | 페이지 코드 읽고 표준 어휘로 패치 | dev 서버 + 375/414/768px 시각 확인 | `<ResponsiveTable>` 등 래퍼 |
| 속도 | 빠름 | 보통 | 느림 |
| 신뢰도 | 중간 — 명백한 깨짐 위주 | 높음 — 시각 확정 | 낮음 — 단발에 과설계 |
| D-19 적합 | ◎ | mobile-1급 5개에 한해 ○ | ✕ |

3번 불채택 이유: 본 spec 의 변경은 대부분 className 추가/조정이라 컴포넌트 추상화로 회수가 안 됨. 또한 백엔드 연동이 다음 큰 작업이라 컴포넌트 구조를 흔들면 안 됨.

## 검증 전략

별도 자동 회귀 안 둠 — 모두 className 변경이라 비주얼 검증이 본체.

1. `pnpm typecheck` — 변경 후 항상 깨끗.
2. `pnpm dev` 띄우고 mobile-1급 5개 페이지를 375/414/768px 폭에서 각 진입 가능한 mock 계정으로 확인:
   - `booth1` / `super` 로 `/login → /booth → /reservations → /reservations/<myId>`
   - `performer1` / `super` 로 `/login → /performance/me`
3. mobile-2급 페이지는 깨짐만 확인(가로 스크롤은 허용).
4. mobile-3급(`/general/booth-layout`)은 < 1024px 에서 안내 메시지 노출, ≥ 1024px 에서 편집기 정상 동작.
5. **실기기**: dev 머지 후 PM/사용자가 실제 폰으로 한 번 더 확인 — PROGRESS.md 가 명시한 단계.

## 파일 변경 예정 목록

| 파일 | 등급 | 변경 |
|---|---|---|
| `src/pages/login.tsx` | 1 | mock 힌트 텍스트 사이즈 + word-break |
| `src/pages/booth-management.tsx` + `src/features/booths/components/*` | 1 | 헤더 wrap, 폼 grid, 이미지 그리드, 액션 버튼 |
| `src/pages/performance-management.tsx` | 1 | 누락 섹션 보강 (md 12개 출발선) |
| `src/pages/reservation-booth-picker.tsx` | 1 | 컨테이너 외곽만 — 본체는 BoothMapPicker |
| `src/features/booth-layout/components/booth-map-picker.tsx` | 1 | 헤더 px 축소(px-4 md:px-6), 슬라이더 절대 폭 검증 |
| `src/features/booth-layout/components/map-section-tabs.tsx` | 1 | 모바일 wrap 또는 가로 스크롤 |
| `src/features/booth-layout/components/booth-slider.tsx` | 1 | 카드 텍스트 truncate 보강 |
| `src/pages/reservation-management.tsx` | 1 | 헤더/필터 wrap, 벌크 액션 바 wrap |
| `src/pages/user-management.tsx` | 2 | role pill 행 wrap, 검색 행 wrap |
| `src/pages/notice.tsx` | 2 | 편집기 + 미리보기 grid 분기 |
| `src/pages/lost-found.tsx`, `performance-review.tsx`, `performance-list.tsx`, `create-admin.tsx` | 2 | dev 서버 audit 후 깨진 항목 패치 |
| `src/pages/booth-layout.tsx` | 3 | `lg:hidden` 안내 + `hidden lg:block` 편집기 |

## 커밋 단위

CLAUDE.md 의 "기능 단위 / 수정 단위로 커밋을 쪼갠다" 원칙을 따름. 1 페이지 = 1 커밋 기본, 표준 어휘만 적용한 단순 audit 패치는 등급 단위로 묶을 수 있음(예: "fix(responsive): 2급 페이지 헤더/필터 wrap 일괄"). prefix 는 `fix(responsive): …` 또는 `feat(responsive): …` (3급 fallback 처럼 새 동작 추가 시).

## 이후 작업

본 spec 승인 후 **writing-plans 스킬**로 구현 플랜 생성 → 작은 커밋 단위로 분할 진행. 모든 변경은 dev 머지 전 `pnpm typecheck` 통과를 강제.
