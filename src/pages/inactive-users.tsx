import { useState } from "react";
import { UserX, RotateCcw } from "lucide-react";
import { mockInactiveUsers, type MockInactiveUser as User } from "@/mocks/users";
import { PageHeaderAction } from "@/components/common/page-header-action";

type UserRole = "전체" | "Super" | "Master" | "Booth" | "Performer";

export function InactiveUsers() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("전체");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [users, setUsers] = useState<User[]>(mockInactiveUsers);

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

  const handleReactivate = () => {
    if (selectedUsers.size === 0) {
      alert("재활성화할 유저를 선택해주세요.");
      return;
    }
    // 재활성화 로직
    alert(`${selectedUsers.size}명의 유저를 재활성화했습니다.`);
    setSelectedUsers(new Set());
  };

  const filteredUsers = selectedRole === "전체"
    ? users
    : users.filter(u => u.role === selectedRole);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <UserX size={32} />
            비활성 유저 목록
          </h1>
          <p className="text-slate-600 mt-2">비활성화된 유저를 관리합니다.</p>
        </div>
        <PageHeaderAction tone="green" onClick={handleReactivate} icon={<RotateCcw size={16} />}>
          유저 재활성화
        </PageHeaderAction>
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
                ? 'bg-slate-800 text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }
            `}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="w-12 py-4 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-green-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">No.</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">유저 ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">권한</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">소속</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">부스명</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">공연팀명</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">이름</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">전화번호</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">비활성일</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr
                key={user.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 rounded accent-green-500"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-800">{user.userId}</td>
                <td className="px-6 py-4">
                  <span className={`
                    inline-block px-3 py-1 rounded-full text-xs font-medium
                    ${user.role === 'Booth' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}
                  `}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.affiliation}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.boothName}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.performanceTeamName}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.representative}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.phone}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.deactivatedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <UserX size={48} className="mx-auto mb-4 opacity-50" />
            <p>비활성 유저가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
