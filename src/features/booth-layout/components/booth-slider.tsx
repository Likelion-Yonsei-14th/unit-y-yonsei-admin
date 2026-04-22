import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BoothSliderCard } from './booth-slider-card';
import type { PickerBooth } from '@/features/booth-layout/types';

interface BoothSliderProps {
  /** 전체 부스 (섹션 무관). 섹션 간 이동은 슬라이더 한 스트립에서 연속. */
  booths: PickerBooth[];
  focusedBoothId: number | null;
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  /** 중앙 카드 변경 시. */
  onFocus: (boothId: number) => void;
  /** 중앙 카드에서 "진입" 트리거 시 (canEnter=true 일 때만 호출 권장). */
  onCommit: (boothId: number) => void;
}

export function BoothSlider({
  booths,
  focusedBoothId,
  myBoothId,
  canEnter,
  onFocus,
  onCommit,
}: BoothSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerCard = useCallback((boothId: number, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(boothId, el);
    else cardRefs.current.delete(boothId);
  }, []);

  // 외부 focus 변경 시 해당 카드로 auto-scroll (pin 클릭 · 화살표 · 키보드 모두 여기로 수렴)
  useEffect(() => {
    if (focusedBoothId == null) return;
    const el = cardRefs.current.get(focusedBoothId);
    if (!el) return;
    isProgrammaticScroll.current = true;
    if (programmaticScrollTimer.current) clearTimeout(programmaticScrollTimer.current);
    programmaticScrollTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [focusedBoothId]);

  // 언마운트 시 debounce · programmaticScroll 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (programmaticScrollTimer.current) clearTimeout(programmaticScrollTimer.current);
    };
  }, []);

  // 스크롤 종료 후 중앙 카드 감지 → onFocus
  const detectCenter = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    let closestId: number | null = null;
    let closestDist = Infinity;
    cardRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    if (closestId != null && closestId !== focusedBoothId) {
      onFocus(closestId);
    }
  }, [focusedBoothId, onFocus]);

  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(detectCenter, 80);
  };

  const focusByOffset = (delta: -1 | 1) => {
    if (focusedBoothId == null || booths.length === 0) return;
    const idx = booths.findIndex((b) => b.placement.boothId === focusedBoothId);
    if (idx < 0) return;
    const next = idx + delta;
    if (next >= 0 && next < booths.length) {
      onFocus(booths[next].placement.boothId);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusByOffset(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusByOffset(1);
    }
  };

  const handleCardClick = (boothId: number) => {
    if (boothId !== focusedBoothId) {
      onFocus(boothId);
      return;
    }
    if (canEnter(boothId)) onCommit(boothId);
  };

  if (booths.length === 0) return null;

  return (
    <div
      className="relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="부스 슬라이더"
    >
      <button
        type="button"
        onClick={() => focusByOffset(-1)}
        aria-label="이전 부스"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md backdrop-blur hover:bg-background"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => focusByOffset(1)}
        aria-label="다음 부스"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md backdrop-blur hover:bg-background"
      >
        <ChevronRight size={18} />
      </button>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden"
        style={{
          // 첫/마지막 카드도 중앙으로 스냅 가능하도록 좌우 여백 확보 (카드 폭 280 / 2 = 140)
          paddingLeft: 'calc(50% - 140px)',
          paddingRight: 'calc(50% - 140px)',
          scrollbarWidth: 'none',
        }}
      >
        {booths.map((b) => {
          const boothId = b.placement.boothId;
          return (
            <div
              key={boothId}
              ref={(el) => registerCard(boothId, el)}
              className="snap-center"
            >
              <BoothSliderCard
                booth={b}
                isFocused={boothId === focusedBoothId}
                isMine={boothId === myBoothId}
                canEnter={canEnter(boothId)}
                onClick={() => handleCardClick(boothId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
