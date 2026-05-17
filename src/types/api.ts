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

/**
 * 백엔드 공통 응답 봉투.
 * 실제 백엔드는 모든 JSON 응답을 이 형태로 감싼다 — `api-client.ts` 가 `data` 를
 * 벗겨 도메인 코드에 넘기고, `success=false` 또는 `error` 면 ApiError 를 던진다.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: ApiErrorBody | null;
}

/** 봉투 안의 에러 객체 (백엔드 ApiError). `details` 같은 필드 단위 에러는 없음. */
export interface ApiErrorBody {
  code: string;
  message: string;
}

/** 공통 쿼리 파라미터 */
export interface ListQuery {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
}
