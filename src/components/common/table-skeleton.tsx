import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  /** 노출할 행 수. 기본 5. */
  rows?: number;
  /** 외곽 컨테이너 className 오버라이드 — 페이지 카드 패턴에 맞추기 위함. */
  className?: string;
}

/**
 * 테이블 형태 페이지의 로딩 상태. '불러오는 중…' 텍스트보다 레이아웃 점프가 적고
 * 데이터 도착 시 시각 충격이 적다.
 */
export function TableSkeleton({ rows = 5, className }: Props) {
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      className={className ?? 'bg-background rounded-2xl p-6 shadow-sm space-y-4'}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
