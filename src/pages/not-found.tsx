import { Link, useLocation } from 'react-router';
import { FileQuestion } from 'lucide-react';

/**
 * 404 — 라우트 catch-all 매칭. AppLayout 안에서 마운트되므로 사이드바 유지.
 */
export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 md:p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion size={40} aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        요청하신 경로{' '}
        <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{location.pathname}</code>{' '}
        는 존재하지 않거나 이동/삭제됐어요.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-ds-primary-pressed"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
