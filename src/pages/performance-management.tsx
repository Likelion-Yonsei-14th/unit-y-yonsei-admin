import { useEffect, useState, type ChangeEvent } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Plus, Trash2, Instagram, Youtube, Music, Check, Edit, X, Star, Upload } from "lucide-react";
import { useAuth } from "@/features/auth/hooks";
import { useMyPerformance, usePerformance } from "@/features/performances/hooks";
import {
  PERFORMANCE_STAGES,
  type PerformanceDetail,
  type PerformanceImage,
  type PerformanceStage,
  type SetlistItem,
} from "@/features/performances/types";
import { FESTIVAL_DATES } from "@/features/booth-layout/sections";

/**
 * 공연 상세/편집. 두 진입 경로:
 *   - `/performance/me`           — Performer 본인 팀 (useMyPerformance)
 *   - `/performance/:teamId`      — Super/Master 가 리스트에서 선택한 팀 (usePerformance)
 * useParams 결과만으로 분기해서 두 훅 중 한 쪽만 실제로 fetch 한다(enabled 가름).
 */
export function PerformanceManagement() {
  const { teamId: teamIdParam } = useParams<{ teamId: string }>();
  const isMe = !teamIdParam || teamIdParam === 'me';
  // 숫자 파라미터는 양의 정수일 때만 유효. Number('abc') = NaN 같은 허위 쿼리 방지.
  const parsedTeamId = isMe ? null : Number(teamIdParam);
  const validTeamId = parsedTeamId != null && Number.isInteger(parsedTeamId) && parsedTeamId > 0
    ? parsedTeamId
    : null;
  const isInvalidRoute = !isMe && validTeamId === null;

  const byIdQuery = usePerformance(validTeamId);
  const myQuery = useMyPerformance();
  const { data, isLoading, isError, refetch } = isMe ? myQuery : byIdQuery;

  const { canEditPerformance } = useAuth();
  const canEdit = data ? canEditPerformance({ teamId: data.teamId }) : false;

  const [isEditMode, setIsEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [performanceData, setPerformanceData] = useState<PerformanceDetail | null>(null);
  const [editingData, setEditingData] = useState<PerformanceDetail | null>(null);

  const [performanceImages, setPerformanceImages] = useState<PerformanceImage[]>([]);
  const [editingImages, setEditingImages] = useState<PerformanceImage[]>([]);

  const [setlist, setSetlist] = useState<SetlistItem[]>([]);
  const [editingSetlist, setEditingSetlist] = useState<SetlistItem[]>([]);

  // data 가 도착/변경되면 view 상태를 재동기화. 편집 중엔 덮어쓰지 않는다
  // (서버 refetch 타이밍이 편집 중 사용자의 입력을 날려버리지 않도록).
  useEffect(() => {
    if (!data || isEditMode) return;
    setPerformanceData(data);
    setPerformanceImages(data.images);
    setSetlist(data.setlist);
  }, [data, isEditMode]);

  // 편집 중 날짜를 바꿨을 때, 기존 stage 가 새 날짜에서 운영되지 않는다면
  // 해당 날짜의 첫 유효 스테이지로 자동 보정. 저장 payload 에 (date, stage) 불일치가
  // 넘어가지 않게 한다. setter 에는 prev 기반으로 써서 stale closure 이슈 회피.
  useEffect(() => {
    setEditingData(prev => {
      if (!prev) return prev;
      if (PERFORMANCE_STAGES[prev.stage].dates.includes(prev.date)) return prev;
      const firstValid = (Object.values(PERFORMANCE_STAGES) as typeof PERFORMANCE_STAGES[PerformanceStage][])
        .find(s => s.dates.includes(prev.date));
      return firstValid ? { ...prev, stage: firstValid.id } : prev;
    });
  }, [editingData?.date]);

  const handleEdit = () => {
    if (!performanceData) return;
    setEditingData(performanceData);
    setEditingSetlist([...setlist]);
    setEditingImages([...performanceImages]);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
    const newItem: SetlistItem = {
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
    if (!editingData) return;
    // TODO: 실제 저장 mutation 연결. 지금은 local state 에만 반영해 UI 흐름만 검증.
    setPerformanceData(editingData);
    setSetlist(editingSetlist);
    setPerformanceImages(editingImages);
    setIsEditMode(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  // URL 의 teamId 가 숫자가 아닌 경우 — 쿼리 자체가 안 돌므로 바로 빈 상태로.
  if (isInvalidRoute) {
    return (
      <div className="p-8">
        <div className="bg-muted rounded-2xl p-12 text-center">
          <Music size={40} className="mx-auto mb-4 text-ds-text-disabled" />
          <p className="text-muted-foreground">잘못된 공연팀 경로입니다.</p>
        </div>
      </div>
    );
  }

  // 실제로 fetch 가 도는 동안만 로딩 화면. enabled=false (예: Performer 인데 소속 팀 없음)
  // 상태는 "쿼리가 안 나간" 것이라 로딩이 아닌 빈 상태로 떨어져야 한다.
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">공연 정보를 불러오는 중…</div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-2xl p-6 text-center">
          <p className="mb-3">공연 정보를 가져오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // query data 와 local performanceData 둘 다 없을 때만 "없음" — data 도착 후 useEffect 로
  // performanceData 에 동기화되기 전 한 프레임 동안 form 이 flash 하지 않게 양쪽 다 확인.
  if (!performanceData && !data) {
    return (
      <div className="p-8">
        <div className="bg-muted rounded-2xl p-12 text-center">
          <Music size={40} className="mx-auto mb-4 text-ds-text-disabled" />
          <p className="text-muted-foreground">
            {isMe
              ? '소속된 공연팀이 없습니다. 운영팀에 문의해 주세요.'
              : '해당 공연팀을 찾을 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  // 표시 데이터 우선순위: 편집 중이면 editingData, 아니면 local(performanceData) → 막 도착한 query data.
  // 위의 `!performanceData && !data` 가드가 둘 중 하나는 non-null 임을 보장.
  const viewData = performanceData ?? data!;
  const displayData: PerformanceDetail = isEditMode && editingData ? editingData : viewData;

  return (
    <div className="p-8">
      {!isMe && (
        <Link
          to="/performance"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          공연 목록으로
        </Link>
      )}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Music size={32} />
          공연 정보 관리
        </h1>
        
        <div className="flex items-center gap-3">
          {/* Edit Button */}
          {!isEditMode && canEdit && (
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
                className="px-6 py-3 border border-ds-border-strong text-foreground rounded-lg hover:bg-muted transition-all duration-200 flex items-center gap-2"
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
            <div className="flex items-center gap-2 px-4 py-3 bg-ds-success-subtle border border-ds-success text-ds-success-pressed rounded-lg shadow-lg animate-fade-in">
              <div className="w-6 h-6 bg-ds-success rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
              <span className="font-medium">저장이 완료되었습니다!</span>
            </div>
          )}
        </div>
      </div>

      {/* Performance Team Profile */}
      <div className="bg-background rounded-2xl p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-6">공연팀 프로필</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">공연팀명</label>
            <input
              type="text"
              placeholder="공연팀 이름을 입력하세요"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={displayData.teamName}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, teamName: e.target.value } : prev)}
              disabled={!isEditMode}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">공연팀 소개글</label>
            <textarea
              rows={5}
              placeholder="동아리 소개, 구성원 소개 등을 작성하세요"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              value={displayData.description}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, description: e.target.value } : prev)}
              disabled={!isEditMode}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">SNS 링크 (선택)</label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Instagram size={20} className="text-white" />
                </div>
                <input
                  type="text"
                  placeholder="인스타그램 URL"
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.instagramUrl}
                  onChange={(e) => setEditingData(prev => prev ? { ...prev, instagramUrl: e.target.value } : prev)}
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
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.youtubeUrl}
                  onChange={(e) => setEditingData(prev => prev ? { ...prev, youtubeUrl: e.target.value } : prev)}
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">공연팀 이미지</label>
            
            {/* Upload Area - Only in Edit Mode */}
            {isEditMode && (
              <label className="block border-2 border-dashed border-ds-border-strong rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
                <p className="text-sm text-muted-foreground mb-1">이미지를 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-muted-foreground">여러 장의 이미지를 선택할 수 있습니다</p>
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
                      <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
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
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-background text-foreground rounded-lg text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            대표로 설정
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-all"
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
              <div className="rounded-lg p-8 text-center bg-muted">
                <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
                <p className="text-sm text-ds-text-disabled">등록된 이미지가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Timetable */}
      <div className="bg-background rounded-2xl p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-6">공연 타임테이블</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">공연 날짜</label>
            <select
              className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={displayData.date}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, date: e.target.value } : prev)}
              disabled={!isEditMode}
            >
              {FESTIVAL_DATES.map(d => {
                const [, m, day] = d.split('-');
                return <option key={d} value={d}>{`${Number(m)}/${Number(day)}`}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">스테이지</label>
            <select
              className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={displayData.stage}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, stage: e.target.value as PerformanceStage } : prev)}
              disabled={!isEditMode}
            >
              {(Object.values(PERFORMANCE_STAGES) as typeof PERFORMANCE_STAGES[PerformanceStage][])
                .filter(s => s.dates.includes(displayData.date))
                .map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">공연 시작 시간</label>
            <input
              type="time"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={displayData.startTime}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, startTime: e.target.value } : prev)}
              disabled={!isEditMode}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">공연 종료 시간</label>
            <input
              type="time"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={displayData.endTime}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, endTime: e.target.value } : prev)}
              disabled={!isEditMode}
            />
          </div>
        </div>
      </div>

      {/* Setlist Management */}
      <div className="bg-background rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">공연 셋리스트</h2>
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
            <div key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-lg hover:border-primary transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold rounded-lg">
                {index + 1}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="곡명"
                  value={item.songName}
                  className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-foreground"
                  onChange={(e) => updateSetlistItem(item.id, 'songName', e.target.value)}
                  disabled={!isEditMode}
                />
                <input
                  type="text"
                  placeholder="원곡자"
                  value={item.artist}
                  className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-foreground"
                  onChange={(e) => updateSetlistItem(item.id, 'artist', e.target.value)}
                  disabled={!isEditMode}
                />
              </div>
              {isEditMode && (
                <button
                  onClick={() => removeSetlistItem(item.id)}
                  className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        {(isEditMode ? editingSetlist : setlist).length === 0 && (
          <div className="text-center py-12 text-ds-text-disabled">
            <Music size={48} className="mx-auto mb-4 opacity-50" />
            <p>셋리스트가 비어있습니다. {isEditMode && '곡을 추가해주세요.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}