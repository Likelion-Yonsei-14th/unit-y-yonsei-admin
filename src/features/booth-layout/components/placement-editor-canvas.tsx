// src/features/booth-layout/components/placement-editor-canvas.tsx
import { useEffect, useRef, useState } from 'react';
import { useImagePaintedRect } from '@/features/booth-layout/hooks/use-image-painted-rect';
import { clamp } from '@/features/booth-layout/utils/clamp';
import type { BoothPlacement, MapSection } from '@/features/booth-layout/types';

export interface PlacementEditorCanvasProps {
  section: MapSection;
  placements: BoothPlacement[];
  selectedPlacementId: number | null;
  selectedBoothId: number | null;
  onSelectPlacement: (id: number | null) => void;
  /** 새 placement 생성 콜백. 좌표/크기는 이미지 기준 0–100 %. */
  onCreatePlacement: (input: { x: number; y: number; width: number; height: number }) => void;
  /** 핀 드래그 이동 commit. dxPct/dyPct 는 이미지 rect 기준 변위(0–100 %). */
  onMovePlacement: (id: number, delta: { dxPct: number; dyPct: number }) => void;
  /** 핀 리사이즈 commit. next 는 리사이즈 후 좌표/크기. */
  onResizePlacement: (
    id: number,
    next: { x: number; y: number; width: number; height: number },
  ) => void;
  /** 미세조정 nudge — 화살표 keydown 1회당 호출. */
  onNudgePlacement: (id: number, delta: { dxPct: number; dyPct: number }) => void;
  /** Backspace/Delete 시 — 부모가 확인 다이얼로그 후 실삭제. */
  onRequestDelete: (id: number) => void;
  /** 마지막에 만든 placement 크기 sticky default. */
  defaultSize: { width: number; height: number };
  /** 추가 모드 — true 일 때만 빈 곳 클릭이 새 자리 생성을 트리거한다. */
  isAddMode: boolean;
}

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_OFFSETS: Record<HandleId, { dx: string; dy: string; cursor: string }> = {
  nw: { dx: '0%',   dy: '0%',   cursor: 'nwse-resize' },
  n:  { dx: '50%',  dy: '0%',   cursor: 'ns-resize'   },
  ne: { dx: '100%', dy: '0%',   cursor: 'nesw-resize' },
  e:  { dx: '100%', dy: '50%',  cursor: 'ew-resize'   },
  se: { dx: '100%', dy: '100%', cursor: 'nwse-resize' },
  s:  { dx: '50%',  dy: '100%', cursor: 'ns-resize'   },
  sw: { dx: '0%',   dy: '100%', cursor: 'nesw-resize' },
  w:  { dx: '0%',   dy: '50%',  cursor: 'ew-resize'   },
};

