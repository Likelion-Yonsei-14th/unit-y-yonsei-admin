import { useEffect, useState } from 'react';
import { BoothMapCanvas } from './booth-map-canvas';
import { BoothSlider } from './booth-slider';
import { DateSelector } from './date-selector';
import { MAP_SECTIONS, fallbackSectionFor } from '@/features/booth-layout/sections';
import type { PickerBooth } from '@/features/booth-layout/types';

export interface BoothMapPickerProps {
  /** 현재 선택된 날짜의 부스들 (이미 머지된 PickerBooth). */
  booths: PickerBooth[];
  selectedDate: string;
  availableDates: readonly string[];
  onDateChange: (date: string) => void;
  /** Booth 계정의 본인 부스 id. 시각적 강조 및 canEnter 판정 기준. */
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  onEnter: (boothId: number) => void;
  initialFocusBoothId?: number;
}

/**
 * 상태 소유자.
 * focusedBoothId = single source of truth.
 * activeSection / boothsInSection / canvas pan 은 여기서 파생.
 */
export function BoothMapPicker({
  booths,
  selectedDate,
  availableDates,
  onDateChange,
  myBoothId,
  canEnter,
  onEnter,
  initialFocusBoothId,
}: BoothMapPickerProps) {
  const [focusedBoothId, setFocusedBoothId] = useState<number | null>(
    initialFocusBoothId ?? booths[0]?.placement.boothId ?? null,
  );

  // 날짜 변경 시 포커스 리셋 — 이전 날짜의 booth 가 새 날짜에 없을 수 있음
  useEffect(() => {
    setFocusedBoothId(initialFocusBoothId ?? booths[0]?.placement.boothId ?? null);
    // selectedDate 만 dep — booths 는 selectedDate 에 의해 교체되므로 중복 트리거 회피
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const focusedBooth = booths.find((b) => b.placement.boothId === focusedBoothId) ?? null;
  const activeSection = focusedBooth
    ? MAP_SECTIONS[focusedBooth.placement.section]
    : fallbackSectionFor(selectedDate);
  const boothsInSection = booths.filter((b) => b.placement.section === activeSection.id);

  const handleCommit = (boothId: number) => {
    if (canEnter(boothId)) onEnter(boothId);
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-20">
        <DateSelector dates={availableDates} selectedDate={selectedDate} onChange={onDateChange} />
      </div>
      <BoothMapCanvas
        section={activeSection}
        boothsInSection={boothsInSection}
        focusedBoothId={focusedBoothId}
        myBoothId={myBoothId}
        onPinClick={setFocusedBoothId}
      />
      {booths.length > 0 ? (
        <div className="absolute inset-x-4 bottom-4">
          <BoothSlider
            booths={booths}
            focusedBoothId={focusedBoothId}
            myBoothId={myBoothId}
            canEnter={canEnter}
            onFocus={setFocusedBoothId}
            onCommit={handleCommit}
          />
        </div>
      ) : (
        <div className="absolute inset-x-4 bottom-4 rounded-xl bg-background/90 p-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
          해당 날짜에 배치된 부스가 없습니다.
        </div>
      )}
    </div>
  );
}
