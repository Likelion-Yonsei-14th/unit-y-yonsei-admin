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

/**
 * 실제 백엔드 인증 응답 DTO.
 * `POST /admin/auth/login`(AdminLoginResponse) 와 `GET /admin/auth/me`
 * (CurrentAdminUserResponse) 가 동일 형태라 하나로 둔다.
 *
 * ⚠️ boothId / performanceTeamId 가 없음 — Booth/Performer 사용자가 자기 부스·
 * 공연팀을 join 하려면 백엔드가 응답에 추가해 줘야 한다 (백엔드 요청 항목).
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
