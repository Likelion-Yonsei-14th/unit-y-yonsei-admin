import { z } from 'zod';

/**
 * 환경변수 스키마. Vite는 VITE_ prefix가 붙은 것만 클라이언트에 노출.
 * .env.local에 정의하고 여기서 검증.
 */
const schema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('http://localhost:8080/api'),
  VITE_APP_NAME: z.string().default('대동제 어드민'),
  /**
   * mock 데이터 사용 여부. **default 는 모드에 따라 다르다**:
   * - dev (`pnpm dev`)      → default 'true'  (개발 편의: .env.local 없어도 mock 으로 즉시 동작)
   * - prod build            → default 'false' (안전: mock 계정이 prod 번들에 새는 사고 차단)
   * 명시적으로 `VITE_USE_MOCK=true` 를 prod 에서 설정하면 vite.config.ts 의
   * build-time 가드가 빌드 자체를 막는다. 아래 런타임 가드는 그 가드를 어떻게든
   * 통과한 번들에 대한 2차 방어선.
   */
  VITE_USE_MOCK: z
    .enum(['true', 'false'])
    .default(import.meta.env.DEV ? 'true' : 'false')
    .transform((v) => v === 'true'),
  /**
   * CS 문의용 오픈카카오 채팅방 URL.
   * 값이 비면 플로팅 CS 버튼을 아예 렌더하지 않는다 — 링크 없는 버튼을 클릭
   * 했을 때의 혼란이 버튼 부재보다 더 나쁘다. 프로덕션에선 Vercel 프로젝트
   * 환경변수로 주입.
   * 빈 문자열("")과 정의되지 않음(undefined) 둘 다 "없음"으로 동일 처리.
   */
  VITE_KAKAO_CS_URL: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
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

/**
 * production + USE_MOCK=true 조합은 mock 계정·고정 비번이 prod 번들에 그대로
 * 노출되는 사고를 만든다. 환경변수 실수로라도 이 조합이 들어오면 런타임에서
 * 즉시 차단. 단, 백엔드 미가동 단계에서는 staging/preview 가 mock 으로 도는 것이
 * 정상 흐름이므로 `VITE_ALLOW_MOCK_BUILD=true` opt-out 으로 우회 가능.
 * 백엔드 연동 완료 시 두 변수 모두 제거하면 가드 재활성.
 */
if (
  import.meta.env.PROD &&
  parsed.data.VITE_USE_MOCK &&
  import.meta.env.VITE_ALLOW_MOCK_BUILD !== 'true'
) {
  throw new Error(
    '[env] production 빌드에서 VITE_USE_MOCK=true 는 차단됩니다 — mock 계정/고정 비번이 번들에 노출됩니다. 의도된 mock staging 이면 VITE_ALLOW_MOCK_BUILD=true 를 함께 설정하세요.',
  );
}

export const env = {
  API_BASE_URL: parsed.data.VITE_API_BASE_URL,
  APP_NAME: parsed.data.VITE_APP_NAME,
  /** true이면 백엔드 대신 mock 데이터를 사용 */
  USE_MOCK: parsed.data.VITE_USE_MOCK,
  /** 오픈카카오 CS URL. 없으면 undefined — 소비자 쪽에서 분기. */
  KAKAO_CS_URL: parsed.data.VITE_KAKAO_CS_URL,
} as const;
