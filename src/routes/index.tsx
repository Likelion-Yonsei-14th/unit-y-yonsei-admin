import { createBrowserRouter, Navigate } from 'react-router';
import { RequireAuth, RequireGuest } from '@/features/auth/guard';
import { AppLayout } from '@/components/layout/app-layout';

import { UserManagement } from '@/pages/user-management';
import { InactiveUsers } from '@/pages/inactive-users';
import { BoothManagement } from '@/pages/booth-management';
import { ReservationManagement } from '@/pages/reservation-management';
import { PerformanceManagement } from '@/pages/performance-management';
import { GeneralManagement } from '@/pages/general-management';
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
 * 세부 권한 체크는 각 페이지 안에서 useAuth().can() 또는 RequirePermission으로.
 * 현재는 라우트 레벨에서 로그인 여부만 체크.
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
      // 기본 진입: 피그마 원본대로 /booth로 리디렉트
      { index: true, element: <Navigate to="/booth" replace /> },

      { path: 'users', element: <UserManagement /> },
      { path: 'users/inactive', element: <InactiveUsers /> },

      { path: 'booth', element: <BoothManagement /> },

      { path: 'reservations', element: <ReservationManagement /> },

      { path: 'performance', element: <PerformanceManagement /> },

      { path: 'general', element: <GeneralManagement /> },
      { path: 'general/notice', element: <NoticePage /> },
      { path: 'general/lost-found', element: <LostFoundPage /> },
      { path: 'general/booth-layout', element: <BoothLayoutPage /> },
      { path: 'general/performance-review', element: <PerformanceReviewPage /> },

      { path: 'create-admin', element: <CreateAdmin /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
