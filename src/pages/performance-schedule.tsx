import { useMemo } from 'react';
import { CalendarClock, MapPin, Music, Radio } from 'lucide-react';
import { useLiveStages, usePerformanceTimetable } from '@/features/performances/hooks';
import {
  LIVE_STAGE_SOURCE_LABEL,
  PERFORMANCE_CATEGORY_LABEL,
  PERFORMANCE_STATUS_LABEL,
  type LiveStage,
  type PerformanceTimetableItem,
} from '@/features/performances/types';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 공연 일차 정수 → 표시 라벨. 1=5/26 블루런 은 공연 없음.
 * `null` 은 "일차 미정" 그룹 — 날짜가 비어 어느 일차에도 안 잡히는 공연을 흘리지 않는다.
 */
const DATE_LABEL: Record<number, string> = {
  2: '5/27 (수) 송도',
  3: '5/28 (목) 신촌',
  4: '5/29 (금) 신촌',
};

const dateLabel = (date: number | null): string =>
  date == null ? '일차 미정' : (DATE_LABEL[date] ?? `${date}일차`);

/**
 * 공연 시간표 + 라이브 무대 읽기 전용 페이지.
 *
 * - 상단: 현재 진행 중인 무대 목록(GET /performances/live-stages, 15초 폴링).
 * - 하단: 일차별로 묶고 시작 시간 오름차순 정렬한 전체 타임테이블(GET /performances/timetable).
 *
 * 시간은 백엔드 LocalTime('HH:mm') 문자열을 그대로 표시한다 — 타임존 변환 없음.
 */
export function PerformanceSchedulePage() {
  const liveStagesQuery = useLiveStages();
  const timetableQuery = usePerformanceTimetable();

  // 일차별 그룹 → 각 그룹 내부는 시작 시간 오름차순(null 은 뒤로).
  const grouped = useMemo(() => {
    const items = timetableQuery.data ?? [];
    const byDate = new Map<number | null, PerformanceTimetableItem[]>();
    for (const item of items) {
      const key = item.performanceDate;
      const bucket = byDate.get(key);
      if (bucket) bucket.push(item);
      else byDate.set(key, [item]);
    }

    const groups = [...byDate.entries()].map(([date, list]) => ({
      date,
      items: list.slice().sort(sortByStartTime),
    }));

    // 일차 오름차순, "미정"(null) 은 항상 맨 뒤.
    groups.sort((a, b) => {
      if (a.date == null) return b.date == null ? 0 : 1;
      if (b.date == null) return -1;
      return a.date - b.date;
    });
    return groups;
  }, [timetableQuery.data]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <CalendarClock size={32} />
          공연 시간표
        </h1>
        <p className="text-muted-foreground mt-2">
          UNIT:Y 2026 공연 타임테이블과 현재 진행 중인 라이브 무대를 한 화면에서 확인합니다.
        </p>
      </div>

      {/* ---- 라이브 무대 ---- */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Radio size={18} aria-hidden="true" />
          현재 라이브 무대
        </h2>

        {liveStagesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : liveStagesQuery.isError ? (
          <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-2xl p-5 text-center">
            <p className="mb-3">라이브 무대를 가져오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => liveStagesQuery.refetch()}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors text-sm"
            >
              다시 시도
            </button>
          </div>
        ) : (liveStagesQuery.data?.length ?? 0) === 0 ? (
          <div className="bg-muted rounded-2xl p-8 text-center">
            <Radio size={32} className="mx-auto mb-3 text-ds-text-disabled" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">현재 진행 중인 라이브 무대가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveStagesQuery.data!.map((stage) => (
              <LiveStageCard key={`${stage.source}-${stage.performance.id}`} stage={stage} />
            ))}
          </div>
        )}
      </section>

      {/* ---- 타임테이블 ---- */}
      <section>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <CalendarClock size={18} aria-hidden="true" />
          전체 타임테이블
        </h2>

        {timetableQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : timetableQuery.isError ? (
          <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-2xl p-6 text-center">
            <p className="mb-3">공연 타임테이블을 가져오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => timetableQuery.refetch()}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors text-sm"
            >
              다시 시도
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-muted rounded-2xl p-12 text-center">
            <Music size={40} className="mx-auto mb-4 text-ds-text-disabled" aria-hidden="true" />
            <p className="text-muted-foreground">등록된 공연이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.date ?? 'undated'}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {dateLabel(group.date)}
                  <span className="ml-2 text-xs font-normal">{group.items.length}개 공연</span>
                </h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <TimetableRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- 내부 컴포넌트 / 유틸 -------------------------------------------------------

/** 시작 시간 오름차순 비교자. null startTime 은 뒤로 보낸다. */
function sortByStartTime(a: PerformanceTimetableItem, b: PerformanceTimetableItem): number {
  if (a.startTime == null) return b.startTime == null ? 0 : 1;
  if (b.startTime == null) return -1;
  return a.startTime.localeCompare(b.startTime);
}

const timeRange = (start: string | null, end: string | null): string =>
  `${start ?? '--:--'} ~ ${end ?? '--:--'}`;

function TimetableRow({ item }: { item: PerformanceTimetableItem }) {
  const isOngoing = item.performanceStatus === 'ONGOING';
  return (
    <li
      className={`bg-background rounded-xl border px-4 py-3 flex items-center gap-4 ${
        isOngoing ? 'border-destructive' : 'border-border'
      }`}
    >
      <div className="w-28 shrink-0 text-sm font-medium text-foreground tabular-nums">
        {timeRange(item.startTime, item.endTime)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground truncate">{item.performanceName}</span>
          {item.performanceCategory && <CategoryBadge category={item.performanceCategory} />}
          <StatusBadge status={item.performanceStatus} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <MapPin size={12} aria-hidden="true" />
          <span className="truncate">{item.locationName ?? '장소 미정'}</span>
        </div>
      </div>
      {item.hashtags.length > 0 && (
        <div className="hidden lg:flex shrink-0 gap-1.5">
          {item.hashtags.map((tag) => (
            <span key={tag} className="text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function LiveStageCard({ stage }: { stage: LiveStage }) {
  const { performance, source } = stage;
  return (
    <div className="bg-ds-error-subtle border border-destructive rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-destructive">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
          </span>
          ON AIR
        </span>
        <span className="text-xs text-muted-foreground">{LIVE_STAGE_SOURCE_LABEL[source]}</span>
      </div>
      <div className="font-semibold text-foreground truncate">{performance.performanceName}</div>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {performance.performanceCategory && (
          <CategoryBadge category={performance.performanceCategory} />
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={12} aria-hidden="true" />
          {performance.locationName ?? '장소 미정'}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-1 tabular-nums">
        {timeRange(performance.startTime, performance.endTime)}
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: 'ARTIST' | 'CLUB' }) {
  return (
    <span
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        category === 'ARTIST'
          ? 'bg-ds-primary-subtle text-ds-primary-pressed'
          : 'bg-ds-secondary-a-subtle text-ds-secondary-a-pressed'
      }`}
    >
      {PERFORMANCE_CATEGORY_LABEL[category]}
    </span>
  );
}

function StatusBadge({ status }: { status: keyof typeof PERFORMANCE_STATUS_LABEL }) {
  // ONGOING 만 강조(라이브 진행 중). 그 외 상태는 차분한 muted 톤으로.
  const tone =
    status === 'ONGOING'
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-muted text-muted-foreground';
  return (
    <span
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}
    >
      {PERFORMANCE_STATUS_LABEL[status]}
    </span>
  );
}
