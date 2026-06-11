import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    // Large single-page bundle is expected for this app (served on a LAN).
    chunkSizeWarningLimit: 6000,
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
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5286',
        changeOrigin: true,
        timeout: 300000, // 5 minutes
        proxyTimeout: 300000, // 5 minutes
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, _req, res) => {
            // Remove timeouts for large uploads
            proxyReq.setTimeout(0);
            res.setTimeout(0);
          });
          proxy.on('proxyRes', (_proxyRes, _req, res) => {
            res.setTimeout(0);
          });
        },
      },
      '/hubs': {
        target: 'http://localhost:5286',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
