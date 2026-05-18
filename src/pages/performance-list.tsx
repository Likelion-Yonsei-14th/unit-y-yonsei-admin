import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Music, Calendar, MapPin, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePerformances,
  useLivePerformance,
  useSetLivePerformance,
} from '@/features/performances/hooks';
import { PERFORMANCE_STAGES, type PerformanceStage } from '@/features/performances/types';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';
import { useAuth } from '@/features/auth/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * 라이브 표시용 펄스 점 — 방송 ON AIR 사인처럼 빨간 점에서 halo 가 퍼져나간다.
 * 동작 민감 사용자(prefers-reduced-motion)에게는 정적인 점만 보이도록 motion-safe 게이트.
 */
function LiveDot({
  size = 'h-3.5 w-3.5',
  tone = 'bg-destructive',
}: {
  size?: string;
  tone?: string;
}) {
  return (
    <span className={`relative flex ${size}`} aria-hidden="true">
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${tone} opacity-75 motion-safe:animate-ping`}
      />
      <span className={`relative inline-flex rounded-full ${tone} ${size}`} />
    </span>
  );
}

/**
 * Super/Master 용 전체 공연 목록 페이지.
 * 날짜 탭(5/27·28·29) × 스테이지 드롭다운(전체/개별) 으로 필터링, 시간 오름차순 정렬.
 * 카드 클릭 시 `/performance/:teamId` 상세로 이동.
 */
export function PerformanceListPage() {
  const { data, isLoading, isError, refetch } = usePerformances();

  const { can } = useAuth();
  const canLive = can('performance.live');
  const { data: liveTeamId } = useLivePerformance();
  const setLive = useSetLivePerformance();

  // 라이브로 지정된 팀의 목록 아이템 — 현재 필터(날짜/스테이지)와 무관하게 전체에서 찾는다.
  const liveTeam = useMemo(
    () => (liveTeamId != null ? (data?.find((p) => p.teamId === liveTeamId) ?? null) : null),
    [data, liveTeamId],
  );

  // 라이브 지정은 오작동 방지를 위해 확인 다이얼로그를 거친다. 해제는 확인 없이 즉시.
  const [pendingLiveTeamId, setPendingLiveTeamId] = useState<number | null>(null);

  const handleSetLive = (teamId: number | null) => {
    setLive.mutate(teamId, {
      onSuccess: (next) => {
        toast(next == null ? '라이브 공연을 해제했습니다.' : '라이브 공연으로 지정했습니다.');
      },
      onError: () => toast.error('라이브 지정에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    });
  };

  const [date, setDate] = useState<string>(FESTIVAL_DATES[0]);
  const [stage, setStage] = useState<PerformanceStage | 'all'>('all');

  const stageOptions = useMemo<(PerformanceStage | 'all')[]>(() => {
    const available = (
      Object.values(PERFORMANCE_STAGES) as (typeof PERFORMANCE_STAGES)[PerformanceStage][]
    )
      .filter((s) => s.dates.includes(date))
      .map((s) => s.id);
    return ['all', ...available];
  }, [date]);

  // 날짜 전환 시 선택 중이던 스테이지가 해당 날짜에 없으면 '전체' 로 되돌림.
  useEffect(() => {
    if (stage !== 'all' && !stageOptions.includes(stage)) setStage('all');
  }, [stage, stageOptions]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter((p) => p.date === date)
      .filter((p) => stage === 'all' || p.stage === stage)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [data, date, stage]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Music size={32} />
          공연 정보 관리
        </h1>
      </div>

      {/* 현재 라이브 공연 배너 — Super 전용. 라이브 지정 시 빨간 톤 + ON AIR 펄스로 강조. */}
      {canLive && (
        <div
          className={`rounded-2xl p-5 mb-6 shadow-sm border flex flex-wrap items-center justify-between gap-3 transition-colors ${
            liveTeamId != null
              ? 'bg-ds-error-subtle border-destructive'
              : 'bg-background border-border'
          }`}
        >
          <div className="flex items-center gap-3">
            {liveTeamId != null ? (
              <LiveDot />
            ) : (
              <Radio size={20} className="text-muted-foreground" aria-hidden="true" />
            )}
            <div>
              <div
                className={`text-sm font-semibold tracking-wide ${
                  liveTeamId != null ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {liveTeamId != null ? 'ON AIR' : '현재 라이브 공연'}
              </div>
              <div className="font-semibold text-foreground">
                {liveTeam ? liveTeam.teamName : '지정된 라이브 공연 없음'}
              </div>
            </div>
          </div>
          {liveTeamId != null && (
            <button
              type="button"
              onClick={() => handleSetLive(null)}
              disabled={setLive.isPending}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors text-sm disabled:opacity-50"
            >
              라이브 해제
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-background rounded-2xl p-6 mb-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-muted-foreground" aria-hidden="true" />
          <div className="flex gap-2">
            {FESTIVAL_DATES.map((d) => {
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
            {stageOptions.map((s) => {
              const active = s === stage;
              const label = s === 'all' ? '전체' : PERFORMANCE_STAGES[s].label;
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
          <p className="text-muted-foreground">이 날짜·스테이지에 등록된 공연이 없습니다.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const isLive = p.teamId === liveTeamId;
            // 라이브 지정은 노천극장(nocheon) 공연만 허용.
            const liveDesignatable = p.stage === 'nocheon';
            return (
              <div
                key={p.teamId}
                className={`bg-background rounded-2xl border transition-all ${
                  isLive
                    ? 'border-destructive ring-2 ring-destructive/30 shadow-md'
                    : 'border-border shadow-sm hover:border-primary hover:shadow-md'
                }`}
              >
                <Link to={`/performance/${p.teamId}`} className="flex gap-4 p-5">
                  <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {p.mainPhotoUrl ? (
                      <img src={p.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={24} className="text-ds-text-disabled" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{p.teamName}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold shrink-0">
                          <LiveDot size="h-1.5 w-1.5" tone="bg-destructive-foreground" />
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {PERFORMANCE_STAGES[p.stage].label}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.startTime} ~ {p.endTime}
                    </div>
                  </div>
                </Link>
                {canLive && (
                  <div className="px-5 pb-4">
                    <button
                      type="button"
                      onClick={() =>
                        isLive ? handleSetLive(null) : setPendingLiveTeamId(p.teamId)
                      }
                      disabled={setLive.isPending || (!isLive && !liveDesignatable)}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isLive
                          ? 'border border-border bg-background text-foreground hover:bg-muted disabled:opacity-50'
                          : liveDesignatable
                            ? 'bg-primary text-primary-foreground hover:bg-ds-primary-pressed disabled:opacity-50'
                            : 'cursor-not-allowed bg-muted text-ds-text-disabled'
                      }`}
                    >
                      {isLive
                        ? '라이브 해제'
                        : liveDesignatable
                          ? '라이브로 지정'
                          : '노천극장 공연만 지정 가능'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 라이브 지정 확인 — 오작동 방지. 해제는 확인 없이 즉시 동작. */}
      <AlertDialog
        open={pendingLiveTeamId != null}
        onOpenChange={(o) => {
          if (!o) setPendingLiveTeamId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>라이브 공연 지정</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{data?.find((p) => p.teamId === pendingLiveTeamId)?.teamName}&rdquo; 공연을
              현재 라이브로 지정합니다. 기존 라이브 공연이 있으면 교체됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLiveTeamId != null) handleSetLive(pendingLiveTeamId);
                setPendingLiveTeamId(null);
              }}
            >
              라이브로 지정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
