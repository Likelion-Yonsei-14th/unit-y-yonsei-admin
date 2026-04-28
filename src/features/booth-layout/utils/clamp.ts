/** 값을 [min, max] 범위로 제한. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
