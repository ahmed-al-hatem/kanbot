import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type ProxyOptions } from 'vite';

// The server only allows CORS from http://localhost:5173. Proxying /api keeps every
// request same-origin, so `vite preview` and Playwright work on any port (plan §9.1).
const proxy: Record<string, ProxyOptions> = {
  '/api': { target: 'http://localhost:4000', changeOrigin: true },
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `npm run analyze` writes stats.html with gzip sizes (target: initial JS < ~120 KB gz).
    mode === 'analyze' && visualizer({ filename: 'stats.html', gzipSize: true, open: false }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
}));
