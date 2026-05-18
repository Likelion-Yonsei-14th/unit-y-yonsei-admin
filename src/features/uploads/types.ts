/**
 * 이미지 업로드 도메인 — presigned URL 요청의 `domain` 값.
 * S3 객체 키 prefix(`images/<domain>/...`)로 쓰인다.
 *
 * 값은 백엔드 `ALLOWED_ROLES_BY_DOMAIN` 키와 정확히 일치해야 한다 —
 * 백엔드 `normalizeDomain` 은 `trim().toLowerCase()` 만 하므로
 * **소문자 + 하이픈** 표기를 그대로 보내야 한다. (`LOST_ITEM` 같은
 * SCREAMING_CASE 를 보내면 `lost_item` 으로 정규화돼 키 불일치 →
 * INVALID_IMAGE_DOMAIN 예외가 난다.)
 */
export type UploadDomain = 'notice' | 'lost-item' | 'booth' | 'menu' | 'performance';

/** 백엔드 presigned URL 응답 (PresignedUrlCreateResponse). */
export interface PresignedUrlDTO {
  /** S3 에 PUT 할 임시 서명 URL (5분 만료). */
  uploadUrl: string;
  objectKey: string;
  /** 업로드 후 DB 에 저장 / 화면에 표시할 공개 이미지 URL. */
  imageUrl: string;
}
