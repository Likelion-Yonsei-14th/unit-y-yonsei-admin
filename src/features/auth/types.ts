import type { Role } from '@/types/role';

/** 로그인된 현재 사용자 정보 (프론트 모델) */
export interface CurrentUser {
  id: number;
  userId: string;
  role: Role;
  name: string;
  /** Booth 권한 사용자의 소속 부스 ID. 자기 부스만 수정 가능한지 판단용 */
  boothId?: number;
  /** Performer 권한 사용자의 소속 공연팀 ID */
  performanceTeamId?: number;
}

/** 백엔드 /auth/me 응답 DTO. 실제 스키마 확정되면 수정. */
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

/** 백엔드 /auth/login 응답 DTO */
export interface LoginResultDTO {
  access_token?: string;
  refresh_token?: string;
  user: CurrentUserDTO;
}
