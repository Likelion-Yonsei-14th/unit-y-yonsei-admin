import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '@/types/role';
import type { Permission } from '@/config/permissions';
import { useAuth } from './hooks';

function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold text-foreground">접근 권한이 없습니다</h1>
      <p className="text-sm text-muted-foreground">이 페이지에 접근할 수 있는 권한이 없어요.</p>
      <a href="/" className="mt-2 text-sm text-primary hover:underline">
        홈으로 돌아가기
      </a>
    </div>
  );
}

/**
 * 로그인 필수 가드. 미로그인 시 /login으로 이동 (returnTo 보존).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

/**
 * 로그인 하지 않은 사용자만 접근 가능 (로그인 페이지용).
 * 이미 로그인된 상태면 홈으로 튕겨냄.
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * 특정 역할만 접근 가능.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: readonly Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}

/**
 * 특정 권한만 접근 가능 (세분화된 액션 기반).
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <ForbiddenPage />;
  return <>{children}</>;
}
