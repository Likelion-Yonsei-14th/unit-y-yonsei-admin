/**
 * 백엔드 API 공통 타입.
 * 실제 백엔드 명세 확정 전까지는 일반적인 REST 패턴을 가정.
 * 명세가 확정되면 이 파일만 수정하면 됨.
 */

/** 페이지네이션 응답 컨테이너 (백엔드가 이 형태로 줄 가능성 높음) */
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/** 단건 조회 응답 */
export type DataResponse<T> = T;

/** 에러 응답 바디 */
export interface ErrorBody {
  message: string;
  code?: string;
  details?: Record<string, string[]>; // 필드별 유효성 에러
}

/** 공통 쿼리 파라미터 */
export interface ListQuery {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
}
