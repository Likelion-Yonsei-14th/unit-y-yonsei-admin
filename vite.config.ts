import { defineConfig } from 'vite';
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
  // env.ts 의 런타임 가드와 짝 — 런타임만으로는 빌드 결과물이 만들어진 뒤 부팅
  // 시점에야 크래시하지만, 여기서 빌드 자체를 막아 배포로 새는 단계까지 끊는다.
  if (command === 'build' && mode === 'production' && process.env.VITE_USE_MOCK === 'true') {
    throw new Error(
      '[vite] production 빌드에서 VITE_USE_MOCK=true 는 차단됩니다 — mock 계정/고정 비번이 번들에 노출됩니다. .env / 배포 환경변수를 확인하세요.',
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
