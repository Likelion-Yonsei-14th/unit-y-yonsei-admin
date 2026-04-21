import type { Role } from '@/types/role';

/**
 * 권한(액션) → 허용되는 역할 매핑.
 *
 * 규칙:
 * - Super: 전부 허용
 * - Master: 관리 업무 전반 (유저 최종 관리는 Super만)
 * - Booth: 자기 부스 관련만 읽기/수정
 * - Performer: 자기 공연 관련만 읽기/수정
 *
 * 운영진 합의되면 이 파일만 수정.
 */
export const PERMISSIONS = {
  // 유저
  'user.read': ['Super', 'Master'],
  'user.manage': ['Super'],
  'user.deactivate': ['Super', 'Master'],

  // 부스
  'booth.read': ['Super', 'Master', 'Booth'],
  'booth.create': ['Super', 'Master'],
  'booth.update.any': ['Super', 'Master'],
  'booth.update.own': ['Booth'],
  'booth.delete': ['Super'],

  // 예약
  'reservation.read': ['Super', 'Master', 'Booth'],
  'reservation.manage': ['Super', 'Master'],

  // 공연
  'performance.read': ['Super', 'Master', 'Performer'],
  'performance.manage': ['Super', 'Master'],
  'performance.update.own': ['Performer'],

  // 공지
  'notice.read': ['Super', 'Master', 'Booth', 'Performer'],
  'notice.manage': ['Super', 'Master'],

  // 분실물
  'lostfound.read': ['Super', 'Master'],
  'lostfound.manage': ['Super', 'Master'],

  // 부스 배치도
  'boothlayout.read': ['Super', 'Master'],
  'boothlayout.manage': ['Super', 'Master'],

  // 공연 후기
  'performancereview.read': ['Super', 'Master'],
  'performancereview.manage': ['Super', 'Master'],

  // 어드민 생성
  'admin.create': ['Super'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * 특정 역할이 특정 권한을 가지는지 검사.
 */
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
