/**
 * 총학생회 공지사항 도메인 모델.
 *
 * 카드뉴스(인스타그램 스타일) + 본문 한 쌍이 단위.
 */
export interface Notice {
  id: number;
  title: string;
  content: string;
  /** 등록일자 — yyyy-mm-dd. */
  date: string;
  /** 카드뉴스 이미지 첨부 여부. 실제 URL 은 별도 필드/엔드포인트로 분리될 수 있음. */
  hasImage: boolean;
}

// ---- 백엔드 DTO (snake_case). 스키마 확정 전까지는 Model 과 거의 동일. ----

export interface NoticeDTO {
  id: number;
  title: string;
  content: string;
  date: string;
  has_image: boolean;
}

export interface CreateNoticeInput {
  title: string;
  content: string;
  hasImage: boolean;
}

export interface UpdateNoticeInput {
  id: number;
  title: string;
  content: string;
  hasImage: boolean;
}
