/**
 * 부스 핀의 borderRadius 를 짧은 변에 비례해 결정.
 *
 * 백양로(1:3.55) 같이 캔버스 종횡비가 길쭉한 섹션에서는 핀의 css 폭이 한 자리수
 * 픽셀까지 줄어 고정 6px 곡률이 변보다 커져 타원처럼 렌더되던 문제가 있었다.
 * 짧은 변의 20% 까지만 곡률을 허용해 사각형 형태를 유지하고, 픽셀 여유가 있는
 * 섹션(한글탑/송도) 은 기존 6px 캡으로 동일하게 동작.
 *
 * view 캔버스(booth-map-canvas) 와 편집기(placement-editor-canvas) 양쪽이
 * 같은 규칙을 공유해야 표시 일관성이 깨지지 않으므로 한 곳에 모은다.
 */
export function computePinRadius(pxW: number, pxH: number): number {
  const shorter = Math.min(pxW, pxH);
  return Math.max(0, Math.min(6, shorter * 0.2));
}
