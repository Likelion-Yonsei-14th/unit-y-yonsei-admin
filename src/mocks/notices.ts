/**
 * 페이지에서 하드코딩해서 쓰던 mock 데이터를 뽑아둔 곳.
 * 백엔드 연결 시 features/notices/ 의 모델/훅으로 대체.
 */

export interface Notice {
  id: number;
  title: string;
  content: string;
  date: string;
  hasImage: boolean;
}

export const mockNotices: Notice[] = [
  { id: 1, title: '2026 대동제 일정 안내', content: '5/27 국제캠퍼스, 5/28~29 신촌캠퍼스에서 진행됩니다.', date: '2026-04-10', hasImage: true },
  { id: 2, title: '부스 운영 시간 변경 안내', content: '우천으로 인해 부스 운영 시간이 변경되었습니다.', date: '2026-04-12', hasImage: false },
];
