import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 开发：npm run dev（0.0.0.0:5173，允许预览域名）
// 打包：npm run build → dist/index.html（单文件）→ 由 scripts/finalize.mjs 复制为 fujiko_paris.html
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
