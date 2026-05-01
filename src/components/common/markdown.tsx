import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

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
    <div className={`markdown-content text-sm leading-relaxed text-foreground ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
