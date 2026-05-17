# 부스 태그 입력 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부스 상세 정보(어드민) 폼에서 `#` 접두사가 자동으로 붙는 태그를 최대 3개, 내용 1~6자로 입력받는 기능을 추가한다.

**Architecture:** `BoothProfile` 데이터 모델에 `tags: string[]` 필드를 추가하고, 신규 controlled 컴포넌트 `BoothTagInput`이 칩 입력/검증을 담당한다. `booth-info-form.tsx`가 편집/읽기 모드에 따라 컴포넌트를 렌더하고 저장 mutation에 `tags`를 포함한다.

**Tech Stack:** React + TypeScript, Tailwind v4 (DS 시맨틱 토큰), `sonner` 토스트, `lucide-react` 아이콘.

**참고:** 이 프로젝트에는 테스트 러너가 없다. 각 태스크의 검증은 `pnpm typecheck`(타입 클린)와 마지막 수동 QA 태스크로 한다. 설계 문서: `docs/superpowers/specs/2026-05-17-booth-tag-input-design.md`.

---

### Task 1: 데이터 모델에 `tags` 필드 추가

`BoothProfile`에 필수 필드를 추가하면 30개 mock 리터럴이 모두 타입 에러가 나므로,
타입·매퍼·mock을 한 커밋으로 묶는다 (typecheck는 셋 다 끝나야 클린).

**Files:**
- Modify: `src/features/booths/types.ts`
- Modify: `src/features/booths/mapper.ts`
- Modify: `src/mocks/booth-profile.ts`

- [ ] **Step 1: `BoothProfile`에 `tags` 추가**

`src/features/booths/types.ts`의 `BoothProfile` 인터페이스에서 `description` 줄 바로 다음에 추가:

```ts
  description: string;
  /** 부스 분류 태그. 각 원소는 '#' 접두사 포함(예: '#먹거리'). 최대 3개. */
  tags: string[];
```

- [ ] **Step 2: `BoothProfileDTO`에 `tags` 추가**

같은 파일 `BoothProfileDTO` 인터페이스에서 `description` 줄 바로 다음에 추가:

```ts
  description: string;
  tags: string[];
```

- [ ] **Step 3: 매퍼에 `tags` 매핑 추가**

`src/features/booths/mapper.ts`의 `toBoothProfile`에서 `description` 줄 다음에 추가:

```ts
  description: d.description,
  tags: d.tags,
```

- [ ] **Step 4: mock 30개 부스 전부에 `tags: []` 삽입**

Run:

```bash
perl -0777 -i -pe 's/(reservationEnabled: (?:true|false),\n)/${1}  tags: [],\n/g' src/mocks/booth-profile.ts
```

이 명령은 `reservationEnabled:` 줄 다음마다 `  tags: [],`를 삽입한다.

Run (삽입 개수 확인):

```bash
grep -c 'tags: \[\]' src/mocks/booth-profile.ts
```

Expected: `30`

- [ ] **Step 5: 데모 부스 id 1에 실제 태그 지정**

`src/mocks/booth-profile.ts`에서 다음 4줄을 찾아 (filledBooth):

```ts
  signatureMenu: '후라이드 치킨',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: true,
  tags: [],
```

마지막 줄을 교체:

```ts
  signatureMenu: '후라이드 치킨',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: true,
  tags: ['#먹거리', '#치킨'],
```

- [ ] **Step 6: 데모 부스 id 3에 실제 태그 지정**

`src/mocks/booth-profile.ts`에서 다음 4줄을 찾아 (secondFilledBooth):

```ts
  signatureMenu: '치즈버거',
  operatingHours: '11:00 - 19:00',
  reservationEnabled: true,
  tags: [],
```

마지막 줄을 교체:

```ts
  signatureMenu: '치즈버거',
  operatingHours: '11:00 - 19:00',
  reservationEnabled: true,
  tags: ['#먹거리', '#햄버거'],
```

- [ ] **Step 7: 타입 검증**

Run: `pnpm typecheck`
Expected: 에러 없이 통과 (mock 30개 모두 `tags` 보유).

- [ ] **Step 8: 커밋**

