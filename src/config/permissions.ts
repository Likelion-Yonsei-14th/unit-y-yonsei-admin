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
  // 역할 변경은 Super만. Super ↔ 다른 역할 전이는 시스템 전반에 파급이 커
  // 거버넌스 액션으로 취급. 인라인 Select 편집 가드로 사용.
  'user.update.role': ['Super'],
  // 비밀번호 강제 재설정 — 임시 비번 재발급. 사용자 본인이 못 들어오는 상황을
  // 운영진이 즉시 풀어주는 액션이라 Master 까지 허용.
  'user.password.reset': ['Super', 'Master'],

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
  // 라이브 공연 수동 지정 — 운영 단일 책임이라 Super 만.
  'performance.live': ['Super'],

  // 공지
  'notice.read': ['Super', 'Master', 'Booth', 'Performer'],
  'notice.manage': ['Super', 'Master'],

  // 분실물 — 등록은 부스 운영진도 가능(자기 부스에서 주운 물건 제보).
  // 목록 열람·수정·삭제는 운영진(Super/Master)만.
  'lostfound.read': ['Super', 'Master'],
  'lostfound.create': ['Super', 'Master', 'Booth'],
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
