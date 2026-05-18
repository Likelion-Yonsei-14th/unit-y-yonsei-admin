import { useRef, useState, type ChangeEvent } from 'react';
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
  useAddPerformanceImage,
  useAddSetlistItem,
  useDeletePerformanceImage,
  useDeleteSetlistItem,
  useMyPerformance,
  usePerformance,
  usePerformanceImages,
  useSetlist,
  useUpdateMyPerformance,
  useUpdateSetlistItem,
} from '@/features/performances/hooks';
import {
  PERFORMANCE_CATEGORY_LABEL,
  PERFORMANCE_STATUS_LABEL,
  type Performance,
  type PerformanceCategory,
  type PerformanceStatus,
  type SetlistItem,
} from '@/features/performances/types';
import type { SetlistEditableField } from '@/features/performances/components/draggable-setlist-item';
import { DraggableSetlistItem } from '@/features/performances/components/draggable-setlist-item';
import { uploadImage } from '@/features/uploads/api';

/** 공연 날짜 정수(2~4) ↔ 표시 라벨. 1=5/26 블루런 은 공연 없음. */
const PERFORMANCE_DATE_OPTIONS: { value: number; label: string }[] = [
  { value: 2, label: '5/27' },
  { value: 3, label: '5/28' },
  { value: 4, label: '5/29' },
];

const dateLabel = (d: number | null): string =>
  PERFORMANCE_DATE_OPTIONS.find((o) => o.value === d)?.label ?? '-';

/**
 * 공연 상세/편집. 두 진입 경로:
 *   - `/performance/me`       — Performer 본인 공연 (useMyPerformance, 편집 가능)
 *   - `/performance/:id`      — Super/Master 가 리스트에서 선택한 공연 (usePerformance, 읽기 전용)
 *
 * 본문(Performance)·이미지·셋리스트는 백엔드에서 각각 별도 sub-resource 라
 * 세 쿼리로 나눠 로드한다. 본문은 편집 모드에서 한 번에 PATCH(`/me`),
 * 이미지·셋리스트는 항목별 mutation 으로 다룬다.
 */
