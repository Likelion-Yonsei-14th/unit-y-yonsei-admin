// src/features/booth-layout/components/placement-list.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import type { BoothProfile } from '@/features/booths/types';
import type { BoothPlacement } from '@/features/booth-layout/types';

export interface PlacementListProps {
  /** 운영자(부스 계정) 풀. */
  booths: BoothProfile[];
  /** 현재 선택된 날짜의 placements (모든 섹션). 'N자리' 카운트 + 날짜 필터에 사용. */
  placementsAtDate: BoothPlacement[];
  /** 현재 (date, section) 의 placements. 섹션 카운트 + 정렬 우선순위에 사용. */
  placementsInSection: BoothPlacement[];
  selectedBoothId: number | null;
  onSelectBooth: (boothId: number | null) => void;
  /** 캔버스 상에서 ghost highlight 동기화용. 리스트 hover → 캔버스 핀 살짝 강조. */
  onHoverBooth?: (boothId: number | null) => void;
}

/**
 * 편집기 좌측의 운영자 리스트.
 *
 * 기본 동작: 현재 (날짜, 섹션) 에 자리가 잡혀 있는 부스만 보여 컨텍스트와 무관한 부스들이
 * 시야를 가리지 않게 한다. 새 부스를 배치하려면 '전체 보기' 토글 또는 검색창 사용.
 *
 * 정렬: 현 섹션 자리 있음 → 같은 날 다른 섹션 자리 있음 → 그 외(다른 날만 또는 무배치).
 * 같은 그룹 내에서는 원본 booth 풀 순서를 유지해 화면이 갑자기 흔들리는 걸 막는다.
 */
