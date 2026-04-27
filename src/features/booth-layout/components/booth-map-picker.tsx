import { useEffect, useState } from 'react';
import { BoothMapCanvas } from './booth-map-canvas';
import { BoothSlider } from './booth-slider';
import { MapSectionTabs } from './map-section-tabs';
import { MAP_SECTIONS } from '@/features/booth-layout/sections';
import type { MapSectionId, PickerBooth } from '@/features/booth-layout/types';

export interface BoothMapPickerProps {
  /** 현재 선택된 날짜의 부스들 (이미 머지된 PickerBooth). 섹션 필터링은 picker 내부. */
  booths: PickerBooth[];
  selectedDate: string;
  availableDates: readonly string[];
  onDateChange: (date: string) => void;
  /** 사용자가 선택한 섹션. 캔버스·슬라이더 모두 이 섹션으로 필터됨. */
  selectedSection: MapSectionId;
  /** selectedDate 에 유효한 섹션들. 1개면 섹션 탭 자체 숨김. */
  availableSections: MapSectionId[];
  onSectionChange: (section: MapSectionId) => void;
  /** Booth 계정의 본인 부스 id. 시각적 강조 및 canEnter 판정 기준. */
  myBoothId?: number;
  canEnter: (boothId: number) => boolean;
  onEnter: (boothId: number) => void;
  initialFocusBoothId?: number;
}

/**
 * 상태 소유자.
 * (date, section) 은 부모가 owner. focusedBoothId 는 picker 내부 owner.
 * boothsInSection 은 booths 를 selectedSection 으로 필터한 결과.
 */
export function BoothMapPicker({
  booths,
  selectedDate,
  availableDates,
  onDateChange,
  selectedSection,
  availableSections,
  onSectionChange,
  myBoothId,
  canEnter,
  onEnter,
  initialFocusBoothId,
}: BoothMapPickerProps) {
  const boothsInSection = booths.filter((b) => b.placement.section === selectedSection);

  const [focusedBoothId, setFocusedBoothId] = useState<number | null>(
    initialFocusBoothId ?? boothsInSection[0]?.placement.boothId ?? null,
  );

  // 섹션/날짜 전환으로 boothsInSection 이 바뀌면 포커스 유효성 재확인.
  // 유효하면 유지, 무효면 initialFocus 또는 첫 부스로 리셋.
  useEffect(() => {
    if (
      focusedBoothId != null &&
      boothsInSection.some((b) => b.placement.boothId === focusedBoothId)
    ) {
      return;
    }
    setFocusedBoothId(initialFocusBoothId ?? boothsInSection[0]?.placement.boothId ?? null);
  }, [boothsInSection, initialFocusBoothId, focusedBoothId]);

  const activeSection = MAP_SECTIONS[selectedSection];

  const handleCommit = (boothId: number) => {
    if (canEnter(boothId)) onEnter(boothId);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-background px-6 py-3">
        <MapSectionTabs
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          availableSections={availableSections}
          selectedSection={selectedSection}
          onSectionChange={onSectionChange}
        />
      </div>
      <div className="relative flex-1">
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
        {boothsInSection.length > 0 ? (
          <div className="absolute bottom-4 left-4 right-24">
            <BoothSlider
              booths={boothsInSection}
              focusedBoothId={focusedBoothId}
              myBoothId={myBoothId}
              canEnter={canEnter}
              onFocus={setFocusedBoothId}
              onCommit={handleCommit}
            />
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 right-24 rounded-xl bg-background/90 p-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
            해당 (날짜, 섹션) 에 배치된 부스가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
