import { createBrowserRouter, Navigate } from 'react-router';
import { RequireAuth, RequireGuest, RequirePermission } from '@/features/auth/guard';
import { useAuth } from '@/features/auth/hooks';
import { AppLayout } from '@/components/layout/app-layout';

/**
 * 로그인 직후 `/`에 접근했을 때 역할에 맞는 기본 페이지로 리다이렉트.
 * RequireAuth 하위에 있으므로 user가 null인 경우는 고려하지 않아도 된다.
 */
function DefaultLanding() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'Booth':
      return <Navigate to="/booth" replace />;
    case 'Performer':
      return <Navigate to="/performance" replace />;
    case 'Super':
    case 'Master':
    default:
      return <Navigate to="/users" replace />;
  }
}

import { UserManagement } from '@/pages/user-management';
import { BoothManagement } from '@/pages/booth-management';
import { ReservationManagement } from '@/pages/reservation-management';
import { PerformanceManagement } from '@/pages/performance-management';
import { NoticePage } from '@/pages/notice';
import { LostFoundPage } from '@/pages/lost-found';
import { BoothLayoutPage } from '@/pages/booth-layout';
import { PerformanceReviewPage } from '@/pages/performance-review';
import { CreateAdmin } from '@/pages/create-admin';
import { LoginPage } from '@/pages/login';

/**
 * 라우터 정의.
 *
 * 구조:
 *   /login — 비로그인 전용 (이미 로그인 되어있으면 /로 튕김)
 *   /*     — 로그인 필요. AppLayout 내부에 중첩
 *
 * 라우트 레벨에서 로그인 + 권한까지 가드. 사이드바는 nav.ts의 requires로 이미 감춰주지만
 * URL 직접 입력 루트도 막아둔다. 각 라우트의 permission은 nav.ts의 requires와 동일하게 맞춘다.
 * 페이지 내부의 세부 액션(삭제/변경 버튼 등)은 useAuth().can()으로 별도 체크.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RequireGuest>
        <LoginPage />
      </RequireGuest>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      // 기본 진입: 역할별로 다른 페이지로 보낸다.
      // Booth→/booth, Performer→/performance, Super·Master→/users.
      { index: true, element: <DefaultLanding /> },

      {
        path: 'users',
        element: (
          <RequirePermission permission="user.read">
            <UserManagement />
          </RequirePermission>
        ),
      },

      {
        path: 'booth',
        element: (
          <RequirePermission permission="booth.update.own">
            <BoothManagement />
          </RequirePermission>
        ),
      },

      {
        path: 'reservations',
        element: (
          <RequirePermission permission="reservation.read">
            <ReservationManagement />
          </RequirePermission>
        ),
      },

      {
        path: 'performance',
        element: (
          <RequirePermission permission="performance.read">
            <PerformanceManagement />
          </RequirePermission>
        ),
      },

      // '/general'은 순수 그룹 헤더 — 자체 페이지가 없어 첫 자식으로 리디렉트.
      // nav.ts에서 사이드바도 path 링크 없이 토글로만 동작하도록 설정돼 있다.
      { path: 'general', element: <Navigate to="/general/notice" replace /> },
      {
        path: 'general/notice',
        element: (
          <RequirePermission permission="notice.manage">
            <NoticePage />
          </RequirePermission>
        ),
      },
      {
        path: 'general/lost-found',
        element: (
          <RequirePermission permission="lostfound.read">
            <LostFoundPage />
          </RequirePermission>
        ),
      },
      {
        path: 'general/booth-layout',
        element: (
          <RequirePermission permission="boothlayout.read">
            <BoothLayoutPage />
          </RequirePermission>
        ),
      },
      {
        path: 'general/performance-review',
        element: (
          <RequirePermission permission="performancereview.read">
            <PerformanceReviewPage />
          </RequirePermission>
        ),
      },

      {
        path: 'create-admin',
        element: (
          <RequirePermission permission="admin.create">
            <CreateAdmin />
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
