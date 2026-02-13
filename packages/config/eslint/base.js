import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * XStudio 공유 ESLint 기본 설정
 * TypeScript + 브라우저 환경 기본 규칙
 * React 관련 규칙은 react.js에서 확장
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', '**/*.d.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
);
