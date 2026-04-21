/**
 * 사용자 권한 역할 정의.
 * 피그마 산출물(CreateAdmin.tsx, UserManagement.tsx) 기준 4단계 체계.
 */
export type Role = 'Super' | 'Master' | 'Booth' | 'Performer';

export const ROLES: readonly Role[] = ['Super', 'Master', 'Booth', 'Performer'] as const;

export const ROLE_LABEL: Record<Role, string> = {
  Super: '슈퍼 어드민',
  Master: '마스터 어드민',
  Booth: '부스 운영자',
  Performer: '공연팀',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  Super: '모든 기능에 접근 가능한 최상위 관리자',
  Master: '일반 어드민. 유저/부스/공연/공지 등 운영 전반 관리',
  Booth: '자신의 부스 정보만 관리 가능',
  Performer: '자신의 공연 정보만 관리 가능',
};
