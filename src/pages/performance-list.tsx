import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Music, Calendar, MapPin, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePerformances,
  useLivePerformance,
  useSetLivePerformance,
} from '@/features/performances/hooks';
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
 * 공연 날짜 정수(2~4) ↔ 표시 라벨. 1=5/26 블루런 은 공연 없음.
 * `null` 은 "미정" 탭 — 운영진이 Performer 계정을 만들 때 날짜를 비워둔
 * 공연이 그 어느 일차 탭에도 안 잡혀 보이지 않는 사고를 막는다.
 */
const PERFORMANCE_DATE_OPTIONS: { value: number | null; label: string }[] = [
  { value: 2, label: '5/27' },
  { value: 3, label: '5/28' },
  { value: 4, label: '5/29' },
  { value: null, label: '미정' },
];

/**
 * 라이브 송출이 가능한 무대 — 운영 정책상 노천극장(STAGE) 아티스트 공연만 라이브로 지정한다.
 * 노천극장 MapLocation id = 3 (mock·운영 DB 동일). 무대가 바뀌면 여기 한 곳만 고친다.
 */
const LIVE_VENUE_LOCATION_ID = 3;

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
 * 일차 탭(5/27·28·29) × 장소 드롭다운(전체/개별) 으로 필터링, 시간 오름차순 정렬.
 * 카드 클릭 시 `/performance/:id` 상세로 이동.
 */
export function PerformanceListPage() {
  const { data, isLoading, isError, refetch } = usePerformances();

  const { can } = useAuth();
  const canLive = can('performance.live');
  const { data: livePerformanceId } = useLivePerformance();
  const setLive = useSetLivePerformance();

  // 라이브로 지정된 공연의 목록 아이템 — 현재 필터와 무관하게 전체에서 찾는다.
  const livePerformance = useMemo(
    () =>
      livePerformanceId != null ? (data?.find((p) => p.id === livePerformanceId) ?? null) : null,
    [data, livePerformanceId],
  );

  // 라이브 지정은 오작동 방지를 위해 확인 다이얼로그를 거친다. 해제는 확인 없이 즉시.
  const [pendingLiveId, setPendingLiveId] = useState<number | null>(null);

  const handleSetLive = (id: number | null) => {
    setLive.mutate(id, {
      onSuccess: (next) => {
        toast(next == null ? '라이브 공연을 해제했습니다.' : '라이브 공연으로 지정했습니다.');
      },
      onError: () => toast.error('라이브 지정에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    });
  };

  const [date, setDate] = useState<number | null>(PERFORMANCE_DATE_OPTIONS[0].value);

  // "미정" 탭 강조용 — 날짜가 비어 있는 공연이 있을 때 운영자가 즉시 발견할 수 있게 카운트 노출.
  const undatedCount = useMemo(
    () => (data ?? []).filter((p) => p.performanceDate == null).length,
    [data],
  );
  const [location, setLocation] = useState<string>('all');

  // 선택한 일차에 등장하는 장소명만 필터 옵션으로 노출.
  const locationOptions = useMemo<string[]>(() => {
    if (!data) return ['all'];
    const names = new Set<string>();
    for (const p of data) {
      if (p.performanceDate === date && p.locationName) names.add(p.locationName);
    }
    return ['all', ...[...names].sort()];
  }, [data, date]);

  // 일차 전환 시 선택 중이던 장소가 해당 일차에 없으면 '전체' 로 되돌림.
  useEffect(() => {
    if (location !== 'all' && !locationOptions.includes(location)) setLocation('all');
  }, [location, locationOptions]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter((p) => p.performanceDate === date)
      .filter((p) => location === 'all' || p.locationName === location)
      .slice()
      .sort((a, b) => {
        // null startTime 은 뒤로.
        if (a.startTime == null) return b.startTime == null ? 0 : 1;
        if (b.startTime == null) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [data, date, location]);

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
            livePerformanceId != null
              ? 'bg-ds-error-subtle border-destructive'
              : 'bg-background border-border'
          }`}
        >
          <div className="flex items-center gap-3">
            {livePerformanceId != null ? (
              <LiveDot />
            ) : (
              <Radio size={20} className="text-muted-foreground" aria-hidden="true" />
            )}
            <div>
              <div
                className={`text-sm font-semibold tracking-wide ${
                  livePerformanceId != null ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {livePerformanceId != null ? 'ON AIR' : '현재 라이브 공연'}
              </div>
              <div className="font-semibold text-foreground">
                {livePerformance ? livePerformance.performanceName : '지정된 라이브 공연 없음'}
              </div>
            </div>
          </div>
          {livePerformanceId != null && (
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
            {PERFORMANCE_DATE_OPTIONS.map((o) => {
              const active = o.value === date;
              const isUndated = o.value === null;
              return (
                <button
                  key={o.value ?? 'undated'}
                  type="button"
                  onClick={() => setDate(o.value)}
                  aria-pressed={active}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-foreground text-primary-foreground'
                      : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
                  }`}
                >
                  {o.label}
                  {isUndated && undatedCount > 0 && (
                    <span
                      className={`ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                        active
                          ? 'bg-primary-foreground text-foreground'
                          : 'bg-ds-warning text-white'
                      }`}
                    >
                      {undatedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-wrap gap-2">
            {locationOptions.map((loc) => {
              const active = loc === location;
              const label = loc === 'all' ? '전체' : loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
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
          <p className="text-muted-foreground">이 일차·장소에 등록된 공연이 없습니다.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const isLive = p.id === livePerformanceId;
            // 라이브 지정은 노천극장 아티스트 공연만. 해제는 위 배너에서 항상 가능하다.
            const canGoLive =
              canLive &&
              p.performanceCategory === 'ARTIST' &&
              p.locationId === LIVE_VENUE_LOCATION_ID;
            return (
              <div
                key={p.id}
                className={`bg-background rounded-2xl border transition-all ${
                  isLive
                    ? 'border-destructive ring-2 ring-destructive/30 shadow-md'
                    : 'border-border shadow-sm hover:border-primary hover:shadow-md'
                }`}
              >
                <Link to={`/performance/${p.id}`} className="flex gap-4 p-5">
                  <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    <Music size={24} className="text-ds-text-disabled" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {p.performanceName}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold shrink-0">
                          <LiveDot size="h-1.5 w-1.5" tone="bg-destructive-foreground" />
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.locationName ?? '장소 미정'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.startTime ?? '--:--'} ~ {p.endTime ?? '--:--'}
                    </div>
                  </div>
                </Link>
                {canGoLive && (
                  <div className="px-5 pb-4">
                    <button
                      type="button"
                      onClick={() => (isLive ? handleSetLive(null) : setPendingLiveId(p.id))}
                      disabled={setLive.isPending}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isLive
                          ? 'border border-border bg-background text-foreground hover:bg-muted disabled:opacity-50'
                          : 'bg-primary text-primary-foreground hover:bg-ds-primary-pressed disabled:opacity-50'
                      }`}
                    >
                      {isLive ? '라이브 해제' : '라이브로 지정'}
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
        open={pendingLiveId != null}
        onOpenChange={(o) => {
          if (!o) setPendingLiveId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>라이브 공연 지정</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{data?.find((p) => p.id === pendingLiveId)?.performanceName}&rdquo; 공연을 현재
              라이브로 지정합니다. 기존 라이브 공연이 있으면 교체됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLiveId != null) handleSetLive(pendingLiveId);
                setPendingLiveId(null);
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