export function PlacementList({
  booths,
  placementsAtDate,
  placementsInSection,
  selectedBoothId,
  onSelectBooth,
  onHoverBooth,
}: PlacementListProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  /** 미배치(이 (date, section) 에 자리 없음) 만 보기 — 누락 검증용 P0 워크플로. */
  const [missingOnly, setMissingOnly] = useState(false);

  // 캔버스에서 핀 클릭 → selectedBoothId 변경 → 리스트의 해당 항목으로 자동 스크롤.
  // li ref Map 으로 추적. 항목 unmount 시 cleanup.
  const liRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  // boothId 별 ref 콜백을 캐시 — inline 콜백 매 렌더 새로 생성되어 ref churn 발생하던
  // 문제 방지(같은 boothId 면 같은 함수 instance 재사용).
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
    // prefers-reduced-motion 사용자에게는 smooth 가 부적절 — 즉각 점프로.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [selectedBoothId]);

  // hover 중인 부스가 필터/검색 변경으로 unmount 되면 onMouseLeave 가 발생하지 않아
  // hoveredBoothId 가 stale 로 남고 캔버스 ghost 가 계속 켜지는 문제. 컴포넌트 unmount
  // 시 일괄 정리.
  useEffect(() => () => onHoverBooth?.(null), [onHoverBooth]);

  const inSectionByBooth = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of placementsInSection) m.set(p.boothId, (m.get(p.boothId) ?? 0) + 1);
    return m;
  }, [placementsInSection]);

  const inDateByBooth = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of placementsAtDate) m.set(p.boothId, (m.get(p.boothId) ?? 0) + 1);
    return m;
  }, [placementsAtDate]);

  const normalizedQuery = query.trim().toLowerCase();

  // 검색어가 비어있을 때만 '이 날짜만' / '미배치만' 필터를 적용. 검색 중에는 전체 풀을 대상으로
  // 매칭 — 새 부스 배치 시 빠른 lookup 을 위함.
  const visibleBooths = useMemo(() => {
    let pool = booths;
    if (!normalizedQuery) {
      if (missingOnly) {
        // 이 날짜에 운영하는 부스 중 이 섹션에 자리가 없는 것 — label 과 일치.
        // 다른 날짜만 운영하는 부스는 노이즈라 제외.
        pool = pool.filter(
          (b) => inDateByBooth.has(b.id) && (inSectionByBooth.get(b.id) ?? 0) === 0,
        );
      } else if (!showAll) {
        pool = pool.filter((b) => inDateByBooth.has(b.id));
      }
    }
    if (normalizedQuery) {
      pool = pool.filter((b) => {
        const haystack = `${b.name} ${b.organizationName}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }
    // 정렬 우선순위: 현 섹션 자리 > 같은 날 다른 섹션 자리 > 그 외.
    // 안정 정렬을 위해 원본 인덱스를 보조 키로 사용.
    const order = new Map(booths.map((b, i) => [b.id, i] as const));
    const rank = (b: BoothProfile) => {
      if ((inSectionByBooth.get(b.id) ?? 0) > 0) return 0;
      if ((inDateByBooth.get(b.id) ?? 0) > 0) return 1;
      return 2;
    };
    return [...pool].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
  }, [booths, normalizedQuery, showAll, missingOnly, inSectionByBooth, inDateByBooth]);

  const totalInDate = useMemo(
    () => booths.filter((b) => inDateByBooth.has(b.id)).length,
    [booths, inDateByBooth],
  );

  /**
   * 검증 패널 카운트 — 운영진이 "이 (date, section) 에 빠진 부스 있나?" 즉시 확인.
   * 의미: 이 날짜에 운영하는 부스(=어떤 placement 라도 있는) 중 이 섹션에 자리 없는 것.
   * 다른 날짜에만 있는 부스는 분모에서 제외 (label "이 (날짜, 섹션) 미배치" 와 일치).
   */
  const totalInSection = useMemo(
    () => booths.filter((b) => (inSectionByBooth.get(b.id) ?? 0) > 0).length,
    [booths, inSectionByBooth],
  );
  const missingFromSection = totalInDate - totalInSection;

  return (
    <aside className="flex h-full min-h-0 w-72 flex-col border-r border-border bg-background">
      <header className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">운영자 (부스 계정)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            운영자를 선택한 뒤 지도 빈 곳을 클릭해 자리를 만드세요. Esc 로 해제.
          </p>
        </div>

        {/* 검증 패널 — 이 (날짜, 섹션) 에 자리 있는 부스 / 없는 부스 카운트.
            축제 시작 전 "빠진 부스 있나?" 1초 안에 확인하기 위함 (운영 사고 방지선). */}
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">이 날짜 운영</span>
            <span className="font-semibold text-foreground">
              {totalInDate}
              <span className="font-normal text-ds-text-disabled"> / {booths.length}</span>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-ds-success-pressed">이 섹션 배치</span>
            <span className="font-semibold text-ds-success-pressed">{totalInSection}</span>
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

        {/* 날짜 필터 토글. 검색·미배치 모드 중에는 무시되므로 disabled. */}
        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span>이 날짜에 운영하는 부스만</span>
          <input
            type="checkbox"
            checked={!showAll}
            onChange={(e) => setShowAll(!e.target.checked)}
            disabled={!!normalizedQuery || missingOnly}
            aria-label="이 날짜에 운영하는 부스만 보기"
            className="h-4 w-4 accent-primary disabled:opacity-40"
          />
        </label>

        {/* 미배치 only 토글 — 검증 패널의 'N 미배치' 와 짝. 누락 부스 빠르게 발견. */}
        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span>이 (날짜, 섹션) 미배치만</span>
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
            disabled={!!normalizedQuery}
            aria-label="이 (날짜, 섹션) 에 자리 없는 부스만 보기"
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
                : `이 날짜 운영 ${totalInDate}개 / 전체 ${booths.length}개`}
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
              : '이 날짜에 운영하는 부스가 없습니다. 새 부스를 배치하려면 위 토글을 해제해 전체를 보세요.'}
          </li>
        )}
        {visibleBooths.map((b) => {
          const sectionCount = inSectionByBooth.get(b.id) ?? 0;
          const dateCount = inDateByBooth.get(b.id) ?? 0;
          const selected = selectedBoothId === b.id;
          const displayName = b.name || `(이름 미작성, id: ${b.id})`;
          // 배지 톤 — 현 섹션에 자리 있으면 success, 같은 날 다른 섹션만 있으면 primary,
          // 아예 없으면 muted (전체/검색 모드에서 등장).
          const badgeClass =
            sectionCount > 0
              ? 'bg-ds-success-subtle text-ds-success-pressed'
              : dateCount > 0
                ? 'bg-ds-primary-subtle text-ds-primary-pressed'
                : 'bg-muted text-muted-foreground';
          const badgeLabel =
            sectionCount > 0 ? `${sectionCount} 자리` : dateCount > 0 ? '다른 섹션' : '미배치';
          const badgeTitle =
            sectionCount > 0
              ? `이 (날짜, 섹션) 에 ${sectionCount} 자리 배치됨`
              : dateCount > 0
                ? `이 날짜의 다른 섹션에 ${dateCount} 자리 배치됨`
                : '아직 배치된 자리가 없는 부스';
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
                  {b.organizationName && (
                    <div className="truncate text-xs text-muted-foreground">
                      {b.organizationName}
                    </div>
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
