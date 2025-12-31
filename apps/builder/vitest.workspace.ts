import path from "node:path";

export default [
  {
    extends: "./vite.config.ts",
    test: {
      name: "unit",
      include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    },
  },
  {
    extends: "./vite.config.ts",
    test: {
      name: "browser-tests",
      browser: {
        enabled: process.env.BROWSER_TESTS === "true",
        headless: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
      },
      include: ["src/**/*.browser.{test,spec}.{js,ts,jsx,tsx}"],
      setupFiles:
        process.env.BROWSER_TESTS === "true"
          ? [path.resolve(".storybook/vitest.setup.ts")]
          : undefined,
    },
  },
];
