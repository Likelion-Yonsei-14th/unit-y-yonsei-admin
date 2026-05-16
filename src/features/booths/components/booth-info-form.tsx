import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Edit, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { BoothImage, BoothProfile } from '@/features/booths/types';
import { ThumbnailCropOverlay } from '@/features/booths/components/thumbnail-crop-overlay';

/** 업로드 파일당 용량 상한. 원본 비율은 제한하지 않는다 — 등록 표시만 3:2/5:6 으로 크롭. */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface Props {
  booth: BoothProfile;
  /** 부스 운영 ON/OFF 토글 — 페이지 헤더와 폼이 같은 값을 가리키므로 controlled. */
  reservationEnabled: boolean;
  onReservationEnabledChange: (next: boolean) => void;
  initiallyEditing: boolean;
  /** 부스 프로필 mutation 인스턴스. 페이지(MenuListForm 과 공유) 와 같은 객체. */
  updateMutation: UseMutationResult<BoothProfile, Error, Partial<BoothProfile>>;
  onClose: () => void;
}

/**
 * 부스 상세 정보 편집 폼.
 * 자체 state 로 텍스트 필드 / 썸네일을 들고 있고, blob URL 도 자체 추적해 누수 방지.
 * 외부 booth refetch 시 form state 를 다시 hydrate.
 */
