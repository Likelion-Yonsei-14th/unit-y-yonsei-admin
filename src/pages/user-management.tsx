import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, UserPlus, Users, X } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusSort, setStatusSort] = useState<SortDir>("none");
  const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const navigate = useNavigate();
  const { user: currentUser, can } = useAuth();

  const roles: RoleFilter[] = ["전체", "Super", "Master", "Booth", "Performer"];
  const canEditRole = can("user.update.role");
  const canToggleStatus = can("user.deactivate");

  // 파이프: users → 검색 → 역할 필터 → 상태 정렬 → visibleUsers
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

  const filteredUsers =
    selectedRole === "전체"
      ? searchedUsers
      : searchedUsers.filter((u) => u.role === selectedRole);

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

  const hasActiveFilter = !!normalizedQuery || selectedRole !== "전체";

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

  // 역할 배지는 table-fixed 로 폭이 고정된 컬럼(w-[10%]) 을 그대로 채운다.
  // 배지에 절대 폭을 박으면 좁은 뷰포트에서 컬럼 경계를 넘어 인접 셀을 침범할 수 있어 w-full 로 붙인다.
  // SelectTrigger 기본 클래스에 `data-[size=sm]:h-8` 이 포함돼 있어
  // 같은 특이도의 `h-7` 로는 덮어써지지 않는다. data-variant 로 맞춰 높이를 통일.
  const roleBadgeSize = "h-7 data-[size=sm]:h-7 rounded-full text-xs font-medium";

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

      {/*
        Role Filter + 검색 — 한 줄에 좌측 pill, 우측 inline search.
        pill 은 가장 긴 라벨("Performer") 기준 min-w-28 로 폭 편차 제거.
        계정 규모(≤수백)를 감안해 서버 검색 없이 프론트에서 .includes() 로 충분.
      */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-3">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`
                min-w-28 px-5 py-2 rounded-full text-sm font-medium text-center transition-all duration-200
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

        <div className="relative w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-disabled pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="유저 ID·이름·소속·부스/공연팀명 검색"
            aria-label="유저 검색"
            className="w-full h-10 pl-9 pr-9 text-sm bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-ds-text-disabled"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
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
        <table className="w-full table-fixed">
          <thead className="bg-muted">
            <tr>
              <th className="w-[5%] px-6 py-4 text-left text-sm font-semibold text-foreground">No.</th>
              <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">유저 ID</th>
              <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">권한</th>
              <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">소속</th>
              <th className="w-[13%] px-6 py-4 text-left text-sm font-semibold text-foreground">부스명</th>
              <th className="w-[13%] px-6 py-4 text-left text-sm font-semibold text-foreground">공연팀명</th>
              <th className="w-[9%] px-6 py-4 text-left text-sm font-semibold text-foreground">이름</th>
              <th className="w-[11%] px-6 py-4 text-left text-sm font-semibold text-foreground">전화번호</th>
              <th className="w-[10%] px-6 py-4 text-center text-sm font-semibold text-foreground">정보작성여부</th>
              <th className="w-[9%] px-6 py-4 text-center text-sm font-semibold text-foreground">
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
            {visibleUsers.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  {hasActiveFilter
                    ? "검색 조건에 맞는 유저가 없습니다."
                    : "표시할 유저가 없습니다."}
                </td>
              </tr>
            )}
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
                  <td className="px-6 py-4 text-sm text-foreground truncate" title={user.userId}>{user.userId}</td>
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
                        title={isSelf ? "자신의 권한은 변경할 수 없습니다" : undefined}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={user.affiliation}>{user.affiliation}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={user.boothName}>{user.boothName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={user.performanceTeamName}>{user.performanceTeamName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={user.representative}>{user.representative}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={user.phone}>{user.phone}</td>
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
