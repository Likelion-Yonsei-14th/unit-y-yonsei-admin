import { useCallback, useEffect, useRef } from 'react';

export type UndoAction = () => Promise<void> | void;

/**
 * 1단계 undo. recordUndo(fn) 으로 직전 동작의 역동작을 등록하면
 * Cmd/Ctrl+Z 시 한 번 실행 후 비워진다. 다단계 history 는 YAGNI.
 */
export function usePlacementUndo() {
  const lastUndoRef = useRef<UndoAction | null>(null);

  const recordUndo = useCallback((fn: UndoAction) => {
    lastUndoRef.current = fn;
  }, []);

  const triggerUndo = useCallback(async () => {
    const fn = lastUndoRef.current;
    if (!fn) return;
    lastUndoRef.current = null;
    await fn();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        void triggerUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerUndo]);

  return { recordUndo, triggerUndo };
}
