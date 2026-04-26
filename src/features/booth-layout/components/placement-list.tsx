// src/features/booth-layout/components/placement-list.tsx
import type { BoothProfile } from '@/features/booths/types';
import type { BoothPlacement } from '@/features/booth-layout/types';

export interface PlacementListProps {
  /** 운영자(부스 계정) 풀. */
  booths: BoothProfile[];
  /** 현재 (date, section) 의 placements. boothId 기준 카운트 표시용. */
  placementsInSection: BoothPlacement[];
  selectedBoothId: number | null;
  onSelectBooth: (boothId: number | null) => void;
}

export function PlacementList({
  booths,
  placementsInSection,
  selectedBoothId,
  onSelectBooth,
}: PlacementListProps) {
  const countByBooth = new Map<number, number>();
  for (const p of placementsInSection) {
    countByBooth.set(p.boothId, (countByBooth.get(p.boothId) ?? 0) + 1);
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-background">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">운영자 (부스 계정)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          운영자를 선택한 뒤 지도 빈 곳을 클릭해 자리를 만드세요. Esc 로 해제.
        </p>
      </header>
      <ul className="flex-1 divide-y divide-border overflow-y-auto">
        {booths.map((b) => {
          const count = countByBooth.get(b.id) ?? 0;
          const selected = selectedBoothId === b.id;
          const displayName = b.name || `(이름 미작성, id: ${b.id})`;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelectBooth(selected ? null : b.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  selected
                    ? 'bg-ds-primary-subtle'
                    : 'hover:bg-muted'
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
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    count > 0
                      ? 'bg-ds-success-subtle text-ds-success-pressed'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  title={`이 (날짜, 섹션) 에 ${count} 자리 배치됨`}
                >
                  {count} 자리
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
