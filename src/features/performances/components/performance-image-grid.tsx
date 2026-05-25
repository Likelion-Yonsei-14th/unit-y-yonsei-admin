import { useRef, type ChangeEvent } from 'react';
import { Star, Trash2, Upload } from 'lucide-react';
import type { PerformanceImage } from '@/features/performances/types';

export interface PerformanceImageGridProps {
  /** 표시할 공연 이미지 목록. */
  images: PerformanceImage[];
  /** 편집 모드 여부 — 업로드 영역/삭제 버튼 노출 분기. */
  isEditMode: boolean;
  /** 직접 업로드 진행 중 — 중복 클릭 차단. */
  isUploading: boolean;
  /** 이미지 삭제 mutation 진행 중 — 삭제 버튼 비활성화. */
  isDeleting: boolean;
  /** 파일 선택 핸들러. */
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  /** 이미지 삭제 핸들러. */
  onRemove: (imageId: number) => void;
}

/**
 * 공연 이미지 그리드 — 표시 + 업로드 + 삭제. 항목별 즉시 반영(추가/삭제).
 * 첫 이미지는 대표(PROFILE) 로 등록되며 그리드에서 별 배지로 강조한다.
 */
export function PerformanceImageGrid({
  images,
  isEditMode,
  isUploading,
  isDeleting,
  onUpload,
  onRemove,
}: PerformanceImageGridProps) {
  // 같은 파일 재선택도 onChange 가 다시 뜨도록 input 값 초기화하기 위한 ref.
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpload(e);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  return (
    <div>
      <span className="block text-sm font-semibold text-foreground mb-2">공연 이미지</span>

      {isEditMode && (
        <label
          className={`block border-2 border-dashed border-ds-border-strong rounded-lg p-8 text-center transition-colors ${
            isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary'
          }`}
        >
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            disabled={isUploading}
            className="hidden"
          />
          <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
          <p className="text-sm text-muted-foreground mb-1">
            {isUploading ? '이미지를 업로드하는 중…' : '이미지를 클릭하여 업로드'}
          </p>
          <p className="text-xs text-muted-foreground">첫 이미지는 대표 이미지로 등록됩니다</p>
        </label>
      )}

      {images.length > 0 && (
        <div
          className={`${isEditMode ? 'mt-4' : ''} grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4`}
        >
          {images.map((image) => {
            const isProfile = image.imageType === 'PROFILE';
            return (
              <div
                key={image.id}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  isProfile ? 'border-primary' : 'border-border'
                }`}
              >
                <img
                  src={image.imageUrl}
                  alt="공연 이미지"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />

                {isProfile && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                    <Star size={12} fill="currentColor" />
                    대표
                  </div>
                )}

                {isEditMode && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onRemove(image.id)}
                      disabled={isDeleting}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-all disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isEditMode && images.length === 0 && (
        <div className="rounded-lg p-8 text-center bg-muted">
          <Upload className="mx-auto mb-3 text-ds-text-disabled" size={32} />
          <p className="text-sm text-ds-text-disabled">등록된 이미지가 없습니다</p>
        </div>
      )}
    </div>
  );
}
