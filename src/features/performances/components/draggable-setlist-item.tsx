import { GripVertical, Trash2 } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import type { SetlistItem } from '@/features/performances/types';

const ItemType = 'SETLIST_ITEM';

export interface DraggableSetlistItemProps {
  item: SetlistItem;
  index: number;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: number, field: 'songName' | 'artist', value: string) => void;
  onDelete: (id: number) => void;
}

/**
 * 셋리스트 편집 모드의 한 행. 드래그 핸들로 순서 변경, 인풋 직접 편집, 삭제.
 * 동적 리스트라 visible label 대신 aria-label 로 매칭한다. (DraggableMenuItem 패턴)
 */
export function DraggableSetlistItem({
  item,
  index,
  moveItem,
  onUpdate,
  onDelete,
}: DraggableSetlistItemProps) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-border rounded-lg transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:border-primary`}
    >
      <div
        ref={drag}
        className="cursor-move text-ds-text-disabled hover:text-muted-foreground transition-colors"
      >
        <GripVertical size={20} />
      </div>

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
