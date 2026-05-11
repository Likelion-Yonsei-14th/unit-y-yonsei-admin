import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Copy, KeyRound, Search, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminUsers, useResetUserPassword, useSetUserRole } from '@/features/users/hooks';
import type { AdminUser as User } from '@/features/users/types';
import { PageHeaderAction } from '@/components/common/page-header-action';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { useAuth } from '@/features/auth/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Role } from '@/types/role';

type RoleFilter = '전체' | Role;

/**
 * Super 는 배포 시점 1인(시스템 오너) 고정이라 UI 승격·강등 경로를
 * 의도적으로 배제한다. 옵션에도 내놓지 않는다.
 */
const ROLE_OPTIONS: Role[] = ['Master', 'Booth', 'Performer'];

/**
 * 역할 전이의 확인 레벨.
 * - 0: 무확인 즉시 반영 (교정/강등 성격의 저위험 전이)
 * - 1: 단순 Confirm (Master로의 승격)
 */
function getRoleChangeTier(from: Role, to: Role): 0 | 1 {
  if (from === to) return 0;
  if (to === 'Master') return 1;
  return 0;
}

interface PendingRoleChange {
  user: User;
  to: Role;
}

/**
 * 비밀번호 재설정 결과 다이얼로그 상태 — 응답으로 받은 임시 비번을 운영자에게
 * 1회 노출. 닫으면 다시 못 보므로 항상 결과 다이얼로그로 노출하고 토스트로
 * 갈음하지 않는다. (API 응답 모델 `ResetPasswordResult` 와 구분하기 위해
 * UI 상태용 이름은 `DialogState` 접미사.)
 */
interface ResetPasswordDialogState {
  user: User;
  tempPassword: string;
}

