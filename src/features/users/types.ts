import type { Role } from '@/types/role';

/**
 * 유저 목록 화면에서 다루는 모델. user-management 페이지가 본다.
 *
 * 백엔드 합류 전엔 mocks/users 의 MockUser 와 동등 — features 로 옮기면서 정식 모델로 승격.
 */
export interface AdminUser {
  id: number;
  userId: string;
  role: Role;
  affiliation: string;
  /** Booth 역할이면 부스명, 아니면 '-' */
  boothName: string;
  /** Performer 역할이면 공연팀명, 아니면 '-' */
  performanceTeamName: string;
  representative: string;
  email: string;
  phone: string;
  /** 백엔드가 booth/performance 테이블 join 으로 계산해 내려주는 플래그. */
  infoCompleted: boolean;
  /** 현재 로그인 가능 여부. */
  active: boolean;
}

export interface AdminUserDTO {
  id: number;
  user_id: string;
  role: Role;
  affiliation: string;
  booth_name: string;
  performance_team_name: string;
  representative: string;
  email: string;
  phone: string;
  info_completed: boolean;
  active: boolean;
}

/**
 * 백엔드로 보낼 신규 계정 생성 payload (snake_case DTO).
 *
 * 폼은 camelCase 로 다루고 (CreateUserFormValues), api 레이어에서 매핑한다.
 */
export interface CreateUserDTO {
  user_id: string;
  temp_password: string;
  affiliation: string;
  role: Role;
  representative_name: string;
  representative_phone: string;
  booth_name?: string;
  performance_team_name?: string;
  internal_memo: string;
}

/** 생성 결과 — 백엔드는 새 계정 id 와 user_id 를 돌려준다. */
export interface CreatedUserDTO {
  id: number;
  user_id: string;
}
export interface CreatedUser {
  id: number;
  userId: string;
}
