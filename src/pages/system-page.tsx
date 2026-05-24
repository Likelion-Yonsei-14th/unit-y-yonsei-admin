import type { ReactNode } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { useActiveAlerts, useErrorLogs, useSystemHealth } from '@/features/system/hooks';
import type { SystemStatus } from '@/features/system/types';
import { env } from '@/lib/env';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Super 전용 시스템 상태 페이지.
 *
 * 백엔드 /api/admin/system/{health,errors,alerts} 를 그대로 보여주는 **관측 전용**
 * 화면(액션 없음). 시계열/이력 차트는 일부러 두지 않는다 — 그건 "Grafana 열기"로
 * 넘기고, 여기선 축제 중 "지금 서버 괜찮아?" 글랜스에 집중.
 */
export function SystemPage() {
  const healthQuery = useSystemHealth();
  const alertsQuery = useActiveAlerts();
  const errorsQuery = useErrorLogs();

  const health = healthQuery.data;

  return (
    <div className="p-4 md:p-8">
      {/* 헤더 */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 md:mb-8">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <Activity size={32} />
            시스템 상태
          </h1>
          <p className="mt-2 text-muted-foreground">
            서버 health · 최근 에러 · 활성 알림 (읽기 전용). health·알림은 12초마다 자동 갱신.
          </p>
        </div>
        {env.GRAFANA_URL && (
          <a
            href={env.GRAFANA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink size={16} />
            Grafana 열기
          </a>
        )}
      </div>

      {/* health 스냅샷 */}
      <Panel title="서버 상태" icon={<Activity size={18} />} className="mb-6">
        {healthQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-40" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : healthQuery.isError || !health ? (
          <RetryBlock
            message="서버 상태를 불러오지 못했습니다."
            onRetry={() => healthQuery.refetch()}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={health.status} />
              <span className="text-sm text-muted-foreground">
                버전 {health.version ?? '—'} · 가동 {fmtUptime(health.uptimeSeconds)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat
                label="Heap"
                value={fmtPercent(health.heap.percent)}
                sub={`${fmtMB(health.heap.usedBytes)} / ${fmtMB(health.heap.maxBytes)}`}
              />
              <Stat label="CPU" value={fmtPercent(health.cpuPercent)} />
              <Stat
                label="DB 풀 (활성/유휴)"
                value={`${fmtNum(health.dbPool.active)} / ${fmtNum(health.dbPool.idle)}`}
                sub={`대기 ${fmtNum(health.dbPool.pending)} · 최대 ${fmtNum(health.dbPool.max)}`}
              />
              <Stat label="DB 풀 대기" value={fmtNum(health.dbPool.pending)} />
              <Stat label="스레드" value={fmtNum(health.liveThreads)} />
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 활성 알림 */}
        <Panel title="활성 알림" icon={<AlertTriangle size={18} />}>
          {alertsQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : alertsQuery.isError ? (
            <RetryBlock
              message="알림을 불러오지 못했습니다."
              onRetry={() => alertsQuery.refetch()}
            />
          ) : (alertsQuery.data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 size={28} className="text-ds-success-pressed" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">현재 활성 알림 없음 · 정상</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {alertsQuery.data!.map((a) => (
                <li key={a.fingerprint} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{a.name}</span>
                    <Badge className={severityCls(a.severity)}>{a.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    시작 {fmtAlertTime(a.startsAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* 최근 에러 */}
        <Panel
          title="최근 에러"
          icon={<AlertTriangle size={18} />}
          action={
            <button
              type="button"
              onClick={() => errorsQuery.refetch()}
              disabled={errorsQuery.isFetching}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={14} className={errorsQuery.isFetching ? 'animate-spin' : ''} />
              새로고침
            </button>
          }
        >
          {errorsQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : errorsQuery.isError ? (
            <RetryBlock
              message="에러 로그를 불러오지 못했습니다."
              onRetry={() => errorsQuery.refetch()}
            />
          ) : (errorsQuery.data?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">최근 에러 없음.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">시각</TableHead>
                    <TableHead>메시지</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorsQuery.data!.map((e, i) => (
                    <TableRow key={`${e.timestamp}-${i}`}>
                      <TableCell className="align-top whitespace-nowrap text-xs text-muted-foreground">
                        {fmtErrorTs(e.timestamp)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm text-foreground">{e.message}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{e.logger}</div>
                        {e.throwable && (
                          <div className="mt-1 break-all font-mono text-xs text-destructive">
                            {e.throwable}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---- 내부 컴포넌트 ----------------------------------------------------------

function Panel({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-background p-5 shadow-sm ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span aria-hidden="true">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

const STATUS_META: Record<SystemStatus, { label: string; cls: string }> = {
  UP: { label: '정상 (UP)', cls: 'bg-ds-success-subtle text-ds-success-pressed' },
  DOWN: { label: '다운 (DOWN)', cls: 'bg-ds-error-subtle text-ds-error-pressed' },
  OUT_OF_SERVICE: { label: '점검 중', cls: 'bg-ds-warning-subtle text-ds-warning-pressed' },
  UNKNOWN: { label: '알 수 없음', cls: 'bg-muted text-muted-foreground' },
};

function StatusPill({ status }: { status: SystemStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.UNKNOWN;
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.cls}`}>{meta.label}</span>
  );
}

function RetryBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-8 text-center">
      <p className="mb-2 text-sm text-destructive">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
      >
        다시 시도
      </button>
    </div>
  );
}

// ---- 표시 헬퍼 --------------------------------------------------------------

const SEVERITY_CLS: Record<string, string> = {
  critical: 'bg-ds-error-subtle text-ds-error-pressed',
  high: 'bg-ds-error-subtle text-ds-error-pressed',
  medium: 'bg-ds-warning-subtle text-ds-warning-pressed',
  low: 'bg-ds-warning-subtle text-ds-warning-pressed',
};
const severityCls = (s: string): string =>
  SEVERITY_CLS[s?.toLowerCase()] ?? 'bg-muted text-muted-foreground';

const fmtNum = (n: number | null): string => (n == null ? '—' : n.toLocaleString());
const fmtPercent = (p: number | null): string => (p == null ? '—' : `${p}%`);
const fmtMB = (b: number | null): string =>
  b == null ? '—' : `${Math.round(b / 1024 / 1024).toLocaleString()} MB`;

/** 가동 시간 초 → "1일 2시간 30분". null 이면 "—". */
function fmtUptime(s: number | null): string {
  if (s == null) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}일`);
  if (h) parts.push(`${h}시간`);
  parts.push(`${m}분`);
  return parts.join(' ');
}

/**
 * 에러 로그 timestamp 는 **타임존 없는** LocalDateTime 이라 Date 로 파싱하면 시각이
 * 틀어진다 → 문자열 그대로 보기 좋게만 정리("T"→공백, 밀리초 제거).
 */
const fmtErrorTs = (raw: string): string => raw.replace('T', ' ').replace(/\.\d+$/, '');

/** 알림 startsAt 은 오프셋/Z 포함이라 실제 Instant 로 파싱해 KST 로 표시. */
function fmtAlertTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}
