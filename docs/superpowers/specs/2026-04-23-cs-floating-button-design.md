# 플로팅 CS 문의 버튼 디자인

- **작성일**: 2026-04-23
- **대상 기능**: 로그인 후 전역에 노출되는 오픈카카오 문의 버튼
- **상태**: draft, 구현 전

## 배경

어드민은 폐쇄 배포라 사용자(Super/Master/Booth/Performer) 가 문의할 일이 생겨도 마땅한 채널이 없다. 축제 직전·당일엔 "예약 설정이 안 돼요", "계정이 로그인이 안 돼요" 같은 문의가 몰릴 텐데, 메일·전화는 속도가 느리고 한 명의 멋사 담당자가 놓칠 여지가 크다. 채널톡 같은 SaaS 를 붙이긴 오버엔지니어링이라 **플로팅 버튼 → 오픈카카오 채팅방** 조합으로 최소 비용 CS 창구를 마련한다.

## 범위

- **포함**
  - 로그인 후 전역 (`AppLayout` 내부) 에 우하단 고정 플로팅 버튼 1개
  - 클릭 시 오픈카카오 URL 을 새 탭에서 오픈
  - URL 은 환경변수로 주입 (Vercel · 로컬 공통 패턴)
- **제외 (non-goals)**
  - 인앱 채팅 UI / 메시지 히스토리 / 미읽음 배지
  - FAQ 목록, 공지, 담당자 표시 등 패널형 추가 정보
  - 로그인 페이지에서의 노출 (Auth 가 없으면 버튼도 없음)
  - 모바일 별도 대응 (어드민은 데스크탑 전제)

## 설계

### 1. 컴포넌트 & 배치

- 신규 컴포넌트 `src/components/common/cs-floating-button.tsx`
- `AppLayout` 에 한 번 마운트. `RequireAuth` 하위라 비로그인 상태에선 자연히 렌더되지 않음
- 포지셔닝: `fixed bottom-6 right-6 z-50`. 사이드바의 `z` 와 겹치지 않는 수준이면서 모달(`z-50` 대동률)보다 튀지 않게 조정 필요 시 한 단계 내릴 수 있음

### 2. 비주얼

- 56×56 원형, `bg-primary text-primary-foreground`, `rounded-full`, `shadow-lg`
- 아이콘: `lucide-react` 의 `MessageCircle` (이미 `nav.ts` 에서 사용 중, 톤 일치), 24px
- Hover: `hover:scale-105 transition-transform`, shadow 한 단계 강화
- 접근성: `aria-label="CS 문의"`, native `title="CS 담당자에게 카카오톡 문의"`
- 디자인 토큰 사용 원칙 준수 — 시맨틱 토큰(`bg-primary`) 우선, 하드코딩 컬러 금지

### 3. 인터랙션

- 클릭 시 `window.open(KAKAO_CS_URL, '_blank', 'noopener,noreferrer')`
- 중간 모달 · 패널 없음. 가장 단순한 원버튼 플로우
- 연속 클릭으로 여러 탭이 열리는 건 허용 (디바운스 불필요)

### 4. 환경변수

- `src/lib/env.ts` Zod 스키마에 다음 추가:
  ```ts
  VITE_KAKAO_CS_URL: z.string().url().optional(),
  ```
- `.env.example` 에 placeholder 한 줄 추가:
  ```
  # 오픈카카오 CS 채팅방 URL (없으면 버튼 미노출)
  VITE_KAKAO_CS_URL=
  ```
- 실제 값은 Vercel Project Settings → Environment Variables 에서 주입 (Production / Preview 각각)

### 5. 값 없을 때의 동작

- `env.KAKAO_CS_URL` 이 `undefined` / 빈 문자열이면 컴포넌트가 `null` 을 반환 → 버튼 자체가 DOM 에 없음
- 이유: 링크 없는 CS 버튼을 클릭했을 때의 혼란(아무 일도 안 일어남, 404, 에러 토스트) 이 "버튼이 없다" 보다 더 나쁨. 특히 운영자가 "여기가 문의창구구나" 기대했다가 아무 반응 없으면 브랜드 신뢰 손상
- 개발 편의: env 미설정 시 앱 부트 때 `console.info("[cs] VITE_KAKAO_CS_URL 미설정 — CS 플로팅 버튼 숨김")` 한 줄. 로컬 개발자가 실수로 누락한 경우 눈에 띄도록

### 6. 파일 변경 예정 목록

| 파일 | 변경 |
|---|---|
| `src/components/common/cs-floating-button.tsx` | 신규 |
| `src/components/layout/app-layout.tsx` | `<CsFloatingButton />` 마운트 1줄 |
| `src/lib/env.ts` | `VITE_KAKAO_CS_URL` 필드 추가 |
| `.env.example` | 변수 한 줄 추가 |

## 테스트 전략

- 별도 테스트 러너가 없으므로 수동 QA:
  1. 로컬 `.env.local` 에 `VITE_KAKAO_CS_URL` 설정 → 로그인 후 우하단 버튼 확인 · 클릭 시 새 탭 열림
  2. `VITE_KAKAO_CS_URL` 제거 → 버튼 미노출 확인, 콘솔 info 문구 확인
  3. 로그인 페이지에서는 버튼 미노출 확인
  4. 모든 mock 계정(super/master/booth1/booth2/performer1) 로그인해 동일하게 노출 확인
  5. 여러 페이지(/users, /reservations, /booth 등) 에서 위치·겹침 확인

## 이후 작업

spec 승인 후 writing-plans 스킬로 구현 플랜 생성 → 실제 구현은 작은 커밋 단위로 분할.
