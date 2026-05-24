import { useMemo } from 'react';
import { Link } from 'react-router';
import { Calendar, FileText, Music, Package, Store, Users } from 'lucide-react';
import { useBooths } from '@/features/booths/hooks';
import { useLostItems } from '@/features/lost-found/hooks';
import { useNotices } from '@/features/notices/hooks';
import { usePerformances } from '@/features/performances/hooks';
import { useReservationSummary } from '@/features/reservations/hooks';
import { useAdminUsers } from '@/features/users/hooks';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Super/Master 가 `/` 진입 시 보는 통합 대시보드.
 *
 * 운영진 시점의 KPI 4종 + 최근 공지/분실물 목록을 한 화면에 모은다.
 * 데이터는 모두 react-query 캐시 공유 — 다른 페이지에서 이미 fetch 됐다면
 * 즉시 채워지고, 처음 진입이면 로딩 스켈레톤만 잠깐 보인 뒤 채워짐.
 */
export function DashboardPage() {
  const reservationSummaryQuery = useReservationSummary();
  const boothsQuery = useBooths();
  const performancesQuery = usePerformances();
  const noticesQuery = useNotices();
  const lostItemsQuery = useLostItems();
  const usersQuery = useAdminUsers();

  // ---- KPI 계산 ----
  const stats = useMemo(() => {
    const reservationTotals = reservationSummaryQuery.data?.totals;
    const booths = boothsQuery.data ?? [];
    const performances = performancesQuery.data ?? [];
    const users = usersQuery.data ?? [];

    return {
      reservationCount: reservationTotals?.total ?? 0,
      waitingCount: reservationTotals?.waiting ?? 0,
      activeBoothCount: booths.filter((b) => b.isReservable && !!b.name).length,
      totalBoothCount: booths.length,
      performanceCount: performances.length,
      userCount: users.length,
    };
  }, [reservationSummaryQuery.data, boothsQuery.data, performancesQuery.data, usersQuery.data]);

  // 최신순 정렬 후 상위 N개 — list API 가 정렬 보장 안 할 수 있어 화면 단계에서 한번 더.
  // 같은 date 내 안정 순위는 id 큰 쪽(나중 등록) 우선.
  const recentNotices = useMemo(() => {
    const arr = noticesQuery.data ? [...noticesQuery.data] : [];
    arr.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return arr.slice(0, 3);
  }, [noticesQuery.data]);
  const recentLostItems = useMemo(() => {
    const arr = lostItemsQuery.data ? [...lostItemsQuery.data] : [];
    arr.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return arr.slice(0, 5);
  }, [lostItemsQuery.data]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Calendar size={32} />
          대동제 운영 대시보드
        </h1>
        <p className="text-muted-foreground mt-2">
          UNIT:Y 2026 운영 현황을 한 눈에 — 좌측 메뉴에서 도메인별 상세로 이동.
        </p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="총 예약"
          loading={reservationSummaryQuery.isLoading}
          isError={reservationSummaryQuery.isError}
          icon={<Calendar size={24} />}
          tone="primary"
          value={stats.reservationCount}
          unit="건"
          hint={`대기 ${stats.waitingCount}건`}
          to="/reservations"
        />
        <KpiCard
          label="활성 부스"
          loading={boothsQuery.isLoading}
          isError={boothsQuery.isError}
          icon={<Store size={24} />}
          tone="success"
          value={stats.activeBoothCount}
          unit={`/ ${stats.totalBoothCount}`}
          hint="운영 ON 상태"
          to="/general/booth-layout"
        />
        <KpiCard
          label="공연팀"
          loading={performancesQuery.isLoading}
          isError={performancesQuery.isError}
          icon={<Music size={24} />}
          tone="warning"
          value={stats.performanceCount}
          unit="팀"
          hint="3일 누적"
          to="/performance"
        />
        <KpiCard
          label="총 계정"
          loading={usersQuery.isLoading}
          isError={usersQuery.isError}
          icon={<Users size={24} />}
          tone="secondary"
          value={stats.userCount}
          unit="명"
          hint="운영진 + 운영자"
          to="/users"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 공지 */}
        <ListCard
          title="최근 공지"
          icon={<FileText size={18} />}
          to="/general/notice"
          loading={noticesQuery.isLoading}
          isError={noticesQuery.isError}
          onRetry={() => noticesQuery.refetch()}
          empty={recentNotices.length === 0}
        >
          {recentNotices.map((n) => (
            <li key={n.id} className="border-b border-border last:border-b-0 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{n.content}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{n.date}</span>
              </div>
            </li>
          ))}
        </ListCard>

        {/* 최근 분실물 */}
        <ListCard
          title="최근 분실물"
          icon={<Package size={18} />}
          to="/general/lost-found"
          loading={lostItemsQuery.isLoading}
          isError={lostItemsQuery.isError}
          onRetry={() => lostItemsQuery.refetch()}
          empty={recentLostItems.length === 0}
        >
          {recentLostItems.map((item) => (
            <li key={item.id} className="border-b border-border last:border-b-0 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground truncate mt-1">{item.location}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{item.date}</span>
              </div>
            </li>
          ))}
        </ListCard>
      </div>
    </div>
  );
}

// ---- 내부 컴포넌트들 -----------------------------------------------------------

interface KpiCardProps {
  label: string;
  loading: boolean;
  /** 쿼리 실패 시 '—' 표시 — '값 없음(0)' 과 명확히 구분. */
  isError: boolean;
  icon: React.ReactNode;
  tone: 'primary' | 'success' | 'warning' | 'secondary';
  value: number;
  unit: string;
  hint: string;
  to: string;
}

const TONE_CLASS: Record<KpiCardProps['tone'], string> = {
  primary: 'bg-ds-primary-subtle text-ds-primary-pressed',
  success: 'bg-ds-success-subtle text-ds-success-pressed',
  warning: 'bg-ds-warning-subtle text-ds-warning-pressed',
  secondary: 'bg-ds-secondary-a-subtle text-ds-secondary-a-pressed',
};

function KpiCard({ label, loading, isError, icon, tone, value, unit, hint, to }: KpiCardProps) {
  return (
    <Link
      to={to}
      className="bg-background rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONE_CLASS[tone]}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : isError ? (
          <span className="text-3xl font-bold text-destructive" title="조회 실패">
            —
          </span>
        ) : (
          <>
            <span className="text-3xl font-bold text-foreground">{value.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        {isError ? '조회 실패 — 클릭해 다시 확인' : hint}
      </div>
    </Link>
  );
}

interface ListCardProps {
  title: string;
  icon: React.ReactNode;
  to: string;
  loading: boolean;
  /** 쿼리 실패 시 에러 메시지 + 다시 시도 버튼 노출 — '항목 없음' 과 분리. */
  isError: boolean;
  onRetry: () => void;
  empty: boolean;
  children: React.ReactNode;
}

function ListCard({ title, icon, to, loading, isError, onRetry, empty, children }: ListCardProps) {
  return (
    <div className="bg-background rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          {title}
        </h2>
        <Link to={to} className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </div>
      {loading ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-12 w-full" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="py-6 text-center">
          <p className="text-sm text-destructive mb-2">조회에 실패했습니다.</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : empty ? (
        <p className="py-8 text-center text-sm text-muted-foreground">표시할 항목이 없습니다.</p>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  );
}
