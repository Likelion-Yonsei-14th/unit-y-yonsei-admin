import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Music, Calendar, MapPin } from 'lucide-react';
import { usePerformances } from '@/features/performances/hooks';
import {
  PERFORMANCE_STAGES,
  type PerformanceStage,
} from '@/features/performances/types';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';

/**
 * Super/Master 용 전체 공연 목록 페이지.
 * 날짜 탭(5/27·28·29) × 스테이지 드롭다운(전체/개별) 으로 필터링, 시간 오름차순 정렬.
 * 카드 클릭 시 `/performance/:teamId` 상세로 이동.
 */
export function PerformanceListPage() {
  const { data, isLoading, isError, refetch } = usePerformances();

  const [date, setDate] = useState<string>(FESTIVAL_DATES[0]);
  const [stage, setStage] = useState<PerformanceStage | 'all'>('all');

  const stageOptions = useMemo<(PerformanceStage | 'all')[]>(() => {
    const available = (Object.values(PERFORMANCE_STAGES) as typeof PERFORMANCE_STAGES[PerformanceStage][])
      .filter(s => s.dates.includes(date))
      .map(s => s.id);
    return ['all', ...available];
  }, [date]);

  // 날짜 전환 시 선택 중이던 스테이지가 해당 날짜에 없으면 '전체' 로 되돌림.
  useEffect(() => {
    if (stage !== 'all' && !stageOptions.includes(stage)) setStage('all');
  }, [stage, stageOptions]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter(p => p.date === date)
      .filter(p => stage === 'all' || p.stage === stage)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [data, date, stage]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Music size={32} />
          공연 정보 관리
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-background rounded-2xl p-6 mb-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-muted-foreground" aria-hidden="true" />
          <div className="flex gap-2">
            {FESTIVAL_DATES.map(d => {
              const active = d === date;
              const [, m, day] = d.split('-');
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  aria-pressed={active}
                  aria-label={`${Number(m)}월 ${Number(day)}일`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-foreground text-primary-foreground'
                      : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
                  }`}
                >
                  {Number(m)}/{Number(day)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-wrap gap-2">
            {stageOptions.map(s => {
              const active = s === stage;
              const label = s === 'all' ? '전체 스테이지' : PERFORMANCE_STAGES[s].label;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">공연 목록을 불러오는 중…</div>
      )}

      {isError && (
        <div className="bg-ds-error-subtle border border-destructive text-destructive rounded-2xl p-6 text-center">
          <p className="mb-3">공연 목록을 가져오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-ds-error-pressed transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="bg-muted rounded-2xl p-12 text-center">
          <Music size={40} className="mx-auto mb-4 text-ds-text-disabled" />
          <p className="text-muted-foreground">
            이 날짜·스테이지에 등록된 공연이 없습니다.
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Link
              key={p.teamId}
              to={`/performance/${p.teamId}`}
              className="bg-background rounded-2xl p-5 shadow-sm border border-border hover:border-primary hover:shadow-md transition-all flex gap-4"
            >
              <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {p.mainPhotoUrl ? (
                  <img src={p.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={24} className="text-ds-text-disabled" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">{p.teamName}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {PERFORMANCE_STAGES[p.stage].label}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {p.startTime} ~ {p.endTime}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
