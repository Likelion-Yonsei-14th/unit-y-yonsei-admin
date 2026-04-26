// src/features/booth-layout/components/placement-editor-canvas.tsx
import { useRef } from 'react';
import { useImagePaintedRect } from '@/features/booth-layout/hooks/use-image-painted-rect';
import type { BoothPlacement, MapSection } from '@/features/booth-layout/types';

export interface PlacementEditorCanvasProps {
  section: MapSection;
  placements: BoothPlacement[];
  selectedPlacementId: number | null;
  selectedBoothId: number | null;
  onSelectPlacement: (id: number | null) => void;
  /** 새 placement 생성 콜백. 좌표/크기는 이미지 기준 0–100 %. */
  onCreatePlacement: (input: { x: number; y: number; width: number; height: number }) => void;
  /** 마지막에 만든 placement 크기 sticky default. */
  defaultSize: { width: number; height: number };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function PlacementEditorCanvas({
  section,
  placements,
  selectedPlacementId,
  selectedBoothId,
  onSelectPlacement,
  onCreatePlacement,
  defaultSize,
}: PlacementEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { rect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef,
    reMeasureKey: section.id,
  });

  const onContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 핀 클릭은 자식 button 의 stopPropagation 으로 흡수됨.
    if (e.target !== e.currentTarget) return;
    if (!rect) return;
    if (selectedBoothId == null) {
      // 운영자 미선택 — 선택만 해제. 좌측 리스트 강조는 부모 책임.
      onSelectPlacement(null);
      return;
    }
    const containerBox = containerRef.current?.getBoundingClientRect();
    if (!containerBox) return;
    const px = e.clientX - containerBox.left - rect.left;
    const py = e.clientY - containerBox.top - rect.top;
    const x = (px / rect.width) * 100;
    const y = (py / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const halfW = defaultSize.width / 2;
    const halfH = defaultSize.height / 2;
    onCreatePlacement({
      x: clamp(x, halfW, 100 - halfW),
      y: clamp(y, halfH, 100 - halfH),
      width: defaultSize.width,
      height: defaultSize.height,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted"
      onClick={onContainerClick}
    >
      <img
        ref={imgRef}
        src={section.imageUrl}
        alt={section.label}
        onLoad={measure}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {rect && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          {placements.map((p) => {
            const isSelected = p.id === selectedPlacementId;
            const isInGroup = !isSelected && p.boothId === selectedBoothId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacement(p.id);
                }}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.width}%`,
                  height: `${p.height}%`,
                  minWidth: 8,
                  minHeight: 8,
                }}
                className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 text-xs font-semibold shadow-sm transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/30 ring-2 ring-primary/40'
                    : isInGroup
                    ? 'border-ds-success-pressed bg-ds-success-subtle/70'
                    : 'border-border bg-background/60 hover:border-ds-border-strong'
                }`}
                aria-label={`자리 ${p.boothNumber}`}
              >
                <span className="truncate">{p.boothNumber}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
