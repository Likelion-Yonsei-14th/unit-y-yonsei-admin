import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, UserPlus, Users } from "lucide-react";
import { mockUsers, type MockUser as User } from "@/mocks/users";
import { PageHeaderAction } from "@/components/common/page-header-action";
import { useAuth } from "@/features/auth/hooks";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Role } from "@/types/role";

type RoleFilter = "전체" | Role;

/**
 * Super 는 배포 시점 1인(시스템 오너) 고정이라 UI 승격·강등 경로를
 * 의도적으로 배제한다. 옵션에도 내놓지 않는다.
 */
const ROLE_OPTIONS: Role[] = ["Master", "Booth", "Performer"];

/**
 * 역할 전이의 확인 레벨.
 * - 0: 무확인 즉시 반영 (교정/강등 성격의 저위험 전이)
 * - 1: 단순 Confirm (Master로의 승격)
 */
function getRoleChangeTier(from: Role, to: Role): 0 | 1 {
  if (from === to) return 0;
  if (to === "Master") return 1;
  return 0;
}

interface PendingRoleChange {
  user: User;
  to: Role;
}

/**
 * 상태 컬럼 정렬 상태. 스프레드시트 관행을 따른다:
 * - 'none': 원본 순서 유지
 * - 'asc': 오름차순 = false(비활성) 먼저 — ArrowUp
 * - 'desc': 내림차순 = true(활성) 먼저 — ArrowDown
 */
type SortDir = "none" | "asc" | "desc";

