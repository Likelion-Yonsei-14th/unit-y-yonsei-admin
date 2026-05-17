import type { Role } from '@/types/role';

/**
 * 유저 목록 화면에서 다루는 모델. user-management 페이지가 본다.
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
  /** 백엔드가 booth/performance join 으로 계산해 내려줄 플래그. */
  infoCompleted: boolean;
}

/**
 * 백엔드 어드민 목록 응답 DTO (AdminUserListResponse).
 *
 * ⚠️ boothName / performanceTeamName / email / phone / infoCompleted 는 백엔드가
 * 아직 안 내려준다 — 매퍼가 기본값으로 채운다 (백엔드 추가 요청 항목).
 */
export interface AdminUserDTO {
  id: number;
  loginId: string;
  /** 소속 (학과/동아리) */
  organization: string;
  /** 'SUPER' | 'MASTER' | 'BOOTH' | 'PERFORMER' */
  role: string;
  /** 'ACTIVE' | 'INACTIVE' */
  status: string;
  representativeName: string;
}

/** 신규 계정 생성 요청 (AdminUserCreateRequest). */
export interface CreateUserDTO {
  loginId: string;
  password: string;
  organization: string;
  /** 'SUPER' | 'MASTER' | 'BOOTH' | 'PERFORMER' */
  role: string;
  representativeName: string;
  representativePhone: string;
  memo: string;
}

/** 생성 결과 (AdminUserCreateResponse). */
export interface CreatedUserDTO {
  id: number;
  loginId: string;
  organization: string;
  role: string;
  status: string;
  representativeName: string;
  representativePhone: string;
  memo: string;
}
export interface CreatedUser {
  id: number;
  userId: string;
}

/**
 * 비밀번호 강제 재설정 응답.
 * 백엔드가 reset-password 엔드포인트를 구현 중 — 스키마 확정 시 갱신.
 */
export interface ResetPasswordDTO {
  temp_password: string;
}
export interface ResetPasswordResult {
  tempPassword: string;
}
