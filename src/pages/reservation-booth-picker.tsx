import { useMemo } from "react";
import { Link } from "react-router";
import { Calendar, Store, ChevronRight } from "lucide-react";
import { mockBoothsById } from "@/mocks/booth-profile";
import { mockReservations, type ReservationState } from "@/mocks/reservations";

/**
 * Super/Master 용 예약 관리 진입점.
 * 부스를 먼저 고른 뒤에야 실제 예약 관리 화면으로 진입한다 —
 * 예약 CRUD 는 반드시 부스 컨텍스트에서만 의미가 있기 때문.
 */
export function ReservationBoothPicker() {
  const booths = Object.values(mockBoothsById).sort((a, b) => a.id - b.id);

  const countsByBooth = useMemo(() => {
    const map = new Map<number, Record<ReservationState, number>>();
    for (const r of mockReservations) {
      const cur = map.get(r.boothId) ?? { waiting: 0, completed: 0, cancelled: 0 };
      cur[r.status] += 1;
      map.set(r.boothId, cur);
    }
    return map;
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="text-sm text-muted-foreground mb-1">부스를 선택해 해당 부스의 예약을 관리하세요</div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Calendar size={32} />
          예약 관리
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {booths.map((b) => {
          const counts = countsByBooth.get(b.id) ?? { waiting: 0, completed: 0, cancelled: 0 };
          const total = counts.waiting + counts.completed + counts.cancelled;
          const displayName = b.name || "이름 미입력 부스";
          const displayOrg = b.organizationName || "-";

          return (
            <Link
              key={b.id}
              to={`/reservations/${b.id}`}
              className="group bg-background border border-border rounded-xl p-5 shadow-sm hover:border-ds-border-strong hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-foreground font-semibold truncate">
                    <Store size={16} className="text-muted-foreground shrink-0" />
                    <span className="truncate" title={displayName}>{displayName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate" title={displayOrg}>
                    {displayOrg}
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform"
                />
              </div>

              {total === 0 ? (
                <div className="text-xs text-ds-text-disabled py-2">예약 없음</div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-ds-primary-subtle text-ds-primary-pressed font-medium">
                    대기 {counts.waiting}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-ds-success-subtle text-ds-success-pressed font-medium">
                    완료 {counts.completed}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-ds-error-subtle text-ds-error-pressed font-medium">
                    취소 {counts.cancelled}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
