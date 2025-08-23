import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    }),
    // Add compression for production builds
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz'
    }),
    // Brotli compression for even better compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br'
    })
  ],
  base: command === 'build' ? '/xstudio/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router', 'react-router-dom'],
          'ui-vendor': ['react-aria-components', 'tailwind-merge', 'tailwind-variants', 'clsx'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['lodash', 'immer', 'zustand'],
          'icons': ['lucide-react', '@lucide/lab'],
        }
      }
    },
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify CSS
    cssMinify: 'esbuild',
    // Better sourcemaps for production
    sourcemap: false,
    // Optimize deps
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
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
}))
