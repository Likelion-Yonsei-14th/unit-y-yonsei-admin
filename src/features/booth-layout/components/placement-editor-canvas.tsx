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
}

export function PlacementEditorCanvas({
  section,
  placements,
  selectedPlacementId,
  selectedBoothId,
  onSelectPlacement,
}: PlacementEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { rect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef,
    reMeasureKey: section.id,
  });

  const onBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onSelectPlacement(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted"
      onClick={onBackgroundClick}
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
