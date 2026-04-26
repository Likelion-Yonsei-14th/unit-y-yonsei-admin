import { useEffect, useRef, useState } from 'react';
import { Lock, Star } from 'lucide-react';
import { useImagePaintedRect } from '@/features/booth-layout/hooks/use-image-painted-rect';
import type { MapSection, PickerBooth } from '@/features/booth-layout/types';

interface BoothMapCanvasProps {
  section: MapSection;
  /** 이 섹션에 속한 부스들만 (상위에서 필터링). */
  boothsInSection: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
  /** 핀 lock 시각 힌트(🔒 / opacity) 표시용. 클릭은 막지 않음 — commit 은 슬라이더 카드 책임. */
  canEnter: (boothId: number) => boolean;
  onPinClick: (boothId: number) => void;
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function BoothMapCanvas({
  section,
  boothsInSection,
  focusedBoothId,
  myBoothId,
  canEnter,
  onPinClick,
}: BoothMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentImgRef = useRef<HTMLImageElement>(null);

  const { rect: imageRect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef: currentImgRef,
    reMeasureKey: section.id,
  });

  // 섹션 스왑 크로스페이드 (v1 과 동일 로직).
  const [layers, setLayers] = useState<MapSection[]>([section]);
  const prev = usePrevious(section);
  useEffect(() => {
    if (prev && prev.id !== section.id) {
      setLayers([prev, section]);
      const t = setTimeout(() => setLayers([section]), 350);
      return () => clearTimeout(t);
    }
    setLayers([section]);
  }, [section, prev]);

  const focused = boothsInSection.find((b) => b.placement.boothId === focusedBoothId);
  const translateX = focused ? 50 - focused.placement.x : 0;
  const translateY = focused ? 50 - focused.placement.y : 0;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted">
      {/* 2-레이어 이미지 크로스페이드. object-contain 으로 letterbox. */}
      {layers.map((s) => (
        <img
          key={s.id}
          ref={s.id === section.id ? currentImgRef : undefined}
          src={s.imageUrl}
          alt={s.label}
          aria-hidden={s.id !== section.id}
          onLoad={s.id === section.id ? measure : undefined}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            s.id === section.id ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* 핀 오버레이 — 이미지 painted rect 에 정합. 내부 0-100 % = 이미지 0-100 %. */}
      {imageRect && (
        <div
          className="pointer-events-none absolute transition-transform duration-300 ease-out"
          style={{
            left: imageRect.left,
            top: imageRect.top,
            width: imageRect.width,
            height: imageRect.height,
            transform: `translate(${translateX}%, ${translateY}%)`,
          }}
        >
          {boothsInSection.map((b) => (
            <BoothPin
              key={b.placement.boothId}
              booth={b}
              isFocused={b.placement.boothId === focusedBoothId}
              isMine={b.placement.boothId === myBoothId}
              canEnter={canEnter(b.placement.boothId)}
              onClick={() => onPinClick(b.placement.boothId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BoothPinProps {
  booth: PickerBooth;
  isFocused: boolean;
  isMine: boolean;
  canEnter: boolean;
  onClick: () => void;
}

function BoothPin({ booth, isFocused, isMine, canEnter, onClick }: BoothPinProps) {
  const { placement } = booth;
  const stateClass = isFocused
    ? 'border-primary bg-primary/20 ring-2 ring-primary/30 scale-[1.02]'
    : isMine
    ? 'border-ds-success-pressed bg-ds-success-subtle/60'
    : 'border-border bg-background/50 hover:border-ds-border-strong';
  const lockedClass = !canEnter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        !canEnter
          ? `부스 ${placement.boothNumber} — 본인 부스만 예약 관리가 가능합니다`
          : `부스 ${placement.boothNumber}`
      }
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        width: `${placement.width}%`,
        height: `${placement.height}%`,
        minWidth: 8,
        minHeight: 8,
      }}
      className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-md border-2 text-xs font-semibold shadow-sm transition-all ${stateClass} ${lockedClass}`}
      aria-label={`부스 ${placement.boothNumber}${!canEnter ? ' — 예약 관리 불가' : ''}`}
    >
      {isMine && <Star size={12} className="mr-1 shrink-0" aria-hidden="true" />}
      <span className="truncate">{placement.boothNumber}</span>
      {!canEnter && <Lock size={10} className="ml-1 shrink-0" aria-hidden="true" />}
    </button>
  );
}
