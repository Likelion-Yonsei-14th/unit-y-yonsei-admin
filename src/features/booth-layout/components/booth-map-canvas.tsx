import { useEffect, useRef, useState } from 'react';
import type { MapSection, PickerBooth } from '@/features/booth-layout/types';

interface BoothMapCanvasProps {
  section: MapSection;
  /** 이 섹션에 속한 부스들만 (상위에서 필터링). */
  boothsInSection: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
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
  onPinClick,
}: BoothMapCanvasProps) {
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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted">
      {/* 이미지의 원본 종횡비를 보존해 letterbox — 0-100% 좌표계가 이미지 좌표계와 정확히 일치 */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: section.imageAspectRatio,
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
          height: '100%',
        }}
      >
        {layers.map((s) => (
          <img
            key={s.id}
            src={s.imageUrl}
            alt={s.label}
            aria-hidden={s.id !== section.id}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              s.id === section.id ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `translate(${translateX}%, ${translateY}%)` }}
        >
          {boothsInSection.map((b) => {
            const isFocused = b.placement.boothId === focusedBoothId;
            const isMine = b.placement.boothId === myBoothId;
            return (
              <button
                key={b.placement.boothId}
                type="button"
                onClick={() => onPinClick(b.placement.boothId)}
                style={{ left: `${b.placement.x}%`, top: `${b.placement.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-xs font-semibold shadow-md transition-all ${
                  isFocused
                    ? 'h-10 w-10 scale-110 bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : isMine
                    ? 'h-8 w-8 bg-ds-success-pressed text-background'
                    : 'h-7 w-7 border border-border bg-background text-foreground hover:border-ds-border-strong'
                }`}
                aria-label={`부스 ${b.placement.boothNumber}`}
              >
                {b.placement.boothNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
