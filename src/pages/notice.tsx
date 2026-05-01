import { useEffect, useState } from "react";
import { Upload, Plus, Trash2, Edit2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { mockNotices, type Notice } from "@/mocks/notices";
import { PageHeaderAction } from "@/components/common/page-header-action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const todayString = () => new Date().toISOString().slice(0, 10);

export function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>(mockNotices);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Notice | null>(null);

  // 폼 입력 상태 (controlled)
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  // 새로 첨부한 이미지의 object URL — 미리보기 + cleanup 대상.
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  // 편집 진입 시 기존 이미지 보유 여부 — 새 파일을 올리지 않고 그대로 저장하면 유지된다.
  const [hasExistingImage, setHasExistingImage] = useState(false);

  useEffect(() => {
    if (!showForm) return;
    if (editingNotice) {
      setTitleDraft(editingNotice.title);
      setContentDraft(editingNotice.content);
      setHasExistingImage(editingNotice.hasImage);
    } else {
      setTitleDraft("");
      setContentDraft("");
      setHasExistingImage(false);
    }
    // 새 미리보기는 폼 진입 시 항상 초기화 — 이전 폼의 잔재가 다음 폼에 남지 않게.
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [editingNotice, showForm]);

  // 컴포넌트 unmount 시 마지막 object URL 정리.
  useEffect(() => () => {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const handleImageChange = (file: File | null) => {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    if (file) setHasExistingImage(false);
  };

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
    setNotices(notices.filter(n => n.id !== pendingDelete.id));
    toast.success("공지사항을 삭제했습니다.");
    setPendingDelete(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNotice(null);
  };

  const handleSave = () => {
    if (!titleDraft.trim() || !contentDraft.trim()) {
      toast.error("제목과 본문을 모두 입력해주세요.");
      return;
    }
    const hasImage = !!imagePreviewUrl || hasExistingImage;
    if (editingNotice) {
      setNotices(notices.map(n =>
        n.id === editingNotice.id
          ? { ...n, title: titleDraft.trim(), content: contentDraft.trim(), hasImage }
          : n,
      ));
      toast.success("공지사항을 수정했습니다.");
    } else {
      const nextId = notices.reduce((max, n) => Math.max(max, n.id), 0) + 1;
      const newNotice: Notice = {
        id: nextId,
        title: titleDraft.trim(),
        content: contentDraft.trim(),
        date: todayString(),
        hasImage,
      };
      setNotices([newNotice, ...notices]);
      toast.success("공지사항을 등록했습니다.");
    }
    setShowForm(false);
    setEditingNotice(null);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
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

      {/* Notice List */}
      {!showForm && (
        <div className="bg-background rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">제목</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">등록일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">이미지</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">액션</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(notice)}
                      className="text-left w-full group"
                      aria-label={`${notice.title} 수정`}
                    >
                      <div className="text-sm font-medium text-foreground group-hover:text-primary group-hover:underline underline-offset-2 transition-colors">
                        {notice.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{notice.content}</div>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{notice.date}</td>
                  <td className="px-6 py-4">
                    {notice.hasImage ? (
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
                        onClick={() => handleEdit(notice)}
                        className="p-2 text-primary hover:bg-ds-primary-subtle rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(notice)}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {editingNotice ? "공지사항 수정" : "새 공지사항 작성"}
            </h2>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors text-sm"
            >
              목록으로
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">공지사항 제목</label>
              <input
                type="text"
                placeholder="공지사항 제목을 입력하세요"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">카드뉴스 이미지</label>
              {imagePreviewUrl ? (
                <div className="relative inline-block max-w-full overflow-hidden rounded-lg border border-border bg-muted">
                  <img
                    src={imagePreviewUrl}
                    alt="첨부한 카드뉴스 미리보기"
                    className="block max-h-80 w-auto max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleImageChange(null)}
                    aria-label="이미지 제거"
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:bg-background hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : hasExistingImage ? (
                /* 편집 진입 시 mock 데이터엔 URL 이 없어 미리보기를 띄울 수 없는 경우.
                   '기존 이미지 유지' 의도를 명시하고, 변경하려면 새로 업로드. */
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span>기존 이미지가 첨부되어 있습니다.</span>
                  <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-ds-border-strong">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                    />
                    이미지 변경
                  </label>
                  <button
                    type="button"
                    onClick={() => setHasExistingImage(false)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    이미지 제거
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer rounded-lg border-2 border-dashed border-ds-border-strong p-8 text-center transition-colors hover:border-primary">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                  />
                  <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
                  <p className="text-sm text-muted-foreground">인스타그램 카드뉴스 이미지를 업로드하세요</p>
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">본문</label>
              <textarea
                rows={6}
                placeholder="공지사항 내용을 작성하세요"
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200"
              >
                {editingNotice ? "수정 완료" : "공지사항 등록"}
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
              "{pendingDelete?.title}" 공지사항을 삭제합니다. 삭제 후에는 복구할 수 없습니다.
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
