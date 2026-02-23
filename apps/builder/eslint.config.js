import reactConfig from '@xstudio/config/eslint/react';
import localRules from './eslint-local-rules/index.js';

export default [
  ...reactConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'local': {
        rules: localRules,
      },
    },
    rules: {
      // XStudio Anti-Pattern Detection Rules
      'local/no-zustand-grouped-selectors': 'error',
      'local/no-zustand-use-shallow': 'error',
      'local/prefer-keyboard-shortcuts-registry': 'warn',
      'local/prefer-copy-paste-hook': 'warn',
      'local/no-eventtype-legacy-import': 'error',
    },
  },
];
