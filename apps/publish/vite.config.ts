import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@xstudio/shared/components': path.resolve(__dirname, '../../packages/shared/src/components/index.tsx'),
      '@xstudio/shared/renderers': path.resolve(__dirname, '../../packages/shared/src/renderers/index.ts'),
      '@xstudio/shared/types': path.resolve(__dirname, '../../packages/shared/src/types/index.ts'),
      '@xstudio/shared/hooks': path.resolve(__dirname, '../../packages/shared/src/hooks/index.ts'),
      '@xstudio/shared/utils': path.resolve(__dirname, '../../packages/shared/src/utils/index.ts'),
      '@xstudio/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 3001,
  },
});
