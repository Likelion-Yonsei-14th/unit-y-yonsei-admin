/**
 * 공연(Performance) 도메인 모델.
 *
 * 한 공연팀(= team) 당 한 Performance 엔티티. 관객용 리스트에는 대표 이미지·팀명·시간·
 * 스테이지만 노출하고, 셋리스트·소개·SNS 같은 상세 정보는 상세 화면에서만 본다.
 * 어드민에서는 Super/Master 가 전체 목록을, Performer 는 본인 팀 상세만 본다.
 */

// ---- 공연 스테이지 ----
// 축제 현장 운영을 기준으로 잡은 **임시** 스테이지 ID. 실제 무대 구성이 확정되면
// 이 union + STAGES 레이블·기본 날짜만 맞추면 나머지는 따라 온다.

export type PerformanceStage = 'songdo' | 'baekyang' | 'nocheon';

export interface PerformanceStageMeta {
  id: PerformanceStage;
  label: string;
  /** 해당 스테이지가 운영되는 날짜 (YYYY-MM-DD). 필터 선택지 제한·유효성 판정에 사용. */
  dates: string[];
}

export const PERFORMANCE_STAGES: Record<PerformanceStage, PerformanceStageMeta> = {
  songdo:   { id: 'songdo',   label: '송도 메인스테이지', dates: ['2026-05-27'] },
  baekyang: { id: 'baekyang', label: '백양로 메인스테이지', dates: ['2026-05-28', '2026-05-29'] },
  nocheon:  { id: 'nocheon',  label: '노천극장', dates: ['2026-05-28', '2026-05-29'] },
};

// ---- 상세 서브 엔티티 ----

export interface SetlistItem {
  id: number;
  order: number;
  songName: string;
  artist: string;
}

export interface PerformanceImage {
  id: number;
  url: string;
  /** 대표 이미지 여부. 한 팀당 0~1장. 관객 리스트 썸네일은 이 이미지만 사용. */
  isMain: boolean;
}

// ---- 프론트 모델 (camelCase) ----

/**
 * 리스트 카드에 필요한 경량 모델. 상세(PerformanceDetail)의 부분집합.
 * 무거운 필드(description/setlist/images 전체) 는 상세 쿼리에서만 로드.
 */
export interface PerformanceListItem {
  teamId: number;
  teamName: string;
  date: string;          // 'YYYY-MM-DD'
  stage: PerformanceStage;
  startTime: string;     // 'HH:mm'
  endTime: string;       // 'HH:mm'
  mainPhotoUrl: string | null;
}

export interface PerformanceDetail {
  teamId: number;
  teamName: string;
  description: string;
  instagramUrl: string;
  youtubeUrl: string;
  date: string;          // 'YYYY-MM-DD'
  stage: PerformanceStage;
  startTime: string;     // 'HH:mm'
  endTime: string;       // 'HH:mm'
  images: PerformanceImage[];
  setlist: SetlistItem[];
}

// ---- 백엔드 응답 DTO (snake_case). 스키마 확정되면 보정. ----

export interface SetlistItemDTO {
  id: number;
  order: number;
  song_name: string;
  artist: string;
}

export interface PerformanceImageDTO {
  id: number;
  url: string;
  is_main: boolean;
}

export interface PerformanceListItemDTO {
  team_id: number;
  team_name: string;
  date: string;
  stage: PerformanceStage;
  start_time: string;
  end_time: string;
  main_photo_url: string | null;
}

export interface PerformanceDetailDTO {
  team_id: number;
  team_name: string;
  description: string;
  instagram_url: string;
  youtube_url: string;
  date: string;
  stage: PerformanceStage;
  start_time: string;
  end_time: string;
  images: PerformanceImageDTO[];
  setlist: SetlistItemDTO[];
}
