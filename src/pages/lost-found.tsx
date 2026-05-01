import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Upload, Package, X } from "lucide-react";
import { toast } from "sonner";
import { mockLostItems, type LostItem } from "@/mocks/lost-items";
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

export function LostFoundPage() {
  const [lostItems, setLostItems] = useState<LostItem[]>(mockLostItems);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LostItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LostItem | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [hasExistingImage, setHasExistingImage] = useState(false);

  useEffect(() => {
    if (!showForm) return;
    if (editingItem) {
      setNameDraft(editingItem.name);
      setLocationDraft(editingItem.location);
      setDescriptionDraft(editingItem.description ?? "");
      setHasExistingImage(editingItem.hasImage);
    } else {
      setNameDraft("");
      setLocationDraft("");
      setDescriptionDraft("");
      setHasExistingImage(false);
    }
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [editingItem, showForm]);

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
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: LostItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setLostItems(lostItems.filter(item => item.id !== pendingDelete.id));
    toast.success("분실물을 삭제했습니다.");
    setPendingDelete(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!nameDraft.trim() || !locationDraft.trim()) {
      toast.error("분실물명과 발견 위치를 모두 입력해주세요.");
      return;
    }
    const description = descriptionDraft.trim() || undefined;
    const hasImage = !!imagePreviewUrl || hasExistingImage;
    if (editingItem) {
      setLostItems(lostItems.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              name: nameDraft.trim(),
              location: locationDraft.trim(),
              description,
              hasImage,
            }
          : item,
      ));
      toast.success("분실물 정보를 수정했습니다.");
    } else {
      const nextId = lostItems.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const newItem: LostItem = {
        id: nextId,
        name: nameDraft.trim(),
        location: locationDraft.trim(),
        date: todayString(),
        hasImage,
        description,
      };
      setLostItems([newItem, ...lostItems]);
      toast.success("분실물을 등록했습니다.");
    }
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="p-4 md:p-8">
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
        <div className="bg-background rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-muted">
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
                <tr key={item.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="text-left w-full group"
                      aria-label={`${item.name} 수정`}
                    >
                      <div className="text-sm font-medium text-foreground group-hover:text-primary group-hover:underline underline-offset-2 transition-colors">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      )}
                    </button>
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
                        onClick={() => setPendingDelete(item)}
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
          {lostItems.length === 0 && (
            <div className="text-center py-12 text-ds-text-disabled">
              <p>등록된 분실물이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Lost Item Form */}
      {showForm && (
        <div className="bg-background rounded-2xl p-4 md:p-8 shadow-sm">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">분실물명</label>
                <input
                  type="text"
                  placeholder="분실물 이름을 입력하세요"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">발견 위치</label>
                <input
                  type="text"
                  placeholder="발견 위치를 입력하세요"
                  value={locationDraft}
                  onChange={(e) => setLocationDraft(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">상세 설명</label>
              <textarea
                rows={4}
                placeholder="분실물에 대한 상세 설명을 입력하세요"
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">분실물 사진</label>
              {imagePreviewUrl ? (
                <div className="relative inline-block max-w-full overflow-hidden rounded-lg border border-border bg-muted">
                  <img
                    src={imagePreviewUrl}
                    alt="첨부한 분실물 사진 미리보기"
                    className="block max-h-80 w-auto max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleImageChange(null)}
                    aria-label="사진 제거"
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:bg-background hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : hasExistingImage ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span>기존 사진이 첨부되어 있습니다.</span>
                  <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-ds-border-strong">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                    />
                    사진 변경
                  </label>
                  <button
                    type="button"
                    onClick={() => setHasExistingImage(false)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    사진 제거
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
                  <p className="text-sm text-muted-foreground">분실물 사진을 업로드하세요</p>
                </label>
              )}
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
                {editingItem ? "수정 완료" : "등록"}
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
            <AlertDialogTitle>분실물 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" 분실물 기록을 삭제합니다. 삭제 후에는 복구할 수 없습니다.
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
