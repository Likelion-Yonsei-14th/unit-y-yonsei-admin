// src/features/booth-layout/components/placement-editor-canvas.tsx
import { useEffect, useRef, useState } from 'react';
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
  /** 핀 드래그 이동 commit. dxPct/dyPct 는 이미지 rect 기준 변위(0–100 %). */
  onMovePlacement: (id: number, delta: { dxPct: number; dyPct: number }) => void;
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
  onMovePlacement,
  defaultSize,
}: PlacementEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { rect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef,
    reMeasureKey: section.id,
  });

  const [dragState, setDragState] = useState<{
    placementId: number;
    startClientX: number;
    startClientY: number;
    dxPct: number;
    dyPct: number;
  } | null>(null);

  const onContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 핀 클릭은 자식 button 의 stopPropagation 으로 흡수됨.
    // 그 외 자식(특히 <img> — 캔버스의 시각 surface) 클릭은 컨테이너 클릭과 동일 취급.
    if ((e.target as HTMLElement).closest('button')) return;
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

  // ref 로 라이브 상태를 잡아 effect 가 매 mousemove 마다 재구독되지 않도록 한다.
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const onPinMouseDown = (e: React.MouseEvent, p: BoothPlacement) => {
    e.stopPropagation();
    // preventDefault 는 의도적으로 호출하지 않음 — click 이벤트가 정상적으로 발생해야
    // 무이동 탭의 onClick selection 경로가 살아 있다.
    onSelectPlacement(p.id);
    setDragState({
      placementId: p.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      dxPct: 0,
      dyPct: 0,
    });
  };

  // dragState 객체가 바뀔 때마다 재구독되지 않도록 boolean 만 dep 으로 올린다.
  const isDragActive = dragState !== null;
  useEffect(() => {
    if (!isDragActive || !rect) return;
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dxPct = ((e.clientX - ds.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - ds.startClientY) / rect.height) * 100;
      setDragState((s) => (s ? { ...s, dxPct, dyPct } : s));
    };
    const onUp = () => {
      const ds = dragStateRef.current;
      if (ds && (Math.abs(ds.dxPct) > 0.05 || Math.abs(ds.dyPct) > 0.05)) {
        onMovePlacement(ds.placementId, { dxPct: ds.dxPct, dyPct: ds.dyPct });
      }
      setDragState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragActive, rect, onMovePlacement]);

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
            const isDragging = dragState?.placementId === p.id;
            const liveX = isDragging ? p.x + dragState!.dxPct : p.x;
            const liveY = isDragging ? p.y + dragState!.dyPct : p.y;
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => onPinMouseDown(e, p)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacement(p.id);
                }}
                style={{
                  left: `${liveX}%`,
                  top: `${liveY}%`,
                  width: `${p.width}%`,
                  height: `${p.height}%`,
                  minWidth: 8,
                  minHeight: 8,
                }}
                className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-md border-2 text-xs font-semibold shadow-sm transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/30 ring-2 ring-primary/40'
                    : isInGroup
                    ? 'border-ds-success-pressed bg-ds-success-subtle/70'
                    : 'border-border bg-background/60 hover:border-ds-border-strong'
                } ${isDragging ? 'cursor-grabbing' : ''}`}
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
