import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      "/supabase": {
        target: "http://121.146.229.198:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/supabase/, ""),
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    hmr: {
      overlay: true
    }
  },
  css: {
    modules: {
      // CSS Modules 설정
      localsConvention: 'camelCaseOnly', // 클래스 이름을 camelCase로 변환
      generateScopedName: '[name]__[local]__[hash:base64:5]', // 고유 클래스 이름 생성 규칙
    },
  },
})
