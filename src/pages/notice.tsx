import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit2, FileText, Pin } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateNotice,
  useDeleteNotice,
  useNotices,
  useUpdateNotice,
} from '@/features/notices/hooks';
import { uploadImage } from '@/features/uploads/api';
import {
  NoticeImagesField,
  type DraftImage,
} from '@/features/notices/components/notice-images-field';
import {
  isNewNotice,
  NOTICE_CATEGORIES,
  type Notice,
  type NoticeCategory,
  type NoticeCategoryMeta,
} from '@/features/notices/types';
import { PageHeaderAction } from '@/components/common/page-header-action';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Markdown, stripMarkdown } from '@/components/common/markdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * 카테고리 톤 → Tailwind 배지 클래스 매핑.
 * NOTICE_CATEGORIES 의 tone 값과 1:1 대응.
 */
const CATEGORY_TONE_CLASS: Record<NoticeCategoryMeta['tone'], string> = {
  neutral: 'bg-muted text-muted-foreground',
  secondary: 'bg-ds-secondary-a-subtle text-ds-secondary-a-pressed',
  warning: 'bg-ds-warning-subtle text-ds-warning-pressed',
  primary: 'bg-ds-primary-subtle text-ds-primary-pressed',
  success: 'bg-ds-success-subtle text-ds-success-pressed',
};

