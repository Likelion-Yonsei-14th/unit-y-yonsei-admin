import { z } from 'zod';

/**
 * 환경변수 스키마. Vite는 VITE_ prefix가 붙은 것만 클라이언트에 노출.
 * .env.local에 정의하고 여기서 검증.
 */
const schema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('http://localhost:8080/api'),
  VITE_APP_NAME: z.string().default('대동제 어드민'),
  VITE_USE_MOCK: z
    .enum(['true', 'false'])
    .default('true')
    .transform(v => v === 'true'),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  // 모듈 로드 시점에 throw → 잘못된 설정으로 앱이 엉뚱하게 동작하는 것보다 fail-fast.
  // 화이트스크린을 본 개발자는 콘솔에서 아래 포맷된 에러를 바로 확인 가능.
  const formatted = parsed.error.format();
  console.error('[env] 환경변수 검증 실패:', formatted);
  throw new Error(
    `환경변수 검증 실패. .env.local 파일을 확인하세요. 상세: ${JSON.stringify(formatted)}`,
  );
}

export const env = {
  API_BASE_URL: parsed.data.VITE_API_BASE_URL,
  APP_NAME: parsed.data.VITE_APP_NAME,
  /** true이면 백엔드 대신 mock 데이터를 사용 */
  USE_MOCK: parsed.data.VITE_USE_MOCK,
} as const;
