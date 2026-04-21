/**
 * 인증 전략 추상화.
 *
 * 백엔드 인증 방식이 아직 미정이므로, API 클라이언트는 이 인터페이스에만 의존.
 * 방식이 확정되면 구현체만 교체하면 됨 (JwtStrategy, SessionCookieStrategy 등).
 *
 * 교체 지점: 이 파일 맨 아래의 `export const authStrategy = ...` 한 줄.
 */

export interface LoginResponse {
  /** JWT 방식인 경우 토큰. 세션 방식이면 undefined */
  accessToken?: string;
  /** refresh token. 필요한 전략에서만 사용 */
  refreshToken?: string;
}

export interface AuthStrategy {
  /** 요청 헤더에 인증 정보 부착 */
  attachAuth(headers: Headers): void;
  /** 로그인 성공 응답을 받아서 저장 */
  persistLogin(res: LoginResponse): void;
  /** 로그아웃: 저장된 인증 정보 제거 */
  clearAuth(): void;
  /** 현재 저장된 토큰 (없으면 null) */
  getStoredToken(): string | null;
  /** 이 전략이 fetch에서 credentials: 'include'를 필요로 하는가 */
  readonly needsCredentials: boolean;
}

// ---- 구현체 ----

/**
 * JWT: Authorization 헤더에 Bearer 토큰 부착, localStorage에 저장.
 */
class JwtStrategy implements AuthStrategy {
  private readonly KEY = 'daedongje.access_token';
  readonly needsCredentials = false;

  attachAuth(headers: Headers): void {
    const token = this.getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  persistLogin(res: LoginResponse): void {
    if (res.accessToken) {
      localStorage.setItem(this.KEY, res.accessToken);
    }
  }

  clearAuth(): void {
    localStorage.removeItem(this.KEY);
  }

  getStoredToken(): string | null {
    return localStorage.getItem(this.KEY);
  }
}

/**
 * 세션 쿠키: 브라우저가 자동으로 쿠키 전송. credentials: 'include' 필요.
 * (현재는 참고용, 활성화 시 export const authStrategy = new SessionCookieStrategy() 로 교체)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class SessionCookieStrategy implements AuthStrategy {
  readonly needsCredentials = true;

  attachAuth(_headers: Headers): void {
    // 쿠키는 브라우저가 자동 전송. 별도 처리 불필요.
  }
  persistLogin(_res: LoginResponse): void {
    // 서버가 Set-Cookie로 처리. 클라에서 할 일 없음.
  }
  clearAuth(): void {
    // 실제 로그아웃은 서버의 /logout 엔드포인트 호출이 담당.
  }
  getStoredToken(): null {
    return null;
  }
}

/**
 * ⭐ 인증 전략 주입 지점.
 * 백엔드 방식이 확정되면 이 한 줄만 교체.
 */
export const authStrategy: AuthStrategy = new JwtStrategy();
