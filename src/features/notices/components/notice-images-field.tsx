import { useEffect, useRef, useState } from 'react';
import { GripVertical, Upload, X } from 'lucide-react';

/**
 * 폼에서 다루는 카드뉴스 이미지 한 장.
 * - existing: 이미 업로드돼 URL 이 있는 이미지(수정 진입 시 로드).
 * - new:      이번에 새로 고른 파일. previewUrl 은 object URL 이라 수명 관리 필요.
 */
export type DraftImage =
  | { kind: 'existing'; url: string }
  | { kind: 'new'; file: File; previewUrl: string };

/** 표시용 src + React key 로 쓸 안정 식별자. */
function keyOf(img: DraftImage): string {
  return img.kind === 'existing' ? img.url : img.previewUrl;
}

interface Props {
  images: DraftImage[];
  onChange: (next: DraftImage[]) => void;
  disabled?: boolean;
}

/**
 * 카드뉴스 다중 이미지 입력 — 추가 / 순서 변경(드래그) / 개별 삭제.
 * 첫 장이 대표(목록 썸네일·공개 앱 호환). 실제 S3 업로드는 폼 제출 시 상위에서 일괄 처리한다.
 * 새로 고른 파일의 object URL 은 삭제·언마운트 시 revoke 해 누수를 막는다.
 */
export function NoticeImagesField({ images, onChange, disabled }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 언마운트 시 남아있는 new 이미지의 object URL 을 모두 revoke.
  // ref 로 최신 목록을 들고 있어 빈 deps effect 가 마지막 상태를 정리한다.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => {
      imagesRef.current.forEach((img) => {
        if (img.kind === 'new') URL.revokeObjectURL(img.previewUrl);
      });
    },
    [],
  );

  const handleAdd = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: DraftImage[] = Array.from(files).map((file) => ({
      kind: 'new',
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...images, ...added]);
  };

  const handleRemove = (index: number) => {
    const target = images[index];
    if (target.kind === 'new') URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((_, i) => i !== index));
  };

  // ---- 드래그 재정렬 (menu-list-form 과 동일 패턴, 서버 호출 없는 로컬 정렬) ----
  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(index);
  };

  const canReorder = !disabled && images.length > 1;

  return (
    <div>
      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={keyOf(img)}
              draggable={canReorder}
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => setDragIndex(null)}
              className={`group relative aspect-[4/5] overflow-hidden rounded-lg border-2 ${
                index === 0 ? 'border-primary' : 'border-border'
              } ${canReorder ? 'cursor-move' : ''} ${dragIndex === index ? 'opacity-50' : ''}`}
            >
              <img
                src={keyOf(img)}
                alt={`카드뉴스 이미지 ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                  대표
                </span>
              )}
              {canReorder && (
                <span className="absolute bottom-1.5 left-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm">
                  <GripVertical size={14} aria-hidden="true" />
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                aria-label={`이미지 ${index + 1} 삭제`}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm hover:bg-background disabled:opacity-50"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className={`block rounded-lg border-2 border-dashed border-ds-border-strong p-6 text-center transition-colors ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            handleAdd(e.target.files);
            // 같은 파일 재선택도 onChange 가 다시 뜨도록 초기화.
            e.target.value = '';
          }}
        />
        <Upload className="mx-auto mb-2 text-ds-text-disabled" size={28} aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          {images.length > 0
            ? '이미지 추가 — 여러 장 선택 가능, 드래그로 순서 변경 (첫 장이 대표)'
            : '인스타그램 카드뉴스 이미지를 업로드하세요 (여러 장 선택 가능)'}
        </p>
      </label>
    </div>
  );
}
