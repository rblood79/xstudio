import path from "node:path";

export default [
  "vite.config.ts",
  {
    extends: "vite.config.ts",
    test: {
      name: "browser-tests",
      browser: {
        enabled: process.env.BROWSER_TESTS === "true",
        headless: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
      },
      setupFiles:
        process.env.BROWSER_TESTS === "true"
          ? [path.resolve(".storybook/vitest.setup.ts")]
          : undefined,
    },
  },
];
