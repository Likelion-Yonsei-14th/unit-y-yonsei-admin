import { GripVertical, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetlistItem } from '@/features/performances/types';

export interface DraggableSetlistItemProps {
  item: SetlistItem;
  index: number;
  onUpdate: (id: number, field: 'songName' | 'artist', value: string) => void;
  onDelete: (id: number) => void;
}

/**
 * 셋리스트 편집 모드의 한 행. 핸들(≡)로 순서 변경, 인풋 직접 편집, 삭제.
 * @dnd-kit/sortable 기반 — 마우스·터치·키보드 모두 지원.
 */
export function DraggableSetlistItem({
  item,
  index,
  onUpdate,
  onDelete,
}: DraggableSetlistItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

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

      <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground font-bold rounded-lg flex-shrink-0">
        {index + 1}
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="곡명"
          aria-label="곡명"
          value={item.songName}
          onChange={(e) => onUpdate(item.id, 'songName', e.target.value)}
          className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="원곡자"
          aria-label="원곡자"
          value={item.artist}
          onChange={(e) => onUpdate(item.id, 'artist', e.target.value)}
          className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="button"
        aria-label={item.songName ? `${item.songName} 곡 삭제` : '곡 삭제'}
        onClick={() => onDelete(item.id)}
        className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
