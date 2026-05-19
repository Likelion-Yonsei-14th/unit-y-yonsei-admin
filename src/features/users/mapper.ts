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
 * BOOTH 역할은 boothName, PERFORMER 역할은 performanceName 을 백엔드 service 가
 * 필수로 검증한다(BOOTH_INFO_REQUIRED / PERFORMER_INFO_REQUIRED) — 역할에 맞춰
 * 함께 보낸다. 폼은 superRefine 으로 두 값을 이미 필수 검증하므로 여기 도달 시 존재.
 *
 * 나머지 운영 정보(boothSector / boothOperatingDate / performanceDate /
 * performanceLocationId / 시간 등)는 백엔드에선 모두 선택이라 미전송 — 폼 enum↔백엔드
 * 코드 매핑(날짜 다중선택↔1~3 정수 등)이 필요해 별도 정합 항목으로 남긴다.
 */
export const fromCreateUserFormValues = (v: CreateUserFormValues): CreateUserDTO => ({
  loginId: v.userId,
  password: v.tempPassword,
  organization: v.affiliation,
  role: roleToBackend(v.permissionType),
  representativeName: v.representativeName,
  representativePhone: v.representativePhone,
  memo: v.internalMemo,
  ...(v.permissionType === 'Booth' && v.boothName ? { boothName: v.boothName } : {}),
  ...(v.permissionType === 'Performer' && v.performanceTeamName
    ? { performanceName: v.performanceTeamName }
    : {}),
});

export const toCreatedUser = (d: CreatedUserDTO): CreatedUser => ({
  id: d.id,
  userId: d.loginId,
});
