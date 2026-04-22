import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { Phone, MessageSquare, Check, X, Calendar, RotateCcw, Search } from "lucide-react";
import { mockReservations, type Reservation, type ReservationState } from "@/mocks/reservations";
import { mockBoothsById } from "@/mocks/booth-profile";
import { PageHeaderAction } from "@/components/common/page-header-action";
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
import { useAuth } from "@/features/auth/hooks";

type ReservationStatus = "대기자 목록" | "완료 목록" | "취소 목록" | "전체 목록";

export function ReservationManagement() {
  const { boothId: boothIdParam } = useParams<{ boothId: string }>();
  const boothId = Number(boothIdParam);
  const booth = Number.isFinite(boothId) ? mockBoothsById[boothId] : undefined;
  const { user } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus>("대기자 목록");
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationEnabled, setReservationEnabled] = useState(booth?.reservationEnabled ?? true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  // 파괴적 전이(→ cancelled)는 상세 모달에서 직접 확정하지 않고 별도 Alert 를 거친다.
  // 확정 시점에 상세 모달이 뒤에 깔려있으면 답답해서, 먼저 상세를 닫고 Alert 만 띄움.
  const [pendingCancel, setPendingCancel] = useState<Reservation | null>(null);

  const boothReservations = useMemo(
    () => reservations.filter((r) => r.boothId === boothId),
    [reservations, boothId],
  );

  // 파이프: boothReservations → 검색 → 상태 필터 → filteredReservations.
  // 연락처/시간/인원수는 검색 대상 제외(user-management 와 동일한 이유: 값 형태가 잡다).
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchedReservations = useMemo(() => {
    if (!normalizedQuery) return boothReservations;
    return boothReservations.filter((r) => {
      return (
        r.id.toLowerCase().includes(normalizedQuery) ||
        r.name.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [boothReservations, normalizedQuery]);

  const applyStatus = (id: string, status: ReservationState) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  // 대기 순번은 시간 오름차순 기준 고정이라 boothReservations 가 바뀔 때만
  // 다시 계산한다. 렌더마다 getWaitingNumber 에서 filter+sort 를 돌리면
  // 행 렌더 횟수에 비례해 O(n² log n) 까지 악화되므로 Map 으로 O(1) 조회.
  const waitingNumberById = useMemo(() => {
    const sorted = boothReservations
      .filter((r) => r.status === "waiting")
      .sort((a, b) => a.time.localeCompare(b.time));
    const map = new Map<string, number>();
    sorted.forEach((r, i) => map.set(r.id, i + 1));
    return map;
  }, [boothReservations]);

  // 대기자 → 완료 → 취소 → 전체 순 — 운영 중 가장 자주 보는 "대기자" 를 좌측 첫 자리에,
  // 요약/감사용 성격의 "전체" 는 맨 끝에 둔다.
  const statuses: ReservationStatus[] = ["대기자 목록", "완료 목록", "취소 목록", "전체 목록"];

  // 훅 호출 이후에 조건부 리턴 — Rules of Hooks 위반 방지.
  // Booth 계정이 본인 소속이 아닌 부스 URL 을 직접 입력한 경우 자기 부스로 튕김.
  // boothId 미할당(이론상 엣지) 계정은 `/reservations` 의 entry 로 보내
  // "소속 부스 미설정" 안내를 보여준다. 이 가드가 없으면 `/reservations/undefined`
  // 로 보내 NaN 매칭 → 재리다이렉트 무한 루프에 빠진다.
  // Super/Master 는 모든 부스 열람 가능하므로 그대로 진행.
  if (user?.role === "Booth") {
    if (user.boothId == null) {
      return <Navigate to="/reservations" replace />;
    }
    if (user.boothId !== boothId) {
      return <Navigate to={`/reservations/${user.boothId}`} replace />;
    }
  }

  // 유효하지 않은 boothId (없는 부스 · 숫자 아님) → picker 로 복귀.
  if (!booth) {
    return <Navigate to="/reservations" replace />;
  }

  const filteredReservations = searchedReservations.filter((res) => {
    if (selectedStatus === "대기자 목록") return res.status === "waiting";
    if (selectedStatus === "완료 목록") return res.status === "completed";
    if (selectedStatus === "취소 목록") return res.status === "cancelled";
    return true; // 전체 목록
  });

  const boothHeaderLabel = booth.name || "이름 미입력 부스";

  // 체크박스 토글
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // "현재 필터 뷰의 전체 행이 선택돼 있는가" 를 실제 membership 으로 판정.
  // 단순 length 비교는 (a) 0 === 0 으로 빈 목록이 '전체 선택'처럼 보이거나
  // (b) 필터 전환 시 다른 필터 선택분과 길이가 우연히 같아질 때 거짓 양성.
  const filteredSelectedCount = filteredReservations.reduce(
    (n, r) => (selectedIds.includes(r.id) ? n + 1 : n),
    0,
  );
  const allFilteredSelected =
    filteredReservations.length > 0 &&
    filteredSelectedCount === filteredReservations.length;
  const someFilteredSelected =
    filteredSelectedCount > 0 && !allFilteredSelected;

  // indeterminate 는 checked 와 별개 프로퍼티라 ref 로 직접 세팅.
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const hasActiveFilter = !!normalizedQuery || selectedStatus !== "전체 목록";

  // 현재 필터 범위의 행만 대상으로 union/diff. 다른 필터에서 선택한 id 는 보존.
  const toggleSelectAll = () => {
    const filteredIds = filteredReservations.map((r) => r.id);
    const filteredIdSet = new Set(filteredIds);
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // 벌크 예약 상태 변경 — 모달 자체가 확인 단계 역할이라 여기서 바로 반영.
  const handleStatusChange = (newStatus: ReservationState) => {
    setReservations((prev) =>
      prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: newStatus } : r)),
    );
    setShowStatusChangeModal(false);
    setSelectedIds([]);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-sm text-muted-foreground mb-1">{boothHeaderLabel} 예약 현황</div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar size={32} />
            예약 관리
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">예약 가능 ON/OFF</span>
            <button
              onClick={() => setReservationEnabled(!reservationEnabled)}
              className={`
                relative w-14 h-7 rounded-full transition-all duration-300
                ${reservationEnabled
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-200'
                  : 'bg-ds-border-strong'
                }
              `}
            >
              <div className={`
                absolute top-1 w-5 h-5 bg-background rounded-full shadow-md transition-all duration-300
                ${reservationEnabled ? 'left-8' : 'left-1'}
              `} />
            </button>
          </div>

          <PageHeaderAction
            tone="neutral"
            onClick={() => {
              if (selectedIds.length === 0) {
                alert("상태를 변경할 예약을 선택해주세요.");
              } else {
                setShowStatusChangeModal(true);
              }
            }}
          >
            예약 상태 변경
          </PageHeaderAction>
        </div>
      </div>

      {/*
        Status Filter + 검색 — 한 줄에 좌측 pill, 우측 inline search.
        user-management 와 동일 패턴. 계정/예약 수가 수백 단위라 서버 검색 없이
        프론트에서 .includes() 로 충분.
      */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-3">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`
                px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${selectedStatus === status
                  ? 'bg-foreground text-primary-foreground shadow-lg'
                  : 'bg-background text-muted-foreground border border-border hover:border-ds-border-strong'
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-disabled pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="예약 ID·신청자명 검색"
            aria-label="예약 검색"
            className="w-full h-10 pl-9 pr-9 text-sm bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-ds-text-disabled"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/*
        Reservations Table

        필터 전환 시(대기자 ↔ 완료 ↔ 취소 ↔ 전체) 현재 행 내용에 따라
        auto-layout 이 컬럼 폭을 다시 계산해 ui 가 튀는 문제.
        table-fixed + 명시 폭으로 컬럼을 고정한다. (user-management 와 동일 패턴)
      */}
      <div className="bg-background rounded-xl overflow-hidden shadow-sm">
        <table className="w-full table-fixed">
          <thead className="bg-muted">
            <tr>
              <th className="w-[4%] py-4 text-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  aria-label={allFilteredSelected ? "현재 목록 전체 선택 해제" : "현재 목록 전체 선택"}
                />
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">예약 ID</th>
              <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-foreground">예약 시간</th>
              <th className="w-[12%] px-6 py-4 text-left text-sm font-semibold text-foreground">예약 신청자명</th>
              <th className="w-[8%] px-6 py-4 text-left text-sm font-semibold text-foreground">인원수</th>
              <th className="w-[18%] px-6 py-4 text-left text-sm font-semibold text-foreground">연락처</th>
              <th className="w-[18%] px-6 py-4 text-left text-sm font-semibold text-foreground">상태</th>
              <th className="w-[20%] px-6 py-4 text-center text-sm font-semibold text-foreground">액션</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  {hasActiveFilter
                    ? "조건에 맞는 예약이 없습니다."
                    : "표시할 예약이 없습니다."}
                </td>
              </tr>
            )}
            {filteredReservations.map((reservation) => (
              <tr
                key={reservation.id}
                onClick={() => setSelectedReservation(reservation)}
                className="hover:bg-muted transition-colors cursor-pointer"
              >
                <td className="py-4 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary"
                    checked={selectedIds.includes(reservation.id)}
                    onChange={() => toggleSelectId(reservation.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground truncate" title={reservation.id}>{reservation.id}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground truncate">{reservation.time}</td>
                <td className="px-6 py-4 text-sm text-foreground truncate" title={reservation.name}>{reservation.name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground truncate">{reservation.people}명</td>
                <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={reservation.contact}>{reservation.contact}</td>
                <td className="px-6 py-4">
                  {/*
                    라벨 길이가 "완료/취소"(2자) ~ "대기 99번"(5자) 로 들쑥날쑥해
                    행마다 배지 폭이 튀는 문제. min-w-24 로 가장 긴 케이스 기준 고정 +
                    inline-flex 로 짧은 라벨도 중앙 정렬해 균일하게 보이도록.
                  */}
                  <span className={`
                    inline-flex items-center justify-center min-w-24 px-3 py-1 rounded-full text-xs font-medium
                    ${reservation.status === 'waiting' && 'bg-ds-primary-subtle text-ds-primary-pressed'}
                    ${reservation.status === 'completed' && 'bg-ds-success-subtle text-ds-success-pressed'}
                    ${reservation.status === 'cancelled' && 'bg-ds-error-subtle text-ds-error-pressed'}
                  `}>
                    {reservation.status === 'waiting' && `대기 ${waitingNumberById.get(reservation.id) ?? ''}번`}
                    {reservation.status === 'completed' && '완료'}
                    {reservation.status === 'cancelled' && '취소'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={`tel:${reservation.contact.replace(/-/g, '')}`}
                      className="inline-flex p-2 bg-ds-primary-subtle text-ds-primary-pressed rounded-lg hover:bg-ds-blue-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={16} />
                    </a>
                    <a
                      href={`sms:${reservation.contact.replace(/-/g, '')}`}
                      className="inline-flex p-2 bg-ds-success-subtle text-ds-success-pressed rounded-lg transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageSquare size={16} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedReservation(null)}
        >
          <div
            className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground">예약 상세 정보</h3>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                aria-label="닫기"
                className="-m-1 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <div className="text-sm text-muted-foreground mb-1">예약 ID</div>
                <div className="text-lg font-semibold text-foreground">{selectedReservation.id}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">예약자명</div>
                <div className="text-lg font-semibold text-foreground">{selectedReservation.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">연락처</div>
                <div className="text-lg font-semibold text-foreground">{selectedReservation.contact}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">예약 시간</div>
                  <div className="text-lg font-semibold text-foreground">{selectedReservation.time}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">인원수</div>
                  <div className="text-lg font-semibold text-foreground">{selectedReservation.people}명</div>
                </div>
              </div>
            </div>

            {/*
              상태 전이 버튼은 "현재 상태 제외" 규칙으로 항상 2개 노출 — 총 4칸으로 grid-cols-2 채움.
              입장/대기로 되돌리기 는 즉시 반영, 취소 는 파괴성이 있어 Alert 로 한 번 더 확인.
            */}
            <div className="grid grid-cols-2 gap-3">
              {selectedReservation.status !== "completed" && (
                <button
                  onClick={() => {
                    applyStatus(selectedReservation.id, "completed");
                    setSelectedReservation(null);
                  }}
                  className="px-4 py-3 bg-ds-success text-white rounded-lg hover:bg-ds-success-pressed transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  입장
                </button>
              )}
              {selectedReservation.status !== "waiting" && (
                <button
                  onClick={() => {
                    applyStatus(selectedReservation.id, "waiting");
                    setSelectedReservation(null);
                  }}
                  className="px-4 py-3 border border-border bg-background text-foreground rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  대기로 되돌리기
                </button>
              )}
              {selectedReservation.status !== "cancelled" && (
                <button
                  onClick={() => {
                    setPendingCancel(selectedReservation);
                    setSelectedReservation(null);
                  }}
                  className="px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-colors flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  취소
                </button>
              )}
              <a
                href={`sms:${selectedReservation.contact.replace(/-/g, '')}`}
                className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                문자
              </a>
              <a
                href={`tel:${selectedReservation.contact.replace(/-/g, '')}`}
                className="px-4 py-3 bg-ds-secondary-a text-white rounded-lg hover:bg-ds-secondary-a-pressed transition-colors flex items-center justify-center gap-2"
              >
                <Phone size={18} />
                전화
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusChangeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowStatusChangeModal(false)}
        >
          <div
            className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">예약 상태 변경</h3>
            <p className="text-muted-foreground mb-6">
              선택한 <span className="font-bold text-primary">{selectedIds.length}개</span>의 예약 상태를 변경합니다.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleStatusChange("waiting")}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors flex items-center justify-center gap-2"
              >
                대기로 변경
              </button>
              <button
                onClick={() => handleStatusChange("completed")}
                className="w-full px-4 py-3 bg-ds-success text-white rounded-lg hover:bg-ds-success-pressed transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                완료로 변경
              </button>
              <button
                onClick={() => handleStatusChange("cancelled")}
                className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                취소로 변경
              </button>
              <button
                onClick={() => setShowStatusChangeModal(false)}
                className="w-full px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 예약 취소 확인 — 고객 약속을 깨는 방향이라 파괴적. 한 번 더 확인. */}
      <AlertDialog
        open={!!pendingCancel}
        onOpenChange={(o) => {
          if (!o) setPendingCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>예약 취소</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel?.name}님({pendingCancel?.time}, {pendingCancel?.people}명)의 예약을 취소합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>되돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCancel) applyStatus(pendingCancel.id, "cancelled");
                setPendingCancel(null);
              }}
            >
              취소 확정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}