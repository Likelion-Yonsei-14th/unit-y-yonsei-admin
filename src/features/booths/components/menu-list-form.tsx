import { useEffect, useState } from 'react';
import { Check, Edit, Plus, Upload } from 'lucide-react';
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
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { BoothMenuItem, BoothProfile } from '@/features/booths/types';
import { DraggableMenuItem } from './draggable-menu-item';

interface Props {
  booth: BoothProfile;
  /** 본 폼 진입 시 곧바로 편집 모드로 갈지 여부 — 메뉴 작성이 비어있는 부스 진입에 사용. */
  initiallyEditing: boolean;
  /**
   * 부스 프로필 mutation 인스턴스. 본 폼은 menuItems / orderNotice 두 필드만 patch 하지만
   * mutation 자체는 페이지(BoothInfoForm 과 공유) 와 같은 객체.
   */
  updateMutation: UseMutationResult<BoothProfile, Error, Partial<BoothProfile>>;
}

/** 빈 메뉴 항목 한 줄. 메뉴 추가 버튼과 초기 디폴트 행 양쪽에서 사용. */
function makeBlankMenuItem(order: number): BoothMenuItem {
  return {
    id: Date.now(),
    order,
    name: '',
    description: '',
    price: '',
    image: null,
    soldOut: false,
  };
}

/**
 * 메뉴 리스트 + 주문 공지 편집 폼.
 *
 * 폼 자체에서 메뉴 항목 / 주문 공지 state 를 들고 있고, 저장 성공 시 view 모드로 복귀.
 * booth prop 이 외부 refetch 로 바뀌면 form state 를 다시 hydrate.
 */
export function MenuListForm({ booth, initiallyEditing, updateMutation }: Props) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [orderNotice, setOrderNotice] = useState(booth.orderNotice);
  const [menuItems, setMenuItems] = useState<BoothMenuItem[]>(booth.menuItems);

  // 서버 데이터 도착/refetch 시 form state hydrate. 편집 중에 덮어쓰지 않으려면
  // 별도 분기 필요하지만, 여기서는 단순 동기화 — 충돌 방지는 페이지가 책임.
  useEffect(() => {
    setOrderNotice(booth.orderNotice);
    setMenuItems(booth.menuItems);
  }, [booth]);

  // 편집 모드인데 메뉴가 하나도 없으면 디폴트로 빈 행 하나를 띄운다.
  // 메뉴 추가 버튼을 누르지 않아도 바로 작성을 시작할 수 있게.
  useEffect(() => {
    if (isEditing && menuItems.length === 0) {
      setMenuItems([makeBlankMenuItem(1)]);
    }
  }, [isEditing, menuItems.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = menuItems.findIndex((m) => m.id === active.id);
    const newIndex = menuItems.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setMenuItems(
      arrayMove(menuItems, oldIndex, newIndex).map((m, idx) => ({ ...m, order: idx + 1 })),
    );
  };

  const addMenuItem = () => {
    setMenuItems([...menuItems, makeBlankMenuItem(menuItems.length + 1)]);
  };

  const updateMenuItem = (id: number, field: keyof BoothMenuItem, value: string | boolean) => {
    setMenuItems(menuItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const deleteMenuItem = (id: number) => {
    const filtered = menuItems.filter((item) => item.id !== id);
    setMenuItems(filtered.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const toggleSoldOut = (id: number) => {
    setMenuItems(
      menuItems.map((item) => (item.id === id ? { ...item, soldOut: !item.soldOut } : item)),
    );
  };

  const handleSave = () => {
    updateMutation.mutate(
      { orderNotice, menuItems },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success('메뉴 리스트를 저장했습니다.');
        },
        onError: () => {
          toast.error('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
        },
      },
    );
  };

  return (
    <div className="bg-background rounded-2xl p-4 md:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-foreground">메뉴 리스트</h2>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={addMenuItem}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-ds-border-strong transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              메뉴 추가
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200"
            >
              <Edit size={18} />
              편집
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              {updateMutation.isPending ? '저장 중…' : '저장'}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="booth-order-notice"
          className="block text-sm font-semibold text-foreground mb-2"
        >
          부스 주문 공지
        </label>
        {isEditing ? (
          <textarea
            id="booth-order-notice"
            rows={3}
            placeholder="예: 테이블 이용 시 메인 메뉴를 하나 이상 주문해주셔야 합니다."
            value={orderNotice}
            onChange={(e) => setOrderNotice(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
          />
        ) : (
          <div
            id="booth-order-notice"
            className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground"
          >
            {orderNotice}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          주문 시 고객에게 안내될 공지사항을 입력하세요.
        </p>
      </div>

      {isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={menuItems.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {menuItems.map((item, index) => (
                <DraggableMenuItem
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdate={updateMenuItem}
                  onDelete={deleteMenuItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-4">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg bg-muted"
            >
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

              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">{item.name}</div>
                <div className="text-sm text-muted-foreground mb-1">{item.description}</div>
                <div className="text-sm font-medium text-primary">{item.price}</div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSoldOut(item.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      item.soldOut
                        ? 'bg-ds-error-subtle text-ds-error-pressed'
                        : 'bg-ds-success-subtle text-ds-success-pressed'
                    }
                  `}
                >
                  {item.soldOut ? '품절' : '판매중'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
