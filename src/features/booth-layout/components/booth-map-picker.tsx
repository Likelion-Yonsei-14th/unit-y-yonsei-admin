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

  // booths 가 바뀔 때마다 현재 포커스의 유효성 재확인.
  // 유효하면 유지(사용자 스크롤/포커스 위치 보존), 무효면 initialFocus 혹은 booths[0] 로 리셋.
  // selectedDate 변경은 간접적으로 booths 를 바꿔 이 로직을 자연스레 트리거함.
  useEffect(() => {
    if (focusedBoothId != null && booths.some((b) => b.placement.boothId === focusedBoothId)) {
      return;
    }
    setFocusedBoothId(initialFocusBoothId ?? booths[0]?.placement.boothId ?? null);
  }, [booths, initialFocusBoothId, focusedBoothId]);

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
        canEnter={canEnter}
        onPinClick={setFocusedBoothId}
      />
      {/* 우측 여백(right-24)은 전역 CS 플로팅 버튼(fixed bottom-6 right-6, 56px)과
          슬라이더 우측 chevron 이 겹치지 않도록 확보한 클리어런스. */}
      {booths.length > 0 ? (
        <div className="absolute bottom-4 left-4 right-24">
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
        <div className="absolute bottom-4 left-4 right-24 rounded-xl bg-background/90 p-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
          해당 날짜에 배치된 부스가 없습니다.
        </div>
      )}
    </div>
  );
}
