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
    },
  },
})
