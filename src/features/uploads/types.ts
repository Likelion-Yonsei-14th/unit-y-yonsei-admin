/**
 * 이미지 업로드 도메인 — presigned URL 요청의 `domain` 값.
 * S3 객체 키 prefix(`images/<domain>/...`)로 쓰인다.
 *
 * ⚠️ 백엔드 스키마상 `domain` 은 자유 문자열 — 허용 값 셋은 백엔드와 확정 필요.
 */
export type UploadDomain = 'BOOTH' | 'MENU' | 'PERFORMANCE' | 'NOTICE' | 'LOST_ITEM';

/** 백엔드 presigned URL 응답 (PresignedUrlCreateResponse). */
export interface PresignedUrlDTO {
  /** S3 에 PUT 할 임시 서명 URL (5분 만료). */
  uploadUrl: string;
  objectKey: string;
  /** 업로드 후 DB 에 저장 / 화면에 표시할 공개 이미지 URL. */
  imageUrl: string;
}
