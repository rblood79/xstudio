import path from 'node:path';
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'vite.config.ts',
  {
    extends: 'vite.config.ts',
    test: {
      name: 'browser-tests',
      browser: {
        enabled: process.env.BROWSER_TESTS === 'true',
        headless: true,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }]
      },
      setupFiles: process.env.BROWSER_TESTS === 'true' 
        ? [path.resolve('.storybook/vitest.setup.ts')] 
        : undefined,
    },
  },
]);
