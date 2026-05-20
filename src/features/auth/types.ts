import type { Role } from '@/types/role';

/** 로그인된 현재 사용자 정보 (프론트 모델) */
export interface CurrentUser {
  id: number;
  userId: string;
  role: Role;
  name: string;
  /** Booth 권한 사용자의 소속 부스 ID. 자기 부스만 수정 가능한지 판단용 */
  boothId?: number | null;
  /** Performer 권한 사용자의 소속 공연팀 ID */
  performanceTeamId?: number | null;
}

/**
 * 실제 백엔드 인증 응답 DTO.
 * `POST /admin/auth/login`(AdminLoginResponse) 와 `GET /admin/auth/me`
 * (CurrentAdminUserResponse) 가 동일 형태라 하나로 둔다.
 */
export interface AdminAuthDTO {
  adminUserId: number;
  loginId: string;
  organization: string;
  /** 'SUPER' | 'MASTER' | 'BOOTH' | 'PERFORMER' (대문자) */
  role: string;
  /** 계정 상태 — 'ACTIVE' 등 */
  status: string;
  representativeName: string;
  /** Booth 역할 계정일 때 본인 부스 ID. 백엔드 도입 전엔 undefined. */
  boothId?: number | null;
  /** Performer 역할 계정일 때 본인 공연팀 ID. */
  performanceTeamId?: number | null;
}

/** mock 전용 사용자 DTO. mock 데이터가 snake_case 라 별도 유지. */
export interface CurrentUserDTO {
  id: number;
  user_id: string;
  role: Role;
  name: string;
  booth_id?: number;
  performance_team_id?: number;
}

export interface LoginPayload {
  userId: string;
  password: string;
}

/** 본인 비밀번호 변경 요청 (PATCH /admin/auth/me/password). */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
