// 水墨风大地图分块渲染
import { landRaw, landNoise, mountAt, colorAt, biomeAt } from './worldgen';
import { fbm, simplex2, hash2, clamp } from './rng';
import { RIVERS } from '../data/world';

export const CHUNK = 1024; // 世界像素
export const CRES = 4; // 渲染像素 = 世界像素 / CRES
export const CPX = CHUNK / CRES;
export const COUT = 520; // 非 2 的幂，避免 WebGL REPEAT 造成接缝 // 输出画布尺寸（装饰笔触以更高分辨率绘制）
export const CSCALE = CHUNK / COUT;

function mix(a: number, b: number, t: number) { return a + (b - a) * t; }

export function renderChunk(cx: number, cy: number): HTMLCanvasElement {
  const base = document.createElement('canvas');
  base.width = CPX; base.height = CPX;
  const bctx = base.getContext('2d')!;
  const img = bctx.createImageData(CPX, CPX);
  const d = img.data;
  const ox = cx * CHUNK, oy = cy * CHUNK;
  for (let py = 0; py < CPX; py++) {
    const wy = oy + py * CRES + 2;
    for (let px = 0; px < CPX; px++) {
      const wx = ox + px * CRES + 2;
      const n1 = fbm(wx / 900, wy / 900, 3);
      const l = landRaw(wx, wy) + n1 * 0.13 + simplex2(wx / 210, wy / 210) * 0.045;
      let R: number, Gc: number, B: number;
      const g = hash2(wx >> 2, wy >> 2, 99);
      if (l < 0.5) {
        const dep = clamp((0.5 - l) / 0.38, 0, 1);
        R = mix(184, 112, dep); Gc = mix(200, 140, dep); B = mix(192, 156, dep);
        // 水波笔触
        const s = Math.sin(wy * 0.04 + n1 * 9 + simplex2(wx / 700, wy / 260) * 4);
        if (s > 0.94) { R += 16; Gc += 16; B += 14; }
        else if (s < -0.97) { R -= 8; Gc -= 8; B -= 6; }
        if (l > 0.455) { const t = (l - 0.455) / 0.045; R = mix(R, 226, t * 0.55); Gc = mix(Gc, 228, t * 0.55); B = mix(B, 214, t * 0.55); }
        if (l > 0.488) { R = 74; Gc = 70; B = 62; }
      } else {
        const col = colorAt(wx, wy);
        const v = 0.93 + 0.1 * (simplex2(wx / 160, wy / 160) * 0.5 + 0.5);
        R = col[0] * v; Gc = col[1] * v; B = col[2] * v;
        if (l < 0.512) { R = 70; Gc = 66; B = 58; }
        else if (l < 0.54) { const t = (l - 0.512) / 0.028; R = mix(214, R, t); Gc = mix(204, Gc, t); B = mix(176, B, t); }
        const m = mountAt(wx, wy) + n1 * 0.28;
        if (m > 0.3) {
          const t = clamp((m - 0.3) / 0.55, 0, 1);
          R = mix(R, 116, t * 0.8); Gc = mix(Gc, 128, t * 0.8); B = mix(B, 112, t * 0.8);
          const ridge = 1 - Math.abs(simplex2(wx / 150, wy / 70));
          if (ridge > 0.86 && t > 0.15) { R -= 30 * t; Gc -= 30 * t; B -= 28 * t; }
          if (t > 0.75) { R = mix(R, 66, (t - 0.75) * 2); Gc = mix(Gc, 76, (t - 0.75) * 2); B = mix(B, 70, (t - 0.75) * 2); }
        }
      }
      const k = 0.965 + 0.035 * g;
      const i = (py * CPX + px) * 4;
      d[i] = R * k; d[i + 1] = Gc * k; d[i + 2] = B * k; d[i + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);
  const c = document.createElement('canvas');
  c.width = COUT; c.height = COUT;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(base, 0, 0, COUT, COUT);
  ctx.save();
  ctx.scale(1 / CSCALE, 1 / CSCALE);
  ctx.translate(-ox, -oy);
  drawRivers(ctx, ox, oy);
  drawDecor(ctx, ox, oy);
  ctx.restore();
  return c;
}

function drawRivers(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const rv of RIVERS) {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const [x, y] of rv) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    if (maxx < ox - 200 || minx > ox + CHUNK + 200 || maxy < oy - 200 || miny > oy + CHUNK + 200) continue;
    // 平滑曲线
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(rv[0][0], rv[0][1]);
      for (let i = 1; i < rv.length - 1; i++) {
        const mx = (rv[i][0] + rv[i + 1][0]) / 2, my = (rv[i][1] + rv[i + 1][1]) / 2;
        ctx.quadraticCurveTo(rv[i][0], rv[i][1], mx, my);
      }
      const L = rv[rv.length - 1]; ctx.lineTo(L[0], L[1]);
    };
    path(); ctx.strokeStyle = 'rgba(70,90,100,0.55)'; ctx.lineWidth = 34; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(160,188,190,0.95)'; ctx.lineWidth = 22; ctx.stroke();
  }
}

