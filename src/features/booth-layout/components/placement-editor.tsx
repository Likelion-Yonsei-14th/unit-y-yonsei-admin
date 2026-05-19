import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useMapLocations,
  useCreateMapLocation,
  useUpdateMapLocation,
  useDeleteMapLocation,
} from '@/features/booth-layout/hooks';
import { useUpdateBooth } from '@/features/booths/hooks';
import {
  FESTIVAL_DATES,
  MAP_SECTIONS,
  sectionsValidFor,
  sectionForSector,
  sectorForSection,
  dayForDate,
  type FestivalDate,
} from '@/features/booth-layout/sections';
import {
  DEFAULT_BOX_SIZE,
  type MapLocation,
  type MapSectionId,
  type PlacementBox,
} from '@/features/booth-layout/types';
import type { Booth } from '@/features/booths/types';
import { PlacementToolbar } from './placement-toolbar';
import { PlacementList } from './placement-list';
import { PlacementEditorCanvas } from './placement-editor-canvas';
import { usePlacementUndo } from '@/features/booth-layout/hooks/use-placement-undo';
import { clamp } from '@/features/booth-layout/utils/clamp';

const DEFAULT_SIZE = DEFAULT_BOX_SIZE;

/** MapLocation + Booth → PlacementBox 뷰모델. */
function toBox(loc: MapLocation, booth: Booth): PlacementBox {
  return {
    locationId: loc.id,
    boothId: booth.id,
    boothNumber: String(booth.location ?? '?'),
    section: sectionForSector[loc.sector],
    x: loc.mapX,
    y: loc.mapY,
    width: loc.width ?? DEFAULT_SIZE.width,
    height: loc.height ?? DEFAULT_SIZE.height,
  };
}

export interface PlacementEditorProps {
  /** 운영자(부스 계정) 풀. 페이지에서 useBooths() 로 끌어와 내려준다. */
  booths: Booth[];
}

