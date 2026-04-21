import { authStrategy } from './auth-strategy';
import { env } from './env';
import type { ErrorBody } from '@/types/api';

/**
 * API 요청 중 발생한 HTTP 에러.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ErrorBody | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** 서버가 보낸 필드별 에러 메시지 (form.setError에 바로 쓸 수 있도록) */
  get fieldErrors(): Record<string, string[]> | undefined {
    return this.body?.details;
  }
}

/**
 * 401(Unauthorized) 응답 시 호출될 콜백.
 * 기본은 로그인 페이지로 리다이렉트하지만,
 * 라우터가 마운트된 이후에는 features/auth/store.ts에서 교체됨.
 */
let onUnauthorized: () => void = () => {
  authStrategy.clearAuth();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type Body = unknown;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Body;
  /** true이면 자동 JSON 직렬화/파싱 스킵 (파일 업로드 등) */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, raw, ...init } = options;
  const headers = new Headers(init.headers);

  if (!raw) {
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
  }
  authStrategy.attachAuth(headers);

  const url = path.startsWith('http') ? path : `${env.API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: authStrategy.needsCredentials ? 'include' : 'same-origin',
    body: body === undefined
      ? undefined
      : raw
        ? (body as BodyInit)
        : JSON.stringify(body),
  });

  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError(401, 'Unauthorized', null);
  }

  if (!res.ok) {
    let errorBody: ErrorBody | null = null;
    try {
      errorBody = await res.json();
    } catch {
      // 빈 응답 또는 JSON이 아닌 응답
    }
    throw new ApiError(
      res.status,
      errorBody?.message ?? res.statusText ?? `HTTP ${res.status}`,
      errorBody,
    );
  }

  // 204 No Content 등 본문이 없을 때
  if (res.status === 204) {
    return undefined as T;
  }

  if (raw) {
    return res as unknown as T;
  }
  return res.json() as Promise<T>;
}

/** 얇은 HTTP 래퍼. 도메인 api.ts는 이것만 사용. */
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: Body, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body: Body, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body: Body, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
