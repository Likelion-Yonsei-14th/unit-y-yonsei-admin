import { ChevronDown } from 'lucide-react';
import type { Performance } from '@/features/performances/types';

/** 공연 날짜 정수(2~4) ↔ 표시 라벨. 1=5/26 블루런 은 공연 없음. */
export const PERFORMANCE_DATE_OPTIONS: { value: number; label: string }[] = [
  { value: 2, label: '5/27' },
  { value: 3, label: '5/28' },
  { value: 4, label: '5/29' },
];

/** 공연 날짜 정수를 표시 라벨로. 미정/미매칭은 '-'. */
export const dateLabel = (d: number | null): string =>
  PERFORMANCE_DATE_OPTIONS.find((o) => o.value === d)?.label ?? '-';

export interface PerformanceTimetableProps {
  /** 표시 데이터 — 편집 중이면 버퍼, 아니면 서버 데이터. */
  data: Performance;
  /** 편집 모드 여부. */
  isEditMode: boolean;
  /** 타임테이블 편집 권한 — performance.manage 권한자만. */
  canEditTimetable: boolean;
  /** 편집 버퍼 부분 갱신. */
  onChange: (patch: Partial<Performance>) => void;
}

/**
 * 공연 타임테이블 — 날짜·장소·시작/종료 시간.
 * 타임테이블은 축제 운영 스케줄의 입력이라 `canEditTimetable` 권한자만 수정 가능 —
 * 편집 모드여도 권한이 없으면 모든 입력이 읽기 전용.
 */
export function PerformanceTimetable({
  data,
  isEditMode,
  canEditTimetable,
  onChange,
}: PerformanceTimetableProps) {
  const timetableEditable = isEditMode && canEditTimetable;
  const selectClass =
    'w-full appearance-none border border-border rounded-lg bg-background py-3 pl-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
    (timetableEditable ? 'pr-10' : 'pr-4');

  return (
    <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">공연 타임테이블</h2>
        {isEditMode && !canEditTimetable && (
          <span className="text-xs text-muted-foreground">운영진만 수정 가능</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="perf-date" className="block text-sm font-semibold text-foreground mb-2">
            공연 날짜
          </label>
          <div className="relative">
            <select
              id="perf-date"
              className={selectClass}
              value={data.performanceDate ?? ''}
              onChange={(e) =>
                onChange({
                  performanceDate: e.target.value ? Number(e.target.value) : null,
                })
              }
              disabled={!timetableEditable}
            >
              <option value="">미정</option>
              {PERFORMANCE_DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {timetableEditable && (
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor="perf-location"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            공연 장소
          </label>
          <input
            id="perf-location"
            type="number"
            placeholder="장소 ID"
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            value={data.locationId ?? ''}
            onChange={(e) =>
              onChange({
                locationId: e.target.value ? Number(e.target.value) : null,
              })
            }
            disabled={!timetableEditable}
          />
          {data.locationName && (
            <p className="text-xs text-muted-foreground mt-1">{data.locationName}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="perf-start-time"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            공연 시작 시간
          </label>
          <input
            id="perf-start-time"
            type="time"
            step={300}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            value={data.startTime ?? ''}
            onChange={(e) => onChange({ startTime: e.target.value || null })}
            disabled={!timetableEditable}
          />
        </div>
        <div>
          <label
            htmlFor="perf-end-time"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            공연 종료 시간
          </label>
          <input
            id="perf-end-time"
            type="time"
            step={300}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            value={data.endTime ?? ''}
            onChange={(e) => onChange({ endTime: e.target.value || null })}
            disabled={!timetableEditable}
          />
        </div>
      </div>
    </div>
  );
}
