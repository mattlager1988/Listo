import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    // Large single-page bundle is expected for this app (served on a LAN).
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress harmless noise from dependencies:
        // - @microsoft/signalr's misplaced /*#__PURE__*/ annotations
        // - pdfjs-dist's use of eval
        if (warning.code === 'INVALID_ANNOTATION' && warning.message.includes('#__PURE__')) return;
        if (warning.code === 'EVAL') return;
        warn(warning);
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5286',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5286',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