export function PlacementEditorCanvas({
  section,
  placements,
  selectedPlacementId,
  selectedBoothId,
  onSelectPlacement,
  onCreatePlacement,
  onMovePlacement,
  onResizePlacement,
  onNudgePlacement,
  onRequestDelete,
  defaultSize,
  isAddMode,
}: PlacementEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { rect, measure } = useImagePaintedRect(containerRef, {
    aspectRatio: section.imageAspectRatio,
    imgRef,
    reMeasureKey: section.id,
  });

  const [dragState, setDragState] = useState<{
    placementId: number;
    startClientX: number;
    startClientY: number;
    dxPct: number;
    dyPct: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    placementId: number;
    handle: HandleId;
    startClientX: number;
    startClientY: number;
    origin: { x: number; y: number; width: number; height: number };
    next: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const resizeStateRef = useRef(resizeState);
  resizeStateRef.current = resizeState;

  // 섹션 전환 시 mid-drag/mid-resize state 가 살아있으면 stale 한 좌표로 mouseup
  // 이 commit 될 위험. 컨텍스트 전환 시 양쪽 모두 강제 클리어.
  useEffect(() => {
    setDragState(null);
    setResizeState(null);
  }, [section.id]);

  const onContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 핀 클릭은 자식 button 의 stopPropagation 으로 흡수됨.
    // 그 외 자식(특히 <img> — 캔버스의 시각 surface) 클릭은 컨테이너 클릭과 동일 취급.
    if ((e.target as HTMLElement).closest('button')) return;
    if (!rect) return;
    if (!isAddMode) {
      // 추가 모드 OFF — 클릭은 선택 해제만 한다. 오작동 방지용 명시 토글.
      onSelectPlacement(null);
      return;
    }
    if (selectedBoothId == null) {
      // 추가 모드 ON 인데 운영자 미선택 — 선택만 해제, 좌측 리스트 강조는 부모 책임.
      onSelectPlacement(null);
      return;
    }
    const containerBox = containerRef.current?.getBoundingClientRect();
    if (!containerBox) return;
    const px = e.clientX - containerBox.left - rect.left;
    const py = e.clientY - containerBox.top - rect.top;
    const x = (px / rect.width) * 100;
    const y = (py / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const halfW = defaultSize.width / 2;
    const halfH = defaultSize.height / 2;
    onCreatePlacement({
      x: clamp(x, halfW, 100 - halfW),
      y: clamp(y, halfH, 100 - halfH),
      width: defaultSize.width,
      height: defaultSize.height,
    });
  };

  // ref 로 라이브 상태를 잡아 effect 가 매 mousemove 마다 재구독되지 않도록 한다.
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const onPinMouseDown = (e: React.MouseEvent, p: BoothPlacement) => {
    e.stopPropagation();
    // preventDefault 는 의도적으로 호출하지 않음 — click 이벤트가 정상적으로 발생해야
    // 무이동 탭의 onClick selection 경로가 살아 있다.
    onSelectPlacement(p.id);
    setDragState({
      placementId: p.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      dxPct: 0,
      dyPct: 0,
    });
  };

  // dragState 객체가 바뀔 때마다 재구독되지 않도록 boolean 만 dep 으로 올린다.
  const isDragActive = dragState !== null;
  useEffect(() => {
    if (!isDragActive || !rect) return;
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dxPct = ((e.clientX - ds.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - ds.startClientY) / rect.height) * 100;
      setDragState((s) => (s ? { ...s, dxPct, dyPct } : s));
    };
    const onUp = () => {
      const ds = dragStateRef.current;
      if (ds && (Math.abs(ds.dxPct) > 0.05 || Math.abs(ds.dyPct) > 0.05)) {
        onMovePlacement(ds.placementId, { dxPct: ds.dxPct, dyPct: ds.dyPct });
      }
      setDragState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragActive, rect, onMovePlacement]);

  const onHandleMouseDown = (
    e: React.MouseEvent,
    p: BoothPlacement,
    handle: HandleId,
  ) => {
    e.stopPropagation();
    // preventDefault: 핸들은 이미 선택된 핀에서만 보이므로 click 폴백 selection 경로가
    // 필요 없고, 텍스트 드래그 선택 등 native default 가 거추장스러워 일관되게 차단.
    e.preventDefault();
    setResizeState({
      placementId: p.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origin: { x: p.x, y: p.y, width: p.width, height: p.height },
      next: { x: p.x, y: p.y, width: p.width, height: p.height },
    });
  };

  const isResizeActive = resizeState !== null;
  useEffect(() => {
    if (!isResizeActive || !rect) return;
    const MIN = 1; // 최소 1% × 1%
    const onMove = (e: MouseEvent) => {
      const rs = resizeStateRef.current;
      if (!rs) return;
      const dxPct = ((e.clientX - rs.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - rs.startClientY) / rect.height) * 100;
      const o = rs.origin;
      // 핀은 중심좌표 기준이므로 좌상단 기준 좌표로 변환 후 다시 중심으로 환산.
      let leftPct = o.x - o.width / 2;
      let topPct = o.y - o.height / 2;
      let rightPct = o.x + o.width / 2;
      let bottomPct = o.y + o.height / 2;
      const h = rs.handle;
      if (h === 'nw' || h === 'w' || h === 'sw') leftPct = o.x - o.width / 2 + dxPct;
      if (h === 'ne' || h === 'e' || h === 'se') rightPct = o.x + o.width / 2 + dxPct;
      if (h === 'nw' || h === 'n' || h === 'ne') topPct = o.y - o.height / 2 + dyPct;
      if (h === 'sw' || h === 's' || h === 'se') bottomPct = o.y + o.height / 2 + dyPct;
      leftPct = Math.max(0, leftPct);
      topPct = Math.max(0, topPct);
      rightPct = Math.min(100, rightPct);
      bottomPct = Math.min(100, bottomPct);
      // overshoot 방지: 드래그하던 변이 반대 변을 추월하면 MIN 만큼의 폭에서 멈춤.
      // 안 그러면 width=MIN 이지만 중심이 반대편으로 튀어 핀이 "snap" 하는 인상.
      if (leftPct > rightPct - MIN)  leftPct = rightPct - MIN;
      if (topPct  > bottomPct - MIN) topPct  = bottomPct - MIN;
      const width = Math.max(MIN, rightPct - leftPct);
      const height = Math.max(MIN, bottomPct - topPct);
      const x = leftPct + width / 2;
      const y = topPct + height / 2;
      setResizeState((s) => (s ? { ...s, next: { x, y, width, height } } : s));
    };
    const onUp = () => {
      const rs = resizeStateRef.current;
      if (rs) onResizePlacement(rs.placementId, rs.next);
      setResizeState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizeActive, rect, onResizePlacement]);

  useEffect(() => {
    if (selectedPlacementId == null) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // 입력 필드 포커스 시엔 무시 — 폼 인풋이나 textarea 에서 화살표가 빨려가지 않도록.
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      const step = e.shiftKey ? 1 : 0.1;
      let dxPct = 0;
      let dyPct = 0;
      if (e.key === 'ArrowLeft')  dxPct = -step;
      else if (e.key === 'ArrowRight') dxPct = step;
      else if (e.key === 'ArrowUp')    dyPct = -step;
      else if (e.key === 'ArrowDown')  dyPct = step;
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRequestDelete(selectedPlacementId);
        return;
      } else if (e.key === 'Escape') {
        onSelectPlacement(null);
        return;
      } else {
        return;
      }
      e.preventDefault();
      onNudgePlacement(selectedPlacementId, { dxPct, dyPct });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedPlacementId, onNudgePlacement, onRequestDelete, onSelectPlacement]);

  // 추가 모드 ON + 운영자 선택 + rect 측정 완료 시에만 crosshair 로 affordance 표시.
  const cursorClass =
    isAddMode && selectedBoothId != null && rect ? 'cursor-crosshair' : '';

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-muted ${cursorClass}`}
      onClick={onContainerClick}
    >
      <img
        ref={imgRef}
        src={section.imageUrl}
        alt={section.label}
        onLoad={measure}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {rect && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          {placements.map((p) => {
            const isSelected = p.id === selectedPlacementId;
            const isInGroup = !isSelected && p.boothId === selectedBoothId;
            const isDragging = dragState?.placementId === p.id;
            const isResizing = resizeState?.placementId === p.id;
            const liveX = isDragging
              ? p.x + dragState!.dxPct
              : isResizing
              ? resizeState!.next.x
              : p.x;
            const liveY = isDragging
              ? p.y + dragState!.dyPct
              : isResizing
              ? resizeState!.next.y
              : p.y;
            const liveW = isResizing ? resizeState!.next.width : p.width;
            const liveH = isResizing ? resizeState!.next.height : p.height;
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => onPinMouseDown(e, p)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacement(p.id);
                }}
                style={{
                  left: `${liveX}%`,
                  top: `${liveY}%`,
                  width: `${liveW}%`,
                  height: `${liveH}%`,
                  minWidth: 8,
                  minHeight: 8,
                }}
                className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-md border-2 text-xs font-semibold shadow-sm transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/30 ring-2 ring-primary/40'
                    : isInGroup
                    ? 'border-ds-success-pressed bg-ds-success-subtle/70'
                    : 'border-border bg-background/60 hover:border-ds-border-strong'
                } ${isDragging ? 'cursor-grabbing' : ''}`}
                aria-label={`자리 ${p.boothNumber}`}
              >
                <span className="truncate">{p.boothNumber}</span>
                {isSelected && !isDragging && !isResizing && (
                  <>
                    {(Object.keys(HANDLE_OFFSETS) as HandleId[]).map((h) => {
                      const o = HANDLE_OFFSETS[h];
                      return (
                        <span
                          key={h}
                          onMouseDown={(e) => onHandleMouseDown(e, p, h)}
                          style={{
                            left: o.dx,
                            top: o.dy,
                            cursor: o.cursor,
                            transform: 'translate(-50%, -50%)',
                          }}
                          className="pointer-events-auto absolute h-2 w-2 rounded-sm border border-primary bg-background"
                          aria-label={`핸들 ${h}`}
                        />
                      );
                    })}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
