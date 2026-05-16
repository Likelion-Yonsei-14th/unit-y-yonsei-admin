/**
 * 부스 대표 이미지(3:2) 위에 이용자 목록 카드 썸네일(5:6) 크롭 영역을 표시하는 오버레이.
 *
 * 3:2 박스(가로:세로 = 1.5) 안에 세로로 꽉 찬 5:6 영역(0.8333)을 중앙 배치하면
 * 크롭 폭은 박스 가로의 (5/6) ÷ (3/2) ≈ 55.6%, 좌우로 각 22.22%씩 잘려나간다.
 * 순수 시각 표시 — pointer-events 없음. 부모는 position:relative 인 3:2 컨테이너여야 한다.
 */
const SIDE_MASK = '22.22%';

export function ThumbnailCropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* 좌우 — 목록 썸네일에서 잘려나가는 영역 */}
      <div className="absolute inset-y-0 left-0 bg-black/45" style={{ width: SIDE_MASK }} />
      <div className="absolute inset-y-0 right-0 bg-black/45" style={{ width: SIDE_MASK }} />
      {/* 가운데 — 5:6 크롭 영역 경계 */}
      <div
        className="absolute inset-y-0 border-2 border-dashed border-white/90"
        style={{ left: SIDE_MASK, right: SIDE_MASK }}
      />
      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
        썸네일 영역
      </div>
    </div>
  );
}
