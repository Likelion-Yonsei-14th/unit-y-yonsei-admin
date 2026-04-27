import { MAP_SECTIONS } from '@/features/booth-layout/sections';
import type { MapSectionId } from '@/features/booth-layout/types';

export interface MapSectionTabsProps {
  /** 표시할 날짜 후보. Booth 계정처럼 1개 일 수 있음. */
  availableDates: readonly string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  /** selectedDate 에 유효한 섹션들. 1개면 섹션 탭 자체를 숨김. */
  availableSections: MapSectionId[];
  selectedSection: MapSectionId;
  onSectionChange: (section: MapSectionId) => void;
}

/** 5/27 (화) 형태 라벨. KST 자정 기준 — UTC 자정 파싱 회피. */
function dateLabel(d: string): string {
  const day = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(`${d}T00:00:00+09:00`).getDay()
  ];
  const m = Number(d.slice(5, 7));
  const dd = Number(d.slice(8, 10));
  return `${m}/${dd} (${day})`;
}

/**
 * 지도 화면 공통 — 날짜 + (옵셔널) 섹션 탭. 편집기 toolbar 와 예약 picker 가 동일 외형.
 * 액션 버튼·필터 등 부가 UI 는 부모에서 자유 배치.
 */
export function MapSectionTabs({
  availableDates,
  selectedDate,
  onDateChange,
  availableSections,
  selectedSection,
  onSectionChange,
}: MapSectionTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {availableDates.map((d) => (
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
    </div>
  );
}
