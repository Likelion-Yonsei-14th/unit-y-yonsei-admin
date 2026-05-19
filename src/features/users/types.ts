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

  // ---- BOOTH 역할 전용 (역할이 BOOTH 일 때만 전송) ----
  /** 필수 — 백엔드 service 가 검증(BOOTH_INFO_REQUIRED). */
  boothName?: string;
  /** 선택 — '한글탑' | '백양로' | '송도' (백엔드 BoothSector enum). */
  boothSector?: string;
  /** 선택 — 축제 일차 2~4 (FestivalDayService: 2=5/27, 3=5/28, 4=5/29). */
  boothOperatingDate?: number;
  /** 선택 — 자리 후보 메모. */
  boothLocationMemo?: string;

  // ---- PERFORMER 역할 전용 (역할이 PERFORMER 일 때만 전송) ----
  /** 필수 — 백엔드 service 가 검증(PERFORMER_INFO_REQUIRED). */
  performanceName?: string;
  /** 선택 — 축제 일차 2~4. */
  performanceDate?: number;
  /** 선택 — 공연 장소 MapLocation id (1=언기도 앞, 2=노천극장, 3=동문광장). */
  performanceLocationId?: number;
  /** 선택 — 'HH:MM' (백엔드 LocalTime). */
  performanceStartTime?: string;
  /** 선택 — 'HH:MM'. */
  performanceEndTime?: string;
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
 * 비밀번호 강제 재설정 결과 (프론트 모델).
 * 백엔드 PATCH /admin/users/{id}/password 는 클라이언트가 보낸 비밀번호로 설정하고
 * 본문 없이 응답하므로, 프론트가 생성한 임시 비번을 그대로 담아 UI 에 노출한다.
 */
export interface ResetPasswordResult {
  tempPassword: string;
}