export function NoticePage() {
  const noticesQuery = useNotices();
  const notices = useMemo(() => noticesQuery.data ?? [], [noticesQuery.data]);
  // 상단 고정 공지를 목록 맨 위로. JS sort 는 안정 정렬이라 그룹 내 기존 순서 유지.
  const sortedNotices = useMemo(
    () => [...notices].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
    [notices],
  );
  const createMutation = useCreateNotice();
  const updateMutation = useUpdateNotice();
  const deleteMutation = useDeleteNotice();

  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Notice | null>(null);

  // 폼 입력 상태 (controlled)
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState<NoticeCategory>('OTHERS');
  const [isPinnedDraft, setIsPinnedDraft] = useState(false);
  // 폼에서 편집 중인 카드뉴스 이미지 목록(순서 = 카드 슬라이드 순서, 첫 장이 대표).
  // 기존 URL 과 새로 고른 파일이 섞여 있고, 실제 업로드는 저장 시 일괄 처리한다.
  const [images, setImages] = useState<DraftImage[]>([]);
  // 이미지 S3 업로드 진행 중 — 저장 버튼 잠금.
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!showForm) return;
    if (editingNotice) {
      setTitleDraft(editingNotice.title);
      setContentDraft(editingNotice.content);
      const urls =
        editingNotice.imageUrls ?? (editingNotice.imageUrl ? [editingNotice.imageUrl] : []);
      setImages(urls.map((url): DraftImage => ({ kind: 'existing', url })));
      setIsPinnedDraft(editingNotice.isPinned);
      setCategoryDraft(editingNotice.category);
    } else {
      setTitleDraft('');
      setContentDraft('');
      setImages([]);
      setIsPinnedDraft(false);
      setCategoryDraft('OTHERS');
    }
  }, [editingNotice, showForm]);

  const handleCreateNew = () => {
    setEditingNotice(null);
    setShowForm(true);
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setShowForm(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success('공지사항을 삭제했습니다.');
      },
      onError: () => {
        toast.error('삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
      },
    });
    setPendingDelete(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNotice(null);
  };

  const handleSave = async () => {
    if (!titleDraft.trim() || !contentDraft.trim()) {
      toast.error('제목과 본문을 모두 입력해주세요.');
      return;
    }
    // 새로 고른 파일만 S3 업로드하고, 기존 URL 은 그대로 둔 채 화면 순서대로 합친다.
    let imageUrls: string[];
    const hasNew = images.some((img) => img.kind === 'new');
    if (hasNew) setIsUploading(true);
    try {
      imageUrls = await Promise.all(
        images.map((img) =>
          img.kind === 'new' ? uploadImage(img.file, 'notice') : Promise.resolve(img.url),
        ),
      );
    } catch {
      toast.error('이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return;
    } finally {
      if (hasNew) setIsUploading(false);
    }
    const onAfter = () => {
      setShowForm(false);
      setEditingNotice(null);
    };
    if (editingNotice) {
      updateMutation.mutate(
        {
          id: editingNotice.id,
          title: titleDraft.trim(),
          content: contentDraft.trim(),
          imageUrls,
          isPinned: isPinnedDraft,
          category: categoryDraft,
        },
        {
          onSuccess: () => {
            toast.success('공지사항을 수정했습니다.');
            onAfter();
          },
          onError: () => toast.error('수정에 실패했습니다. 잠시 후 다시 시도해주세요.'),
        },
      );
    } else {
      createMutation.mutate(
        {
          title: titleDraft.trim(),
          content: contentDraft.trim(),
          imageUrls,
          isPinned: isPinnedDraft,
          category: categoryDraft,
        },
        {
          onSuccess: () => {
            toast.success('공지사항을 등록했습니다.');
            onAfter();
          },
          onError: () => toast.error('등록에 실패했습니다. 잠시 후 다시 시도해주세요.'),
        },
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || isUploading;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText size={32} />
          총학생회 공지사항
        </h1>
        {!showForm && (
          <PageHeaderAction tone="blue" onClick={handleCreateNew} icon={<Plus size={16} />}>
            새 공지사항 작성
          </PageHeaderAction>
        )}
      </div>

      {/* 로딩/에러 상태 */}
      {!showForm && noticesQuery.isLoading && <TableSkeleton rows={4} />}
      {!showForm && noticesQuery.isError && (
        <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-2xl p-6 text-center">
          <p className="mb-3">공지사항을 가져오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => noticesQuery.refetch()}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Notice List */}
      {!showForm && noticesQuery.isSuccess && (
        <div className="bg-background rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    제목
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground whitespace-nowrap">
                    등록일
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground whitespace-nowrap">
                    이미지
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedNotices.map((notice) => {
                  const category = NOTICE_CATEGORIES[notice.category];
                  const isNew = isNewNotice(notice.date);
                  return (
                    <tr key={notice.id} className="hover:bg-muted transition-colors">
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(notice)}
                          className="text-left w-full group"
                          aria-label={`${notice.title} 수정`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            {notice.isPinned && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-ds-warning-subtle text-ds-warning-pressed">
                                <Pin size={9} aria-hidden="true" />
                                고정
                              </span>
                            )}
                            {isNew && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
                                NEW
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${CATEGORY_TONE_CLASS[category.tone]}`}
                            >
                              {category.label}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-foreground group-hover:text-primary group-hover:underline underline-offset-2 transition-colors">
                            {notice.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {stripMarkdown(notice.content)}
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {notice.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {notice.hasImage ? (
                          <span className="inline-block px-3 py-1 bg-ds-success-subtle text-ds-success-pressed rounded-full text-xs font-medium">
                            {notice.imageUrls?.length ?? 1}장
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
                            type="button"
                            aria-label={`${notice.title} 수정`}
                            onClick={() => handleEdit(notice)}
                            className="p-2 text-primary hover:bg-ds-primary-subtle rounded-lg transition-colors"
                          >
                            <Edit2 size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${notice.title} 삭제`}
                            onClick={() => setPendingDelete(notice)}
                            className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {notices.length === 0 && (
            <div className="text-center py-12 text-ds-text-disabled">
              <p>등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Notice Form */}
      {showForm && (
        <div className="bg-background rounded-2xl p-4 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {editingNotice ? '공지사항 수정' : '새 공지사항 작성'}
            </h2>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors text-sm"
            >
              목록으로
            </button>
          </div>

          <div className="space-y-6">
            {/* 카테고리 — 모바일 웹사이트와 통일된 4 일자 + general 5 옵션. */}
            <div>
              <span className="block text-sm font-semibold text-foreground mb-2">분류</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="공지 분류">
                {(Object.values(NOTICE_CATEGORIES) as NoticeCategoryMeta[]).map((cat) => {
                  const selected = categoryDraft === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setCategoryDraft(cat.id)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selected
                          ? CATEGORY_TONE_CLASS[cat.tone] + ' ring-2 ring-foreground/40'
                          : 'bg-background border border-border text-muted-foreground hover:border-ds-border-strong'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="notice-title"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                공지사항 제목
              </label>
              <input
                id="notice-title"
                type="text"
                placeholder="공지사항 제목을 입력하세요"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>

            <div>
              <span className="block text-sm font-semibold text-foreground mb-2">
                카드뉴스 이미지
              </span>
              <NoticeImagesField images={images} onChange={setImages} disabled={isSaving} />
            </div>

            {/* 상단 고정 — 켜면 목록·앱 상단에 우선 노출. */}
            <div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isPinnedDraft}
                  onChange={(e) => setIsPinnedDraft(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground">상단 고정</span>
                <span className="text-xs font-normal text-muted-foreground">
                  목록·앱 상단에 우선 노출됩니다.
                </span>
              </label>
            </div>

            <div>
              <label
                htmlFor="notice-content"
                className="block text-sm font-semibold text-foreground mb-2 flex items-center justify-between"
              >
                <span>본문</span>
                <span className="text-xs font-normal text-muted-foreground">
                  마크다운 지원 — **굵게**, *기울임*, [링크](url), 목록(- ), 표
                </span>
              </label>
              <textarea
                id="notice-content"
                rows={6}
                placeholder="공지사항 내용을 작성하세요. 마크다운 문법을 그대로 쓰면 미리보기에 반영됩니다."
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none font-mono text-sm"
              />
              {/* 실시간 미리보기 — 비어 있을 땐 안내, 있을 땐 렌더 결과. */}
              <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2">미리보기</div>
                {contentDraft.trim() ? (
                  <Markdown source={contentDraft} />
                ) : (
                  <p className="text-xs text-ds-text-disabled">
                    본문을 입력하면 여기에 렌더 결과가 표시됩니다.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isUploading
                  ? '이미지 업로드 중…'
                  : isSaving
                    ? '저장 중…'
                    : editingNotice
                      ? '수정 완료'
                      : '공지사항 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; 공지사항을 삭제합니다. 삭제 후에는 복구할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
