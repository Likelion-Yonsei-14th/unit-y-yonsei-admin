import { useState } from "react";
import { Plus, Trash2, Edit2, Upload, Package } from "lucide-react";
import { mockLostItems, type LostItem } from "@/mocks/lost-items";
import { PageHeaderAction } from "@/components/common/page-header-action";

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
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Package size={32} />
          분실물 관리
        </h1>
        {!showForm && (
          <PageHeaderAction tone="blue" onClick={handleCreateNew} icon={<Plus size={16} />}>
            분실물 등록
          </PageHeaderAction>
        )}
      </div>

      {/* Lost Items List */}
      {!showForm && (
        <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">분실물명</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">발견 위치</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">등록일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">이미지</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">액션</th>
              </tr>
            </thead>
            <tbody>
              {lostItems.map((item) => (
                <tr key={item.id} className="border-b border hover:bg-muted transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{item.location}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{item.date}</td>
                  <td className="px-6 py-4">
                    {item.hasImage ? (
                      <span className="inline-block px-3 py-1 bg-ds-success-subtle text-ds-success-pressed rounded-full text-xs font-medium">
                        있음
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                        없음
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-primary hover:bg-ds-primary-subtle rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
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
            <div className="text-center py-12 text-ds-text-disabled">
              <p>등록된 분실물이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Lost Item Form */}
      {showForm && (
        <div className="bg-background rounded-2xl border border p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {editingItem ? "분실물 수정" : "분실물 등록"}
            </h2>
            <button 
              onClick={handleCancel}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors text-sm"
            >
              목록으로
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">분실물명</label>
                <input
                  type="text"
                  placeholder="분실물 이름을 입력하세요"
                  defaultValue={editingItem?.name || ""}
                  className="w-full px-4 py-3 border border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">발견 위치</label>
                <input
                  type="text"
                  placeholder="발견 위치를 입력하세요"
                  defaultValue={editingItem?.location || ""}
                  className="w-full px-4 py-3 border border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">상세 설명</label>
              <textarea
                rows={4}
                placeholder="분실물에 대한 상세 설명을 입력하세요"
                defaultValue={editingItem?.description || ""}
                className="w-full px-4 py-3 border border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">분실물 사진</label>
              <div className="border-2 border-dashed border-ds-border-strong rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
                <p className="text-sm text-muted-foreground">분실물 사진을 업로드하세요</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border">
              <button 
                onClick={handleCancel}
                className="px-6 py-3 border border text-foreground rounded-lg hover:bg-muted transition-colors"
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