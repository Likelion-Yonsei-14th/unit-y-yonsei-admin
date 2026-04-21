import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { mockLostItems, type LostItem } from "@/mocks/lost-items";

export function GeneralManagement() {
  const [lostItems, setLostItems] = useState<LostItem[]>(mockLostItems);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">기타 정보 관리</h1>

      {/* Notice Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">총학생회 공지사항</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">공지사항 제목</label>
            <input
              type="text"
              placeholder="공지사항 제목을 입력하세요"
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
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Lost & Found Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">분실물 관리</h2>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 flex items-center gap-2 text-sm">
            <Plus size={16} />
            분실물 등록
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
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
                  <td className="px-6 py-4 text-sm text-slate-800">{item.name}</td>
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
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booth Layout Mapping */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">부스 배치도 매칭</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">일자</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">부스 번호</label>
              <input
                type="text"
                placeholder="예: A-12"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">부스명</label>
              <input
                type="text"
                placeholder="부스 이름"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">단체명</label>
            <input
              type="text"
              placeholder="단체 이름"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <button className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
            매칭 정보 저장
          </button>
        </div>
      </div>
    </div>
  );
}
