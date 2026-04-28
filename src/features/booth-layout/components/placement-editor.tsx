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
  sectionsValidFor,
  type FestivalDate,
} from '@/features/booth-layout/sections';
import type { BoothPlacement, MapSectionId } from '@/features/booth-layout/types';
import type { BoothProfile } from '@/features/booths/types';
import { PlacementToolbar } from './placement-toolbar';
import { PlacementList } from './placement-list';
import { PlacementEditorCanvas } from './placement-editor-canvas';
import { usePlacementUndo } from '@/features/booth-layout/hooks/use-placement-undo';
import { placementStorage } from '@/features/booth-layout/storage';
import { exportPlacementsAsJson } from '@/features/booth-layout/utils/export-placements';
import { clamp } from '@/features/booth-layout/utils/clamp';

const DEFAULT_SIZE = { width: 5, height: 3 };

function previousDateOf(date: FestivalDate): FestivalDate | null {
  const idx = FESTIVAL_DATES.indexOf(date);
  return idx > 0 ? FESTIVAL_DATES[idx - 1] : null;
}

function nextAvailableBoothNumber(existing: BoothPlacement[]): string {
  const used = new Set(existing.map((p) => p.boothNumber));
  for (let n = 1; n <= 1000; n++) {
    if (!used.has(String(n))) return String(n);
  }
  return `${Date.now()}`;
}

export interface PlacementEditorProps {
  /** 운영자(부스 계정) 풀. 페이지에서 useBooths() 로 끌어와 내려준다. */
  booths: BoothProfile[];
}

export function PlacementEditor({ booths }: PlacementEditorProps) {
  const [selectedDate, setSelectedDate] = useState<FestivalDate>(FESTIVAL_DATES[0]);
  const validSections = useMemo(() => sectionsValidFor(selectedDate), [selectedDate]);
  const [selectedSection, setSelectedSection] = useState<MapSectionId>(validSections[0]);
  // selectedBoothId 는 의도적으로 날짜/섹션 전환에서 유지된다 — 사용자가 한 운영자의
  // 자리들을 여러 (date, section) 에 걸쳐 연속으로 배치하는 흐름을 지원. 반면
  // selectedPlacementId 는 특정 row 를 가리키므로 컨텍스트 전환 시 해제된다.
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<number | null>(null);
  const [stickySize, setStickySize] = useState<{ width: number; height: number }>(DEFAULT_SIZE);
  // 추가 모드 — 기본 OFF. 빈 곳 클릭이 의도치 않게 자리를 만드는 오작동 방지.
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  // 파괴적 액션 확인 다이얼로그 pending 상태 — 코드베이스 다른 페이지의 패턴과 동일.
  const [pendingDelete, setPendingDelete] = useState<BoothPlacement | null>(null);
  const [pendingCopy, setPendingCopy] = useState<boolean>(false);
  const [pendingReset, setPendingReset] = useState<boolean>(false);

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

  const section = MAP_SECTIONS[selectedSection];

  const createMut = useCreatePlacement();
  const updateMut = useUpdatePlacement();
  const deleteMut = useDeletePlacement();
  const copyMut = useCopyPlacements();
  const resetMut = useResetSection();
  const { recordUndo } = usePlacementUndo();

  // 핀 select 시 그 핀 크기를 stickySize 로 채택 — "클릭=복사, 빈 곳 클릭=붙여넣기"
  // 멘탈 모델 지원. null(해제) 일 땐 stickySize 손대지 않는다.
  const handleSelectPlacement = (id: number | null) => {
    setSelectedPlacementId(id);
    if (id != null) {
      const target = placementsInSection.find((p) => p.id === id);
      if (target) setStickySize({ width: target.width, height: target.height });
    }
  };

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

  const handleDeleteRequest = (id: number) => {
    const target = placementsInSection.find((p) => p.id === id);
    if (!target) return;
    setPendingDelete(target);
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    try {
      await deleteMut.mutateAsync({
        id: target.id,
        date: target.date,
        boothId: target.boothId,
      });
      setSelectedPlacementId(null);
      // Edge case: 삭제 직후 같은 booth_number 를 새로 만들면 undo 시 UNIQUE 충돌이 나
      // toast.error 로 surfaced 됨. 1회 admin 시딩 도구라 명시적 안내로 충분 — 더
      // 나은 처리(충돌 시 자동 재할당 등) 는 운영 어드민 승격 시 follow-up.
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

  const handleCopyFromPrevious = () => {
    const prev = previousDateOf(selectedDate);
    if (!prev) return;
    setPendingCopy(true);
  };

  const confirmCopy = async () => {
    const prev = previousDateOf(selectedDate);
    setPendingCopy(false);
    if (!prev) return;
    try {
      await copyMut.mutateAsync({ fromDate: prev, toDate: selectedDate, section: selectedSection });
      toast.success('전날 좌표를 복제했습니다.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReset = () => {
    setPendingReset(true);
  };

  const confirmReset = async () => {
    setPendingReset(false);
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
        isAddMode={isAddMode}
        onToggleAddMode={() => setIsAddMode((v) => !v)}
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
            onSelectPlacement={handleSelectPlacement}
            onCreatePlacement={handleCreate}
            onMovePlacement={handleMove}
            onResizePlacement={handleResize}
            onNudgePlacement={handleNudge}
            onRequestDelete={handleDeleteRequest}
            defaultSize={stickySize}
            isAddMode={isAddMode}
          />
          {placementsInSection.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-background/85 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                {isAddMode
                  ? '운영자를 선택하고 지도를 클릭해 첫 자리를 만드세요.'
                  : '우상단 "추가 모드 OFF" 를 켠 뒤 운영자를 선택하고 지도를 클릭하면 자리를 만들 수 있습니다.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 자리 1개 삭제 확인 */}
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
              자리 "{pendingDelete?.boothNumber}" 를 삭제합니다. Cmd/Ctrl+Z 로
              되돌릴 수 있지만 직후 같은 booth_number 가 재사용되면 충돌할 수 있습니다.
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

      {/* 전날 복제 확인 — 현재 (date, section) 좌표는 모두 덮어써짐 */}
      <AlertDialog
        open={pendingCopy}
        onOpenChange={(o) => {
          if (!o) setPendingCopy(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전날 좌표 복제</AlertDialogTitle>
            <AlertDialogDescription>
              {previousDateOf(selectedDate)} {section.label} 좌표를 {selectedDate}{' '}
              {section.label} 로 덮어씁니다. 현재 ({selectedDate}, {section.label})
              에 있는 좌표는 모두 사라집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCopy}>복제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 전체 리셋 확인 */}
      <AlertDialog
        open={pendingReset}
        onOpenChange={(o) => {
          if (!o) setPendingReset(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 리셋</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDate} {section.label} 의 모든 자리를 삭제합니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              전체 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
