import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BoothMapPicker } from '@/features/booth-layout/components/booth-map-picker';
import { useMyBoothPlacements, usePlacements } from '@/features/booth-layout/hooks';
import { FESTIVAL_DATES, sectionsValidFor } from '@/features/booth-layout/sections';
import type { MapSectionId, PickerBooth } from '@/features/booth-layout/types';
import { useAuth } from '@/features/auth/hooks';
import { mockBoothsById } from '@/mocks/booth-profile';
import { mockReservations, type ReservationState } from '@/mocks/reservations';

/** boothId → 상태별 카운트 집계 (mockReservations 순회 1회). */
function buildReservationCountsByBooth(): Map<number, Record<ReservationState, number>> {
  const m = new Map<number, Record<ReservationState, number>>();
  for (const r of mockReservations) {
    const cur = m.get(r.boothId) ?? { waiting: 0, completed: 0, cancelled: 0 };
    cur[r.status] += 1;
    m.set(r.boothId, cur);
  }
  return m;
}

/**
 * 지도+슬라이더 기반 예약 관리 진입점.
 * Super/Master/Booth 모두 같은 화면을 본다. canEnter 로 진입 권한만 분기.
 */
export function ReservationBoothPicker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isBooth = user?.role === 'Booth';
  const myBoothId = isBooth ? user?.boothId : undefined;

  // Booth 계정의 본인 배치 (초기 날짜·포커스 resolve 용).
  // 자리가 여러 개일 수 있으나 다중 자리 UX 는 follow-up — 일단 첫 자리만 사용.
  const myPlacementsQuery = useMyBoothPlacements(isBooth ? (myBoothId ?? null) : null);
  const myFirstPlacement = myPlacementsQuery.data?.[0] ?? null;

  // 역할별 available dates
  const availableDates = useMemo<readonly string[]>(() => {
    if (isBooth && myFirstPlacement) return [myFirstPlacement.date];
    if (isBooth) return [];
    return FESTIVAL_DATES;
  }, [isBooth, myFirstPlacement]);

  // 초기 날짜 resolve
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDate != null) return;
    if (isBooth && myFirstPlacement) {
      setSelectedDate(myFirstPlacement.date);
    } else if (!isBooth && user) {
      setSelectedDate(FESTIVAL_DATES[0]);
    }
  }, [isBooth, myFirstPlacement, user, selectedDate]);

  // 선택 가능한 섹션 (선택 날짜 기반).
  const availableSections = useMemo<MapSectionId[]>(
    () => (selectedDate ? sectionsValidFor(selectedDate) : []),
    [selectedDate],
  );

  // 선택 섹션 — Booth 계정은 본인 부스 섹션 default, 그 외엔 첫 유효 섹션.
  const [selectedSection, setSelectedSection] = useState<MapSectionId | null>(null);
  useEffect(() => {
    if (availableSections.length === 0) return;
    if (selectedSection != null && availableSections.includes(selectedSection)) return;
    if (isBooth && myFirstPlacement && availableSections.includes(myFirstPlacement.section)) {
      setSelectedSection(myFirstPlacement.section);
    } else {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, isBooth, myFirstPlacement, selectedSection]);

  const placementsQuery = usePlacements(selectedDate ?? '');

  const booths = useMemo<PickerBooth[]>(() => {
    if (!placementsQuery.data) return [];
    const countsByBooth = buildReservationCountsByBooth();
    return placementsQuery.data.map((p) => ({
      placement: p,
      profile: {
        name: mockBoothsById[p.boothId]?.name || '이름 미입력 부스',
        organizationName: mockBoothsById[p.boothId]?.organizationName || '-',
      },
      counts: countsByBooth.get(p.boothId) ?? { waiting: 0, completed: 0, cancelled: 0 },
    }));
  }, [placementsQuery.data]);

  const canEnter = useCallback(
    (boothId: number) => {
      if (user?.role === 'Super' || user?.role === 'Master') return true;
      if (user?.role === 'Booth') return boothId === user.boothId;
      return false;
    },
    [user],
  );

  const onEnter = useCallback(
    (boothId: number) => {
      navigate(`/reservations/${boothId}`);
    },
    [navigate],
  );

  // Booth 계정 본인 배치 조회 실패 — 영구 로딩 방지 + 재시도 안내
  if (isBooth && myPlacementsQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-8 text-sm">
        <div className="text-destructive">본인 부스 배치 정보를 불러오지 못했습니다.</div>
        <button
          type="button"
          onClick={() => myPlacementsQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Booth 계정인데 본인 배치가 없는 경우 (fetch 완료 + null)
  if (isBooth && myPlacementsQuery.isFetched && (myPlacementsQuery.data?.length ?? 0) === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        소속 부스 정보가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
      </div>
    );
  }

  if (!selectedDate || !selectedSection) {
    return <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  // 해당 날짜 배치 목록 조회 실패 — 빈 상태("배치된 부스 없음") 와 구분해 재시도 제공
  if (placementsQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-8 text-sm">
        <div className="text-destructive">배치 정보를 불러오지 못했습니다.</div>
        <button
          type="button"
          onClick={() => placementsQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <BoothMapPicker
        booths={booths}
        selectedDate={selectedDate}
        availableDates={availableDates}
        onDateChange={setSelectedDate}
        selectedSection={selectedSection}
        availableSections={availableSections}
        onSectionChange={setSelectedSection}
        myBoothId={myBoothId}
        canEnter={canEnter}
        onEnter={onEnter}
        initialFocusBoothId={myBoothId}
      />
    </div>
  );
}
