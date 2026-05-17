import { roleFromBackend, roleToBackend } from '@/types/role';
import type { CreateUserFormValues } from './schema';
import type { AdminUser, AdminUserDTO, CreatedUser, CreatedUserDTO, CreateUserDTO } from './types';

/**
 * 백엔드 목록 DTO → AdminUser.
 *
 * boothName / performanceTeamName / email / phone / infoCompleted 는 백엔드
 * 응답(AdminUserListResponse)에 없어 기본값으로 채운다. 백엔드가 해당 필드를
 * 추가하면 이 매퍼만 갱신하면 된다.
 */
export const toAdminUser = (d: AdminUserDTO): AdminUser => ({
  id: d.id,
  userId: d.loginId,
  role: roleFromBackend(d.role),
  affiliation: d.organization,
  representative: d.representativeName,
  boothId: null,
  boothName: '-',
  performanceTeamId: null,
  performanceTeamName: '-',
  email: '',
  phone: '',
  infoCompleted: false,
});

/**
 * 계정 생성 폼 → 백엔드 생성 요청(AdminUserCreateRequest).
 *
 * 폼의 운영 정보(boothCampus / boothOperatingDates / performance* 등)는 현재
 * 백엔드 생성 엔드포인트가 받지 않아 전송하지 않는다 (백엔드 협의 항목).
 */
export const fromCreateUserFormValues = (v: CreateUserFormValues): CreateUserDTO => ({
  loginId: v.userId,
  password: v.tempPassword,
  organization: v.affiliation,
  role: roleToBackend(v.permissionType),
  representativeName: v.representativeName,
  representativePhone: v.representativePhone,
  memo: v.internalMemo,
});

export const toCreatedUser = (d: CreatedUserDTO): CreatedUser => ({
  id: d.id,
  userId: d.loginId,
});
