import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
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
import { useCreateMenu, useDeleteMenu, useMenus, useUpdateMenu } from '@/features/menus/hooks';
import type { Menu } from '@/features/menus/types';

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all';

/** number | 'new' — 편집 중인 메뉴 id, 또는 신규 추가 폼. */
type DraftId = number | 'new';

interface Draft {
  name: string;
  price: string;
  description: string;
  isSoldOut: boolean;
}

const EMPTY_DRAFT: Draft = { name: '', price: '', description: '', isSoldOut: false };

interface Props {
  boothId: number;
}

/**
 * 부스 메뉴 관리 — 목록 + 추가/수정/삭제.
 * 백엔드 displayOrder 가 부스 단위 UNIQUE 라 순서변경(DnD)은 v1 범위 외 —
 * 새 메뉴는 항상 끝에 붙는다(api 레이어가 max+1 채움).
 */
export function MenuListForm({ boothId }: Props) {
  const menusQuery = useMenus(boothId);
  const createMut = useCreateMenu(boothId);
  const updateMut = useUpdateMenu(boothId);
  const deleteMut = useDeleteMenu(boothId);

  const [editingId, setEditingId] = useState<DraftId | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pendingDelete, setPendingDelete] = useState<Menu | null>(null);

  const saving = createMut.isPending || updateMut.isPending;

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId('new');
  };

  const startEdit = (m: Menu) => {
    setDraft({
      name: m.name,
      price: String(m.price),
      description: m.description,
      isSoldOut: m.isSoldOut,
    });
    setEditingId(m.id);
  };

  const saveDraft = () => {
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (!name) {
      toast.error('메뉴 이름을 입력해주세요.');
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      toast.error('가격을 0 이상의 정수로 입력해주세요.');
      return;
    }
    const payload = {
      name,
      description: draft.description.trim(),
      price,
      isSoldOut: draft.isSoldOut,
    };
    if (editingId === 'new') {
      createMut.mutate(payload, {
        onSuccess: () => {
          setEditingId(null);
          toast.success('메뉴를 추가했습니다.');
        },
        onError: () => toast.error('메뉴 추가에 실패했습니다.'),
      });
    } else if (editingId != null) {
      updateMut.mutate(
        { menuId: editingId, patch: payload },
        {
          onSuccess: () => {
            setEditingId(null);
            toast.success('메뉴를 수정했습니다.');
          },
          onError: () => toast.error('메뉴 수정에 실패했습니다.'),
        },
      );
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    deleteMut.mutate(id, {
      onSuccess: () => {
        setPendingDelete(null);
        if (editingId === id) setEditingId(null);
        toast.success('메뉴를 삭제했습니다.');
      },
      onError: () => toast.error('메뉴 삭제에 실패했습니다.'),
    });
  };

  const draftForm = (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="menu-name" className="block text-sm font-semibold text-foreground mb-1.5">
            메뉴 이름
          </label>
          <input
            id="menu-name"
            type="text"
            placeholder="예: 후라이드 치킨"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="menu-price"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            가격 (원)
          </label>
          <input
            id="menu-price"
            type="number"
            min={0}
            placeholder="예: 5000"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="menu-description"
          className="block text-sm font-semibold text-foreground mb-1.5"
        >
          설명
        </label>
        <input
          id="menu-description"
          type="text"
          placeholder="메뉴 설명 (선택)"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">품절</span>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, isSoldOut: !draft.isSoldOut })}
            aria-pressed={draft.isSoldOut}
            aria-label={draft.isSoldOut ? '품절 해제' : '품절로 설정'}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
              draft.isSoldOut ? 'bg-destructive' : 'bg-ds-gray-400'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-background rounded-full shadow-md transition-all duration-300 ${
                draft.isSoldOut ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-foreground hover:border-ds-border-strong transition-colors"
          >
            <X size={16} />
            취소
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-ds-primary-pressed transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );

  const menus = menusQuery.data ?? [];

  return (
    <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-foreground">메뉴 리스트</h2>
        {editingId !== 'new' && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200"
          >
            <Plus size={18} />
            메뉴 추가
          </button>
        )}
      </div>

      {menusQuery.isPending && <p className="text-sm text-muted-foreground">불러오는 중…</p>}

      {menusQuery.isError && (
        <div className="flex flex-col items-start gap-3 text-sm">
          <span className="text-destructive">메뉴를 불러오지 못했습니다.</span>
          <button
            type="button"
            onClick={() => menusQuery.refetch()}
            className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
          >
            다시 시도
          </button>
        </div>
      )}

      {!menusQuery.isPending && !menusQuery.isError && (
        <div className="space-y-3">
          {menus.length === 0 && editingId !== 'new' && (
            <div className="w-full px-4 py-8 border border-dashed border-border rounded-lg bg-muted text-center text-sm text-muted-foreground">
              등록된 메뉴가 없습니다. &lsquo;메뉴 추가&rsquo;로 첫 메뉴를 등록하세요.
            </div>
          )}

          {menus.map((m) =>
            editingId === m.id ? (
              <div key={m.id}>{draftForm}</div>
            ) : (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{m.name}</span>
                    {m.isSoldOut && (
                      <span className="shrink-0 rounded-full bg-ds-error-subtle px-2 py-0.5 text-xs font-medium text-ds-error-pressed">
                        품절
                      </span>
                    )}
                  </div>
                  {m.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">{m.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-foreground tabular-nums">
                    {m.price.toLocaleString()}원
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    aria-label={`${m.name} 수정`}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(m)}
                    aria-label={`${m.name} 삭제`}
                    className="rounded-md p-2 text-muted-foreground hover:bg-ds-error-subtle hover:text-destructive transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ),
          )}

          {editingId === 'new' && draftForm}
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메뉴 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              메뉴 &ldquo;{pendingDelete?.name}&rdquo; 를 삭제합니다. 되돌릴 수 없습니다.
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
