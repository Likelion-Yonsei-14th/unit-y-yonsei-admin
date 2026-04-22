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
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {/* 이미지는 object-contain 으로 캔버스 안에 letterbox 되어 자연 종횡비 유지.
          핀 오버레이는 캔버스 rect 기준(0-100%) — 실제 이미지 픽셀과 엄밀히 정합하지
          않지만, 운영자가 "눈에 보이는 캔버스" 기준으로 좌표를 잡으므로 실사용에선 OK. */}
      {layers.map((s) => (
        <img
          key={s.id}
          src={s.imageUrl}
          alt={s.label}
          aria-hidden={s.id !== section.id}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            s.id === section.id ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div
        className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
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
              className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-xs font-semibold shadow-md transition-all ${
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
  );
}
