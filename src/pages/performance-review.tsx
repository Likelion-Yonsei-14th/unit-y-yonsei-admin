import { useState } from "react";
import { MessageCircle, Filter, Trash2, Eye, EyeOff, Calendar, Music, Heart, TrendingUp, Search } from "lucide-react";
import { mockReviews, type Review } from "@/mocks/performance-reviews";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PerformanceReviewPage() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [selectedTeam, setSelectedTeam] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);

  const performanceTeams = ["전체", ...Array.from(new Set(mockReviews.map(r => r.performanceTeam)))];

  const filteredReviews = reviews.filter(review => {
    const matchesTeam = selectedTeam === "전체" || review.performanceTeam === selectedTeam;
    const matchesSearch = review.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.favoriteSong.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHidden = showHidden || !review.isHidden;
    return matchesTeam && matchesSearch && matchesHidden;
  });

  const toggleHidden = (id: number) => {
    setReviews(reviews.map(review =>
      review.id === id ? { ...review, isHidden: !review.isHidden } : review
    ));
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      setReviews((prev) => prev.filter((r) => r.id !== pendingDelete.id));
    }
    setPendingDelete(null);
  };

  // 통계 계산
  const stats = {
    total: reviews.length,
    hidden: reviews.filter(r => r.isHidden).length,
    byTeam: performanceTeams.slice(1).map(team => ({
      team,
      count: reviews.filter(r => r.performanceTeam === team).length,
    })),
    topSongs: Object.entries(
      reviews.reduce((acc, r) => {
        acc[r.favoriteSong] = (acc[r.favoriteSong] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageCircle size={32} />
          공연 후기 수합
        </h1>
        <p className="text-muted-foreground mt-2">이용자들이 남긴 공연 후기와 응원 메시지를 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-background rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">전체 후기</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-ds-primary-subtle rounded-lg flex items-center justify-center">
              <MessageCircle size={24} className="text-ds-primary-pressed" />
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">숨김 처리</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.hidden}</p>
            </div>
            <div className="w-12 h-12 bg-ds-warning-subtle rounded-lg flex items-center justify-center">
              <EyeOff size={24} className="text-ds-warning-pressed" />
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">평균 후기/팀</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.byTeam.length > 0 ? Math.round(stats.total / stats.byTeam.length) : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-ds-success-subtle rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-ds-success-pressed" />
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">인기 곡 1위</p>
              <p className="text-lg font-bold text-foreground mt-1 truncate">
                {stats.topSongs[0]?.[0] || "-"}
              </p>
            </div>
            <div className="w-12 h-12 bg-ds-secondary-a-subtle rounded-lg flex items-center justify-center">
              <Music size={24} className="text-ds-secondary-a-pressed" />
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-background rounded-xl p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-foreground mb-2">공연팀 필터</label>
            <div className="relative">
              <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-disabled" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {performanceTeams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-semibold text-foreground mb-2">검색</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-disabled" />
              <input
                type="text"
                placeholder="메시지 또는 곡명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-foreground">숨김 포함</span>
            </label>
          </div>
        </div>
      </div>

      {/* 인기 곡 순위 */}
      {stats.topSongs.length > 0 && (
        <div className="bg-background rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Heart size={20} className="text-destructive" />
            인기 곡 TOP 5
          </h3>
          <div className="space-y-2">
            {stats.topSongs.map(([song, count], index) => (
              <div key={song} className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${index === 0 ? 'bg-ds-warning text-white' :
                    index === 1 ? 'bg-ds-gray-300 text-white' :
                    index === 2 ? 'bg-ds-warning-pressed text-white' :
                    'bg-muted text-muted-foreground'}
                `}>
                  {index + 1}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{song}</span>
                  <span className="text-sm text-muted-foreground">{count}회 선택</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 후기 목록 */}
      <div className="bg-background rounded-xl shadow-sm">
        <div className="px-6 py-4">
          <h3 className="font-bold text-foreground">
            후기 목록 ({filteredReviews.length})
          </h3>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MessageCircle size={48} className="mx-auto mb-3 text-ds-text-disabled" />
            <p>조건에 맞는 후기가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className={`p-6 hover:bg-muted transition-colors ${
                  review.isHidden ? 'bg-muted opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
                      {review.performanceTeam}
                    </div>
                    {review.isHidden && (
                      <div className="px-3 py-1 bg-ds-warning-subtle text-ds-warning-pressed text-sm rounded-full flex items-center gap-1">
                        <EyeOff size={14} />
                        숨김
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleHidden(review.id)}
                      className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                      title={review.isHidden ? "표시" : "숨김"}
                    >
                      {review.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      onClick={() => setPendingDelete(review)}
                      className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Music size={16} />
                    <span className="font-medium">가장 좋았던 곡:</span>
                    <span className="text-foreground">{review.favoriteSong}</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{review.message}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar size={14} />
                  {review.createdAt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 공연팀별 통계 */}
      {stats.byTeam.length > 0 && (
        <div className="bg-background rounded-xl p-6 shadow-sm mt-6">
          <h3 className="font-bold text-foreground mb-4">공연팀별 후기 수</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.byTeam.map(({ team, count }) => (
              <div key={team} className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">{team}</p>
                <p className="text-2xl font-bold text-foreground">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 후기 삭제 확인 — 파괴적이라 프로젝트 전반의 AlertDialog 패턴으로 통일. */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>후기 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.performanceTeam} 공연 후기를 삭제합니다. 삭제 후에는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
