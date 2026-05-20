import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { hasPermission, type Permission } from '@/config/permissions';
import { changeMyPassword, fetchMe, login, logout } from './api';
import { useAuthStore } from './store';
import type { ChangePasswordPayload, CurrentUser, LoginPayload } from './types';

/** 소유자 판정을 위해 필요한 최소 필드. 실제 Booth/Performance 모델이 이를 만족해야 함. */
interface OwnableBooth {
  id: number;
}
interface OwnablePerformance {
  /** 공연 id — Performer 의 performanceTeamId 와 동일 식별자. */
  id: number;
}

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
        return user.performanceTeamId === perf.id;
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
 *
 * 백엔드 `AdminLoginResponse` 와 `CurrentAdminUserResponse` 가 동일 shape 가 아닐 수
 * 있어(로그인 응답엔 `boothId`/`performanceTeamId` 가 빠진 케이스 확인됨, 2026-05-20),
 * 로그인 직후 `/me` 를 한 번 더 호출해 완전한 user 를 store 에 넣는다. 이 한 번이
 * 빠지면 Booth 계정 첫 로그인 시 `useMyBooth` 의 `enabled: boothId!=null` gate 가
 * 영원히 false 가 되어 `/booth` 페이지가 무한 스피너에 멈춘다(새로고침은 앱
 * 부트스트랩이 `/me` 를 다시 호출해 풀린다).
 *
 * `/me` 실패 시엔 partial 로그인 응답으로 폴백 — 로그인 자체는 성공시킨다.
 */
export function useLogin() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoginPayload): Promise<CurrentUser> => {
      const loginUser = await login(payload);
      try {
        return await fetchMe();
      } catch {
        return loginUser;
      }
    },
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

/**
 * 본인 비밀번호 변경 뮤테이션.
 *
 * 백엔드는 변경 직후 현재 세션을 invalidate 한다 — 변경 후 같은 세션으로 다른
 * 요청을 보내면 401 이 난다. 호출부가 onSuccess 에서 로컬 상태를 비우고
 * `/login` 으로 보내야 다음 화면 진입에서 401 redirect 가 일어나지 않는다.
 *
 * 에러는 ApiError.body.code 로 분기:
 *  - A-021 INVALID_CURRENT_PASSWORD : 현재 비밀번호 불일치
 *  - A-020 PASSWORD_SAME_AS_CURRENT : 새 비밀번호 = 현재 비밀번호
 */
export function useChangeMyPassword() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changeMyPassword(payload),
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.');
      setUser(null);
      qc.clear();
      navigate('/login', { replace: true });
    },
  });
}
