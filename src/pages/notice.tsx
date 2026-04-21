import { useState } from "react";
import { Upload, Plus, Trash2, Edit2, FileText } from "lucide-react";
import { mockNotices, type Notice } from "@/mocks/notices";
import { PageHeaderAction } from "@/components/common/page-header-action";

export function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>(mockNotices);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const handleCreateNew = () => {
    setEditingNotice(null);
    setShowForm(true);
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setNotices(notices.filter(n => n.id !== id));
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNotice(null);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <FileText size={32} />
          총학생회 공지사항
        </h1>
        {!showForm && (
          <PageHeaderAction tone="blue" onClick={handleCreateNew} icon={<Plus size={16} />}>
            새 공지사항 작성
          </PageHeaderAction>
        )}
      </div>

      {/* Notice List */}
      {!showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">제목</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">등록일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">이미지</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">액션</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{notice.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{notice.content}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{notice.date}</td>
                  <td className="px-6 py-4">
                    {notice.hasImage ? (
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
                        onClick={() => handleEdit(notice)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(notice.id)}
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
          {notices.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Notice Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {editingNotice ? "공지사항 수정" : "새 공지사항 작성"}
            </h2>
            <button 
              onClick={handleCancel}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
            >
              목록으로
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">공지사항 제목</label>
              <input
                type="text"
                placeholder="공지사항 제목을 입력하세요"
                defaultValue={editingNotice?.title || ""}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">카드뉴스 이미지</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <Upload className="mx-auto mb-3 text-slate-400" size={32} />
                <p className="text-sm text-slate-600">인스타그램 카드뉴스 이미지를 업로드하세요</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">본문</label>
              <textarea
                rows={6}
                placeholder="공지사항 내용을 작성하세요"
                defaultValue={editingNotice?.content || ""}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button 
                onClick={handleCancel}
                className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200">
                {editingNotice ? "수정 완료" : "공지사항 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}