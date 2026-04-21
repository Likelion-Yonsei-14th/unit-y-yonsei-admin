import { useEffect, useState } from "react";
import { Upload, Plus, Trash2, Check, X, GripVertical, ArrowLeft, Star, Edit } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useMyBoothProfile } from "@/features/booths/hooks";
import {
  isBoothInfoCompleted, isMenuListCompleted,
  type BoothImage, type BoothMenuItem,
} from "@/features/booths/types";

const ItemType = "MENU_ITEM";

interface DraggableMenuItemProps {
  item: BoothMenuItem;
  index: number;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: number, field: keyof BoothMenuItem, value: string | boolean) => void;
  onDelete: (id: number) => void;
}

function DraggableMenuItem({ item, index, moveItem, onUpdate, onDelete }: DraggableMenuItemProps) {
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
      className={`flex items-center gap-4 p-4 border border-slate-200 rounded-lg transition-all ${
        isDragging ? "opacity-50" : "opacity-100"
      } hover:border-blue-300`}
    >
      <div
        ref={drag}
        className="cursor-move text-slate-400 hover:text-slate-600 transition-colors"
      >
        <GripVertical size={20} />
      </div>

      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
        {item.order}
      </div>

      <div className="w-20 h-20 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Upload size={24} className="text-slate-400" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <input
          type="text"
          placeholder="메뉴명"
          value={item.name}
          onChange={(e) => onUpdate(item.id, "name", e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="메뉴 설명"
          value={item.description}
          onChange={(e) => onUpdate(item.id, "description", e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="가격 (예: 5,000원)"
          value={item.price}
          onChange={(e) => onUpdate(item.id, "price", e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">품절</span>
        <button
          onClick={() => onUpdate(item.id, "soldOut", !item.soldOut)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            item.soldOut ? "bg-red-500" : "bg-slate-300"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${
              item.soldOut ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

export function BoothManagement() {
  // 서버 상태. data가 undefined면 아직 로딩 중이거나 Booth 역할이 아님.
  const { data: booth } = useMyBoothProfile();

  // "작성 완료" 여부는 저장된 데이터에서 파생 — 편집 중 입력은 반영되지 않음
  // (저장 전까지는 불완전한 입력으로 취급). 파일 상단의 helper 참고.
  const boothInfoCompleted = isBoothInfoCompleted(booth);
  const menuListCompleted = isMenuListCompleted(booth);

  const [showBoothInfoForm, setShowBoothInfoForm] = useState(false);
  const [showMenuListForm, setShowMenuListForm] = useState(false);
  const [isEditingBoothInfo, setIsEditingBoothInfo] = useState(false);
  const [isEditingMenuList, setIsEditingMenuList] = useState(false);

  // 폼 state — booth 로드 후 아래 useEffect에서 하이드레이션.
  const [reservationEnabled, setReservationEnabled] = useState(false);
  const [boothImages, setBoothImages] = useState<BoothImage[]>([]);
  const [boothName, setBoothName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [boothDescription, setBoothDescription] = useState("");
  const [signatureMenu, setSignatureMenu] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [orderNotice, setOrderNotice] = useState("");
  const [menuItems, setMenuItems] = useState<BoothMenuItem[]>([]);

  useEffect(() => {
    if (!booth) return;
    setReservationEnabled(booth.reservationEnabled);
    setBoothImages(booth.thumbnails);
    setBoothName(booth.name);
    setOrganizationName(booth.organizationName);
    setBoothDescription(booth.description);
    setSignatureMenu(booth.signatureMenu);
    setOperatingHours(booth.operatingHours);
    setOrderNotice(booth.orderNotice);
    setMenuItems(booth.menuItems);
  }, [booth]);

  /** 작성 전(=완료 안 된) 카드 클릭 시 바로 편집 모드로 진입. */
  const openBoothInfoForm = () => {
    setShowBoothInfoForm(true);
    if (!boothInfoCompleted) setIsEditingBoothInfo(true);
  };
  const openMenuListForm = () => {
    setShowMenuListForm(true);
    if (!menuListCompleted) setIsEditingMenuList(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: BoothImage[] = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        url: URL.createObjectURL(file),
        isMain: boothImages.length === 0 && index === 0,
      }));
      setBoothImages([...boothImages, ...newImages]);
    }
  };

  const setMainImage = (id: number) => {
    setBoothImages(boothImages.map(img => ({
      ...img,
      isMain: img.id === id,
    })));
  };

  const removeImage = (id: number) => {
    const filtered = boothImages.filter(img => img.id !== id);
    if (filtered.length > 0 && !filtered.some(img => img.isMain)) {
      filtered[0].isMain = true;
    }
    setBoothImages(filtered);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const updatedItems = [...menuItems];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);

    const reorderedItems = updatedItems.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setMenuItems(reorderedItems);
  };

  const addMenuItem = () => {
    const newItem: BoothMenuItem = {
      id: Date.now(),
      order: menuItems.length + 1,
      name: "",
      description: "",
      price: "",
      image: null,
      soldOut: false,
    };
    setMenuItems([...menuItems, newItem]);
  };

  const updateMenuItem = (id: number, field: keyof BoothMenuItem, value: string | boolean) => {
    setMenuItems(menuItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const deleteMenuItem = (id: number) => {
    const filtered = menuItems.filter((item) => item.id !== id);
    const reordered = filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
    setMenuItems(reordered);
  };

  const toggleSoldOut = (id: number) => {
    setMenuItems(menuItems.map((item) => 
      item.id === id ? { ...item, soldOut: !item.soldOut } : item
    ));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-sm text-slate-500 mb-1">문헌정보학과 부스 예약 관리</div>
          <h1 className="text-3xl font-bold text-slate-800">부스 정보 관리</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">부스 운영 ON/OFF</span>
          <button
            onClick={() => setReservationEnabled(!reservationEnabled)}
            className={`
              relative w-14 h-7 rounded-full transition-all duration-300
              ${reservationEnabled
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-200'
                : 'bg-slate-300'
              }
            `}
          >
            <div className={`
              absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300
              ${reservationEnabled ? 'left-8' : 'left-1'}
            `} />
          </button>
        </div>
      </div>

      {/* Status Cards */}
      {!showBoothInfoForm && !showMenuListForm && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          <button
            onClick={openBoothInfoForm}
            className={`
            relative overflow-hidden rounded-2xl p-8 transition-all duration-300 text-left cursor-pointer hover:scale-105
            ${boothInfoCompleted
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 hover:border-red-300'
            }
          `}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                부스 상세 정보<br />작성
              </h3>
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                ${boothInfoCompleted
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                  : 'bg-red-500 text-white shadow-lg shadow-red-200'
                }
              `}>
                {boothInfoCompleted ? <Check size={32} /> : <X size={32} />}
              </div>
            </div>
            <div className={`text-sm font-medium ${boothInfoCompleted ? 'text-green-700' : 'text-red-700'}`}>
              {boothInfoCompleted ? '작성완료' : '작성필요'}
            </div>

            <div className="mt-8 space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1763256340762-f0ffc4b3ad18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwYm9vdGglMjBsaW5lJTIwYXJ0JTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc3NjIwMDEwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="부스 상세 정보"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={openMenuListForm}
            className={`
            relative overflow-hidden rounded-2xl p-8 transition-all duration-300 text-left cursor-pointer hover:scale-105
            ${menuListCompleted
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 hover:border-red-300'
            }
          `}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                메뉴 리스트<br />작성
              </h3>
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                ${menuListCompleted
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                  : 'bg-red-500 text-white shadow-lg shadow-red-200'
                }
              `}>
                {menuListCompleted ? <Check size={32} /> : <X size={32} />}
              </div>
            </div>
            <div className={`text-sm font-medium ${menuListCompleted ? 'text-green-700' : 'text-red-700'}`}>
              {menuListCompleted ? '작성완료' : '작성필요'}
            </div>

            <div className="mt-8 space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1545105090-b8a3fe3f87f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwbWVudSUyMGxpbmUlMjBkcmF3aW5nJTIwc2tldGNofGVufDF8fHx8MTc3NjIwMDEwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="메뉴 리스트"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Booth Details - View/Edit Mode */}
      {showBoothInfoForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">부스 상세 정보</h2>
            <div className="flex items-center gap-3">
              {!isEditingBoothInfo ? (
                <button 
                  onClick={() => setIsEditingBoothInfo(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
                >
                  <Edit size={18} />
                  편집
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditingBoothInfo(false)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
                >
                  저장
                </button>
              )}
              <button 
                onClick={() => {
                  setShowBoothInfoForm(false);
                  setIsEditingBoothInfo(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">이전으로</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">부스명</label>
                {isEditingBoothInfo ? (
                  <input
                    type="text"
                    placeholder="부스 이름을 입력하세요"
                    value={boothName}
                    onChange={(e) => setBoothName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                    {boothName}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">단체명</label>
                {isEditingBoothInfo ? (
                  <input
                    type="text"
                    placeholder="단체 이름을 입력하세요"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                    {organizationName}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">부스 소개글</label>
              {isEditingBoothInfo ? (
                <textarea
                  rows={4}
                  placeholder="부스를 소개하는 내용을 작성하세요"
                  value={boothDescription}
                  onChange={(e) => setBoothDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              ) : (
                <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 min-h-[112px]">
                  {boothDescription}
                </div>
              )}
            </div>

            {isEditingBoothInfo && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">부스 썸네일</label>
                
                <label className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Upload className="mx-auto mb-3 text-slate-400" size={32} />
                  <p className="text-sm text-slate-600 mb-1">이미지를 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-slate-500">여러 장의 이미지를 선택할 수 있습니다</p>
                </label>
                
                {boothImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    {boothImages.map((image) => (
                      <div 
                        key={image.id}
                        className="relative group aspect-square rounded-lg overflow-hidden border-2 transition-all"
                        style={{ borderColor: image.isMain ? '#3b82f6' : '#e2e8f0' }}
                      >
                        <img 
                          src={image.url} 
                          alt="부스 이미지" 
                          className="w-full h-full object-cover"
                        />
                        
                        {image.isMain && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                            <Star size={12} fill="white" />
                            대표
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                          {!image.isMain && (
                            <button
                              onClick={() => setMainImage(image.id)}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-blue-500 hover:text-white transition-all"
                            >
                              대표로 설정
                            </button>
                          )}
                          <button
                            onClick={() => removeImage(image.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">대표 메뉴</label>
                {isEditingBoothInfo ? (
                  <input
                    type="text"
                    placeholder="대표 메뉴명"
                    value={signatureMenu}
                    onChange={(e) => setSignatureMenu(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                    {signatureMenu}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">운영 시간</label>
                {isEditingBoothInfo ? (
                  <input
                    type="text"
                    placeholder="예: 10:00 - 18:00"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                    {operatingHours}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <span className="text-sm font-semibold text-slate-700">부스 운영 여부</span>
              <button
                onClick={() => isEditingBoothInfo && setReservationEnabled(!reservationEnabled)}
                disabled={!isEditingBoothInfo}
                className={`
                  relative w-14 h-7 rounded-full transition-all duration-300
                  ${reservationEnabled
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-200'
                    : 'bg-slate-300'
                  }
                  ${!isEditingBoothInfo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className={`
                  absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300
                  ${reservationEnabled ? 'left-8' : 'left-1'}
                `} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu List - View/Edit Mode */}
      {showMenuListForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">메뉴 리스트</h2>
            <div className="flex items-center gap-3">
              {isEditingMenuList && (
                <button 
                  onClick={addMenuItem}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all duration-200 flex items-center gap-2 text-sm">
                  <Plus size={16} />
                  메뉴 추가
                </button>
              )}
              {!isEditingMenuList ? (
                <button 
                  onClick={() => setIsEditingMenuList(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
                >
                  <Edit size={18} />
                  편집
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditingMenuList(false)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
                >
                  저장
                </button>
              )}
              <button 
                onClick={() => {
                  setShowMenuListForm(false);
                  setIsEditingMenuList(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">이전으로</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">부스 주문 공지</label>
            {isEditingMenuList ? (
              <textarea
                rows={3}
                placeholder="예: 테이블 이용 시 메인 메뉴를 하나 이상 주문해주셔야 합니다."
                value={orderNotice}
                onChange={(e) => setOrderNotice(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            ) : (
              <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                {orderNotice}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">주문 시 고객에게 안내될 공지사항을 입력하세요.</p>
          </div>

          {isEditingMenuList ? (
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-4">
                {menuItems.map((item, index) => (
                  <DraggableMenuItem
                    key={item.id}
                    item={item}
                    index={index}
                    moveItem={moveItem}
                    onUpdate={updateMenuItem}
                    onDelete={deleteMenuItem}
                  />
                ))}
              </div>
            </DndProvider>
          ) : (
            <div className="space-y-4">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {item.order}
                  </div>

                  <div className="w-20 h-20 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={24} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 mb-1">{item.name}</div>
                    <div className="text-sm text-slate-600 mb-1">{item.description}</div>
                    <div className="text-sm font-medium text-blue-600">{item.price}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSoldOut(item.id)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${item.soldOut 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
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
      )}
    </div>
  );
}
