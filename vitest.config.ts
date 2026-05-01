import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest 전용 설정 — vite.config.ts 와 분리해 둔 이유:
 *  - vite.config.ts 는 figmaAssetResolver / tailwindcss 플러그인을 포함해
 *    번들 빌드에 특화. 테스트 환경에선 불필요한 플러그인이 jsdom 부팅을 느리게 만듬.
 *  - 테스트는 React 플러그인 + alias 만 있으면 충분.
 *
 * import.meta.env.MODE 는 'test' 가 자동 주입돼 features/<domain>/api.ts 의
 * env.USE_MOCK 분기는 그대로 동작 (mock 사용).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // 기본은 node — jsdom 이 일부 환경에서 vitest 와 hang 하는 이슈 회피.
    // DOM 이 필요한 컴포넌트 테스트는 파일 첫 줄에 `// @vitest-environment jsdom`
    // pragma 로 case-by-case 활성화한다.
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
