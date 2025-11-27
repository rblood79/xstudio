/**
 * Vite Configuration for Preview
 *
 * Preview를 독립적인 번들로 빌드합니다.
 * srcdoc iframe에 인라인으로 삽입될 JavaScript를 생성합니다.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/preview",
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, "src/preview/index.tsx"),
      name: "Preview",
      formats: ["iife"], // 즉시 실행 함수로 번들링 (srcdoc용)
      fileName: () => "preview.js",
    },
    rollupOptions: {
      // 모든 의존성을 번들에 포함
      external: [],
      output: {
        // 전역 변수 설정 (필요 시)
        globals: {},
        // 인라인 CSS
        assetFileNames: "preview.[ext]",
      },
    },
    // 번들 최적화
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, // 개발 중에는 콘솔 유지
      },
    },
    // 소스맵 (개발용)
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // 환경 변수 정의
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
});
