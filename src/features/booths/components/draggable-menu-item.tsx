import { GripVertical, Trash2, Upload } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import type { BoothMenuItem } from "@/features/booths/types";

const ItemType = "MENU_ITEM";

export interface DraggableMenuItemProps {
  item: BoothMenuItem;
  index: number;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: number, field: keyof BoothMenuItem, value: string | boolean) => void;
  onDelete: (id: number) => void;
}

/**
 * 메뉴 리스트 편집 모드의 한 행. 드래그 핸들로 순서 변경, 인풋 직접 편집,
 * 품절 토글, 삭제. 동적 리스트라 visible label 대신 aria-label 로 매칭한다.
 */
export function DraggableMenuItem({ item, index, moveItem, onUpdate, onDelete }: DraggableMenuItemProps) {
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
      className={`flex items-center gap-4 p-4 border border-border rounded-lg transition-all ${
        isDragging ? "opacity-50" : "opacity-100"
      } hover:border-primary`}
    >
      <div
        ref={drag}
        className="cursor-move text-ds-text-disabled hover:text-muted-foreground transition-colors"
      >
        <GripVertical size={20} />
      </div>

      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
        {item.order}
      </div>

      <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Upload size={24} className="text-ds-text-disabled" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        {/* 동적 리스트 행이라 visible label 대신 aria-label 로 매칭. */}
        <input
          type="text"
          placeholder="메뉴명"
          aria-label="메뉴명"
          value={item.name}
          onChange={(e) => onUpdate(item.id, "name", e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="메뉴 설명"
          aria-label="메뉴 설명"
          value={item.description}
          onChange={(e) => onUpdate(item.id, "description", e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="가격 (예: 5,000원)"
          aria-label="가격"
          value={item.price}
          onChange={(e) => onUpdate(item.id, "price", e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">품절</span>
        <button
          onClick={() => onUpdate(item.id, "soldOut", !item.soldOut)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            item.soldOut ? "bg-destructive" : "bg-ds-border-strong"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-background rounded-full shadow-md transition-all duration-300 ${
              item.soldOut ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
