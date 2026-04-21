import { useState } from "react";
import { Plus, Trash2, Edit2, Upload } from "lucide-react";
import { mockLostItems, type LostItem } from "@/mocks/lost-items";

export function LostFoundPage() {
  const [lostItems, setLostItems] = useState<LostItem[]>(mockLostItems);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LostItem | null>(null);

  const handleCreateNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: LostItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setLostItems(lostItems.filter(item => item.id !== id));
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800">분실물 관리</h1>
        {!showForm && (
          <button 
            onClick={handleCreateNew}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            분실물 등록
          </button>
        )}
      </div>

      {/* Lost Items List */}
      {!showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">분실물명</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">발견 위치</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">등록일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">이미지</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">액션</th>
              </tr>
            </thead>
            <tbody>
              {lostItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.location}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.date}</td>
                  <td className="px-6 py-4">
                    {item.hasImage ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        있음
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        없음
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lostItems.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>등록된 분실물이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Lost Item Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {editingItem ? "분실물 수정" : "분실물 등록"}
            </h2>
            <button 
              onClick={handleCancel}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
            >
              목록으로
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">분실물명</label>
                <input
                  type="text"
                  placeholder="분실물 이름을 입력하세요"
                  defaultValue={editingItem?.name || ""}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">발견 위치</label>
                <input
                  type="text"
                  placeholder="발견 위치를 입력하세요"
                  defaultValue={editingItem?.location || ""}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">상세 설명</label>
              <textarea
                rows={4}
                placeholder="분실물에 대한 상세 설명을 입력하세요"
                defaultValue={editingItem?.description || ""}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">분실물 사진</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <Upload className="mx-auto mb-3 text-slate-400" size={32} />
                <p className="text-sm text-slate-600">분실물 사진을 업로드하세요</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button 
                onClick={handleCancel}
                className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200">
                {editingItem ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}