```bash
git add src/features/booths/types.ts src/features/booths/mapper.ts src/mocks/booth-profile.ts
git commit -m "feat(booths): BoothProfile 에 tags 필드 추가

부스 분류 태그를 데이터 모델·매퍼·mock 전반에 도입한다.
태그 입력 UI(다음 커밋)와 BE DTO 가 같은 필드를 공유한다.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `BoothTagInput` 컴포넌트

**Files:**
- Create: `src/features/booths/components/booth-tag-input.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/features/booths/components/booth-tag-input.tsx` 전체 내용:

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

/** 부스당 태그 최대 개수. */
const MAX_TAGS = 3;
/** 태그 내용('#' 제외) 최대 글자수. */
const MAX_TAG_CONTENT = 6;
/** 쉼표·공백류를 토큰 구분자로 본다. */
const SEPARATOR = /[,\s]+/;

interface Props {
  /** '#' 접두사 포함 태그 배열. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * 부스 태그 입력 — Enter/쉼표/스페이스로 칩 확정.
 * 저장값은 항상 '#' 접두사 포함(예: '#먹거리'). 내용은 1~6자, 최대 3개.
 */
export function BoothTagInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const atMax = value.length >= MAX_TAGS;

  /** 토큰 문자열들을 정규화·검증해 value 에 누적 추가. */
  const commitTokens = (raw: string) => {
    const tokens = raw.split(SEPARATOR).filter(Boolean);
    if (tokens.length === 0) return;

    const next = [...value];
    let rejectedLong = false;
    let rejectedDup = false;
    let rejectedFull = false;

    for (const token of tokens) {
      // 앞쪽 '#'·공백을 벗겨 내용만 추출 → 단일 '#' 재부착.
      const content = token.replace(/^#+/, '').trim();
      if (!content) continue;
      if (content.length > MAX_TAG_CONTENT) {
        rejectedLong = true;
        continue;
      }
      const tag = `#${content}`;
      if (next.includes(tag)) {
        rejectedDup = true;
        continue;
      }
      if (next.length >= MAX_TAGS) {
        rejectedFull = true;
        continue;
      }
      next.push(tag);
    }

    if (rejectedLong) toast.error(`태그는 ${MAX_TAG_CONTENT}자 이내로 입력해주세요.`);
    if (rejectedDup) toast('이미 추가된 태그입니다.');
    if (rejectedFull) toast(`태그는 최대 ${MAX_TAGS}개까지 추가할 수 있습니다.`);

    if (next.length !== value.length) onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitTokens(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      // 빈 입력에서 Backspace → 마지막 칩 제거.
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    // 구분자가 섞인 붙여넣기만 가로채 일괄 처리. 단일 토큰은 기본 입력에 맡긴다.
    if (SEPARATOR.test(text)) {
      e.preventDefault();
      commitTokens(`${draft}${text}`);
      setDraft('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 pl-3 pr-2 py-1 bg-muted text-foreground text-sm rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`${tag} 삭제`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            type="text"
            value={draft}
            // 내용 6자 + 사용자가 직접 친 '#' 1자 여유.
            maxLength={MAX_TAG_CONTENT + 1}
            placeholder={value.length === 0 ? '태그 입력 후 Enter (예: 먹거리)' : '태그 추가'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="flex-1 min-w-[120px] px-1 py-1 bg-transparent focus:outline-none text-sm"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {atMax
          ? `태그는 최대 ${MAX_TAGS}개입니다. (${value.length}/${MAX_TAGS})`
          : `Enter·쉼표·스페이스로 추가 · ${MAX_TAG_CONTENT}자 이내 · ${value.length}/${MAX_TAGS}`}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/features/booths/components/booth-tag-input.tsx
git commit -m "feat(booths): 부스 태그 입력 컴포넌트 추가

Enter·쉼표·스페이스로 칩 확정, '#' 자동 접두, 내용 1~6자·최대 3개 검증.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `booth-info-form.tsx`에 태그 섹션 통합

**Files:**
- Modify: `src/features/booths/components/booth-info-form.tsx`

- [ ] **Step 1: import 추가**

`booth-info-form.tsx` 상단 import 블록에서 `ThumbnailCropOverlay` import 다음 줄에 추가:

```ts
import { ThumbnailCropOverlay } from '@/features/booths/components/thumbnail-crop-overlay';
import { BoothTagInput } from '@/features/booths/components/booth-tag-input';
```

- [ ] **Step 2: `tags` state 추가**

`const [boothImages, setBoothImages] = useState<BoothImage[]>(booth.thumbnails);` 줄 다음에 추가:

```ts
  const [boothImages, setBoothImages] = useState<BoothImage[]>(booth.thumbnails);
  const [tags, setTags] = useState<string[]>(booth.tags);
```

- [ ] **Step 3: hydrate `useEffect`에 `tags` 동기화 추가**

`booth` refetch hydrate `useEffect` 안의 `setBoothImages(booth.thumbnails);` 줄 다음에 추가:

```ts
    setBoothImages(booth.thumbnails);
    setTags(booth.tags);
```

- [ ] **Step 4: `handleSave` mutation payload에 `tags` 추가**

`handleSave`의 `updateMutation.mutate({ ... })` 객체에서 `thumbnails: boothImages,` 줄 다음에 추가:

```ts
        operatingHours,
        reservationEnabled,
        thumbnails: boothImages,
        tags,
```

- [ ] **Step 5: 태그 섹션 JSX 추가**

부스 소개글 `<div>` 블록(닫는 `</div>`가 `부스 소개글` 라벨 다음에 오는 블록)이 끝난 직후,
`{/* 그룹 타이틀 — 편집 시 ... */}` 주석으로 시작하는 부스 이미지 `<div>` 블록 **앞에** 다음을 삽입:

```tsx
        <div>
          <span className="block text-sm font-semibold text-foreground mb-2">부스 태그</span>
          {isEditing ? (
            <BoothTagInput value={tags} onChange={setTags} />
          ) : tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-muted text-foreground text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground">
              등록된 태그가 없습니다.
            </div>
          )}
        </div>
```

- [ ] **Step 6: 타입 검증**

Run: `pnpm typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/features/booths/components/booth-info-form.tsx
git commit -m "feat(booths): 부스 상세 정보에 태그 입력 섹션 연결

부스 소개글과 부스 이미지 사이에 태그 섹션 배치, 저장 mutation 에 tags 포함.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 수동 QA

테스트 러너가 없으므로 브라우저에서 mock 계정으로 직접 확인한다.

**Files:** 없음 (검증만)

- [ ] **Step 1: 개발 서버 실행**

Run: `pnpm dev`

- [ ] **Step 2: 작성 완료 부스(태그 있음) 확인**

`booth1` / `booth1234`(Booth, booth_id=1)로 로그인 → 부스 관리 → 부스 상세 정보.
- 읽기 모드에서 `#먹거리`, `#치킨` 칩이 보인다.
- "편집" → 태그 입력창에 두 칩이 보이고 카운터가 `2/3`.

- [ ] **Step 3: 입력·검증 동작 확인 (편집 모드)**

- `행사`(2자) 입력 후 Enter → `#행사` 칩 추가, 카운터 `3/3`, 입력창 비활성.
- 한 칩의 `✕` 클릭 → 제거, 입력창 다시 활성.
- `먹거리` 다시 입력 → 중복 토스트, 추가 안 됨.
- 7자 이상(`일이삼사오육칠`) 입력 시도 → `maxLength`로 7자에서 막히고, `#`까지 친 경우가 아니면 6자 초과 토큰은 토스트로 거부.
- `부스, 공연` 처럼 쉼표로 한 번에 입력 → 두 칩 분리 추가(개수 한도 내).
- 빈 입력창에서 Backspace → 마지막 칩 제거.

- [ ] **Step 4: 저장·새로고침 후 영속 확인**

태그를 바꾸고 "저장" → 성공 토스트 → 페이지 새로고침 → 변경된 태그가 유지된다(mock 영속).

- [ ] **Step 5: 빈 부스 플로우 확인**

`booth2` / `booth1234`(Booth, booth_id=2)로 로그인 → 부스 상세 정보.
- 읽기 모드에서 `등록된 태그가 없습니다.` 표시.
- 편집 → 태그 추가 → 저장 → 읽기 모드에 칩 표시.

---

## Self-Review

**Spec coverage:**
- 데이터 모델(`tags` 필드, DTO, 매퍼, `isBoothInfoCompleted` 미포함) → Task 1. ✓
- `BoothTagInput`(레이아웃·확정 동작·정규화·검증 6규칙) → Task 2. ✓
- `booth-info-form` 통합(state/hydrate/위치/읽기·편집 모드/handleSave) → Task 3. ✓
- Mock 30개 + 데모 부스 id 1·3 → Task 1 Step 4~6. ✓
- 스타일(DS 토큰, 칩 pill) → Task 2·3 코드에 반영. ✓
- 수동 QA → Task 4. ✓

**Placeholder scan:** 모든 코드 블록은 완성된 실제 코드. 플레이스홀더 없음. ✓

**Type consistency:** `BoothProfile.tags: string[]` / `BoothProfileDTO.tags: string[]` / `BoothTagInput` props `value: string[]`, `onChange: (next: string[]) => void` — Task 1~3 전반 일관. ✓
