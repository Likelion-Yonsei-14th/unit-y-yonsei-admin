// src/features/booth-layout/components/placement-editor.tsx
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  usePlacements,
  useCreatePlacement,
  useUpdatePlacement,
  useDeletePlacement,
  useCopyPlacements,
  useResetSection,
} from '@/features/booth-layout/hooks';
import {
  FESTIVAL_DATES,
  MAP_SECTIONS,
  type FestivalDate,
} from '@/features/booth-layout/sections';
import type { BoothPlacement, MapSectionId } from '@/features/booth-layout/types';
import { mockBoothsById } from '@/mocks/booth-profile';
import { PlacementToolbar } from './placement-toolbar';
import { PlacementList } from './placement-list';
import { PlacementEditorCanvas } from './placement-editor-canvas';
import { usePlacementUndo } from '@/features/booth-layout/hooks/use-placement-undo';
import { placementStorage } from '@/features/booth-layout/storage';
import { exportPlacementsAsJson } from '@/features/booth-layout/utils/export-placements';

const DEFAULT_SIZE = { width: 5, height: 3 };

function previousDateOf(date: FestivalDate): FestivalDate | null {
  const idx = FESTIVAL_DATES.indexOf(date);
  return idx > 0 ? FESTIVAL_DATES[idx - 1] : null;
}

function sectionsValidFor(date: FestivalDate): MapSectionId[] {
  return (Object.values(MAP_SECTIONS) as Array<typeof MAP_SECTIONS[MapSectionId]>)
    .filter((s) => s.validDates.includes(date))
    .map((s) => s.id);
}

