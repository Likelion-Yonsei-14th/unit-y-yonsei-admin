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
  /** Booth 역할이면 보유 부스 id. picker / 좌표 / 예약 페이지가 이 값으로 매칭. */
  boothId: number | null;
  /** Booth 역할이면 부스명, 아니면 '-' (표시용). */
  boothName: string;
  /** Performer 역할이면 보유 공연팀 id. */
  performanceTeamId: number | null;
  /** Performer 역할이면 공연팀명, 아니면 '-' (표시용). */
  performanceTeamName: string;
  representative: string;
  email: string;
  phone: string;
  /** 백엔드가 booth/performance 테이블 join 으로 계산해 내려주는 플래그. */
  infoCompleted: boolean;
}

export interface AdminUserDTO {
  id: number;
  user_id: string;
  role: Role;
  affiliation: string;
  booth_id: number | null;
  booth_name: string;
  performance_team_id: number | null;
  performance_team_name: string;
  representative: string;
  email: string;
  phone: string;
  info_completed: boolean;
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
  // ---- 선택 입력 운영 정보 — Booth/Performer 의 초기 프로필 시드. ----
  // 백엔드는 이 값들로 booth_profile / performance_detail 행을 같이 채워서 만든다.
  // 비어 있으면 본인 또는 운영진이 후속 화면에서 채움.
  booth_campus?: 'global' | 'baekyang' | 'hangeul';
  booth_operating_dates?: string[];
  booth_location_note?: string;
  performance_date?: string;
  performance_stage?: 'songdo' | 'dongmoon' | 'nocheon';
  performance_start_time?: string;
  performance_end_time?: string;
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
