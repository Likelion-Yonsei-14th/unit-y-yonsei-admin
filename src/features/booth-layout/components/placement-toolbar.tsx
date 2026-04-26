// src/features/booth-layout/components/placement-toolbar.tsx
import { Copy, RotateCcw, Download } from 'lucide-react';
import { MAP_SECTIONS, FESTIVAL_DATES, type FestivalDate } from '@/features/booth-layout/sections';
import type { MapSectionId } from '@/features/booth-layout/types';

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

/** 5/27 화 / 5/28 수 / 5/29 목 라벨 */
function dateLabel(d: string): string {
  const day = ['일','월','화','수','목','금','토'][new Date(d).getDay()];
  const m = Number(d.slice(5, 7));
  const dd = Number(d.slice(8, 10));
  return `${m}/${dd} (${day})`;
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
      {/* 날짜 탭 */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {FESTIVAL_DATES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDateChange(d)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedDate === d
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {dateLabel(d)}
          </button>
        ))}
      </div>

      {/* 섹션 탭 — 섹션이 둘 이상일 때만 표시 (5/27 global 단일 섹션은 숨김). */}
      {availableSections.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {availableSections.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSectionChange(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSection === s
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {MAP_SECTIONS[s].label}
            </button>
          ))}
        </div>
      )}

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
