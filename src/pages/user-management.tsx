import { useState } from "react";
import { useNavigate } from "react-router";
import { UserPlus, Users } from "lucide-react";
import { mockUsers, type MockUser as User } from "@/mocks/users";
import { PageHeaderAction } from "@/components/common/page-header-action";
import { useAuth } from "@/features/auth/hooks";

type UserRole = "전체" | "Super" | "Master" | "Booth" | "Performer";

export function UserManagement() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("전체");
  const [users] = useState<User[]>(mockUsers);
  const navigate = useNavigate();
  const { can } = useAuth();

  const roles: UserRole[] = ["전체", "Super", "Master", "Booth", "Performer"];

  const filteredUsers = selectedRole === "전체"
    ? users
    : users.filter(u => u.role === selectedRole);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
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

      {/* Role Filter */}
      <div className="flex gap-3 mb-6">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`
              px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${selectedRole === role
                ? 'bg-foreground text-primary-foreground shadow-lg'
                : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">정보작성여부</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr
                key={user.id}
                className="hover:bg-muted transition-colors"
              >
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{user.userId}</td>
                <td className="px-6 py-4">
                  <span className={`
                    inline-block px-3 py-1 rounded-full text-xs font-medium
                    ${user.role === 'Booth' ? 'bg-ds-primary-subtle text-ds-primary-pressed' : 'bg-ds-secondary-a-subtle text-ds-secondary-a-pressed'}
                  `}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.affiliation}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.boothName}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.performanceTeamName}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.representative}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.phone}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`
                    inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${user.infoCompleted
                      ? 'bg-ds-success text-white'
                      : 'bg-destructive text-destructive-foreground'
                    }
                  `}>
                    {user.infoCompleted ? 'O' : 'X'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
