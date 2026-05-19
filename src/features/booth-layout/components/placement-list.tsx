// src/features/booth-layout/components/placement-list.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import type { Booth, BoothSector } from '@/features/booths/types';

export interface PlacementListProps {
  /** 운영자(부스 계정) 풀. */
  booths: Booth[];
  /** 현재 (날짜, 섹션) 에 배치된 부스 id 집합. */
  placedBoothIds: Set<number>;
  /** 선택 일차(Booth.date 비교용). null 이면 날짜 필터 비활성. */
  selectedDay: number | null;
  /** 선택 섹션의 장소(Booth.sector 비교용). */
  selectedSector: BoothSector;
  selectedBoothId: number | null;
  onSelectBooth: (boothId: number | null) => void;
  /** 캔버스 상에서 ghost highlight 동기화용. 리스트 hover → 캔버스 핀 살짝 강조. */
  onHoverBooth?: (boothId: number | null) => void;
}

/**
 * 편집기 좌측의 운영자 리스트.
 *
 * 기본 동작: 현재 일차·장소(섹션)에 해당하는 부스만 보여 컨텍스트와 무관한 부스가
 * 시야를 가리지 않게 한다. 1:1 모델이라 한 부스는 배치(슬롯 있음) 또는 미배치 둘 중 하나다.
 *
 * 정렬: 이 섹션 배치 → 이 날짜·장소 미배치 → 그 외(다른 날/장소).
 */
