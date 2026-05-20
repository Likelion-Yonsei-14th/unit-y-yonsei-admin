// @ts-check
/**
 * ESLint flat config (ESLint 9).
 *
 * 목적: 안티패턴/잠재 버그/접근성/Rules of Hooks 위반을 자동 검출.
 * 포맷팅은 Prettier 가 전담하므로 이 파일에서는 stylistic 룰을 강제하지 않는다
 * (eslint-config-prettier 가 마지막에 충돌 룰을 끔).
 *
 * 무시 대상:
 *  - dist/, dist-types/ — 빌드 산출물
 *  - src/components/ui/ — shadcn 원본 (수정 금지 컨벤션)
 *  - src/components/figma/ — Figma Make 원본
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-types/**',
      'node_modules/**',
      'src/components/ui/**',
      'src/components/figma/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ---- React core ----
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react/prop-types': 'off', // TS 가 대신 검증.

      // ---- React Hooks (지난 PR 의 Rules of Hooks 위반 같은 사고 방지) ----
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ---- React Refresh (Vite HMR 깨질 export 패턴 검출) ----
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ---- 접근성 (recommended 적용) ----
      ...jsxA11y.configs.recommended.rules,
      // 우리 코드에서 <label> 이 file input 을 wrap 하는 implicit 패턴이 다수.
      // 'either' 면 wrapping 매칭도 인정.
      'jsx-a11y/label-has-associated-control': [
        'error',
        { assert: 'either', controlComponents: ['input', 'select', 'textarea'] },
      ],

      // ---- TypeScript 추가 룰 ----
      // 사용 안 하는 변수: _ prefix 면 의도적으로 무시.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // any 사용은 경고 — 점진 제거.
      '@typescript-eslint/no-explicit-any': 'warn',
      // {} 같은 모호한 타입 검출은 끔 (shadcn 컴포넌트 타입에서 자주 등장).
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  // scripts/ 하위 .mjs 는 노드 런타임 — process/console/fetch 등 노드 globals 가 필요.
  // 브라우저 env 만 깔린 디폴트로는 'no-undef' 가 false positive 를 낸다.
  {
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  // Prettier 충돌 룰 끄기 — 반드시 마지막.
  prettierConfig,
);
