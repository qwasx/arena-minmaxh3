// 把 dist/index.html 复制为仓库里可直接双击打开的单文件 fujiko_paris.html
import { copyFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'dist/index.html');
const dst = resolve(root, 'fujiko_paris.html');
copyFileSync(src, dst);
console.log(`✔ ${dst}  (${(statSync(dst).size / 1024).toFixed(0)} KB)`);
