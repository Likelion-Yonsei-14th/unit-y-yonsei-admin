import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router";
import { Phone, MessageSquare, Check, X, Calendar } from "lucide-react";
import { mockReservations, type Reservation } from "@/mocks/reservations";
import { mockBoothsById } from "@/mocks/booth-profile";
import { PageHeaderAction } from "@/components/common/page-header-action";
import { useAuth } from "@/features/auth/hooks";

type ReservationStatus = "전체 목록" | "대기자 목록" | "취소 목록" | "완료 목록";

export function ReservationManagement() {
  const { boothId: boothIdParam } = useParams<{ boothId: string }>();
  const boothId = Number(boothIdParam);
  const booth = Number.isFinite(boothId) ? mockBoothsById[boothId] : undefined;
  const { user } = useAuth();

  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus>("전체 목록");
  const [reservationEnabled, setReservationEnabled] = useState(booth?.reservationEnabled ?? true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);

  const boothReservations = useMemo(
    () => mockReservations.filter((r) => r.boothId === boothId),
    [boothId],
  );

  const statuses: ReservationStatus[] = ["전체 목록", "대기자 목록", "취소 목록", "완료 목록"];

  // 훅 호출 이후에 조건부 리턴 — Rules of Hooks 위반 방지.
  // Booth 계정이 본인 소속이 아닌 부스 URL 을 직접 입력한 경우 자기 부스로 튕김.
  // Super/Master 는 모든 부스 열람 가능하므로 그대로 진행.
  if (user?.role === "Booth" && user.boothId !== boothId) {
    return <Navigate to={`/reservations/${user.boothId}`} replace />;
  }

  // 유효하지 않은 boothId (없는 부스 · 숫자 아님) → picker 로 복귀.
  if (!booth) {
    return <Navigate to="/reservations" replace />;
  }

  const filteredReservations = boothReservations.filter((res) => {
    if (selectedStatus === "전체 목록") return true;
    if (selectedStatus === "대기자 목록") return res.status === "waiting";
    if (selectedStatus === "취소 목록") return res.status === "cancelled";
    if (selectedStatus === "완료 목록") return res.status === "completed";
    return true;
  });

  // 대기 순번은 부스 스코프 내에서 계산 (전역 순번이 아님).
  const getWaitingNumber = (reservation: Reservation) => {
    if (reservation.status !== "waiting") return null;
    const waitingReservations = boothReservations
      .filter((r) => r.status === "waiting")
      .sort((a, b) => a.time.localeCompare(b.time));
    return waitingReservations.findIndex((r) => r.id === reservation.id) + 1;
  };

  const boothHeaderLabel = booth.name || "이름 미입력 부스";

  // 체크박스 토글
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReservations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReservations.map(r => r.id));
    }
  };

  // 예약 상태 변경
  const handleStatusChange = (newStatus: "waiting" | "completed" | "cancelled") => {
    // 실제로는 API 호출하여 상태 변경
    console.log("선택된 예약:", selectedIds, "변경할 상태:", newStatus);
    setShowStatusChangeModal(false);
    setSelectedIds([]);
    alert(`${selectedIds.length}개의 예약이 ${newStatus === "waiting" ? "대기" : newStatus === "completed" ? "완료" : "취소"} 상태로 변경되었습니다.`);
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

      {/* Status Filter */}
      <div className="flex gap-3 mb-6">
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

      {/* Reservations Table */}
      <div className="bg-background rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="w-12 py-4 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary"
                  checked={selectedIds.length === filteredReservations.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">예약 ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">예약 시간</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">예약 신청자명</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">인원수</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">연락처</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">상태</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">액션</th>
            </tr>
          </thead>
          <tbody>
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
                <td className="px-6 py-4 text-sm font-medium text-foreground">{reservation.id}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{reservation.time}</td>
                <td className="px-6 py-4 text-sm text-foreground">{reservation.name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{reservation.people}명</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{reservation.contact}</td>
                <td className="px-6 py-4">
                  <span className={`
                    inline-block px-3 py-1 rounded-full text-xs font-medium
                    ${reservation.status === 'waiting' && 'bg-ds-primary-subtle text-ds-primary-pressed'}
                    ${reservation.status === 'completed' && 'bg-ds-success-subtle text-ds-success-pressed'}
                    ${reservation.status === 'cancelled' && 'bg-ds-error-subtle text-ds-error-pressed'}
                  `}>
                    {reservation.status === 'waiting' && `대기 ${getWaitingNumber(reservation)}번`}
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
            <h3 className="text-2xl font-bold text-foreground mb-6">예약 상세 정보</h3>

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

            <div className="grid grid-cols-2 gap-3">
              <button className="px-4 py-3 bg-ds-success text-white rounded-lg hover:bg-ds-success-pressed transition-colors flex items-center justify-center gap-2">
                <Check size={18} />
                입장
              </button>
              <button className="px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-ds-error-pressed transition-colors flex items-center justify-center gap-2">
                <X size={18} />
                취소
              </button>
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
    </div>
  );
}