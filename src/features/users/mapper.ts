import { roleFromBackend, roleToBackend } from '@/types/role';
import { dayForDate } from '@/features/booth-layout/sections';
import type { CreateUserFormValues } from './schema';
import type { AdminUser, AdminUserDTO, CreatedUser, CreatedUserDTO, CreateUserDTO } from './types';

/** 폼 캠퍼스 enum → 백엔드 BoothSector enum 문자열. */
const SECTOR_BY_CAMPUS: Record<'global' | 'baekyang' | 'hangeul', string> = {
  global: '송도',
  baekyang: '백양로',
  hangeul: '한글탑',
};

/** 폼 스테이지 enum → 백엔드 공연장 MapLocation id (백엔드 @Schema 라벨 기준). */
const LOCATION_ID_BY_STAGE: Record<'songdo' | 'dongmoon' | 'nocheon', number> = {
  songdo: 1, // 언기도 앞
  nocheon: 2, // 노천극장
  dongmoon: 3, // 동문광장
};

/**
 * 백엔드 목록 DTO → AdminUser.
 *
 * infoCompleted·연결 부스/공연은 백엔드 AdminUserListResponse 에서 그대로 읽는다.
 * email / phone 은 목록 응답에 없어 기본값('')으로 둔다.
 */
export const toAdminUser = (d: AdminUserDTO): AdminUser => {
  // 부스↔어드민은 1:1 — 목록 응답은 배열로 주지만 첫 원소만 표시에 쓴다.
  const booth = d.linkedBooths?.[0] ?? null;
  return {
    id: d.id,
    userId: d.loginId,
    role: roleFromBackend(d.role),
    affiliation: d.organization,
    representative: d.representativeName,
    boothId: booth?.id ?? null,
    boothName: booth?.name ?? '-',
    performanceTeamId: d.linkedPerformance?.id ?? null,
    performanceTeamName: d.linkedPerformance?.performanceName ?? '-',
    // email / phone 은 목록 응답에 없다.
    email: '',
    phone: '',
    infoCompleted: d.infoCompleted ?? false,
  };
};

/**
 * 계정 생성 폼 → 백엔드 생성 요청(AdminUserCreateRequest).
 *
 * 공통 7필드 + 역할별 운영 필드를 보낸다. BOOTH 는 boothName, PERFORMER 는
 * performanceName 이 백엔드 service 필수 검증 대상(BOOTH_INFO_REQUIRED /
 * PERFORMER_INFO_REQUIRED) — 폼 superRefine 이 이미 필수 검증하므로 여기 도달 시 존재.
 * 나머지 운영 필드는 백엔드에서 모두 선택이라 폼에 입력됐을 때만 전송한다.
 *
 * 운영일은 폼의 ISO 날짜를 dayForDate 로 축제 일차 정수(2~4)로 변환해 보낸다 —
 * 백엔드 FestivalDayService 정의(2=5/27, 3=5/28, 4=5/29)와 Booth.date 가 동일 체계.
 */
export const fromCreateUserFormValues = (v: CreateUserFormValues): CreateUserDTO => {
  const base: CreateUserDTO = {
    loginId: v.userId,
    password: v.tempPassword,
    organization: v.affiliation,
    role: roleToBackend(v.permissionType),
    representativeName: v.representativeName,
    representativePhone: v.representativePhone,
    memo: v.internalMemo,
  };

  if (v.permissionType === 'Booth') {
    return {
      ...base,
      ...(v.boothName ? { boothName: v.boothName } : {}),
      ...(v.boothCampus ? { boothSector: SECTOR_BY_CAMPUS[v.boothCampus] } : {}),
      ...(v.boothOperatingDate
        ? { boothOperatingDate: dayForDate(v.boothOperatingDate) ?? undefined }
        : {}),
      ...(v.boothLocationNote ? { boothLocationMemo: v.boothLocationNote } : {}),
    };
  }

  if (v.permissionType === 'Performer') {
    return {
      ...base,
      ...(v.performanceTeamName ? { performanceName: v.performanceTeamName } : {}),
      ...(v.performanceDate ? { performanceDate: dayForDate(v.performanceDate) ?? undefined } : {}),
      ...(v.performanceStage
        ? { performanceLocationId: LOCATION_ID_BY_STAGE[v.performanceStage] }
        : {}),
      ...(v.performanceStartTime ? { performanceStartTime: v.performanceStartTime } : {}),
      ...(v.performanceEndTime ? { performanceEndTime: v.performanceEndTime } : {}),
    };
  }

  return base;
};

export const toCreatedUser = (d: CreatedUserDTO): CreatedUser => ({
  id: d.id,
  userId: d.loginId,
});
