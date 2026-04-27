import { Copy, RotateCcw, Download } from 'lucide-react';
import { FESTIVAL_DATES, type FestivalDate } from '@/features/booth-layout/sections';
import type { MapSectionId } from '@/features/booth-layout/types';
import { MapSectionTabs } from './map-section-tabs';

export interface PlacementToolbarProps {
  selectedDate: FestivalDate;
  selectedSection: MapSectionId;
  /** selectedDate 에 유효한 섹션들. 1 개면 섹션 탭 자체를 숨김. */
  availableSections: MapSectionId[];
  onDateChange: (date: FestivalDate) => void;
  onSectionChange: (section: MapSectionId) => void;
  /** 5/29 백양로/한글탑 같은 "전날 동일 섹션 복제" 가능 여부. */
  copyFromPreviousAvailable: boolean;
  onCopyFromPrevious: () => void;
  onResetSection: () => void;
  onExportJson: () => void;
}

export function PlacementToolbar({
  selectedDate,
  selectedSection,
  availableSections,
  onDateChange,
  onSectionChange,
  copyFromPreviousAvailable,
  onCopyFromPrevious,
  onResetSection,
  onExportJson,
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

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onCopyFromPrevious}
          disabled={!copyFromPreviousAvailable}
          title={
            copyFromPreviousAvailable
              ? '전날의 동일 섹션 좌표를 그대로 복제합니다'
              : '복제할 전날 좌표가 없거나 5/27 입니다'
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={14} />
          전날 복제
        </button>
        <button
          type="button"
          onClick={onResetSection}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-destructive hover:bg-ds-error-subtle"
        >
          <RotateCcw size={14} />
          전체 리셋
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-ds-primary-pressed"
        >
          <Download size={14} />
          JSON Export
        </button>
      </div>
    </div>
  );
}
