import { Plus } from 'lucide-react';
import { FESTIVAL_DATES, type FestivalDate } from '@/features/booth-layout/sections';
import type { MapSectionId } from '@/features/booth-layout/types';
import { MapSectionTabs } from './map-section-tabs';

export interface PlacementToolbarProps {
  selectedDate: FestivalDate;
  selectedSection: MapSectionId;
  /** selectedDate 에 유효한 섹션들. 1개면 섹션 탭 자체를 숨김. */
  availableSections: MapSectionId[];
  onDateChange: (date: FestivalDate) => void;
  onSectionChange: (section: MapSectionId) => void;
  /** 추가 모드 — 빈 곳 클릭으로 새 자리 생성. OFF 일 땐 클릭이 선택 해제만 한다. */
  isAddMode: boolean;
  onToggleAddMode: () => void;
}

export function PlacementToolbar({
  selectedDate,
  selectedSection,
  availableSections,
  onDateChange,
  onSectionChange,
  isAddMode,
  onToggleAddMode,
}: PlacementToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-6 py-3">
      <MapSectionTabs
        availableDates={FESTIVAL_DATES}
        selectedDate={selectedDate}
        onDateChange={(d) => onDateChange(d as FestivalDate)}
        availableSections={availableSections}
        selectedSection={selectedSection}
        onSectionChange={onSectionChange}
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAddMode}
          aria-pressed={isAddMode}
          title={
            isAddMode
              ? '추가 모드 켜짐 — 빈 곳 클릭으로 새 자리 생성'
              : '추가 모드 꺼짐 — 클릭은 선택만'
          }
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            isAddMode
              ? 'border-primary bg-ds-primary-subtle text-ds-primary-pressed'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          <Plus size={14} />
          추가 모드 {isAddMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
