import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

/**
 * 403 — RequirePermission/RequireRole 가 권한 없을 때 렌더하는 페이지.
 * AppLayout 안에서 마운트되므로 사이드바를 유지한 채 본문 영역만 채운다.
 */
export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 md:p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ds-error-subtle text-ds-error-pressed">
        <ShieldAlert size={40} aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">접근 권한이 없습니다</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        이 페이지에 접근할 수 있는 권한이 없어요. 본인 역할에 허용된 메뉴는 좌측 사이드바에서 확인할
        수 있습니다.
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
