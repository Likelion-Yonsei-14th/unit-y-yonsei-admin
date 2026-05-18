import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/components/ui/utils';

interface Props {
  /** 원본 markdown 문자열. */
  source: string;
  /** 추가 className — prose 영역의 사이즈/색상 미세 조정용. */
  className?: string;
}

/**
 * 공지/안내문 등의 한정된 marker(굵게/기울임/링크/리스트/코드)를 안전하게 렌더한다.
 *
 * 어드민이 직접 작성하는 텍스트라 위험은 낮지만, rehype-sanitize 로 한 번 더
 * 거른다(스크립트/onclick 등 제거). GitHub Flavored Markdown(remark-gfm)
 * 으로 표/체크리스트/취소선까지 지원.
 *
 * 디자인 토큰 친화적인 prose 스타일은 Tailwind v4 의 'prose' 플러그인 없이
 * 직접 자식 element 셀렉터로 부여 — 어드민 1-2 곳에서만 쓰여 의존성 늘릴
 * 필요 적음.
 */
export function Markdown({ source, className }: Props) {
  return (
    <div className={cn('markdown-content text-sm leading-relaxed text-foreground', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 마크다운 문자열을 한 줄 미리보기용 평문으로 환원한다.
 *
 * 목록(공지/안내문 등)의 본문 미리보기에 마크다운 원문(`## `, 표 `|—|—|` 등)이
 * 그대로 노출되는 걸 막는다. 렌더가 아니라 문법 기호 제거 — 표/제목 같은 블록
 * 요소를 한 줄 셀에 욱여넣지 않는다.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // 코드 블록
    .replace(/`([^`]+)`/g, '$1') // 인라인 코드
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 이미지
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 링크 → 텍스트만
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // 제목
    .replace(/^\s{0,3}>\s?/gm, '') // 인용
    .replace(/^\s*[-*+]\s+/gm, '') // 불릿 리스트
    .replace(/^\s*\d+\.\s+/gm, '') // 순서 리스트
    .replace(/^[\s|:]*-{2,}[\s|:-]*$/gm, ' ') // 표 정렬 행 / 수평선
    .replace(/\|/g, ' ') // 표 셀 구분자
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // 굵게
    .replace(/(\*|_)(.*?)\1/g, '$2') // 기울임
    .replace(/~~(.*?)~~/g, '$1') // 취소선
    .replace(/\s+/g, ' ') // 공백 정리
    .trim();
}
