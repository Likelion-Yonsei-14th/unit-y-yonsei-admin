import { describe, expect, it } from 'vitest';
import { hasPermission, PERMISSIONS, type Permission } from './permissions';
import type { Role } from '@/types/role';

/**
 * 권한 매트릭스는 운영 시점 보안의 1차 게이트라 회귀 무조건 잡아야 함.
 * 각 역할이 가져야 하는 / 가지면 안 되는 액션을 explicit 하게 검증.
 */
describe('hasPermission', () => {
  it('null/undefined 역할은 어떤 권한도 없음', () => {
    expect(hasPermission(null, 'user.read')).toBe(false);
    expect(hasPermission(undefined, 'booth.read')).toBe(false);
  });

  it('Super 는 모든 비-own 권한을 가진다 — *.own 은 자기소유 액션이라 역할별', () => {
    // *.own 은 본인 부스/공연팀 한정 액션이라 의도적으로 Super 에서도 제외.
    // Super 는 .any / .manage / .delete 같은 거버넌스 액션을 통해 작동.
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];
    const ownActions = allPermissions.filter((p) => p.endsWith('.own'));
    const nonOwn = allPermissions.filter((p) => !p.endsWith('.own'));
    for (const perm of nonOwn) {
      expect(hasPermission('Super', perm), `Super should have ${perm}`).toBe(true);
    }
    // 역으로 *.own 은 Super 에 없어야 함을 명시 (회귀 방지).
    for (const perm of ownActions) {
      expect(hasPermission('Super', perm), `Super should NOT have ${perm}`).toBe(false);
    }
  });

  it('Master 는 user.update.role / user.manage / admin.create / booth.delete 외 관리 권한을 가진다', () => {
    expect(hasPermission('Master', 'user.read')).toBe(true);
    expect(hasPermission('Master', 'user.deactivate')).toBe(true);
    expect(hasPermission('Master', 'booth.create')).toBe(true);
    expect(hasPermission('Master', 'reservation.manage')).toBe(true);
    expect(hasPermission('Master', 'performance.manage')).toBe(true);
    expect(hasPermission('Master', 'notice.manage')).toBe(true);

    // Master 가 가지면 안 되는 거버넌스 액션:
    expect(hasPermission('Master', 'user.update.role')).toBe(false);
    expect(hasPermission('Master', 'user.manage')).toBe(false);
    expect(hasPermission('Master', 'booth.delete')).toBe(false);
    expect(hasPermission('Master', 'admin.create')).toBe(false);
  });

  it('Booth 는 자기 부스 관련만, 전체 운영 액션은 못 한다', () => {
    expect(hasPermission('Booth', 'booth.read')).toBe(true);
    expect(hasPermission('Booth', 'booth.update.own')).toBe(true);
    expect(hasPermission('Booth', 'reservation.read')).toBe(true);
    expect(hasPermission('Booth', 'notice.read')).toBe(true);

    // 다른 부스 / 전체 관리는 절대 X.
    expect(hasPermission('Booth', 'booth.update.any')).toBe(false);
    expect(hasPermission('Booth', 'booth.delete')).toBe(false);
    expect(hasPermission('Booth', 'reservation.manage')).toBe(false);
    expect(hasPermission('Booth', 'user.read')).toBe(false);
    expect(hasPermission('Booth', 'performance.read')).toBe(false);
    expect(hasPermission('Booth', 'lostfound.read')).toBe(false);
  });

  it('Performer 는 자기 공연 관련만, 전체 운영 액션은 못 한다', () => {
    expect(hasPermission('Performer', 'performance.read')).toBe(true);
    expect(hasPermission('Performer', 'performance.update.own')).toBe(true);
    expect(hasPermission('Performer', 'notice.read')).toBe(true);

    expect(hasPermission('Performer', 'performance.manage')).toBe(false);
    expect(hasPermission('Performer', 'user.read')).toBe(false);
    expect(hasPermission('Performer', 'booth.read')).toBe(false);
    expect(hasPermission('Performer', 'reservation.read')).toBe(false);
  });

  it('admin.create 는 Super 단독', () => {
    const roles: Role[] = ['Super', 'Master', 'Booth', 'Performer'];
    for (const role of roles) {
      expect(hasPermission(role, 'admin.create')).toBe(role === 'Super');
    }
  });

  it('user.update.role 도 Super 단독 — Master 인라인 편집 가드 회귀 방지', () => {
    expect(hasPermission('Super', 'user.update.role')).toBe(true);
    expect(hasPermission('Master', 'user.update.role')).toBe(false);
    expect(hasPermission('Booth', 'user.update.role')).toBe(false);
    expect(hasPermission('Performer', 'user.update.role')).toBe(false);
  });
});
