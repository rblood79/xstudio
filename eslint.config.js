import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import localRules from './eslint-local-rules/index.js'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'local': {
        rules: localRules,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // XStudio Anti-Pattern Detection Rules
      'local/no-zustand-grouped-selectors': 'error',
      'local/no-zustand-use-shallow': 'error',
      'local/prefer-keyboard-shortcuts-registry': 'warn',
      'local/prefer-copy-paste-hook': 'warn',
      'local/no-eventtype-legacy-import': 'error',
    },
  },
)
