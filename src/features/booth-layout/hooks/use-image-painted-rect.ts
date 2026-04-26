import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UseImagePaintedRectOptions {
  /** 우선 적용할 이미지 종횡비 (W/H). 미지정 시 imgRef 의 naturalWidth/Height 로 fallback. */
  aspectRatio?: number;
  /** aspectRatio 미지정 시 fallback 으로 쓰일 이미지 ref. */
  imgRef?: RefObject<HTMLImageElement | null>;
  /** rect 재계산을 트리거하는 의존성 (예: 활성 섹션 id). */
  reMeasureKey?: unknown;
}

/**
 * object-contain 이미지의 letterbox 제외 painted rect 를 container 기준으로 계산.
 * pin overlay 정합용.
 */
export function useImagePaintedRect(
  containerRef: RefObject<HTMLElement | null>,
  options: UseImagePaintedRectOptions,
): { rect: ImageRect | null; measure: () => void } {
  const { aspectRatio, imgRef, reMeasureKey } = options;
  const [rect, setRect] = useState<ImageRect | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      setRect(null);
      return;
    }
    const img = imgRef?.current;
    const aspect =
      aspectRatio && aspectRatio > 0
        ? aspectRatio
        : img && img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : null;
    if (!aspect) {
      setRect(null);
      return;
    }
    const containerAspect = box.width / box.height;
    let width: number;
    let height: number;
    let left: number;
    let top: number;
    if (containerAspect > aspect) {
      // 가로 letterbox.
      height = box.height;
      width = height * aspect;
      left = (box.width - width) / 2;
      top = 0;
    } else {
      // 상하 letterbox.
      width = box.width;
      height = width / aspect;
      left = 0;
      top = (box.height - height) / 2;
    }
    setRect({ left, top, width, height });
  }, [containerRef, aspectRatio, imgRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, measure]);

  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(raf);
  }, [measure, reMeasureKey]);

  return { rect, measure };
}
