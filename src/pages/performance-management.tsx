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
import { ArrowLeft, Plus, Music, Check, Edit, X, MessageCircle, EyeOff } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks';
import {
  useAddPerformanceImage,
  useAddSetlistItem,
  useDeletePerformanceImage,
  useDeleteSetlistItem,
  useMyCheerMessages,
  useMyPerformance,
  usePerformance,
  usePerformanceImages,
  useSetlist,
  useUpdateMyPerformance,
  useUpdatePerformance,
  useUpdateSetlistItem,
} from '@/features/performances/hooks';
import type { Performance, SetlistItem } from '@/features/performances/types';
import type { SetlistEditableField } from '@/features/performances/components/draggable-setlist-item';
import { DraggableSetlistItem } from '@/features/performances/components/draggable-setlist-item';
import { PerformanceProfileFields } from '@/features/performances/components/performance-profile-fields';
import {
  PerformanceTimetable,
  dateLabel,
} from '@/features/performances/components/performance-timetable';
import { PerformanceImageGrid } from '@/features/performances/components/performance-image-grid';
import { diffSetlist } from '@/features/performances/setlist-diff';
import { uploadImage } from '@/features/uploads/api';

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
  // 내 공연 응원 메시지 — Performer 본인 공연(`/me`)에서만 읽기 전용으로 노출.
  // hook 내부에서 역할로 게이트하므로 Super/Master 가 :teamId 로 진입해도 쿼리는 안 나간다.
  const cheerMessagesQuery = useMyCheerMessages();

  const { can, canEditPerformance } = useAuth();
  // 편집 권한: 본인 공연이면 자기 팀, 운영진(`performance.manage`)이면 임의 공연.
  // 백엔드는 두 경로를 별도 엔드포인트로 받는다 — `PATCH /admin/performances/me`(`/me`
  // 라우트), `PATCH /admin/performances/{id}`(`/:teamId` 라우트, 운영진 전용).
  const canEdit = data ? canEditPerformance({ id: data.id }) : false;
  // 타임테이블(날짜·시작/종료·상태) 은 축제 운영 스케줄이라 Performer 가 임의로 바꾸면
  // 곤란 — performance.manage 권한자만.
  const canEditTimetable = canEdit && can('performance.manage');
  // 이미지·셋리스트는 백엔드 sub-resource 가 `/me` 전용이라 운영진이 다른 팀 공연에
  // 대해 수정할 수 없다(잘못 호출하면 본인 공연을 건드리는 사고). 본인 공연일 때만 연다.
  const canEditSubResources = canEdit && isMe;

  const myUpdateMutation = useUpdateMyPerformance();
  const adminUpdateMutation = useUpdatePerformance(data?.id ?? null);
  // 라우트별로 다른 PATCH 엔드포인트 — isMe 면 `/me`, 운영진이 :teamId 면 `/{id}`.
  const updateMutation = isMe ? myUpdateMutation : adminUpdateMutation;
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
   * 셋리스트 diff 계산은 `diffSetlist`(순수 함수)에 위임하고, 여기서는
   * 산출된 작업 목록을 항목별 mutation 으로 소비한다.
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

      // 2) 셋리스트 diff — sub-resource 라 본인 공연일 때만 반영. 운영진 :teamId 편집에서는 스킵.
      // NOTE: 항목별 POST/PATCH/DELETE 를 순차 실행한다 — 비원자적(non-atomic).
      // 중간 항목에서 실패하면 일부만 서버에 반영된 부분 저장 상태가 되고,
      // 편집 버퍼는 여전히 전체를 보여준다(서버와 불일치). 백엔드에 일괄 저장
      // 엔드포인트가 생기기 전까지의 한계.
      if (canEditSubResources) {
        const { creates, updates, deletes } = diffSetlist(setlist, editingSetlist);
        for (const id of deletes) {
          await deleteSetlistMutation.mutateAsync(id);
        }
        for (const dto of creates) {
          await addSetlistMutation.mutateAsync(dto);
        }
        for (const { id, dto } of updates) {
          await updateSetlistMutation.mutateAsync({ setlistId: id, input: dto });
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
          <PerformanceProfileFields
            data={displayData}
            isEditMode={isEditMode}
            canEditTimetable={canEditTimetable}
            onChange={patchEditing}
          />

          {/* 공연 이미지 — 항목별 즉시 반영(추가/삭제).
              운영진이 다른 팀 공연(/:teamId)을 편집할 때는 잠근다 — `/me` 전용 엔드포인트라
              잘못 호출하면 자기 공연을 건드린다. */}
          <PerformanceImageGrid
            images={images}
            isEditMode={isEditMode && canEditSubResources}
            isUploading={isUploading}
            isDeleting={deleteImageMutation.isPending}
            onUpload={handleImageUpload}
            onRemove={handleRemoveImage}
          />
        </div>
      </div>

      {/* 공연 타임테이블 */}
      <PerformanceTimetable
        data={displayData}
        isEditMode={isEditMode}
        canEditTimetable={canEditTimetable}
        onChange={patchEditing}
      />

      {/* 공연 셋리스트 — 이미지와 동일하게 sub-resource 라 운영진 :teamId 편집에서는 잠근다. */}
      <div className="bg-background rounded-2xl p-4 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">공연 셋리스트</h2>
          {isEditMode && canEditSubResources && (
            <button
              onClick={addSetlistItem}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus size={16} />곡 추가
            </button>
          )}
        </div>

        {isEditMode && canEditSubResources ? (
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

      {/* 내 응원 메시지 — Performer 본인 공연(`/me`)에서만 노출. 읽기 전용.
          관객이 남긴 응원을 본인이 확인하는 용도. 숨김 처리(모더레이션)는 운영진 도메인의 책임이라
          여기선 상태 배지만 보여준다. */}
      {isMe && (
        <div className="bg-background rounded-2xl p-4 md:p-8 mt-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <MessageCircle size={20} />내 응원 메시지
          </h2>

          {cheerMessagesQuery.isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              응원 메시지를 불러오는 중…
            </div>
          )}

          {cheerMessagesQuery.isError && (
            <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-lg p-6 text-center">
              <p className="mb-3">응원 메시지를 가져오지 못했습니다.</p>
              <button
                type="button"
                onClick={() => cheerMessagesQuery.refetch()}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}

          {!cheerMessagesQuery.isLoading &&
            !cheerMessagesQuery.isError &&
            (cheerMessagesQuery.data ?? []).length === 0 && (
              <div className="text-center py-12 text-ds-text-disabled">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>아직 받은 응원 메시지가 없습니다.</p>
              </div>
            )}

          {!cheerMessagesQuery.isLoading &&
            !cheerMessagesQuery.isError &&
            (cheerMessagesQuery.data ?? []).length > 0 && (
              <ul className="space-y-3">
                {(cheerMessagesQuery.data ?? []).map((m) => (
                  <li
                    key={m.id}
                    className="p-4 border border-border rounded-lg flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {m.songTitle && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          <Music size={12} />
                          {m.songTitle}
                          {m.singerName ? ` · ${m.singerName}` : ''}
                        </span>
                      )}
                      {m.displayStatus === 'HIDDEN' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ds-error-subtle text-destructive text-xs font-medium">
                          <EyeOff size={12} />
                          숨김
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{m.createdAt}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap break-words">{m.message}</p>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      {/* 공연 일차 표시 — view 모드 보조 정보. */}
      {!isEditMode && (
        <p className="mt-4 text-xs text-muted-foreground">
          공연 일차: {dateLabel(data.performanceDate)}
        </p>
      )}
    </div>
  );
}
