import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams, Link } from 'react-router';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Instagram,
  Youtube,
  Music,
  Check,
  Edit,
  X,
  Star,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks';
import {
  useMyPerformance,
  usePerformance,
  useUpdatePerformance,
} from '@/features/performances/hooks';
import {
  PERFORMANCE_STAGES,
  type PerformanceDetail,
  type PerformanceImage,
  type PerformanceStage,
  type SetlistItem,
} from '@/features/performances/types';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';
import { DraggableSetlistItem } from '@/features/performances/components/draggable-setlist-item';

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
  const validTeamId =
    parsedTeamId != null && Number.isInteger(parsedTeamId) && parsedTeamId > 0
      ? parsedTeamId
      : null;
  const isInvalidRoute = !isMe && validTeamId === null;

  const byIdQuery = usePerformance(validTeamId);
  const myQuery = useMyPerformance();
  const { data, isLoading, isError, refetch } = isMe ? myQuery : byIdQuery;

  const { can, canEditPerformance } = useAuth();
  const canEdit = data ? canEditPerformance({ teamId: data.teamId }) : false;
  const updateMutation = useUpdatePerformance();
  // 타임테이블(날짜·스테이지·시작/종료) 은 축제 운영 전체 스케줄의 입력으로
  // Performer 가 임의로 바꾸면 곤란. 본인 프로필·셋리스트는 수정 가능하되
  // 이 섹션은 Super/Master(performance.manage) 만 편집할 수 있다.
  const canEditTimetable = canEdit && can('performance.manage');

  const [isEditMode, setIsEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [performanceData, setPerformanceData] = useState<PerformanceDetail | null>(null);
  const [editingData, setEditingData] = useState<PerformanceDetail | null>(null);

  const [performanceImages, setPerformanceImages] = useState<PerformanceImage[]>([]);
  const [editingImages, setEditingImages] = useState<PerformanceImage[]>([]);

  const [setlist, setSetlist] = useState<SetlistItem[]>([]);
  const [editingSetlist, setEditingSetlist] = useState<SetlistItem[]>([]);

  // 직접 createObjectURL 로 만든 blob URL 만 추적 — 서버에서 받은 일반 URL 은 revoke 대상 아님.
  // 제거/취소/서버 동기화/언마운트 시점에 누수 없이 정리.
  const blobUrlsRef = useRef<Set<string>>(new Set());
  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current.clear();
    },
    [],
  );

  /** stillUsed 에 없는 추적 blob URL 을 즉시 revoke + ref 에서 제거. */
  const revokeUnusedBlobs = (stillUsed: Iterable<string>) => {
    const used = new Set(stillUsed);
    for (const url of blobUrlsRef.current) {
      if (!used.has(url)) {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      }
    }
  };

  // data 가 도착/변경되면 view 상태를 재동기화. 편집 중엔 덮어쓰지 않는다
  // (서버 refetch 타이밍이 편집 중 사용자의 입력을 날려버리지 않도록).
  useEffect(() => {
    if (!data || isEditMode) return;
    setPerformanceData(data);
    setPerformanceImages(data.images);
    setSetlist(data.setlist);
    // 서버 데이터로 다시 채워질 때 — 더 이상 화면에 없는 blob URL 정리.
    revokeUnusedBlobs(data.images.map((img) => img.url));
  }, [data, isEditMode]);

  // 편집 중 날짜를 바꿨을 때, 기존 stage 가 새 날짜에서 운영되지 않는다면
  // 해당 날짜의 첫 유효 스테이지로 자동 보정. 저장 payload 에 (date, stage) 불일치가
  // 넘어가지 않게 한다. setter 에는 prev 기반으로 써서 stale closure 이슈 회피.
  useEffect(() => {
    setEditingData((prev) => {
      if (!prev) return prev;
      if (PERFORMANCE_STAGES[prev.stage].dates.includes(prev.date)) return prev;
      const firstValid = (
        Object.values(PERFORMANCE_STAGES) as (typeof PERFORMANCE_STAGES)[PerformanceStage][]
      ).find((s) => s.dates.includes(prev.date));
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
    // 편집 중 업로드했지만 저장하지 않은 blob URL 정리. 다음 handleEdit 가
    // editingImages 를 performanceImages 로 덮어쓰므로 여기서 끊어도 안전.
    revokeUnusedBlobs(performanceImages.map((img) => img.url));
    setIsEditMode(false);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: PerformanceImage[] = Array.from(files).map((file, index) => {
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.add(url);
        return {
          id: Date.now() + index,
          url,
          isMain: editingImages.length === 0 && index === 0,
        };
      });
      setEditingImages([...editingImages, ...newImages]);
    }
  };

  const setMainImage = (id: number) => {
    setEditingImages(
      editingImages.map((img) => ({
        ...img,
        isMain: img.id === id,
      })),
    );
  };

  const removeImage = (id: number) => {
    const target = editingImages.find((img) => img.id === id);
    if (target && blobUrlsRef.current.has(target.url)) {
      URL.revokeObjectURL(target.url);
      blobUrlsRef.current.delete(target.url);
    }
    const filtered = editingImages.filter((img) => img.id !== id);
    // 불변 처리 — 기존 객체를 mutate 하지 않고 새 객체로 첫 항목 isMain 만 갱신.
    const next =
      filtered.length > 0 && !filtered.some((img) => img.isMain)
        ? filtered.map((img, i) => (i === 0 ? { ...img, isMain: true } : img))
        : filtered;
    setEditingImages(next);
  };

  const addSetlistItem = () => {
    const newItem: SetlistItem = {
      id: Date.now(),
      order: editingSetlist.length + 1,
      songName: '',
      artist: '',
    };
    setEditingSetlist([...editingSetlist, newItem]);
  };

  const removeSetlistItem = (id: number) => {
    setEditingSetlist(editingSetlist.filter((item) => item.id !== id));
  };

  const updateSetlistItem = (id: number, field: 'songName' | 'artist', value: string) => {
    setEditingSetlist(
      editingSetlist.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const setlistSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSetlistDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = editingSetlist.findIndex((s) => s.id === active.id);
    const newIndex = editingSetlist.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    // 드래그 후 order 를 위치 기준으로 다시 매긴다.
    setEditingSetlist(
      arrayMove(editingSetlist, oldIndex, newIndex).map((s, idx) => ({ ...s, order: idx + 1 })),
    );
  };

  const handleSave = () => {
    if (!editingData) return;
    // 편집 중인 모든 영역(프로필+타임테이블+셋리스트+이미지) 을 한 번에 patch.
    // teamId 는 URL 파라미터로만 전달 — 바디에 중복 포함하면 백엔드 검증에 걸리거나 무시될 수 있다.
    const { teamId, ...rest } = editingData;
    const patch: Partial<PerformanceDetail> = {
      ...rest,
      images: editingImages,
      setlist: editingSetlist,
    };
    updateMutation.mutate(
      { teamId, patch },
      {
        onSuccess: (saved) => {
          // 캐시는 hooks 의 onSuccess 가 갱신함. 여기서는 로컬 view state 를 서버 응답으로 동기화.
          setPerformanceData(saved);
          setSetlist(saved.setlist);
          setPerformanceImages(saved.images);
          setIsEditMode(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        },
        // onError 는 mutation.error 로 노출 — 아래 알림 영역에서 처리.
      },
    );
  };

  // URL 의 teamId 가 숫자가 아닌 경우 — 쿼리 자체가 안 돌므로 바로 빈 상태로.
  if (isInvalidRoute) {
    return (
      <div className="p-4 md:p-8">
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
      <div className="p-4 md:p-8 text-center text-muted-foreground">공연 정보를 불러오는 중…</div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8">
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
      <div className="p-4 md:p-8">
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
    <div className="p-4 md:p-8">
      {!isMe && (
        <Link
          to="/performance"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          공연 목록으로
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Music size={32} />
          공연 정보 관리
        </h1>

        <div className="flex items-center gap-3">
          {/* Edit Button */}
          {!isEditMode && canEdit && (
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
                disabled={updateMutation.isPending}
                className="px-6 py-3 border border-ds-border-strong text-foreground rounded-lg hover:bg-muted transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
                <span>취소</span>
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                <span>{updateMutation.isPending ? '저장 중…' : '저장'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 저장 실패/성공 알림 — 헤더와 별도 줄로 분리. flex-wrap 의 우측 그룹 안에 alert
          박스를 넣으면 좁은 폰에서 버튼+alert 가 같은 줄에 욱여 들어가 가독성↓. */}
      {updateMutation.isError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-ds-error-subtle border border-destructive text-destructive rounded-lg shadow-sm"
        >
          <X size={14} />
          <span className="font-medium">저장에 실패했습니다. 잠시 후 다시 시도해주세요.</span>
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-ds-success-subtle border border-ds-success text-ds-success-pressed rounded-lg shadow-sm animate-fade-in">
          <div className="w-6 h-6 bg-ds-success rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
          <span className="font-medium">저장이 완료되었습니다!</span>
        </div>
      )}

      {/* Performance Team Profile */}
      <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-6">공연팀 프로필</h2>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="perf-team-name"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              공연팀명
            </label>
            <input
              id="perf-team-name"
              type="text"
              placeholder="공연팀 이름을 입력하세요"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={displayData.teamName}
              onChange={(e) =>
                setEditingData((prev) => (prev ? { ...prev, teamName: e.target.value } : prev))
              }
              disabled={!isEditMode}
            />
          </div>

          <div>
            <label
              htmlFor="perf-description"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              공연팀 소개글
            </label>
            <textarea
              id="perf-description"
              rows={5}
              placeholder="동아리 소개, 구성원 소개 등을 작성하세요"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              value={displayData.description}
              onChange={(e) =>
                setEditingData((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              disabled={!isEditMode}
            />
          </div>

          <div>
            {/* SNS 묶음은 그룹 라벨이라 htmlFor 단일 매칭이 어색함. 각 input 에 aria-label 로 매칭. */}
            <span className="block text-sm font-semibold text-foreground mb-2">
              SNS 링크 (선택)
            </span>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 bg-muted text-muted-foreground rounded-lg"
                  aria-hidden="true"
                >
                  <Instagram size={20} />
                </div>
                <input
                  type="text"
                  placeholder="인스타그램 URL"
                  aria-label="인스타그램 URL"
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.instagramUrl}
                  onChange={(e) =>
                    setEditingData((prev) =>
                      prev ? { ...prev, instagramUrl: e.target.value } : prev,
                    )
                  }
                  disabled={!isEditMode}
                />
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 bg-muted text-muted-foreground rounded-lg"
                  aria-hidden="true"
                >
                  <Youtube size={20} />
                </div>
                <input
                  type="text"
                  placeholder="유튜브 URL"
                  aria-label="유튜브 URL"
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.youtubeUrl}
                  onChange={(e) =>
                    setEditingData((prev) =>
                      prev ? { ...prev, youtubeUrl: e.target.value } : prev,
                    )
                  }
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </div>

          <div>
            {/* 그룹 타이틀 — file input 은 아래 wrapping label 안. */}
            <span className="block text-sm font-semibold text-foreground mb-2">공연팀 이미지</span>

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
                <p className="text-sm text-muted-foreground mb-1">
                  이미지를 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-xs text-muted-foreground">
                  여러 장의 이미지를 선택할 수 있습니다
                </p>
              </label>
            )}

            {/* Image Preview Grid */}
            {(isEditMode ? editingImages : performanceImages).length > 0 && (
              <div
                className={`${isEditMode ? 'mt-4' : ''} grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4`}
              >
                {(isEditMode ? editingImages : performanceImages).map((image) => (
                  <div
                    key={image.id}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      image.isMain ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt="공연팀 이미지"
                      className="w-full h-full object-cover"
                    />

                    {/* Main Badge */}
                    {image.isMain && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                        <Star size={12} fill="currentColor" />
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
      <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">공연 타임테이블</h2>
          {/* 편집 모드 중이지만 타임테이블을 건드릴 수 없는 케이스(= Performer) 에만 안내.
              View 모드 유저에게는 모든 필드가 기본적으로 비활성이라 메시지 자체가 노이즈. */}
          {isEditMode && !canEditTimetable && (
            <span className="text-xs text-muted-foreground">운영진만 수정 가능</span>
          )}
        </div>

        {/* 편집 가능 여부에 따라 select 의 화살표 표시를 갈음한다.
            native 화살표는 disabled 상태에서도 항상 그려져 view 모드에서 시각적 노이즈가 됐다.
            appearance-none 으로 native UI 를 끄고, 편집 가능할 때만 ChevronDown 을
            안쪽(right-3) 에 띄워 시간 입력의 disabled 동작과 결을 맞춘다. */}
        {(() => {
          const timetableEditable = isEditMode && canEditTimetable;
          const selectClass =
            'w-full appearance-none border border-border rounded-lg bg-background py-3 pl-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
            (timetableEditable ? 'pr-10' : 'pr-4');
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="perf-date"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  공연 날짜
                </label>
                <div className="relative">
                  <select
                    id="perf-date"
                    className={selectClass}
                    value={displayData.date}
                    onChange={(e) =>
                      setEditingData((prev) => (prev ? { ...prev, date: e.target.value } : prev))
                    }
                    disabled={!timetableEditable}
                  >
                    {FESTIVAL_DATES.map((d) => {
                      const [, m, day] = d.split('-');
                      return <option key={d} value={d}>{`${Number(m)}/${Number(day)}`}</option>;
                    })}
                  </select>
                  {timetableEditable && (
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="perf-stage"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  스테이지
                </label>
                <div className="relative">
                  <select
                    id="perf-stage"
                    className={selectClass}
                    value={displayData.stage}
                    onChange={(e) =>
                      setEditingData((prev) =>
                        prev ? { ...prev, stage: e.target.value as PerformanceStage } : prev,
                      )
                    }
                    disabled={!timetableEditable}
                  >
                    {(
                      Object.values(
                        PERFORMANCE_STAGES,
                      ) as (typeof PERFORMANCE_STAGES)[PerformanceStage][]
                    )
                      .filter((s) => s.dates.includes(displayData.date))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                  </select>
                  {timetableEditable && (
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="perf-start-time"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  공연 시작 시간
                </label>
                <input
                  id="perf-start-time"
                  type="time"
                  step={300}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.startTime}
                  onChange={(e) =>
                    setEditingData((prev) => (prev ? { ...prev, startTime: e.target.value } : prev))
                  }
                  disabled={!isEditMode || !canEditTimetable}
                />
              </div>
              <div>
                <label
                  htmlFor="perf-end-time"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  공연 종료 시간
                </label>
                <input
                  id="perf-end-time"
                  type="time"
                  step={300}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.endTime}
                  onChange={(e) =>
                    setEditingData((prev) => (prev ? { ...prev, endTime: e.target.value } : prev))
                  }
                  disabled={!isEditMode || !canEditTimetable}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Setlist Management */}
      <div className="bg-background rounded-2xl p-4 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">공연 셋리스트</h2>
          {isEditMode && (
            <button
              onClick={addSetlistItem}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus size={16} />곡 추가
            </button>
          )}
        </div>

        {isEditMode ? (
          <DndContext
            sensors={setlistSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSetlistDragEnd}
          >
            <SortableContext
              items={editingSetlist.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {editingSetlist.map((item, index) => (
                  <DraggableSetlistItem
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateSetlistItem}
                    onDelete={removeSetlistItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-3">
            {setlist.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-border rounded-lg"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground font-bold rounded-lg flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
                    {item.songName}
                  </div>
                  <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
                    {item.artist}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