export function PlacementEditor({ booths }: PlacementEditorProps) {
  const [selectedDate, setSelectedDate] = useState<FestivalDate>(FESTIVAL_DATES[0]);
  const validSections = useMemo(() => sectionsValidFor(selectedDate), [selectedDate]);
  const [selectedSection, setSelectedSection] = useState<MapSectionId>(validSections[0]);
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [hoveredBoothId, setHoveredBoothId] = useState<number | null>(null);
  const [stickySize, setStickySize] = useState<{ width: number; height: number }>(DEFAULT_SIZE);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<PlacementBox | null>(null);

  const onDateChange = (d: FestivalDate) => {
    setSelectedDate(d);
    setSelectedSection(sectionsValidFor(d)[0]);
    setSelectedLocationId(null);
  };

  useEffect(() => {
    if (!validSections.includes(selectedSection)) setSelectedSection(validSections[0]);
  }, [selectedDate, selectedSection, validSections]);

  const locationsQuery = useMapLocations();

  const boothById = useMemo(() => {
    const m = new Map<number, Booth>();
    for (const b of booths) m.set(b.id, b);
    return m;
  }, [booths]);

  /** locationId → Booth 역참조 (1:1). 첫 부스만 채택, 둘 이상이면 경고. */
  const boothByLocationId = useMemo(() => {
    const m = new Map<number, Booth>();
    for (const b of booths) {
      if (b.locationId == null) continue;
      if (m.has(b.locationId)) {
        console.warn(
          `MapLocation ${b.locationId} 를 부스 ${m.get(b.locationId)!.id}, ${b.id} 가 공유 — 1:1 위반. 첫 부스만 표시.`,
        );
        continue;
      }
      m.set(b.locationId, b);
    }
    return m;
  }, [booths]);

  /** 모든 (배치된) PlacementBox. */
  const allBoxes = useMemo<PlacementBox[]>(() => {
    const locs = locationsQuery.data ?? [];
    const boxes: PlacementBox[] = [];
    for (const loc of locs) {
      const booth = boothByLocationId.get(loc.id);
      if (booth) boxes.push(toBox(loc, booth));
    }
    return boxes;
  }, [locationsQuery.data, boothByLocationId]);

  /** 현재 (날짜, 섹션) 박스. */
  const selectedDay = dayForDate(selectedDate);
  const boxesInSection = useMemo(
    () =>
      allBoxes.filter(
        (b) => b.section === selectedSection && boothById.get(b.boothId)?.date === selectedDay,
      ),
    [allBoxes, selectedSection, selectedDay, boothById],
  );

  /** 이 섹션에 배치된 부스 id 집합 — PlacementList 검증 패널용. */
  const placedBoothIds = useMemo(
    () => new Set(boxesInSection.map((b) => b.boothId)),
    [boxesInSection],
  );

  const section = MAP_SECTIONS[selectedSection];

  const createMut = useCreateMapLocation();
  const updateMut = useUpdateMapLocation();
  const deleteMut = useDeleteMapLocation();
  const updateBoothMut = useUpdateBooth();
  const { recordUndo } = usePlacementUndo();

  const handleSelectLocation = (id: number | null) => {
    setSelectedLocationId(id);
    if (id != null) {
      const target = boxesInSection.find((b) => b.locationId === id);
      if (target) setStickySize({ width: target.width, height: target.height });
    }
  };

  const handleCreate = async (input: { x: number; y: number; width: number; height: number }) => {
    if (selectedBoothId == null) {
      toast.warning('좌측에서 운영자를 먼저 선택해 주세요.');
      return;
    }
    const booth = boothById.get(selectedBoothId);
    if (!booth) return;
    if (booth.locationId != null) {
      toast.warning('이미 배치된 부스입니다. 기존 자리를 옮기거나 삭제 후 다시 배치하세요.');
      return;
    }
    setStickySize({ width: input.width, height: input.height });
    // 새 자리는 "지금 보고 있는 섹션/일차"에 속한다 — 부스의 기존 sector/date 가
    // 비어 있거나 다른 값이면 자리가 엉뚱한 섹션으로 가 화면에서 사라진다.
    // 클릭한 섹션·일차를 단일 진실로 삼아 자리·부스 양쪽을 맞춘다.
    const placedSector = sectorForSection[selectedSection];
    try {
      const loc = await createMut.mutateAsync({
        locationName: booth.name || `${placedSector} 부스 슬롯`,
        sector: placedSector,
        mapX: input.x,
        mapY: input.y,
        width: input.width,
        height: input.height,
      });
      await updateBoothMut.mutateAsync({
        ...booth,
        locationId: loc.id,
        sector: placedSector,
        date: selectedDay,
      });
      setSelectedLocationId(loc.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMove = async (id: number, delta: { dxPct: number; dyPct: number }) => {
    const target = boxesInSection.find((b) => b.locationId === id);
    if (!target) return;
    const nextX = clamp(target.x + delta.dxPct, target.width / 2, 100 - target.width / 2);
    const nextY = clamp(target.y + delta.dyPct, target.height / 2, 100 - target.height / 2);
    const before = { mapX: target.x, mapY: target.y };
    try {
      await updateMut.mutateAsync({ id, patch: { mapX: nextX, mapY: nextY } });
      recordUndo(() => updateMut.mutateAsync({ id, patch: before }).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleResize = async (
    id: number,
    box: { x: number; y: number; width: number; height: number },
  ) => {
    const target = boxesInSection.find((b) => b.locationId === id);
    if (!target) return;
    setStickySize({ width: box.width, height: box.height });
    const before = {
      mapX: target.x,
      mapY: target.y,
      width: target.width,
      height: target.height,
    };
    try {
      await updateMut.mutateAsync({
        id,
        patch: { mapX: box.x, mapY: box.y, width: box.width, height: box.height },
      });
      recordUndo(() => updateMut.mutateAsync({ id, patch: before }).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteRequest = (id: number) => {
    const target = boxesInSection.find((b) => b.locationId === id);
    if (target) setPendingDelete(target);
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    const booth = boothById.get(target.boothId);
    try {
      // 순서 필수: 부스 참조를 먼저 끊어야 location 삭제 시 409 가 안 난다.
      if (booth) await updateBoothMut.mutateAsync({ ...booth, locationId: null });
      await deleteMut.mutateAsync(target.locationId);
      setSelectedLocationId(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PlacementToolbar
        selectedDate={selectedDate}
        selectedSection={selectedSection}
        availableSections={validSections}
        onDateChange={onDateChange}
        onSectionChange={(s) => {
          setSelectedSection(s);
          setSelectedLocationId(null);
        }}
        isAddMode={isAddMode}
        onToggleAddMode={() => setIsAddMode((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <PlacementList
          booths={booths}
          placedBoothIds={placedBoothIds}
          selectedDay={selectedDay}
          selectedBoothId={selectedBoothId}
          onSelectBooth={setSelectedBoothId}
          onHoverBooth={setHoveredBoothId}
        />
        <div className="relative flex-1">
          <PlacementEditorCanvas
            section={section}
            placements={boxesInSection}
            selectedPlacementId={selectedLocationId}
            selectedBoothId={selectedBoothId}
            hoveredBoothId={hoveredBoothId}
            boothById={boothById}
            onSelectPlacement={handleSelectLocation}
            onCreatePlacement={handleCreate}
            onMovePlacement={handleMove}
            onResizePlacement={handleResize}
            onNudgePlacement={handleMove}
            onRequestDelete={handleDeleteRequest}
            defaultSize={stickySize}
            isAddMode={isAddMode}
          />
          {boxesInSection.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-background/85 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                {isAddMode
                  ? '운영자를 선택하고 지도를 클릭해 자리를 만드세요.'
                  : '우상단 "추가 모드" 를 켠 뒤 운영자를 선택하고 지도를 클릭하면 자리를 만들 수 있습니다.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              자리 &ldquo;{pendingDelete?.boothNumber}&rdquo; 를 삭제하고 해당 부스의 배치를
              해제합니다. 되돌릴 수 없습니다.
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
