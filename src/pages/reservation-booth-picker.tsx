import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, MapPinOff } from 'lucide-react';
import { BoothMapPicker } from '@/features/booth-layout/components/booth-map-picker';
import { useMapLocations } from '@/features/booth-layout/hooks';
import {
  FESTIVAL_DATES,
  sectionsValidFor,
  sectionForSector,
  dayForDate,
  dateForDay,
} from '@/features/booth-layout/sections';
import {
  DEFAULT_BOX_SIZE_BY_SECTION,
  type MapLocation,
  type MapSectionId,
  type PickerBooth,
  type PlacementBox,
} from '@/features/booth-layout/types';
import { useAuth } from '@/features/auth/hooks';
import { useBooths, useMyBooth } from '@/features/booths/hooks';
import { useReservationSummary } from '@/features/reservations/hooks';
import type { Booth } from '@/features/booths/types';

/** MapLocation + Booth → PlacementBox. */
function toBox(loc: MapLocation, booth: Booth): PlacementBox {
  const section = sectionForSector[loc.sector];
  const fallback = DEFAULT_BOX_SIZE_BY_SECTION[section];
  return {
    locationId: loc.id,
    boothId: booth.id,
    boothNumber: String(booth.location ?? '?'),
    section,
    x: loc.mapX,
    y: loc.mapY,
    width: loc.width ?? fallback.width,
    height: loc.height ?? fallback.height,
  };
}

/**
 * 지도+슬라이더 기반 예약 관리 진입점.
 * Super/Master/Booth 모두 같은 화면. canEnter 로 진입 권한만 분기.
 */
export function ReservationBoothPicker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isBooth = user?.role === 'Booth';
  const myBoothId = isBooth ? (user?.boothId ?? undefined) : undefined;

  const locationsQuery = useMapLocations();
  const allBoothsQuery = useBooths();
  const reservationSummaryQuery = useReservationSummary();
  const myBoothQuery = useMyBooth();

  // locationId → MapLocation 조회.
  const locationById = useMemo(() => {
    const m = new Map<number, MapLocation>();
    for (const l of locationsQuery.data ?? []) m.set(l.id, l);
    return m;
  }, [locationsQuery.data]);

  // boothId → 상태별 카운트. summary 응답의 byBooth Map 을 그대로 쓴다.
  const countsByBooth = reservationSummaryQuery.data?.byBooth;

  /** 일차 → PickerBooth[] (배치된 부스만). */
  const pickerBoothByDay = useMemo(() => {
    const byDay = new Map<number, PickerBooth[]>();
    for (const booth of allBoothsQuery.data ?? []) {
      if (booth.locationId == null || booth.date == null) continue;
      const loc = locationById.get(booth.locationId);
      if (!loc) continue;
      const pb: PickerBooth = {
        placement: toBox(loc, booth),
        profile: {
          name: booth.name || '이름 미입력 부스',
          organization: booth.organization || '-',
        },
        counts: countsByBooth?.get(booth.id) ?? { waiting: 0, completed: 0, cancelled: 0 },
      };
      const list = byDay.get(booth.date) ?? [];
      list.push(pb);
      byDay.set(booth.date, list);
    }
    return byDay;
  }, [allBoothsQuery.data, locationById, countsByBooth]);

  // 역할별 available dates — Booth 계정은 본인 부스 날짜 1개, 그 외 전체.
  const availableDates = useMemo<readonly string[]>(() => {
    if (isBooth) {
      const d = dateForDay(myBoothQuery.data?.date ?? null);
      return d ? [d] : [];
    }
    return FESTIVAL_DATES;
  }, [isBooth, myBoothQuery.data]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDate != null) return;
    if (isBooth) {
      const d = dateForDay(myBoothQuery.data?.date ?? null);
      if (d) setSelectedDate(d);
    } else if (user) {
      setSelectedDate(FESTIVAL_DATES[0]);
    }
  }, [isBooth, myBoothQuery.data, user, selectedDate]);

  const availableSections = useMemo<MapSectionId[]>(
    () => (selectedDate ? sectionsValidFor(selectedDate) : []),
    [selectedDate],
  );

  const [selectedSection, setSelectedSection] = useState<MapSectionId | null>(null);
  useEffect(() => {
    if (availableSections.length === 0) return;
    if (selectedSection != null && availableSections.includes(selectedSection)) return;
    // Booth 계정은 본인 부스 섹션을 default 로.
    const mySector = myBoothQuery.data?.sector;
    const mySection = mySector ? sectionForSector[mySector] : null;
    if (isBooth && mySection && availableSections.includes(mySection)) {
      setSelectedSection(mySection);
    } else {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, isBooth, myBoothQuery.data, selectedSection]);

  // 선택 일차의 PickerBooth 목록.
  const booths = useMemo<PickerBooth[]>(() => {
    const day = selectedDate ? dayForDate(selectedDate) : null;
    return day != null ? (pickerBoothByDay.get(day) ?? []) : [];
  }, [pickerBoothByDay, selectedDate]);

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

  // Booth 계정 본인 부스 조회 실패.
  if (isBooth && myBoothQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-8 text-sm">
        <div className="text-destructive">본인 부스 정보를 불러오지 못했습니다.</div>
        <button
          type="button"
          onClick={() => myBoothQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Booth 계정인데 본인 부스가 미배치.
  if (
    isBooth &&
    myBoothQuery.isFetched &&
    (myBoothQuery.data == null || myBoothQuery.data.locationId == null)
  ) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MapPinOff size={28} aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          지도 배치가 아직 설정되지 않았어요
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          소속 부스의 자리가 축제 배치도에 아직 등록되지 않았습니다. 운영진이 배치를 완료하면 이
          화면에서 예약을 관리할 수 있어요. 배치가 필요하면 운영진에게 문의해 주세요.
        </p>
      </div>
    );
  }

  if (locationsQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-8 text-sm">
        <div className="text-destructive">배치 정보를 불러오지 못했습니다.</div>
        <button
          type="button"
          onClick={() => locationsQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!selectedDate || !selectedSection) {
    return <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-border bg-background px-4 py-4 md:px-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <Calendar size={26} aria-hidden="true" />
          예약 관리
        </h1>
      </div>
      <div className="min-h-0 flex-1">
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
    </div>
  );
}
