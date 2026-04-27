import { useEffect, useRef, useState } from 'react';
import { Lock, Minus, Plus, RotateCcw, Star } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
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
  // useImagePaintedRect 는 transform 영향을 받지 않는 외곽 컨테이너를 측정한다.
  // TransformComponent 안의 좌표는 모두 이 외곽 박스 기준이라 zoom/pan 시에도
  // 이미지·핀이 함께 변환돼 정합 유지.
  const containerRef = useRef<HTMLDivElement>(null);
  const currentImgRef = useRef<HTMLImageElement>(null);

  const { rect: imageRect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef: currentImgRef,
    reMeasureKey: section.id,
  });

  // 섹션 스왑 크로스페이드.
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

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted">
      <TransformWrapper
        minScale={1}
        maxScale={4}
        initialScale={1}
        wheel={{ step: 0.1 }}
        doubleClick={{ disabled: true }}
        limitToBounds
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperClass="!h-full !w-full"
              contentClass="!h-full !w-full"
            >
              {/* 2-레이어 이미지 크로스페이드. object-contain 으로 letterbox. */}
              {layers.map((s) => (
                <img
                  key={s.id}
                  ref={s.id === section.id ? currentImgRef : undefined}
                  src={s.imageUrl}
                  alt={s.label}
                  aria-hidden={s.id !== section.id}
                  onLoad={s.id === section.id ? measure : undefined}
                  draggable={false}
                  className={`absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-300 ${
                    s.id === section.id ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}

              {/* 핀 오버레이 — 이미지 painted rect 에 정합. 내부 0-100 % = 이미지 0-100 %.
                  TransformComponent 안에 있으므로 이미지와 함께 zoom/pan 된다. */}
              {imageRect && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: imageRect.left,
                    top: imageRect.top,
                    width: imageRect.width,
                    height: imageRect.height,
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
            </TransformComponent>

            {/* 줌 컨트롤 — TransformWrapper 안이지만 TransformComponent 밖이라 화면 고정. */}
            <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => zoomIn()}
                aria-label="확대"
                title="확대"
                className="flex h-7 w-7 items-center justify-center rounded text-foreground hover:bg-muted"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                aria-label="축소"
                title="축소"
                className="flex h-7 w-7 items-center justify-center rounded text-foreground hover:bg-muted"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                aria-label="원래 크기로"
                title="원래 크기로"
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </>
        )}
      </TransformWrapper>
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
      {/* 부스 번호 텍스트는 의도적으로 렌더하지 않음 — 지도 위 매장명/구획 정보를
          가리는 문제. 식별은 슬라이더 카드의 #번호 + tooltip(title) + aria-label 로 충분. */}
      {isMine && <Star size={12} className="shrink-0" aria-hidden="true" />}
      {!canEnter && <Lock size={10} className="shrink-0" aria-hidden="true" />}
    </button>
  );
}
