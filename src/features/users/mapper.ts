import type { CreateUserFormValues } from './schema';
import type {
  AdminUser,
  AdminUserDTO,
  CreatedUser,
  CreatedUserDTO,
  CreateUserDTO,
} from './types';

export const toAdminUser = (d: AdminUserDTO): AdminUser => ({
  id: d.id,
  userId: d.user_id,
  role: d.role,
  affiliation: d.affiliation,
  boothName: d.booth_name,
  performanceTeamName: d.performance_team_name,
  representative: d.representative,
  email: d.email,
  phone: d.phone,
  infoCompleted: d.info_completed,
  active: d.active,
});

export const fromCreateUserFormValues = (v: CreateUserFormValues): CreateUserDTO => ({
  user_id: v.userId,
  temp_password: v.tempPassword,
  affiliation: v.affiliation,
  role: v.permissionType,
  representative_name: v.representativeName,
  representative_phone: v.representativePhone,
  booth_name: v.boothName?.trim() ? v.boothName.trim() : undefined,
  performance_team_name: v.performanceTeamName?.trim() ? v.performanceTeamName.trim() : undefined,
  internal_memo: v.internalMemo,
});

export const toCreatedUser = (d: CreatedUserDTO): CreatedUser => ({
  id: d.id,
  userId: d.user_id,
});
