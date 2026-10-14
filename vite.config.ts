import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true, hmr: { clientPort: 443 } },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { chunkSizeWarningLimit: 3000 },
});
