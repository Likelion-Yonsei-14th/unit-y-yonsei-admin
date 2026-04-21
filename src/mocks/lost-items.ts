/**
 * 분실물 mock. lost-found.tsx / general-management.tsx 양쪽에서 사용.
 * description은 lost-found에서만 보여주므로 optional.
 */

export interface LostItem {
  id: number;
  name: string;
  location: string;
  date: string;
  hasImage: boolean;
  description?: string;
}

export const mockLostItems: LostItem[] = [
  { id: 1, name: '검은색 지갑', location: '중앙 무대 앞', date: '2026-04-14', hasImage: true, description: '현대카드가 들어있습니다' },
  { id: 2, name: 'iPhone 14 Pro', location: '부스 A-12', date: '2026-04-14', hasImage: false, description: '검은색 케이스' },
];