const nextSortDir: Record<SortDir, SortDir> = {
  none: "asc",
  asc: "desc",
  desc: "none",
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("전체");
  const [statusSort, setStatusSort] = useState<SortDir>("none");
  const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const navigate = useNavigate();
  const { user: currentUser, can } = useAuth();

  const roles: RoleFilter[] = ["전체", "Super", "Master", "Booth", "Performer"];
  const canEditRole = can("user.update.role");
  const canToggleStatus = can("user.deactivate");

  const filteredUsers =
    selectedRole === "전체" ? users : users.filter((u) => u.role === selectedRole);

  const visibleUsers = useMemo(() => {
    if (statusSort === "none") return filteredUsers;
    const copy = [...filteredUsers];
    copy.sort((a, b) => {
      if (a.active === b.active) return 0;
      if (statusSort === "desc") return a.active ? -1 : 1; // 활성 먼저
      return a.active ? 1 : -1; // 비활성 먼저
    });
    return copy;
  }, [filteredUsers, statusSort]);

  const SortIcon = statusSort === "asc" ? ArrowUp : statusSort === "desc" ? ArrowDown : ArrowUpDown;
  const sortLabel =
    statusSort === "asc" ? "비활성 먼저" : statusSort === "desc" ? "활성 먼저" : "정렬 없음";

  const applyStatus = (id: number, active: boolean) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
  };

  const handleToggleActive = (u: User) => {
    if (u.active) {
      // 활성 → 비활성은 로그인 차단으로 이어지므로 확인 받음.
      setPendingDeactivate(u);
    } else {
      // 비활성 → 활성은 복구 방향이라 즉시 반영.
      applyStatus(u.id, true);
    }
  };

  const confirmDeactivate = () => {
    if (pendingDeactivate) applyStatus(pendingDeactivate.id, false);
    setPendingDeactivate(null);
  };

  const handleRoleSelect = (u: User, to: Role) => {
    const tier = getRoleChangeTier(u.role, to);
    if (tier === 0) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: to } : x)));
      return;
    }
    setPendingRoleChange({ user: u, to });
  };

  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      setUsers((prev) =>
        prev.map((x) =>
          x.id === pendingRoleChange.user.id ? { ...x, role: pendingRoleChange.to } : x,
        ),
      );
    }
    setPendingRoleChange(null);
  };

  const roleBadgeClass = (role: Role) =>
    role === "Booth"
      ? "bg-ds-primary-subtle text-ds-primary-pressed"
      : "bg-ds-secondary-a-subtle text-ds-secondary-a-pressed";

  // 역할 변경 시 가장 긴 라벨("Performer") 기준으로 폭을 고정해 시각적 지터를 막는다.
  const roleBadgeSize = "h-7 w-28 rounded-full text-xs font-medium";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users size={32} />
          유저 관리
        </h1>
        {can("admin.create") && (
          <PageHeaderAction
            tone="green"
            onClick={() => navigate("/create-admin")}
            icon={<UserPlus size={16} />}
          >
            신규 계정 생성
          </PageHeaderAction>
        )}
      </div>

      {/* Role Filter */}
      <div className="flex gap-3 mb-6">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`
              px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${
                selectedRole === role
                  ? "bg-foreground text-primary-foreground shadow-lg"
                  : "bg-background text-muted-foreground border border-border hover:border-ds-border-strong"
              }
            `}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-background rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">No.</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">유저 ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">권한</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">소속</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">부스명</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">공연팀명</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">이름</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">전화번호</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">정보작성여부</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                <button
                  type="button"
                  onClick={() => setStatusSort((d) => nextSortDir[d])}
                  className="inline-flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                  title={`상태 정렬: ${sortLabel} (클릭하여 전환)`}
                  aria-label={`상태 정렬 — 현재: ${sortLabel}`}
                >
                  상태
                  <SortIcon
                    size={14}
                    className={statusSort === "none" ? "text-muted-foreground" : "text-primary"}
                  />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user, index) => {
              const isSelf = currentUser?.userId === user.userId;
              const rowDimmed = !user.active ? "opacity-60" : "";
              return (
                <tr
                  key={user.id}
                  className={`hover:bg-muted transition-colors ${rowDimmed}`}
                >
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{user.userId}</td>
                  <td className="px-6 py-4">
                    {canEditRole && !isSelf ? (
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleSelect(user, v as Role)}
                      >
                        <SelectTrigger
                          size="sm"
                          className={`${roleBadgeSize} border-0 shadow-none px-3 ${roleBadgeClass(user.role)}`}
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
                        className={`${roleBadgeSize} inline-flex items-center justify-center px-3 ${roleBadgeClass(user.role)}`}
                        title={isSelf ? "자신의 권한은 변경할 수 없습니다" : undefined}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.affiliation}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.boothName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.performanceTeamName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.representative}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.phone}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`
                        inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${
                          user.infoCompleted
                            ? "bg-ds-success text-white"
                            : "bg-destructive text-destructive-foreground"
                        }
                      `}
                    >
                      {user.infoCompleted ? "O" : "X"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Switch
                      checked={user.active}
                      onCheckedChange={() => handleToggleActive(user)}
                      disabled={!canToggleStatus || isSelf}
                      aria-label={user.active ? "비활성화" : "활성화"}
                      title={
                        isSelf
                          ? "자신의 상태는 변경할 수 없습니다"
                          : !canToggleStatus
                            ? "상태 변경 권한이 없습니다"
                            : undefined
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 비활성화 확인 — 차단 방향은 파괴성이 커서 경고 패널을 동반한다 */}
      <AlertDialog
        open={!!pendingDeactivate}
        onOpenChange={(o) => !o && setPendingDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유저 비활성화</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeactivate?.userId}
              {pendingDeactivate?.representative ? ` (${pendingDeactivate.representative})` : ""}
              을(를) 비활성화합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingDeactivate && (
            <div className="rounded-md border border-ds-warning bg-ds-warning-subtle px-3 py-2 text-sm text-ds-warning-pressed">
              비활성화 즉시 해당 유저는 로그인할 수 없게 됩니다. 되돌리려면 다시 활성화해야 합니다.
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>비활성화</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {pendingRoleChange?.user.userId}의 권한을{" "}
              <b>{pendingRoleChange?.user.role}</b> → <b>{pendingRoleChange?.to}</b> 로 변경합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
