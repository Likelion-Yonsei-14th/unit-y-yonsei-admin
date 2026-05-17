import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

/** 부스당 태그 최대 개수. */
const MAX_TAGS = 3;
/** 태그 내용('#' 제외) 최대 글자수. */
const MAX_TAG_CONTENT = 6;
/** 쉼표·공백류를 토큰 구분자로 본다. /g 금지 — .test() 의 lastIndex 가 드리프트한다. */
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

  /** 토큰 문자열들을 정규화·검증해 value 에 누적 추가. 하나라도 추가됐으면 true. */
  const commitTokens = (raw: string): boolean => {
    const tokens = raw.split(SEPARATOR).filter(Boolean);
    if (tokens.length === 0) return false;

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

    if (next.length !== value.length) {
      onChange(next);
      return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 한글 IME 조합 중의 Enter 는 음절 확정용 — 태그 확정으로 가로채지 않는다.
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      // 거부돼 아무것도 추가되지 않으면 입력값을 지우지 않는다 (재입력 부담 방지).
      if (commitTokens(draft)) setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      // 빈 입력에서 Backspace → 마지막 칩 제거.
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (atMax) return;
    const text = e.clipboardData.getData('text');
    // 구분자가 섞인 붙여넣기만 가로채 일괄 처리. 단일 토큰은 기본 입력에 맡긴다.
    if (SEPARATOR.test(text)) {
      e.preventDefault();
      if (commitTokens(`${draft}${text}`)) setDraft('');
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
            aria-label="부스 태그 입력"
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