export function PlacementList({
  booths,
  placedBoothIds,
  selectedDay,
  selectedSector,
  selectedBoothId,
  onSelectBooth,
  onHoverBooth,
}: PlacementListProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  /** 미배치(이 섹션에 자리 없음) 만 보기 — 누락 검증용 P0 워크플로. */
  const [missingOnly, setMissingOnly] = useState(false);

  // 캔버스에서 핀 클릭 → selectedBoothId 변경 → 리스트의 해당 항목으로 자동 스크롤.
  const liRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const liRefCallbacks = useRef<Map<number, (el: HTMLLIElement | null) => void>>(new Map());
  const getLiRef = useCallback((boothId: number) => {
    let cb = liRefCallbacks.current.get(boothId);
    if (!cb) {
      cb = (el: HTMLLIElement | null) => {
        if (el) liRefs.current.set(boothId, el);
        else liRefs.current.delete(boothId);
      };
      liRefCallbacks.current.set(boothId, cb);
    }
    return cb;
  }, []);
  useEffect(() => {
    if (selectedBoothId == null) return;
    const el = liRefs.current.get(selectedBoothId);
    if (!el) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [selectedBoothId]);

  // hover 중인 부스가 필터 변경으로 unmount 되면 stale 강조가 남는 문제 — unmount 시 정리.
  useEffect(() => () => onHoverBooth?.(null), [onHoverBooth]);

  /** 부스가 현재 섹션에 배치됐는지. */
  const isPlaced = useCallback((b: Booth) => placedBoothIds.has(b.id), [placedBoothIds]);
  /** 부스가 선택 일차에 운영하는지. */
  const inDate = useCallback(
    (b: Booth) => selectedDay != null && b.date === selectedDay,
    [selectedDay],
  );
  /** 부스가 선택 섹션(장소)에 속하는지. */
  const inSection = useCallback((b: Booth) => b.sector === selectedSector, [selectedSector]);

  const normalizedQuery = query.trim().toLowerCase();

  // 검색어가 비어있을 때만 '이 날짜·장소만' / '미배치만' 필터를 적용. 검색 중에는 전체 풀 매칭.
  const visibleBooths = useMemo(() => {
    let pool = booths;
    if (!normalizedQuery) {
      if (missingOnly) {
        pool = pool.filter((b) => inDate(b) && inSection(b) && !isPlaced(b));
      } else if (!showAll) {
        pool = pool.filter((b) => inDate(b) && inSection(b));
      }
    }
    if (normalizedQuery) {
      pool = pool.filter((b) => {
        const haystack = `${b.name} ${b.organization}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }
    // 정렬 우선순위: 이 섹션 배치 > 이 날짜·장소 미배치 > 그 외. 안정 정렬용 원본 인덱스 보조키.
    const order = new Map(booths.map((b, i) => [b.id, i] as const));
    const rank = (b: Booth) => {
      if (isPlaced(b)) return 0;
      if (inDate(b) && inSection(b)) return 1;
      return 2;
    };
    return [...pool].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
  }, [booths, normalizedQuery, showAll, missingOnly, isPlaced, inDate, inSection]);

  const totalInScope = useMemo(
    () => booths.filter((b) => inDate(b) && inSection(b)).length,
    [booths, inDate, inSection],
  );
  const totalPlaced = useMemo(() => booths.filter((b) => isPlaced(b)).length, [booths, isPlaced]);
  const missingFromSection = totalInScope - totalPlaced;

  return (
    <aside className="flex h-full min-h-0 w-72 flex-col border-r border-border bg-background">
      <header className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">운영자 (부스 계정)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            운영자를 선택한 뒤 지도 빈 곳을 클릭해 자리를 만드세요. Esc 로 해제.
          </p>
        </div>

        {/* 검증 패널 — 이 (날짜, 섹션) 에 배치된 부스 / 미배치 카운트. */}
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">이 날짜·장소 운영</span>
            <span className="font-semibold text-foreground">
              {totalInScope}
              <span className="font-normal text-ds-text-disabled"> / {booths.length}</span>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-ds-success-pressed">이 섹션 배치</span>
            <span className="font-semibold text-ds-success-pressed">{totalPlaced}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span
              className={
                missingFromSection > 0 ? 'text-ds-warning-pressed' : 'text-muted-foreground'
              }
            >
              {missingFromSection > 0 && (
                <AlertTriangle size={11} className="inline-block mr-1 -mt-0.5" aria-hidden="true" />
              )}
              미배치
            </span>
            <span
              className={
                missingFromSection > 0
                  ? 'font-semibold text-ds-warning-pressed'
                  : 'text-muted-foreground'
              }
            >
              {missingFromSection}
            </span>
          </div>
        </div>

        {/* 검색 — 전체 풀에서 즉시 매칭 (필터 무시). */}
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ds-text-disabled"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="부스명·단체명 검색"
            aria-label="부스 검색"
            className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-7 text-xs placeholder:text-ds-text-disabled focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* 날짜·장소 필터 토글. 검색·미배치 모드 중에는 무시되므로 disabled. */}
        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span>이 날짜·장소에 해당하는 부스만</span>
          <input
            type="checkbox"
            checked={!showAll}
            onChange={(e) => setShowAll(!e.target.checked)}
            disabled={!!normalizedQuery || missingOnly}
            aria-label="이 날짜·장소에 해당하는 부스만 보기"
            className="h-4 w-4 accent-primary disabled:opacity-40"
          />
        </label>

        {/* 미배치 only 토글 — 검증 패널의 '미배치' 와 짝. 누락 부스 빠르게 발견. */}
        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span>이 섹션 미배치만</span>
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
            disabled={!!normalizedQuery}
            aria-label="이 섹션에 자리 없는 부스만 보기"
            className="h-4 w-4 accent-primary disabled:opacity-40"
          />
        </label>

        <div className="text-[10px] text-ds-text-disabled">
          {normalizedQuery
            ? `검색 결과 ${visibleBooths.length}개`
            : missingOnly
              ? `미배치 ${visibleBooths.length}개`
              : showAll
                ? `전체 ${booths.length}개 부스 표시`
                : `이 날짜·장소 ${totalInScope}개 / 전체 ${booths.length}개`}
        </div>
      </header>

      <ul
        className="min-h-0 flex-1 divide-y divide-border overflow-y-auto"
        onMouseLeave={() => onHoverBooth?.(null)}
      >
        {visibleBooths.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            {normalizedQuery
              ? '검색 결과가 없습니다.'
              : '이 날짜·장소에 해당하는 부스가 없습니다. 새 부스를 배치하려면 위 토글을 해제해 전체를 보세요.'}
          </li>
        )}
        {visibleBooths.map((b) => {
          const placed = isPlaced(b);
          const inScope = inDate(b) && inSection(b);
          const placedElsewhere = !placed && b.locationId != null;
          const selected = selectedBoothId === b.id;
          const displayName = b.name || `(이름 미작성, id: ${b.id})`;
          // 배지 톤 — 이 섹션 배치 success, 이 날짜·장소 미배치 warning, 그 외 muted.
          const badgeClass = placed
            ? 'bg-ds-success-subtle text-ds-success-pressed'
            : inScope
              ? 'bg-ds-warning-subtle text-ds-warning-pressed'
              : 'bg-muted text-muted-foreground';
          const badgeLabel = placed
            ? '배치'
            : inScope
              ? '미배치'
              : placedElsewhere
                ? '타 섹션'
                : '대상 외';
          const badgeTitle = placed
            ? '이 (날짜, 섹션) 에 배치된 부스'
            : inScope
              ? '이 날짜·장소에 운영하나 아직 배치되지 않은 부스'
              : placedElsewhere
                ? '다른 섹션에 이미 배치된 부스'
                : '이 날짜·장소 대상이 아닌 부스';
          return (
            <li key={b.id} ref={getLiRef(b.id)} onMouseEnter={() => onHoverBooth?.(b.id)}>
              <button
                type="button"
                onClick={() => onSelectBooth(selected ? null : b.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  selected ? 'bg-ds-primary-subtle' : 'hover:bg-muted'
                }`}
                aria-pressed={selected}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
                  {b.organization && (
                    <div className="truncate text-xs text-muted-foreground">{b.organization}</div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                  title={badgeTitle}
                >
                  {badgeLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
