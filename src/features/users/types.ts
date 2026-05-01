import type { Role } from '@/types/role';

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
