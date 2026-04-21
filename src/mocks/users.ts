/**
 * 유저 관리 mock. 실제 백엔드 붙으면 features/users/types.ts의 Model로 대체.
 */

export interface MockUser {
  id: number;
  userId: string;
  role: string;
  affiliation: string;
  boothName: string;
  representative: string;
  email: string;
  phone: string;
  infoCompleted: boolean;
}

export interface MockInactiveUser extends MockUser {
  deactivatedDate: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    userId: 'munjeong_01',
    role: 'Booth',
    affiliation: '문헌정보학과',
    boothName: '취중떡담',
    representative: '정@@',
    email: '정@@',
    phone: '010-1234-1234',
    infoCompleted: true,
  },
  {
    id: 2,
    userId: 'cumputer_01',
    role: 'Performer',
    affiliation: '멋쟁이사자...',
    boothName: '해당없음',
    representative: '멋사OB',
    email: '정@@',
    phone: '010-1234-1234',
    infoCompleted: false,
  },
];

export const mockInactiveUsers: MockInactiveUser[] = [
  {
    id: 3,
    userId: 'inactive_user01',
    role: 'Booth',
    affiliation: '경영학과',
    boothName: '비활성 부스',
    representative: '김@@',
    email: 'kim@@',
    phone: '010-5678-5678',
    infoCompleted: true,
    deactivatedDate: '2026-04-10',
  },
];
