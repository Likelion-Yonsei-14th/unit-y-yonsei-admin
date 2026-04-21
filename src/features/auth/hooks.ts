import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useCallback } from 'react';
import { hasPermission, type Permission } from '@/config/permissions';
import { login, logout } from './api';
import { useAuthStore } from './store';
import type { LoginPayload } from './types';

/** 소유자 판정을 위해 필요한 최소 필드. 실제 Booth/Performance 모델이 이를 만족해야 함. */
interface OwnableBooth { id: number }
interface OwnablePerformance { teamId: number }

/**
 * 현재 사용자 정보 + 권한 체크 헬퍼.
 *
 * - `can(permission)`: 역할 단위 권한 (booth.create 등)
 * - `canEditBooth(booth)`: Super/Master는 any, Booth는 자기 부스일 때만
 * - `canEditPerformance(perf)`: Super/Master는 any, Performer는 자기 팀일 때만
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  const can = useCallback(
    (permission: Permission) => hasPermission(user?.role, permission),
    [user?.role],
  );

  const canEditBooth = useCallback(
    (booth: OwnableBooth | null | undefined) => {
      if (!user || !booth) return false;
      if (hasPermission(user.role, 'booth.update.any')) return true;
      if (hasPermission(user.role, 'booth.update.own')) {
        return user.boothId === booth.id;
      }
      return false;
    },
    [user],
  );

  const canEditPerformance = useCallback(
    (perf: OwnablePerformance | null | undefined) => {
      if (!user || !perf) return false;
      if (hasPermission(user.role, 'performance.manage')) return true;
      if (hasPermission(user.role, 'performance.update.own')) {
        return user.performanceTeamId === perf.teamId;
      }
      return false;
    },
    [user],
  );

  return {
    user,
    isAuthenticated: !!user,
    isInitializing,
    can,
    canEditBooth,
    canEditPerformance,
    role: user?.role ?? null,
  };
}

/**
 * 로그인 뮤테이션.
 * 성공 시 쿼리 캐시를 비우고(이전 사용자 잔재 방지) 스토어에 user 저장 + 홈으로 이동.
 */
export function useLogin() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (user) => {
      qc.clear();
      setUser(user);
      navigate('/', { replace: true });
    },
  });
}

/**
 * 로그아웃.
 * 성공 실패 상관없이 로컬 상태는 비우고 /login으로 이동.
 */
export function useLogout() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      setUser(null);
      qc.clear();
      navigate('/login', { replace: true });
    },
  });
}
