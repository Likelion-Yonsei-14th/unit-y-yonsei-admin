import { useMemo } from 'react';
import { Star, Smile } from 'lucide-react';
import { useSatisfactionReviews } from '@/features/satisfaction-reviews/hooks';
import type {
  RatingDistribution,
  SatisfactionReviewItem,
} from '@/features/satisfaction-reviews/types';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 만족도 후기 조회 (Super/Master 읽기 전용).
 *
 * 백엔드 GET /admin/info/reviews 의 집계(총 개수·평균 평점·1~5점 분포)와
 * 후기 목록을 한 화면에 보여준다. 데이터 변경(숨김/삭제)은 이번 범위 밖 — 순수 조회.
 */
export function SatisfactionReviewPage() {
  const reviewsQuery = useSatisfactionReviews();
  const data = reviewsQuery.data;

  const reviews: SatisfactionReviewItem[] = useMemo(() => data?.reviews ?? [], [data?.reviews]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Smile size={32} />
          만족도 후기
        </h1>
        <p className="text-muted-foreground mt-2">
          축제 참가자들이 남긴 만족도 평점과 후기를 모아 봅니다.
        </p>
      </div>

      {reviewsQuery.isLoading ? (
        <SummarySkeleton />
      ) : reviewsQuery.isError ? (
        <div className="bg-background rounded-2xl p-8 shadow-sm text-center">
          <p className="text-sm text-destructive mb-3">후기 조회에 실패했습니다.</p>
          <button
            type="button"
            onClick={() => reviewsQuery.refetch()}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : data ? (
        <>
          <SummaryRow
            totalCount={data.totalCount}
            averageRating={data.averageRating}
            distribution={data.ratingDistribution}
          />

          <div className="bg-background rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">후기 목록</h2>
            {reviews.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                표시할 후기가 없습니다.
              </p>
            ) : (
              <ul>
                {reviews.map((review, i) => (
                  <ReviewRow key={`${review.createdAt}-${i}`} review={review} />
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---- 내부 컴포넌트들 -----------------------------------------------------------

/**
 * 타임존 없는 ISO LocalDateTime 문자열을 보기 좋게 정리.
 * ⚠️ new Date() 파싱 금지 — 타임존이 없는 값이라 로컬 변환이 끼면 표시가 어긋난다.
 * "2026-05-25T02:10:01.056" → "2026-05-25 02:10:01"
 */
function formatCreatedAt(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+$/, '');
}

/** 별점 표시 (채워진 별 + 빈 별). */
function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={
            n <= filled
              ? 'fill-ds-warning-pressed text-ds-warning-pressed'
              : 'text-muted-foreground'
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

interface SummaryRowProps {
  totalCount: number;
  averageRating: number;
  distribution: RatingDistribution;
}

function SummaryRow({ totalCount, averageRating, distribution }: SummaryRowProps) {
  // 5점 → 1점 순으로 보여준다(높은 평점이 위). 분포 막대의 비율 기준은 최댓값.
  const rows: { star: number; count: number }[] = [
    { star: 5, count: distribution.fiveStarCount },
    { star: 4, count: distribution.fourStarCount },
    { star: 3, count: distribution.threeStarCount },
    { star: 2, count: distribution.twoStarCount },
    { star: 1, count: distribution.oneStarCount },
  ];
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 mb-8">
      {/* 평균 평점 + 총 개수 */}
      <div className="bg-background rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center min-w-[200px]">
        <span className="text-sm text-muted-foreground">평균 평점</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-4xl font-bold text-foreground">{averageRating.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/ 5</span>
        </div>
        <div className="mt-2">
          <Stars rating={averageRating} />
        </div>
        <span className="text-xs text-muted-foreground mt-2">
          총 {totalCount.toLocaleString()}개 후기
        </span>
      </div>

      {/* 1~5점 분포 막대 */}
      <div className="bg-background rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">평점 분포</h2>
        <ul className="space-y-2">
          {rows.map(({ star, count }) => (
            <li key={star} className="flex items-center gap-3">
              <span className="flex items-center gap-1 w-12 shrink-0 text-xs text-muted-foreground">
                {star}
                <Star
                  size={12}
                  className="fill-ds-warning-pressed text-ds-warning-pressed"
                  aria-hidden="true"
                />
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-ds-warning-pressed"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReviewRow({ review }: { review: SatisfactionReviewItem }) {
  return (
    <li className="border-b border-border last:border-b-0 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Stars rating={review.rating} />
          <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap break-words">
            {review.content}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatCreatedAt(review.createdAt)}
        </span>
      </div>
    </li>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 mb-8">
      <div className="bg-background rounded-2xl p-5 shadow-sm min-w-[200px]">
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="bg-background rounded-2xl p-5 shadow-sm">
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i}>
              <Skeleton className="h-6 w-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