export function BoothInfoForm({
  booth,
  reservationEnabled,
  onReservationEnabledChange,
  initiallyEditing,
  updateMutation,
  onClose,
}: Props) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [boothName, setBoothName] = useState(booth.name);
  const [organizationName, setOrganizationName] = useState(booth.organizationName);
  const [boothDescription, setBoothDescription] = useState(booth.description);
  const [signatureMenu, setSignatureMenu] = useState(booth.signatureMenu);
  const [operatingHours, setOperatingHours] = useState(booth.operatingHours);
  const [boothImages, setBoothImages] = useState<BoothImage[]>(booth.thumbnails);

  // 직접 createObjectURL 로 만든 blob URL 만 추적 — 서버 URL 은 revoke 대상 아님.
  const blobUrlsRef = useRef<Set<string>>(new Set());
  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current.clear();
    },
    [],
  );

  // 서버 데이터로 다시 채워질 때 — 화면에서 사라진 blob URL 즉시 revoke + form state hydrate.
  useEffect(() => {
    setBoothName(booth.name);
    setOrganizationName(booth.organizationName);
    setBoothDescription(booth.description);
    setSignatureMenu(booth.signatureMenu);
    setOperatingHours(booth.operatingHours);
    setBoothImages(booth.thumbnails);
    const stillUsed = new Set(booth.thumbnails.map((img) => img.url));
    for (const url of blobUrlsRef.current) {
      if (!stillUsed.has(url)) {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      }
    }
  }, [booth]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    if (!files) return;

    // 1차 필터: 이미지 타입 + 용량 상한. 초과분은 제외하고 알림.
    const accepted: File[] = [];
    const oversized: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_SIZE) {
        oversized.push(file.name);
        continue;
      }
      accepted.push(file);
    }
    if (oversized.length > 0) {
      toast.error(`5MB를 초과한 이미지는 제외했습니다: ${oversized.join(', ')}`);
    }
    // 같은 파일 재선택이 onChange 를 다시 트리거하도록 input 초기화.
    input.value = '';
    if (accepted.length === 0) return;

    const newImages: BoothImage[] = accepted.map((file, index) => {
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.add(url);
      return {
        id: Date.now() + index,
        url,
        isMain: boothImages.length === 0 && index === 0,
      };
    });
    setBoothImages([...boothImages, ...newImages]);
  };

  const setMainImage = (id: number) => {
    setBoothImages(boothImages.map((img) => ({ ...img, isMain: img.id === id })));
  };

  const removeImage = (id: number) => {
    const target = boothImages.find((img) => img.id === id);
    if (target && blobUrlsRef.current.has(target.url)) {
      URL.revokeObjectURL(target.url);
      blobUrlsRef.current.delete(target.url);
    }
    const filtered = boothImages.filter((img) => img.id !== id);
    // 불변 처리 — 기존 객체를 mutate 하지 않고 새 객체로 첫 항목 isMain 만 갱신.
    const next =
      filtered.length > 0 && !filtered.some((img) => img.isMain)
        ? filtered.map((img, i) => (i === 0 ? { ...img, isMain: true } : img))
        : filtered;
    setBoothImages(next);
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        name: boothName,
        organizationName,
        description: boothDescription,
        signatureMenu,
        operatingHours,
        reservationEnabled,
        thumbnails: boothImages,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success('부스 정보를 저장했습니다.');
        },
        onError: () => {
          toast.error('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
        },
      },
    );
  };

  return (
    <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-foreground">부스 상세 정보</h2>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200"
            >
              <Edit size={18} />
              편집
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? '저장 중…' : '저장'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">이전으로</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="booth-name"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              부스명
            </label>
            {isEditing ? (
              <input
                id="booth-name"
                type="text"
                placeholder="부스 이름을 입력하세요"
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            ) : (
              <div
                id="booth-name"
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground"
              >
                {boothName}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-organization"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              단체명
            </label>
            {isEditing ? (
              <input
                id="booth-organization"
                type="text"
                placeholder="단체 이름을 입력하세요"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            ) : (
              <div
                id="booth-organization"
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground"
              >
                {organizationName}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="booth-description"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            부스 소개글
          </label>
          {isEditing ? (
            <textarea
              id="booth-description"
              rows={4}
              placeholder="부스를 소개하는 내용을 작성하세요"
              value={boothDescription}
              onChange={(e) => setBoothDescription(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
            />
          ) : (
            <div
              id="booth-description"
              className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground min-h-[112px]"
            >
              {boothDescription}
            </div>
          )}
        </div>

        <div>
          {/* 그룹 타이틀 — 편집 시 실제 file input 은 아래 wrapping label 안. 시맨틱은 span. */}
          <span className="block text-sm font-semibold text-foreground mb-2">부스 이미지</span>

          {isEditing && (
            <label className="block border-2 border-dashed border-ds-border-strong rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
              <p className="text-sm text-muted-foreground mb-1">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-muted-foreground">
                상세 배너는 3:2, 목록 썸네일은 5:6 비율로 표시됩니다 · 원본 크기는 제한 없음 ·
                파일당 최대 5MB · 여러 장 선택 가능
              </p>
            </label>
          )}

          {boothImages.length > 0 ? (
            <>
              <p className="mt-3 text-xs text-muted-foreground">
                대표 이미지는 이용자 페이지 상세 배너로 쓰이며, 가운데 점선 영역만 목록 카드
                썸네일에 보입니다. 핵심 피사체를 가운데에 두세요.
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {boothImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative group aspect-[3/2] rounded-lg overflow-hidden border-2 transition-all ${
                      image.isMain ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img src={image.url} alt="부스 이미지" className="w-full h-full object-cover" />

                    {/* 대표 이미지에만 5:6 썸네일 크롭 영역 미리보기 */}
                    {image.isMain && <ThumbnailCropOverlay />}

                    {image.isMain && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                        <Star size={12} fill="white" />
                        대표
                      </div>
                    )}

                    {isEditing && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                        {!image.isMain && (
                          <button
                            onClick={() => setMainImage(image.id)}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-background text-foreground rounded-lg text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            대표로 설정
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            !isEditing && (
              <div className="w-full px-4 py-8 border border-border rounded-lg bg-muted text-center text-sm text-muted-foreground">
                등록된 이미지가 없습니다.
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="booth-signature-menu"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              대표 메뉴
            </label>
            {isEditing ? (
              <input
                id="booth-signature-menu"
                type="text"
                placeholder="대표 메뉴명"
                value={signatureMenu}
                onChange={(e) => setSignatureMenu(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            ) : (
              <div
                id="booth-signature-menu"
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground"
              >
                {signatureMenu}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-operating-hours"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              운영 시간
            </label>
            {isEditing ? (
              <input
                id="booth-operating-hours"
                type="text"
                placeholder="예: 10:00 - 18:00"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            ) : (
              <div
                id="booth-operating-hours"
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground"
              >
                {operatingHours}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <span className="text-sm font-semibold text-foreground">부스 운영 여부</span>
          <button
            onClick={() => isEditing && onReservationEnabledChange(!reservationEnabled)}
            disabled={!isEditing}
            className={`
              relative w-14 h-7 rounded-full transition-all duration-300
              ${reservationEnabled ? 'bg-ds-success shadow-lg' : 'bg-ds-border-strong'}
              ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div
              className={`
              absolute top-1 w-5 h-5 bg-background rounded-full shadow-md transition-all duration-300
              ${reservationEnabled ? 'left-8' : 'left-1'}
            `}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
