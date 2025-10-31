import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    base: '/xstudio/',
    server: {
      // Note: Supabase client connects directly using VITE_SUPABASE_URL
      // No proxy needed for development environment
      headers: {
        // Development CORS headers (느슨한 설정)
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // iframe 격리 및 보안 헤더 (Preview iframe 시스템에 필수)
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
  }
})