export function UserManagement() {
  const usersQuery = useAdminUsers();
  // useMemo 로 묶어 매 렌더 새 빈 배열이 만들어지지 않게 — 하위 useMemo deps 안정.
  const users: User[] = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const setRoleMutation = useSetUserRole();
  const resetPasswordMutation = useResetUserPassword();

  const [selectedRole, setSelectedRole] = useState<RoleFilter>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<User | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordDialogState | null>(null);
  const navigate = useNavigate();
  const { user: currentUser, can } = useAuth();

  const roles: RoleFilter[] = ['전체', 'Super', 'Master', 'Booth', 'Performer'];
  const canEditRole = can('user.update.role');
  const canResetPassword = can('user.password.reset');

  // 역할별 계정 수. pill 라벨에 "Super | 3" 형태로 노출해 필터 클릭 전에도 분포 파악.
  const roleCounts = useMemo<Record<RoleFilter, number>>(() => {
    const counts: Record<RoleFilter, number> = {
      전체: users.length,
      Super: 0,
      Master: 0,
      Booth: 0,
      Performer: 0,
    };
    for (const u of users) counts[u.role] += 1;
    return counts;
  }, [users]);

  // 파이프: users → 검색 → 역할 필터 → visibleUsers
  // 전화번호/이메일은 검색 대상 제외 — 값 형태가 제각각이라 매칭 체감이 나쁨.
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchedUsers = useMemo(() => {
    if (!normalizedQuery) return users;
    return users.filter((u) => {
      const haystack = [
        u.userId,
        u.representative,
        u.affiliation,
        u.boothName,
        u.performanceTeamName,
      ];
      return haystack.some((f) => f.toLowerCase().includes(normalizedQuery));
    });
  }, [users, normalizedQuery]);

  const visibleUsers = useMemo(
    () =>
      selectedRole === '전체'
        ? searchedUsers
        : searchedUsers.filter((u) => u.role === selectedRole),
    [searchedUsers, selectedRole],
  );

  const hasActiveFilter = !!normalizedQuery || selectedRole !== '전체';

  const applyRole = (id: number, role: Role) => {
    setRoleMutation.mutate(
      { id, role },
      {
        onError: () => toast.error('권한 변경에 실패했습니다. 잠시 후 다시 시도해주세요.'),
      },
    );
  };

  const handleRoleSelect = (u: User, to: Role) => {
    const tier = getRoleChangeTier(u.role, to);
    if (tier === 0) {
      applyRole(u.id, to);
      return;
    }
    setPendingRoleChange({ user: u, to });
  };

  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      applyRole(pendingRoleChange.user.id, pendingRoleChange.to);
    }
    setPendingRoleChange(null);
  };

  const confirmPasswordReset = () => {
    const target = pendingPasswordReset;
    if (!target) return;
    setPendingPasswordReset(null);
    resetPasswordMutation.mutate(
      { id: target.id },
      {
        onSuccess: ({ tempPassword }) => {
          setResetResult({ user: target, tempPassword });
        },
        onError: () => toast.error('비밀번호 재설정에 실패했습니다. 잠시 후 다시 시도해주세요.'),
      },
    );
  };

  const copyTempPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.tempPassword);
      toast.success('임시 비밀번호를 복사했습니다.');
    } catch {
      // HTTPS 가 아닌 환경(개발 IP 접속 등) 에선 clipboard API 가 throw — 수동 복사 유도.
      toast.error('자동 복사에 실패했습니다. 표시된 비밀번호를 직접 복사해주세요.');
    }
  };

  const roleBadgeClass = (role: Role) =>
    role === 'Booth'
      ? 'bg-ds-primary-subtle text-ds-primary-pressed'
      : 'bg-ds-secondary-a-subtle text-ds-secondary-a-pressed';

  // 역할 배지는 table-fixed 로 폭이 고정된 컬럼(w-[10%]) 을 그대로 채운다.
  // 배지에 절대 폭을 박으면 좁은 뷰포트에서 컬럼 경계를 넘어 인접 셀을 침범할 수 있어 w-full 로 붙인다.
  // SelectTrigger 기본 클래스에 `data-[size=sm]:h-8` 이 포함돼 있어
  // 같은 특이도의 `h-7` 로는 덮어써지지 않는다. data-variant 로 맞춰 높이를 통일.
  const roleBadgeSize = 'h-7 data-[size=sm]:h-7 rounded-full text-xs font-medium';

  if (usersQuery.isLoading) {
    return (
      <div className="p-4 md:p-8">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (usersQuery.isError) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-2xl p-6 text-center">
          <p className="mb-3">유저 정보를 가져오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => usersQuery.refetch()}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users size={32} />
          유저 관리
        </h1>
        {can('admin.create') && (
          <PageHeaderAction
            tone="green"
            onClick={() => navigate('/create-admin')}
            icon={<UserPlus size={16} />}
          >
            신규 계정 생성
          </PageHeaderAction>
        )}
      </div>

      {/*
        Role Filter + 검색 — 한 줄에 좌측 pill, 우측 inline search.
        pill 은 "Performer | 99" 형태의 라벨·카운트 동반 노출을 고려해 min-w-32 로 폭 편차 제거.
        계정 규모(≤수백)를 감안해 서버 검색 없이 프론트에서 .includes() 로 충분.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              aria-pressed={selectedRole === role}
              aria-label={`${role} ${roleCounts[role]}명`}
              className={`
                min-w-32 px-5 py-2 rounded-full text-sm font-medium text-center transition-all duration-200
                ${
                  selectedRole === role
                    ? 'bg-foreground text-primary-foreground shadow-lg'
                    : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
                }
              `}
            >
              {role}
              <span aria-hidden="true" className="mx-1.5 opacity-50">
                |
              </span>
              {roleCounts[role]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-disabled pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ID·이름·소속·부스/팀명 검색"
            aria-label="유저 검색"
            className="w-full h-10 pl-9 pr-9 text-sm bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-ds-text-disabled"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/*
        Users Table

        필터 전환 시 테이블 형태가 흔들리지 않도록 table-fixed + 명시적 컬럼 폭.
        auto-layout 은 현재 보이는 행의 내용에 따라 컬럼 폭을 다시 계산하므로,
        부스/공연팀처럼 특정 필터에서 전부 비게 되는 컬럼이 생기면 지터가 발생.
      */}
      <div className="bg-background rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed">
            <thead className="bg-muted">
              <tr>
                <th className="w-[5%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  No.
                </th>
                <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  유저 ID
                </th>
                <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  권한
                </th>
                <th className="w-[12%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  소속
                </th>
                <th className="w-[18%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  부스/공연팀
                </th>
                <th className="w-[11%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  이름
                </th>
                <th className="w-[13%] px-6 py-4 text-left text-sm font-semibold text-foreground">
                  전화번호
                </th>
                {/* 한국어 다음절 헤더는 좁은 컬럼 폭에서 '부' 같은 한 글자만 떨어져 어색하게
                    줄바꿈됨 — 의미 단위로 명시적 줄바꿈해 시각 안정성 확보. */}
                <th className="w-[10%] px-6 py-4 text-center text-sm font-semibold text-foreground leading-tight">
                  정보작성
                  <br />
                  여부
                </th>
                <th className="w-[11%] px-6 py-4 text-center text-sm font-semibold text-foreground leading-tight">
                  비밀번호
                  <br />
                  재설정
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    {hasActiveFilter
                      ? '검색 조건에 맞는 유저가 없습니다.'
                      : '표시할 유저가 없습니다.'}
                  </td>
                </tr>
              )}
              {visibleUsers.map((user, index) => {
                const isSelf = currentUser?.userId === user.userId;
                // 역할에 따라 상호 배타적 — 한 컬럼에 병합해서 렌더.
                const boothOrTeamName =
                  user.role === 'Booth'
                    ? user.boothName
                    : user.role === 'Performer'
                      ? user.performanceTeamName
                      : '-';
                return (
                  <tr key={user.id} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground truncate" title={user.userId}>
                      {user.userId}
                    </td>
                    <td className="px-6 py-4">
                      {canEditRole && !isSelf ? (
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleSelect(user, v as Role)}
                        >
                          <SelectTrigger
                            size="sm"
                            className={`${roleBadgeSize} w-full border-0 shadow-none px-3 ${roleBadgeClass(user.role)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={`${roleBadgeSize} w-full inline-flex items-center justify-center px-3 ${roleBadgeClass(user.role)}`}
                          title={isSelf ? '자신의 권한은 변경할 수 없습니다' : undefined}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-muted-foreground truncate"
                      title={user.affiliation}
                    >
                      {user.affiliation}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-muted-foreground truncate"
                      title={boothOrTeamName}
                    >
                      {boothOrTeamName}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-muted-foreground truncate"
                      title={user.representative}
                    >
                      {user.representative}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-muted-foreground truncate"
                      title={user.phone}
                    >
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`
                        inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${
                          user.infoCompleted
                            ? 'bg-ds-success text-white'
                            : 'bg-destructive text-destructive-foreground'
                        }
                      `}
                      >
                        {user.infoCompleted ? 'O' : 'X'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setPendingPasswordReset(user)}
                        disabled={!canResetPassword || isSelf || resetPasswordMutation.isPending}
                        title={
                          isSelf
                            ? '자신의 비밀번호는 재설정할 수 없습니다'
                            : !canResetPassword
                              ? '비밀번호 재설정 권한이 없습니다'
                              : '임시 비밀번호 재발급'
                        }
                        aria-label="임시 비밀번호 재발급"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <KeyRound size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 권한 변경 확인 */}
      <AlertDialog
        open={!!pendingRoleChange}
        onOpenChange={(o) => {
          if (!o) setPendingRoleChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>권한 변경</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange?.user.userId}의 권한을 <b>{pendingRoleChange?.user.role}</b> →{' '}
              <b>{pendingRoleChange?.to}</b> 로 변경합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 비밀번호 재설정 확인 — 기존 비번이 즉시 무효화되므로 경고 패널 동반. */}
      <AlertDialog
        open={!!pendingPasswordReset}
        onOpenChange={(o) => !o && setPendingPasswordReset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>임시 비밀번호 재발급</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPasswordReset?.userId}
              {pendingPasswordReset?.representative
                ? ` (${pendingPasswordReset.representative})`
                : ''}
              의 비밀번호를 재설정합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-ds-warning bg-ds-warning-subtle px-3 py-2 text-sm text-ds-warning-pressed">
            재발급 즉시 기존 비밀번호로는 로그인할 수 없습니다. 새 임시 비밀번호는 다음 화면에서
            <b> 한 번만</b> 노출되므로 운영자가 사용자에게 직접 전달해야 합니다.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPasswordReset}>재발급</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*
        재설정 결과 — 임시 비번 1회 노출. 닫으면 다시 못 봄.
        '1회 노출' 원칙상 실수로 닫히면 비번을 잃으므로
        overlay 클릭 / ESC 로는 닫히지 않게 막고, 명시적 닫기 버튼만 허용.
      */}
      <Dialog
        open={!!resetResult}
        onOpenChange={(o) => {
          if (!o) setResetResult(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>임시 비밀번호 발급 완료</DialogTitle>
            <DialogDescription>
              {resetResult?.user.userId}
              {resetResult?.user.representative ? ` (${resetResult.user.representative})` : ''}의 새
              임시 비밀번호입니다. 사용자에게 전달 후 첫 로그인 시 변경하도록 안내해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
            <code className="flex-1 select-all font-mono text-sm text-foreground break-all">
              {resetResult?.tempPassword}
            </code>
            <button
              type="button"
              onClick={copyTempPassword}
              aria-label="임시 비밀번호 복사"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-foreground bg-background border border-border hover:bg-muted hover:border-ds-border-strong transition-colors"
            >
              <Copy size={14} />
              복사
            </button>
          </div>
          <p className="text-xs text-ds-warning-pressed">
            이 창을 닫으면 비밀번호는 다시 볼 수 없습니다.
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setResetResult(null)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-ds-primary-pressed transition-colors"
            >
              닫기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
