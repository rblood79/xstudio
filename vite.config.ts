import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/supabase": {
        target: "https://msuyfmthxwnjqsknxbap.supabase.co",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/supabase/, ""),
      },
    },
  },
  css: {
    modules: {
      // CSS Modules 설정
      localsConvention: 'camelCaseOnly', // 클래스 이름을 camelCase로 변환
      generateScopedName: '[name]__[local]__[hash:base64:5]', // 고유 클래스 이름 생성 규칙
    },
  },
})
