import type { BoothPlacementDTO } from '@/features/booth-layout/types';

/**
 * placement 목록을 다운로드 가능한 JSON Blob 으로 export.
 * surrogate id 는 백엔드 import 시 재생성되므로 제외.
 */
export function exportPlacementsAsJson(rows: BoothPlacementDTO[]): void {
  const stripped = rows.map(({ id: _id, ...rest }) => rest);
  const json = JSON.stringify(stripped, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  // toISOString 은 UTC 기준이라 KST 야간엔 하루 밀린다. 로컬 컴포넌트로 조립.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const a = document.createElement('a');
  a.href = url;
  a.download = `booth-placements-${yyyy}-${mm}-${dd}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
