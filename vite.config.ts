import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// package.json이 "type": "module"이라 ESM 컨텍스트에서 로드된다.
// ESM에는 __dirname이 없으므로 import.meta.url에서 파생해서 쓴다.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return path.resolve(__dirname, 'src/assets', filename);
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // production 빌드에서 VITE_USE_MOCK=true 가 새는 사고 차단(build-time guard).
  // mock 계정·고정 비번이 prod 번들에 들어가는 일이 없도록 빌드 단계에서 fail-fast.
  //
  // loadEnv 로 .env*(`. env`, `.env.local`, `.env.production`, `.env.production.local`)
  // 파일까지 명시적으로 로드 — process.env 직접 조회는 vite 의 env 주입 타이밍에
  // 따라 .env.production 의 값이 빠져 가드가 우회될 수 있다는 Copilot 리뷰 반영.
  //
  // 단, 백엔드 미가동 단계에서는 staging/preview 가 mock 으로 돌아가는 게 정상
  // 흐름이므로, 의도적인 mock 빌드를 위해 `VITE_ALLOW_MOCK_BUILD=true` opt-out 을
  // 둔다. 백엔드 연동 완료 시 Vercel/배포 환경변수에서 두 값(USE_MOCK, ALLOW_MOCK_BUILD)
  // 을 모두 제거하면 가드가 다시 활성화돼 사고 방지선이 살아난다.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (
    command === 'build' &&
    mode === 'production' &&
    env.VITE_USE_MOCK === 'true' &&
    env.VITE_ALLOW_MOCK_BUILD !== 'true'
  ) {
    throw new Error(
      '[vite] production 빌드에서 VITE_USE_MOCK=true 는 차단됩니다 — mock 계정/고정 비번이 번들에 노출됩니다. 의도된 mock staging 이면 VITE_ALLOW_MOCK_BUILD=true 를 함께 설정하세요. 백엔드 연동 완료 후엔 두 변수 모두 제거.',
    );
  }

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
});
