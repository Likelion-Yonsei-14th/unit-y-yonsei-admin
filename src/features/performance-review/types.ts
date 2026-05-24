/**
 * 공연 후기 — 관객이 남긴 메시지 + 가장 좋았던 곡.
 */
export interface Review {
  id: number;
  performanceTeam: string;
  /** 가장 좋았던 곡. 셋리스트 미선택 메시지는 null — 표시 라벨은 화면 레이어에서. */
  favoriteSong: string | null;
  message: string;
  /** "yyyy-mm-dd HH:mm" — 통계용으로만 쓰여 시간대 보정은 보류. */
  createdAt: string;
  /** 관리자가 운영 중 숨김 처리한 후기. 사용자 페이지에는 노출되지 않음. */
  isHidden: boolean;
}

/**
 * 백엔드 `PerformanceCheerMessageResponse` (공연 응원 메시지) 원형.
 * 이 도메인 응답은 다른 도메인과 달리 **camelCase** 로 내려온다.
 * GET /api/admin/performances/cheer-messages (SUPER·MASTER, 전 팀 전 상태).
 */
export interface ReviewDTO {
  id: number;
  performanceId: number;
  /** 공연(팀) 이름 → performanceTeam */
  performanceName: string;
  setlistId: number | null;
  singerName: string | null;
  /** 곡명 → favoriteSong. 메시지에 셋리스트 미선택 시 null. */
  songTitle: string | null;
  message: string;
  displayStatus: 'VISIBLE' | 'HIDDEN';
  /** "yyyy-MM-dd HH:mm" */
  createdAt: string;
}
