import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lock, Star } from 'lucide-react';
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

interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
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
  const [imageRect, setImageRect] = useState<ImageRect | null>(null);

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

  // object-contain 이미지의 실제 painted rect 를 container 기준으로 계산.
  // <img> 엘리먼트 박스는 h-full w-full 로 container 와 동일하므로 getBoundingClientRect
  // 로는 letterbox 포함 박스만 얻어짐. 핀/footprint 정합을 위해선 aspect ratio 로
  // letterbox 를 제외한 진짜 그림 영역을 직접 계산해야 한다.
  const measureImage = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerBox = container.getBoundingClientRect();
    if (containerBox.width === 0 || containerBox.height === 0) {
      setImageRect(null);
      return;
    }
    // 섹션 상수에 박힌 aspect ratio 우선, 없으면 로드된 <img> 의 natural 크기 fallback.
    const img = currentImgRef.current;
    const aspect =
      section.imageAspectRatio && section.imageAspectRatio > 0
        ? section.imageAspectRatio
        : img && img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : null;
    if (!aspect) {
      setImageRect(null);
      return;
    }
    const containerAspect = containerBox.width / containerBox.height;
    let width: number;
    let height: number;
    let left: number;
    let top: number;
    if (containerAspect > aspect) {
      // container 가 더 가로 김 → 세로 fit, 좌우 letterbox.
      height = containerBox.height;
      width = height * aspect;
      left = (containerBox.width - width) / 2;
      top = 0;
    } else {
      // container 가 더 세로 김(또는 동일) → 가로 fit, 상하 letterbox.
      width = containerBox.width;
      height = width / aspect;
      left = 0;
      top = (containerBox.height - height) / 2;
    }
    setImageRect({ left, top, width, height });
  }, [section.imageAspectRatio]);

  // ResizeObserver 는 container 에 attach — img 직접 관찰 시 섹션 스왑마다 재연결 필요.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measureImage());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureImage]);

  // 섹션 전환: aspectRatio 기반이라 동기 계산 가능 — 첫 paint 에 올바른 rect 를
  // 얻도록 useLayoutEffect 로 승격. rAF 는 naturalWidth fallback 경로 대비 폴백.
  useLayoutEffect(() => {
    measureImage();
    const raf = requestAnimationFrame(() => measureImage());
    return () => cancelAnimationFrame(raf);
  }, [section, measureImage]);

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
          onLoad={s.id === section.id ? measureImage : undefined}
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