export function PerformanceManagement() {
  const { teamId: idParam } = useParams<{ teamId: string }>();
  const isMe = !idParam || idParam === 'me';
  // 숫자 파라미터는 양의 정수일 때만 유효. Number('abc') = NaN 같은 허위 쿼리 방지.
  const parsedId = isMe ? null : Number(idParam);
  const validId = parsedId != null && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const isInvalidRoute = !isMe && validId === null;

  const byIdQuery = usePerformance(validId);
  const myQuery = useMyPerformance();
  const { data, isLoading, isError, refetch } = isMe ? myQuery : byIdQuery;

  const performanceId = data?.id ?? null;
  const imagesQuery = usePerformanceImages(performanceId);
  const setlistQuery = useSetlist(performanceId);

  const { can, canEditPerformance } = useAuth();
  // 본문/이미지/셋리스트 편집은 본인 공연(`/me` 라우트) 에서만 — 백엔드 쓰기 엔드포인트가
  // `/admin/performances/me` 단수형이라 다른 공연을 편집할 경로가 없다.
  const canEdit = isMe && (data ? canEditPerformance({ id: data.id }) : false);
  // 타임테이블(날짜·시작/종료) 은 축제 운영 스케줄의 입력이라 Performer 가 임의로
  // 바꾸면 곤란 — performance.manage 권한자만. (`/me` 라우트엔 사실상 운영진이 없으므로
  // 현재 흐름에서는 읽기 전용으로 동작.)
  const canEditTimetable = canEdit && can('performance.manage');

  const updateMutation = useUpdateMyPerformance();
  const addImageMutation = useAddPerformanceImage(performanceId);
  const deleteImageMutation = useDeletePerformanceImage(performanceId);
  const addSetlistMutation = useAddSetlistItem(performanceId);
  const updateSetlistMutation = useUpdateSetlistItem(performanceId);
  const deleteSetlistMutation = useDeleteSetlistItem(performanceId);

  const [isEditMode, setIsEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 본문 편집 버퍼. 편집 모드 진입 시 서버 데이터로 채우고, 저장 시 변경분만 PATCH.
  const [editingData, setEditingData] = useState<Performance | null>(null);
  // 셋리스트 편집 버퍼. 인라인 편집·드래그 재정렬을 로컬에서 모은 뒤 저장 시 diff 반영.
  const [editingSetlist, setEditingSetlist] = useState<SetlistItem[]>([]);

  const images = imagesQuery.data ?? [];
  const setlist = setlistQuery.data ?? [];

  // 직접 업로드 진행 상태 — 업로드 중 중복 클릭 차단.
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // 로컬에서 신규 추가한 셋리스트 행은 음수 임시 id 로 구분(서버 id 와 충돌 방지).
  // 마운트 단위로 스코프 — 편집 세션 내에서 고유한 음수 id 를 발급한다.
  const tempSetlistSeq = useRef(-1);

  // 편집 모드 진입 시 서버 데이터를 버퍼에 복사.
  const handleEdit = () => {
    if (!data) return;
    setEditingData({ ...data });
    setEditingSetlist(setlist.map((s) => ({ ...s })));
    setActionError(null);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditingData(null);
    setEditingSetlist([]);
    setActionError(null);
  };

  // 편집 중 셋리스트 쿼리가 새로 도착해도 버퍼를 덮어쓰지 않는다(사용자 입력 보존).
  // 편집 모드가 아닐 때만 동기화는 불필요 — view 는 setlistQuery 를 직접 읽는다.

  // ---- 이미지: 항목별 즉시 반영 ----

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일 재선택도 onChange 가 다시 뜨도록 input 값 초기화.
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (!file) return;
    setIsUploading(true);
    setActionError(null);
    try {
      const imageUrl = await uploadImage(file, 'performance');
      // 첫 이미지는 대표(PROFILE), 이후는 상세(DETAIL).
      const hasProfile = images.some((img) => img.imageType === 'PROFILE');
      await addImageMutation.mutateAsync({
        imageUrl,
        imageOrder: images.length + 1,
        imageType: hasProfile ? 'DETAIL' : 'PROFILE',
      });
    } catch {
      setActionError('이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (imageId: number) => {
    setActionError(null);
    deleteImageMutation.mutate(imageId, {
      onError: () => setActionError('이미지 삭제에 실패했습니다.'),
    });
  };

  // ---- 셋리스트: 로컬 편집 후 저장 시 diff 반영 ----

  const addSetlistItem = () => {
    setEditingSetlist((prev) => [
      ...prev,
      {
        id: tempSetlistSeq.current--,
        performanceId: performanceId ?? 0,
        songTitle: '',
        singerName: '',
        songOrder: prev.length + 1,
        note: '',
      },
    ]);
  };

  const removeSetlistItem = (id: number) => {
    setEditingSetlist((prev) =>
      prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, songOrder: i + 1 })),
    );
  };

  const updateSetlistField = (id: number, field: SetlistEditableField, value: string) => {
    setEditingSetlist((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
    // 드래그 후 songOrder 를 위치 기준으로 다시 매긴다. 실제 PATCH 는 저장 시.
    setEditingSetlist(
      arrayMove(editingSetlist, oldIndex, newIndex).map((s, idx) => ({
        ...s,
        songOrder: idx + 1,
      })),
    );
  };

  /**
   * 본문 PATCH + 셋리스트 diff 반영을 함께 실행.
   * 셋리스트는 백엔드에 임베디드 일괄저장이 없어 항목별 endpoint 로 처리한다:
   *   - 음수 임시 id = 신규 → POST
   *   - 서버에 있던 id 중 버퍼에 없음 = 삭제 → DELETE
   *   - 남은 항목 = 내용/순서 변경 가능 → PATCH (full body)
   */
  const handleSave = async () => {
    if (!editingData || !data) return;
    setActionError(null);
    try {
      // 1) 본문 — 변경된 필드만 추려 PATCH.
      const patch: Partial<Performance> = {};
      (Object.keys(editingData) as (keyof Performance)[]).forEach((k) => {
        if (editingData[k] !== data[k]) {
          // 좁은 타입 유지를 위해 키별 대입.
          (patch as Record<string, unknown>)[k] = editingData[k];
        }
      });
      if (Object.keys(patch).length > 0) {
        await updateMutation.mutateAsync(patch);
      }

      // 2) 셋리스트 diff.
      // NOTE: 항목별 POST/PATCH/DELETE 를 순차 실행한다 — 비원자적(non-atomic).
      // 중간 항목에서 실패하면 일부만 서버에 반영된 부분 저장 상태가 되고,
      // 편집 버퍼는 여전히 전체를 보여준다(서버와 불일치). 백엔드에 일괄 저장
      // 엔드포인트가 생기기 전까지의 한계.
      const serverIds = new Set(setlist.map((s) => s.id));
      const bufferIds = new Set(editingSetlist.filter((s) => s.id > 0).map((s) => s.id));

      // 삭제 — 서버엔 있고 버퍼엔 없음.
      for (const s of setlist) {
        if (!bufferIds.has(s.id)) {
          await deleteSetlistMutation.mutateAsync(s.id);
        }
      }
      // 신규 + 수정.
      for (const s of editingSetlist) {
        const body = {
          songTitle: s.songTitle,
          singerName: s.singerName,
          songOrder: s.songOrder,
          note: s.note || null,
        };
        if (s.id < 0) {
          await addSetlistMutation.mutateAsync(body);
        } else if (serverIds.has(s.id)) {
          const before = setlist.find((x) => x.id === s.id)!;
          const changed =
            before.songTitle !== s.songTitle ||
            before.singerName !== s.singerName ||
            before.songOrder !== s.songOrder ||
            before.note !== s.note;
          if (changed) {
            await updateSetlistMutation.mutateAsync({ setlistId: s.id, input: body });
          }
        }
      }

      setIsEditMode(false);
      setEditingData(null);
      setEditingSetlist([]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setActionError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const isSaving =
    updateMutation.isPending ||
    addSetlistMutation.isPending ||
    updateSetlistMutation.isPending ||
    deleteSetlistMutation.isPending;

  // URL 의 id 가 숫자가 아닌 경우 — 쿼리 자체가 안 돌므로 바로 빈 상태로.
  if (isInvalidRoute) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-muted rounded-2xl p-12 text-center">
          <Music size={40} className="mx-auto mb-4 text-ds-text-disabled" />
          <p className="text-muted-foreground">잘못된 공연 경로입니다.</p>
        </div>
      </div>
    );
  }

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

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-muted rounded-2xl p-12 text-center">
          <Music size={40} className="mx-auto mb-4 text-ds-text-disabled" />
          <p className="text-muted-foreground">
            {isMe
              ? '소속된 공연이 없습니다. 운영팀에 문의해 주세요.'
              : '해당 공연을 찾을 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  // 표시 데이터: 편집 중이면 버퍼, 아니면 서버 데이터.
  const displayData: Performance = isEditMode && editingData ? editingData : data;
  // 셋리스트 표시: 편집 중이면 버퍼, 아니면 서버 데이터.
  const displaySetlist = isEditMode ? editingSetlist : setlist;

  const patchEditing = (p: Partial<Performance>) =>
    setEditingData((prev) => (prev ? { ...prev, ...p } : prev));

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
          {!isEditMode && canEdit && (
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <Edit size={18} />
              <span>편집</span>
            </button>
          )}

          {isEditMode && (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-3 border border-ds-border-strong text-foreground rounded-lg hover:bg-muted transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
                <span>취소</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                <span>{isSaving ? '저장 중…' : '저장'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-ds-error-subtle border border-destructive text-destructive rounded-lg shadow-sm"
        >
          <X size={14} />
          <span className="font-medium">{actionError}</span>
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

      {/* 공연 프로필 */}
      <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-6">공연 프로필</h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="perf-name"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                공연명
              </label>
              <input
                id="perf-name"
                type="text"
                placeholder="공연 이름을 입력하세요"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                value={displayData.performanceName}
                onChange={(e) => patchEditing({ performanceName: e.target.value })}
                disabled={!isEditMode}
              />
            </div>
            <div>
              <label
                htmlFor="perf-lineup"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                라인업명
              </label>
              <input
                id="perf-lineup"
                type="text"
                placeholder="라인업/팀 표기명"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                value={displayData.lineupName}
                onChange={(e) => patchEditing({ lineupName: e.target.value })}
                disabled={!isEditMode}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="perf-description"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              공연 소개글
            </label>
            <textarea
              id="perf-description"
              rows={5}
              placeholder="동아리 소개, 구성원 소개 등을 작성하세요"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              value={displayData.performanceDescription}
              onChange={(e) => patchEditing({ performanceDescription: e.target.value })}
              disabled={!isEditMode}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="perf-category"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                공연 분류
              </label>
              <div className="relative">
                <select
                  id="perf-category"
                  className={`w-full appearance-none border border-border rounded-lg bg-background py-3 pl-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                    isEditMode ? 'pr-10' : 'pr-4'
                  }`}
                  value={displayData.performanceCategory ?? ''}
                  onChange={(e) =>
                    patchEditing({
                      performanceCategory: (e.target.value || null) as PerformanceCategory | null,
                    })
                  }
                  disabled={!isEditMode}
                >
                  <option value="">미정</option>
                  {(Object.keys(PERFORMANCE_CATEGORY_LABEL) as PerformanceCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {PERFORMANCE_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
                {isEditMode && (
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
                htmlFor="perf-status"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                공연 상태
              </label>
              <div className="relative">
                <select
                  id="perf-status"
                  className={`w-full appearance-none border border-border rounded-lg bg-background py-3 pl-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                    isEditMode && canEditTimetable ? 'pr-10' : 'pr-4'
                  }`}
                  value={displayData.performanceStatus}
                  onChange={(e) =>
                    patchEditing({ performanceStatus: e.target.value as PerformanceStatus })
                  }
                  disabled={!isEditMode || !canEditTimetable}
                >
                  {(Object.keys(PERFORMANCE_STATUS_LABEL) as PerformanceStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {PERFORMANCE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                {isEditMode && canEditTimetable && (
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                )}
              </div>
            </div>
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
                  onChange={(e) => patchEditing({ instagramUrl: e.target.value })}
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
                  onChange={(e) => patchEditing({ youtubeUrl: e.target.value })}
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </div>

          {/* 공연 이미지 — 항목별 즉시 반영(추가/삭제). */}
          <div>
            <span className="block text-sm font-semibold text-foreground mb-2">공연 이미지</span>

            {isEditMode && (
              <label
                className={`block border-2 border-dashed border-ds-border-strong rounded-lg p-8 text-center transition-colors ${
                  isUploading
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:border-primary'
                }`}
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
                <p className="text-sm text-muted-foreground mb-1">
                  {isUploading ? '이미지를 업로드하는 중…' : '이미지를 클릭하여 업로드'}
                </p>
                <p className="text-xs text-muted-foreground">
                  첫 이미지는 대표 이미지로 등록됩니다
                </p>
              </label>
            )}

            {images.length > 0 && (
              <div
                className={`${isEditMode ? 'mt-4' : ''} grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4`}
              >
                {images.map((image) => {
                  const isProfile = image.imageType === 'PROFILE';
                  return (
                    <div
                      key={image.id}
                      className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isProfile ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <img
                        src={image.imageUrl}
                        alt="공연 이미지"
                        className="w-full h-full object-cover"
                      />

                      {isProfile && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                          <Star size={12} fill="currentColor" />
                          대표
                        </div>
                      )}

                      {isEditMode && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(image.id)}
                            disabled={deleteImageMutation.isPending}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-all disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isEditMode && images.length === 0 && (
              <div className="rounded-lg p-8 text-center bg-muted">
                <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
                <p className="text-sm text-ds-text-disabled">등록된 이미지가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 공연 타임테이블 */}
      <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">공연 타임테이블</h2>
          {isEditMode && !canEditTimetable && (
            <span className="text-xs text-muted-foreground">운영진만 수정 가능</span>
          )}
        </div>

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
                    value={displayData.performanceDate ?? ''}
                    onChange={(e) =>
                      patchEditing({
                        performanceDate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    disabled={!timetableEditable}
                  >
                    <option value="">미정</option>
                    {PERFORMANCE_DATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
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
                  htmlFor="perf-location"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  공연 장소
                </label>
                <input
                  id="perf-location"
                  type="number"
                  placeholder="장소 ID"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  value={displayData.locationId ?? ''}
                  onChange={(e) =>
                    patchEditing({
                      locationId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  disabled={!timetableEditable}
                />
                {displayData.locationName && (
                  <p className="text-xs text-muted-foreground mt-1">{displayData.locationName}</p>
                )}
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
                  value={displayData.startTime ?? ''}
                  onChange={(e) => patchEditing({ startTime: e.target.value || null })}
                  disabled={!timetableEditable}
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
                  value={displayData.endTime ?? ''}
                  onChange={(e) => patchEditing({ endTime: e.target.value || null })}
                  disabled={!timetableEditable}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* 공연 셋리스트 */}
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
                    onUpdate={updateSetlistField}
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
                <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground font-bold rounded-lg shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
                    {item.songTitle}
                  </div>
                  <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
                    {item.singerName}
                  </div>
                  <div className="px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground">
                    {item.note || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {displaySetlist.length === 0 && (
          <div className="text-center py-12 text-ds-text-disabled">
            <Music size={48} className="mx-auto mb-4 opacity-50" />
            <p>셋리스트가 비어있습니다. {isEditMode && '곡을 추가해주세요.'}</p>
          </div>
        )}
      </div>

      {/* 공연 일차 표시 — view 모드 보조 정보. */}
      {!isEditMode && (
        <p className="mt-4 text-xs text-muted-foreground">
          공연 일차: {dateLabel(data.performanceDate)}
        </p>
      )}
    </div>
  );
}
