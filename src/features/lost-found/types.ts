/**
 * 분실물 도메인 모델.
 */
export interface LostItem {
  id: number;
  name: string;
  /** 발견 위치 — 자유 텍스트("중앙 무대 앞"). */
  location: string;
  /** 등록 일자 — yyyy-mm-dd. */
  date: string;
  /** 첨부 사진의 공개 URL. 없으면 undefined. */
  imageUrl?: string;
  /** 보충 설명 (선택). */
  description?: string;
}

export interface LostItemDTO {
  id: number;
  name: string;
  location: string;
  date: string;
  image_url?: string;
  description?: string;
}

export interface CreateLostItemInput {
  name: string;
  location: string;
  description?: string;
  imageUrl?: string;
}

export interface UpdateLostItemInput extends CreateLostItemInput {
  id: number;
}
