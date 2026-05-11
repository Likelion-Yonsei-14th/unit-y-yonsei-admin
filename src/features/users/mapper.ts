import type { CreateUserFormValues } from './schema';
import type {
  AdminUser,
  AdminUserDTO,
  CreatedUser,
  CreatedUserDTO,
  CreateUserDTO,
  ResetPasswordDTO,
  ResetPasswordResult,
} from './types';

export const toAdminUser = (d: AdminUserDTO): AdminUser => ({
  id: d.id,
  userId: d.user_id,
  role: d.role,
  affiliation: d.affiliation,
  boothId: d.booth_id,
  boothName: d.booth_name,
  performanceTeamId: d.performance_team_id,
  performanceTeamName: d.performance_team_name,
  representative: d.representative,
  email: d.email,
  phone: d.phone,
  infoCompleted: d.info_completed,
});

/** 빈 문자열은 백엔드에 `undefined` 로 보냄 — 누락과 빈 값을 같게 취급. */
const trimOrUndefined = (s: string | undefined): string | undefined => {
  const v = s?.trim();
  return v ? v : undefined;
};

export const fromCreateUserFormValues = (v: CreateUserFormValues): CreateUserDTO => ({
  user_id: v.userId,
  temp_password: v.tempPassword,
  affiliation: v.affiliation,
  role: v.permissionType,
  representative_name: v.representativeName,
  representative_phone: v.representativePhone,
  booth_name: trimOrUndefined(v.boothName),
  performance_team_name: trimOrUndefined(v.performanceTeamName),
  internal_memo: v.internalMemo,
  // 권한별로 어울리는 영역만 보냄. Master/Super 권한이면 둘 다 비움.
  ...(v.permissionType === 'Booth'
    ? {
        booth_campus: v.boothCampus,
        // 빈 배열은 누락과 동일 취급 — undefined 로 보내 백엔드가 'no preference'
        // 로 해석하게.
        booth_operating_dates: v.boothOperatingDates?.length ? v.boothOperatingDates : undefined,
        booth_location_note: trimOrUndefined(v.boothLocationNote),
      }
    : {}),
  ...(v.permissionType === 'Performer'
    ? {
        performance_date: trimOrUndefined(v.performanceDate),
        performance_stage: v.performanceStage,
        performance_start_time: trimOrUndefined(v.performanceStartTime),
        performance_end_time: trimOrUndefined(v.performanceEndTime),
      }
    : {}),
});

export const toCreatedUser = (d: CreatedUserDTO): CreatedUser => ({
  id: d.id,
  userId: d.user_id,
});

export const toResetPasswordResult = (d: ResetPasswordDTO): ResetPasswordResult => ({
  tempPassword: d.temp_password,
});