function inkMountain(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, h: number) {
  const w = s * (1.1 + h * 0.4), ht = s * (0.9 + h * 0.5);
  const off = (h - 0.5) * s * 0.3;
  // 阴面
  const grad = ctx.createLinearGradient(x, y - ht, x, y);
  grad.addColorStop(0, 'rgba(48,58,54,0.88)');
  grad.addColorStop(0.55, 'rgba(84,100,90,0.55)');
  grad.addColorStop(1, 'rgba(140,154,136,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.22, y - ht * 0.45, x + off, y - ht);
  ctx.quadraticCurveTo(x + w * 0.18, y - ht * 0.5, x + w / 2, y);
  ctx.closePath(); ctx.fill();
  // 阳面留白
  const g2 = ctx.createLinearGradient(x, y - ht, x + w / 2, y);
  g2.addColorStop(0, 'rgba(236,232,214,0.55)');
  g2.addColorStop(1, 'rgba(236,232,214,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.moveTo(x + off, y - ht);
  ctx.quadraticCurveTo(x + w * 0.2, y - ht * 0.4, x + w / 2, y);
  ctx.lineTo(x + w * 0.1, y);
  ctx.quadraticCurveTo(x + w * 0.05, y - ht * 0.45, x + off, y - ht);
  ctx.fill();
  // 轮廓笔触
  ctx.strokeStyle = 'rgba(38,44,40,0.75)';
  ctx.lineWidth = Math.max(6, s * 0.035);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + w * 0.08, y - ht * 0.08);
  ctx.quadraticCurveTo(x - w * 0.22, y - ht * 0.45, x + off, y - ht);
  ctx.quadraticCurveTo(x + w * 0.12, y - ht * 0.6, x + w * 0.3, y - ht * 0.3);
  ctx.stroke();
  // 皴笔
  ctx.lineWidth = Math.max(4, s * 0.02);
  ctx.strokeStyle = 'rgba(40,48,44,0.45)';
  for (let i = 0; i < 3; i++) {
    const yy = y - ht * (0.25 + i * 0.18), xx = x - w * 0.12 + off * 0.5;
    ctx.beginPath(); ctx.moveTo(xx - s * 0.08, yy + s * 0.06); ctx.lineTo(xx + s * 0.05, yy - s * 0.04); ctx.stroke();
  }
}

function inkTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pine: boolean, dark: number) {
  ctx.strokeStyle = `rgba(52,46,40,${0.6 * dark})`;
  ctx.lineWidth = s * 0.08;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.7); ctx.stroke();
  if (pine) {
    ctx.fillStyle = `rgba(48,74,58,${0.75 * dark})`;
    for (let i = 0; i < 3; i++) {
      const yy = y - s * (0.35 + i * 0.25), ww = s * (0.6 - i * 0.15);
      ctx.beginPath(); ctx.ellipse(x, yy, ww, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = `rgba(62,94,66,${0.55 * dark})`;
    ctx.beginPath(); ctx.arc(x - s * 0.18, y - s * 0.7, s * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.78, s * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(40,66,48,${0.6 * dark})`;
    ctx.beginPath(); ctx.arc(x, y - s * 0.95, s * 0.26, 0, Math.PI * 2); ctx.fill();
  }
}

function drawDecor(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  // 山峰
  const MS = 130;
  const items: { y: number; f: () => void }[] = [];
  const m = 320;
  for (let gy = Math.floor((oy - m) / MS); gy <= Math.floor((oy + CHUNK + m) / MS); gy++) {
    for (let gx = Math.floor((ox - m) / MS); gx <= Math.floor((ox + CHUNK + m) / MS); gx++) {
      const h = hash2(gx, gy, 5);
      const x = gx * MS + hash2(gx, gy, 6) * MS, y = gy * MS + hash2(gx, gy, 7) * MS;
      const l = landRaw(x, y) + landNoise(x, y);
      if (l < 0.53) continue;
      const mv = mountAt(x, y) + fbm(x / 900, y / 900, 3) * 0.28;
      if (mv > 0.48 && h < 0.75) {
        const s = 120 + (mv - 0.48) * 380 + h * 60;
        items.push({ y, f: () => inkMountain(ctx, x, y, s, h) });
        continue;
      }
      // 树木 / 草
      const b = biomeAt(x, y);
      if ((b === 'forest' || b === 'jungle') && h < 0.85) {
        const n = 2 + Math.floor(h * 4);
        for (let i = 0; i < n; i++) {
          const tx = x + (hash2(gx * 7 + i, gy, 8) - 0.5) * 110, ty = y + (hash2(gx, gy * 7 + i, 9) - 0.5) * 110;
          items.push({ y: ty, f: () => inkTree(ctx, tx, ty, 34 + hash2(i, gx, 3) * 22, b === 'forest' && i % 2 === 0, 1) });
        }
      } else if ((b === 'plain' || b === 'island') && h < 0.12) {
        items.push({ y, f: () => inkTree(ctx, x, y, 30 + h * 100, h < 0.05, 0.85) });
      } else if (b === 'snow' && h < 0.1) {
        items.push({ y, f: () => inkTree(ctx, x, y, 34, true, 0.6) });
      } else if (b === 'steppe' && h < 0.4) {
        items.push({ y, f: () => { ctx.strokeStyle = 'rgba(110,116,70,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 4, y - 22); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 28); ctx.moveTo(x + 10, y); ctx.lineTo(x + 16, y - 20); ctx.stroke(); } });
      } else if (b === 'desert' && h < 0.3) {
        items.push({ y, f: () => { ctx.strokeStyle = 'rgba(150,120,80,0.35)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y + 40, 70, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); } });
      } else if ((b === 'evil' || b === 'blood') && h < 0.3) {
        items.push({ y, f: () => { ctx.fillStyle = b === 'blood' ? 'rgba(120,30,30,0.25)' : 'rgba(60,30,80,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 90, 40, 0, 0, Math.PI * 2); ctx.fill(); } });
      } else if (b === 'marsh' && h < 0.35) {
        items.push({ y, f: () => { ctx.strokeStyle = 'rgba(70,100,90,0.4)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y); ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 18, y - 12); ctx.stroke(); } });
      }
    }
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
}

// ---------------- 中等细节图块（缩小视图用） ----------------
export const MID = 4096;
export const MRES = 16;
export const MPX = MID / MRES;
export const MOUT = 260; // 非 2 的幂
export const MSCALE = MID / MOUT;
export function renderMid(tx: number, ty: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = MPX; c.height = MPX;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(MPX, MPX);
  const d = img.data;
  const ox = tx * MID, oy = ty * MID;
  for (let py = 0; py < MPX; py++) {
    const wy = oy + py * MRES + 8;
    for (let px = 0; px < MPX; px++) {
      const wx = ox + px * MRES + 8;
      const n1 = fbm(wx / 900, wy / 900, 3);
      const l = landRaw(wx, wy) + n1 * 0.13 + simplex2(wx / 210, wy / 210) * 0.045;
      let R: number, Gc: number, B: number;
      if (l < 0.5) {
        const dep = clamp((0.5 - l) / 0.38, 0, 1);
        R = mix(184, 112, dep); Gc = mix(200, 140, dep); B = mix(192, 156, dep);
        if (l > 0.455) { const t = (l - 0.455) / 0.045; R = mix(R, 226, t * 0.55); Gc = mix(Gc, 228, t * 0.55); B = mix(B, 214, t * 0.55); }
        if (l > 0.488) { R = 74; Gc = 70; B = 62; }
      } else {
        const col = colorAt(wx, wy);
        R = col[0]; Gc = col[1]; B = col[2];
        if (l < 0.512) { R = 70; Gc = 66; B = 58; }
        const m = mountAt(wx, wy) + n1 * 0.28;
        if (m > 0.3) { const t = clamp((m - 0.3) / 0.55, 0, 1); R = mix(R, 116, t * 0.8); Gc = mix(Gc, 128, t * 0.8); B = mix(B, 112, t * 0.8); }
      }
      const i = (py * MPX + px) * 4;
      d[i] = R; d[i + 1] = Gc; d[i + 2] = B; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.scale(1 / MRES, 1 / MRES);
  ctx.translate(-ox, -oy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const rv of RIVERS) {
    ctx.beginPath(); ctx.moveTo(rv[0][0], rv[0][1]);
    for (let i = 1; i < rv.length - 1; i++) { const mx = (rv[i][0] + rv[i + 1][0]) / 2, my = (rv[i][1] + rv[i + 1][1]) / 2; ctx.quadraticCurveTo(rv[i][0], rv[i][1], mx, my); }
    const L = rv[rv.length - 1]; ctx.lineTo(L[0], L[1]);
    ctx.strokeStyle = 'rgba(110,140,150,0.9)'; ctx.lineWidth = 40; ctx.stroke();
  }
  const MS = 420; const m = 700;
  const items: { y: number; f: () => void }[] = [];
  for (let gy = Math.floor((oy - m) / MS); gy <= Math.floor((oy + MID + m) / MS); gy++) {
    for (let gx = Math.floor((ox - m) / MS); gx <= Math.floor((ox + MID + m) / MS); gx++) {
      const h = hash2(gx, gy, 15);
      const x = gx * MS + hash2(gx, gy, 16) * MS, y = gy * MS + hash2(gx, gy, 17) * MS;
      const l = landRaw(x, y) + landNoise(x, y);
      if (l < 0.53) continue;
      const mv = mountAt(x, y) + fbm(x / 900, y / 900, 3) * 0.28;
      if (mv > 0.5 && h < 0.8) { const s = 360 + (mv - 0.5) * 900 + h * 160; items.push({ y, f: () => inkMountain(ctx, x, y, s, h) }); }
      else if (biomeAt(x, y) === 'forest' && h < 0.3) items.push({ y, f: () => inkTree(ctx, x, y, 160, h < 0.15, 0.8) });
    }
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  ctx.restore();
  const o = document.createElement('canvas'); o.width = MOUT; o.height = MOUT;
  const octx = o.getContext('2d')!; octx.imageSmoothingEnabled = true; octx.drawImage(c, 0, 0, MOUT, MOUT);
  return o;
}
