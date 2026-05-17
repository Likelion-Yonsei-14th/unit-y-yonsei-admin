import { useState } from 'react';
import { GripVertical, Loader2, Trash2, Upload } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { uploadImage } from '@/features/uploads/api';
import type { BoothMenuItem } from '@/features/booths/types';

export interface DraggableMenuItemProps {
  item: BoothMenuItem;
  index: number;
  onUpdate: (id: number, field: keyof BoothMenuItem, value: string | boolean) => void;
  onDelete: (id: number) => void;
}

/**
 * 메뉴 리스트 편집 모드의 한 행. 핸들(≡)로 순서 변경, 인풋 직접 편집, 사진 첨부,
 * 품절 토글, 삭제. @dnd-kit/sortable 기반 — 마우스·터치·키보드 모두 지원.
 */
export function DraggableMenuItem({ item, index, onUpdate, onDelete }: DraggableMenuItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [uploading, setUploading] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-border rounded-lg bg-background hover:border-primary ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <button
        type="button"
        aria-label="순서 변경 핸들"
        className="cursor-grab active:cursor-grabbing touch-none text-ds-text-disabled hover:text-muted-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={20} />
      </button>

      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
        {index + 1}
      </div>

      {/* 메뉴 사진 — 박스 클릭 시 파일 선택 → 업로드 후 imageUrl 저장. */}
      <label className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
        <input
          type="file"
          accept="image/*"
          aria-label="메뉴 사진 첨부"
          className="hidden"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setUploading(true);
            try {
              onUpdate(item.id, 'image', await uploadImage(file, 'MENU'));
            } catch {
              toast.error('사진 업로드에 실패했습니다.');
            } finally {
              setUploading(false);
            }
          }}
        />
        {uploading ? (
          <Loader2 size={24} className="animate-spin text-ds-text-disabled" />
        ) : item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Upload size={24} className="text-ds-text-disabled" />
        )}
      </label>

      <div className="flex-1 space-y-2">
        <input
          type="text"
          placeholder="메뉴명"
          aria-label="메뉴명"
          value={item.name}
          onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="메뉴 설명"
          aria-label="메뉴 설명"
          value={item.description}
          onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="가격 (예: 5,000원)"
          aria-label="가격"
          value={item.price}
          onChange={(e) => onUpdate(item.id, 'price', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2">
        <span id={`menu-${item.id}-soldout-label`} className="text-sm text-muted-foreground">
          품절
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={item.soldOut}
          aria-labelledby={`menu-${item.id}-soldout-label`}
          onClick={() => onUpdate(item.id, 'soldOut', !item.soldOut)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            item.soldOut ? 'bg-destructive' : 'bg-ds-gray-400'
          }`}
        >
          <div
            aria-hidden="true"
            className={`absolute top-1 w-4 h-4 bg-background rounded-full shadow-md transition-all duration-300 ${
              item.soldOut ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      <button
        type="button"
        aria-label={item.name ? `${item.name} 메뉴 삭제` : '메뉴 삭제'}
        onClick={() => onDelete(item.id)}
        className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
