import { useState } from "react";
import { Plus, Trash2, Instagram, Youtube, Music, Check, Edit, X, Star, Upload } from "lucide-react";
import {
  mockPerformanceData,
  mockSetlist,
  type SetlistItem as Setlist,
  type PerformanceImage,
  type PerformanceData,
} from "@/mocks/performance-profile";

export function PerformanceManagement() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 실제 API 연결 시 useMyPerformance()로 교체
  const [performanceData, setPerformanceData] = useState<PerformanceData>(mockPerformanceData);

  const [editingData, setEditingData] = useState<PerformanceData>(performanceData);

  const [performanceImages, setPerformanceImages] = useState<PerformanceImage[]>([]);
  const [editingImages, setEditingImages] = useState<PerformanceImage[]>([]);

  const [setlist, setSetlist] = useState<Setlist[]>(mockSetlist);

  const [editingSetlist, setEditingSetlist] = useState<Setlist[]>(setlist);

  const handleEdit = () => {
    setEditingData(performanceData);
    setEditingSetlist([...setlist]);
    setEditingImages([...performanceImages]);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: PerformanceImage[] = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        url: URL.createObjectURL(file),
        isMain: editingImages.length === 0 && index === 0,
      }));
      setEditingImages([...editingImages, ...newImages]);
    }
  };

  const setMainImage = (id: number) => {
    setEditingImages(editingImages.map(img => ({
      ...img,
      isMain: img.id === id,
    })));
  };

  const removeImage = (id: number) => {
    const filtered = editingImages.filter(img => img.id !== id);
    if (filtered.length > 0 && !filtered.some(img => img.isMain)) {
      filtered[0].isMain = true;
    }
    setEditingImages(filtered);
  };

  const addSetlistItem = () => {
    const newItem: Setlist = {
      id: Date.now(),
      order: editingSetlist.length + 1,
      songName: "",
      artist: "",
    };
    setEditingSetlist([...editingSetlist, newItem]);
  };

  const removeSetlistItem = (id: number) => {
    setEditingSetlist(editingSetlist.filter(item => item.id !== id));
  };

  const updateSetlistItem = (id: number, field: 'songName' | 'artist', value: string) => {
    setEditingSetlist(editingSetlist.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = () => {
    // 저장 로직
    setPerformanceData(editingData);
    setSetlist(editingSetlist);
    setPerformanceImages(editingImages);
    setIsEditMode(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800">공연 정보 관리</h1>
        
        <div className="flex items-center gap-3">
          {/* Edit Button */}
          {!isEditMode && (
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 flex items-center gap-2"
            >
              <Edit size={18} />
              <span>편집</span>
            </button>
          )}
          
          {/* Cancel and Save Buttons */}
          {isEditMode && (
            <>
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200 flex items-center gap-2"
              >
                <X size={18} />
                <span>취소</span>
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 flex items-center gap-2"
              >
                <Check size={18} />
                <span>저장</span>
              </button>
            </>
          )}
          
          {/* Save Success Toast */}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-lg animate-fade-in">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
              <span className="font-medium">저장이 완료되었습니다!</span>
            </div>
          )}
        </div>
      </div>

      {/* Performance Team Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">공연팀 프로필</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">공연팀명</label>
            <input
              type="text"
              placeholder="공연팀 이름을 입력하세요"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={editingData.teamName}
              onChange={(e) => setEditingData({ ...editingData, teamName: e.target.value })}
              disabled={!isEditMode}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">공연팀 소개글</label>
            <textarea
              rows={5}
              placeholder="동아리 소개, 구성원 소개 등을 작성하세요"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              value={editingData.description}
              onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
              disabled={!isEditMode}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">SNS 링크 (선택)</label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Instagram size={20} className="text-white" />
                </div>
                <input
                  type="text"
                  placeholder="인스타그램 URL"
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={editingData.instagramUrl}
                  onChange={(e) => setEditingData({ ...editingData, instagramUrl: e.target.value })}
                  disabled={!isEditMode}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-lg">
                  <Youtube size={20} className="text-white" />
                </div>
                <input
                  type="text"
                  placeholder="유튜브 URL"
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={editingData.youtubeUrl}
                  onChange={(e) => setEditingData({ ...editingData, youtubeUrl: e.target.value })}
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">공연팀 이미지</label>
            
            {/* Upload Area - Only in Edit Mode */}
            {isEditMode && (
              <label className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="mx-auto mb-3 text-slate-400" size={32} />
                <p className="text-sm text-slate-600 mb-1">이미지를 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-slate-500">여러 장의 이미지를 선택할 수 있습니다</p>
              </label>
            )}
            
            {/* Image Preview Grid */}
            {(isEditMode ? editingImages : performanceImages).length > 0 && (
              <div className={`${isEditMode ? 'mt-4' : ''} grid grid-cols-4 gap-4`}>
                {(isEditMode ? editingImages : performanceImages).map((image) => (
                  <div 
                    key={image.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border-2 transition-all"
                    style={{ borderColor: image.isMain ? '#3b82f6' : '#e2e8f0' }}
                  >
                    <img 
                      src={image.url} 
                      alt="공연팀 이미지" 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Main Badge */}
                    {image.isMain && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                        <Star size={12} fill="white" />
                        대표
                      </div>
                    )}
                    
                    {/* Hover Overlay - Only in Edit Mode */}
                    {isEditMode && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                        {!image.isMain && (
                          <button
                            onClick={() => setMainImage(image.id)}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-blue-500 hover:text-white transition-all"
                          >
                            대표로 설정
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty State - View Mode */}
            {!isEditMode && performanceImages.length === 0 && (
              <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
                <Upload className="mx-auto mb-3 text-slate-300" size={32} />
                <p className="text-sm text-slate-400">등록된 이미지가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Timetable */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">공연 타임테이블</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">공연 시작 시간</label>
            <input
              type="time"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={editingData.startTime}
              onChange={(e) => setEditingData({ ...editingData, startTime: e.target.value })}
              disabled={!isEditMode}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">공연 종료 시간</label>
            <input
              type="time"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={editingData.endTime}
              onChange={(e) => setEditingData({ ...editingData, endTime: e.target.value })}
              disabled={!isEditMode}
            />
          </div>
        </div>
      </div>

      {/* Setlist Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">공연 셋리스트</h2>
          {isEditMode && (
            <button
              onClick={addSetlistItem}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              곡 추가
            </button>
          )}
        </div>

        <div className="space-y-3">
          {(isEditMode ? editingSetlist : setlist).map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-blue-200">
                {index + 1}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="곡명"
                  value={item.songName}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-700"
                  onChange={(e) => updateSetlistItem(item.id, 'songName', e.target.value)}
                  disabled={!isEditMode}
                />
                <input
                  type="text"
                  placeholder="원곡자"
                  value={item.artist}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-700"
                  onChange={(e) => updateSetlistItem(item.id, 'artist', e.target.value)}
                  disabled={!isEditMode}
                />
              </div>
              {isEditMode && (
                <button
                  onClick={() => removeSetlistItem(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        {(isEditMode ? editingSetlist : setlist).length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Music size={48} className="mx-auto mb-4 opacity-50" />
            <p>셋리스트가 비어있습니다. {isEditMode && '곡을 추가해주세요.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}