function nextAvailableBoothNumber(existing: BoothPlacement[]): string {
  const used = new Set(existing.map((p) => p.boothNumber));
  for (let n = 1; n <= 1000; n++) {
    if (!used.has(String(n))) return String(n);
  }
  return `${Date.now()}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function PlacementEditor() {
  const [selectedDate, setSelectedDate] = useState<FestivalDate>(FESTIVAL_DATES[0]);
  const validSections = sectionsValidFor(selectedDate);
  const [selectedSection, setSelectedSection] = useState<MapSectionId>(validSections[0]);
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<number | null>(null);
  const [stickySize, setStickySize] = useState<{ width: number; height: number }>(DEFAULT_SIZE);

  // 날짜 바뀌면 섹션도 첫 유효 섹션으로 리셋, 선택도 해제.
  const onDateChange = (d: FestivalDate) => {
    setSelectedDate(d);
    const first = sectionsValidFor(d)[0];
    setSelectedSection(first);
    setSelectedPlacementId(null);
  };

  // 만일 섹션이 유효하지 않게 된 경우 (예: 5/27 → 5/28 전환) 보정.
  useEffect(() => {
    if (!validSections.includes(selectedSection)) {
      setSelectedSection(validSections[0]);
    }
  }, [selectedDate, selectedSection, validSections]);

  const placementsQuery = usePlacements(selectedDate);
  const placementsInSection = useMemo(
    () => (placementsQuery.data ?? []).filter((p) => p.section === selectedSection),
    [placementsQuery.data, selectedSection],
  );

  const booths = useMemo(() => Object.values(mockBoothsById), []);
  const section = MAP_SECTIONS[selectedSection];

  const createMut = useCreatePlacement();
  const updateMut = useUpdatePlacement();
  const deleteMut = useDeletePlacement();
  const copyMut = useCopyPlacements();
  const resetMut = useResetSection();
  const { recordUndo } = usePlacementUndo();

  const handleCreate = async (input: { x: number; y: number; width: number; height: number }) => {
    if (selectedBoothId == null) {
      toast.warning('좌측에서 운영자를 먼저 선택해 주세요.');
      return;
    }
    const number = nextAvailableBoothNumber(placementsInSection);
    setStickySize({ width: input.width, height: input.height });
    try {
      const created = await createMut.mutateAsync({
        boothId: selectedBoothId,
        date: selectedDate,
        section: selectedSection,
        boothNumber: number,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
      });
      setSelectedPlacementId(created.id);
      recordUndo(() =>
        deleteMut
          .mutateAsync({ id: created.id, date: created.date, boothId: created.boothId })
          .then(() => undefined),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMove = async (id: number, delta: { dxPct: number; dyPct: number }) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    const next: BoothPlacement = {
      ...target,
      x: clamp(target.x + delta.dxPct, target.width / 2, 100 - target.width / 2),
      y: clamp(target.y + delta.dyPct, target.height / 2, 100 - target.height / 2),
    };
    const before = target;
    try {
      await updateMut.mutateAsync(next);
      recordUndo(() => updateMut.mutateAsync(before).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleResize = async (
    id: number,
    box: { x: number; y: number; width: number; height: number },
  ) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    const next: BoothPlacement = { ...target, ...box };
    setStickySize({ width: box.width, height: box.height });
    const before = target;
    try {
      await updateMut.mutateAsync(next);
      recordUndo(() => updateMut.mutateAsync(before).then(() => undefined));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleNudge = (id: number, delta: { dxPct: number; dyPct: number }) =>
    handleMove(id, delta);

  const handleDeleteRequest = async (id: number) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    if (!window.confirm(`자리 "${target.boothNumber}" 를 삭제할까요?`)) return;
    try {
      await deleteMut.mutateAsync({ id, date: target.date, boothId: target.boothId });
      setSelectedPlacementId(null);
      recordUndo(() =>
        createMut
          .mutateAsync({
            boothId: target.boothId,
            date: target.date,
            section: target.section,
            boothNumber: target.boothNumber,
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
          })
          .then(() => undefined),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCopyFromPrevious = async () => {
    const prev = previousDateOf(selectedDate);
    if (!prev) return;
    if (
      !window.confirm(
        `${prev} ${section.label} 좌표를 ${selectedDate} 로 덮어쓸까요?\n현재 (${selectedDate}, ${section.label}) 좌표는 모두 사라집니다.`,
      )
    ) {
      return;
    }
    try {
      await copyMut.mutateAsync({ fromDate: prev, toDate: selectedDate, section: selectedSection });
      toast.success('전날 좌표를 복제했습니다.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        `${selectedDate} ${section.label} 의 모든 자리를 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    try {
      await resetMut.mutateAsync({ date: selectedDate, section: selectedSection });
      setSelectedPlacementId(null);
      toast.success('전체 리셋 완료.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleExport = () => {
    const rows = placementStorage.loadAll();
    if (rows.length === 0) {
      toast.warning('저장된 좌표가 없습니다.');
      return;
    }
    exportPlacementsAsJson(rows);
  };

  const copyFromPreviousAvailable = previousDateOf(selectedDate) != null;

  return (
    <div className="flex h-full flex-col">
      <PlacementToolbar
        selectedDate={selectedDate}
        selectedSection={selectedSection}
        availableSections={validSections}
        onDateChange={onDateChange}
        onSectionChange={(s) => {
          setSelectedSection(s);
          setSelectedPlacementId(null);
        }}
        copyFromPreviousAvailable={copyFromPreviousAvailable}
        onCopyFromPrevious={handleCopyFromPrevious}
        onResetSection={handleReset}
        onExportJson={handleExport}
      />
      <div className="flex flex-1 overflow-hidden">
        <PlacementList
          booths={booths}
          placementsInSection={placementsInSection}
          selectedBoothId={selectedBoothId}
          onSelectBooth={setSelectedBoothId}
        />
        <div className="relative flex-1">
          <PlacementEditorCanvas
            section={section}
            placements={placementsInSection}
            selectedPlacementId={selectedPlacementId}
            selectedBoothId={selectedBoothId}
            onSelectPlacement={setSelectedPlacementId}
            onCreatePlacement={handleCreate}
            onMovePlacement={handleMove}
            onResizePlacement={handleResize}
            onNudgePlacement={handleNudge}
            onRequestDelete={handleDeleteRequest}
            defaultSize={stickySize}
          />
          {placementsInSection.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-background/85 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                운영자를 선택하고 지도를 클릭해 첫 자리를 만드세요.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
