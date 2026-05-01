/**
 * 공연 후기 — 관객이 남긴 메시지 + 가장 좋았던 곡.
 */
export interface Review {
  id: number;
  performanceTeam: string;
  favoriteSong: string;
  message: string;
  /** "yyyy-mm-dd HH:mm" — 통계용으로만 쓰여 시간대 보정은 보류. */
  createdAt: string;
  /** 관리자가 운영 중 숨김 처리한 후기. 사용자 페이지에는 노출되지 않음. */
  isHidden: boolean;
}

export interface ReviewDTO {
  id: number;
  performance_team: string;
  favorite_song: string;
  message: string;
  created_at: string;
  is_hidden: boolean;
}
