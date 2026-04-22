import { useState } from "react";
import { Plus, Trash2, UserX, Edit, Users } from "lucide-react";
import { mockUsers, type MockUser as User } from "@/mocks/users";
import { PageHeaderAction } from "@/components/common/page-header-action";

type UserRole = "전체" | "Super" | "Master" | "Booth" | "Performer";

export function UserManagement() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("전체");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [users] = useState<User[]>(mockUsers);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const roles: UserRole[] = ["전체", "Super", "Master", "Booth", "Performer"];

  const toggleUser = (id: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUsers(newSelected);
  };

  const handleStatusChange = () => {
    if (selectedUsers.size === 0) {
      alert("유저를 선택해주세요.");
      return;
    }
    setShowStatusModal(true);
  };

  const handleRoleChange = () => {
    if (selectedUsers.size === 0) {
      alert("유저를 선택해주세요.");
      return;
    }
    setShowRoleModal(true);
  };

  const handleDeactivate = () => {
    alert(`${selectedUsers.size}명의 유저를 비활성화했습니다.`);
    setShowStatusModal(false);
    setSelectedUsers(new Set());
  };

  const handleActivate = () => {
    alert(`${selectedUsers.size}명의 유저를 활성화했습니다.`);
    setShowStatusModal(false);
    setSelectedUsers(new Set());
  };

  const handleRoleUpdate = (newRole: string) => {
    alert(`${selectedUsers.size}명의 유저 권한을 ${newRole}로 변경했습니다.`);
    setShowRoleModal(false);
    setSelectedUsers(new Set());
  };

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
        <div className="flex items-center gap-3">
          <PageHeaderAction tone="blue" onClick={handleStatusChange} icon={<UserX size={16} />}>
            유저 상태 변경
          </PageHeaderAction>
          <PageHeaderAction tone="purple" onClick={handleRoleChange} icon={<Edit size={16} />}>
            권한 변경
          </PageHeaderAction>
        </div>
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
      <div className="bg-background rounded-xl border border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-muted border-b border">
            <tr>
              <th className="w-12 py-4 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary"
                />
              </th>
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
                className="border-b border hover:bg-muted transition-colors"
              >
                <td className="py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                </td>
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

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">유저 상태 변경</h3>
            <p className="text-sm text-muted-foreground mb-6">
              선택된 {selectedUsers.size}명의 유저 상태를 변경합니다.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleActivate}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-200 transition-all duration-200"
              >
                활성화
              </button>
              <button
                onClick={handleDeactivate}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-lg hover:shadow-red-200 transition-all duration-200"
              >
                비활성화
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full px-6 py-3 border border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">권한 변경</h3>
            <p className="text-sm text-muted-foreground mb-6">
              선택된 {selectedUsers.size}명의 유저 권한을 변경합니다.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleRoleUpdate("Super")}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:shadow-lg hover:shadow-red-200 transition-all duration-200"
              >
                Super
              </button>
              <button
                onClick={() => handleRoleUpdate("Master")}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-200 transition-all duration-200"
              >
                Master
              </button>
              <button
                onClick={() => handleRoleUpdate("Booth")}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
              >
                Booth
              </button>
              <button
                onClick={() => handleRoleUpdate("Performer")}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-200 transition-all duration-200"
              >
                Performer
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
                className="w-full px-6 py-3 border border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}