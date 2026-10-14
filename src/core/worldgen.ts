// 世界场生成：陆地 / 山脉 / 地貌颜色，均为低分辨率网格，渲染时叠加噪声
import { WORLD_W, WORLD_H, MAINLAND, LAKES, EXTRA_LAND, BIOME_POLYS, BIOME_COLORS, RIDGES, LOCATIONS, REGIONS, pointInPoly, BiomeId } from '../data/world';
import { fbm, simplex2, mulberry32, clamp } from './rng';

export const G = 32;
export const GW = Math.ceil(WORLD_W / G);
export const GH = Math.ceil(WORLD_H / G);

export let land: Float32Array;
export let mount: Float32Array;
export let colR: Float32Array, colG: Float32Array, colB: Float32Array;
export let biome: Uint8Array;
export const BIOME_LIST: BiomeId[] = ['plain', 'forest', 'steppe', 'desert', 'snow', 'jungle', 'evil', 'island', 'blood', 'marsh'];
export const ISLANDS: [number, number, number, number, number][] = []; // cx, cy, rx, ry, seed

function boxBlur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length);
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0; const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * inv;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      src[y * w + x] = acc * inv;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return c;
}

function blobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number) {
  const r = mulberry32(seed);
  const n = 18; const ph = r() * 10;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.78 + 0.32 * (0.5 + 0.5 * Math.sin(a * 3 + ph)) * r() + 0.1 * r();
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function generateWorld() {
  const t0 = performance.now();
  // ---- 岛屿 ----
  ISLANDS.length = 0;
  const r = mulberry32(7771);
  for (const l of LOCATIONS) if (l.island) ISLANDS.push([l.x, l.y, l.island * 1.15, l.island * 0.9, Math.floor(r() * 1e6)]);
  // 乱星海散布小岛
  let tries = 0;
  while (ISLANDS.length < 190 && tries++ < 4000) {
    const x = 20500 + r() * 15000, y = 13800 + r() * 9800;
    const rad = 90 + Math.pow(r(), 2.2) * 520;
    if (ISLANDS.some((i) => Math.hypot(i[0] - x, i[1] - y) < i[2] + rad + 260)) continue;
    ISLANDS.push([x, y, rad * (0.8 + r() * 0.5), rad * (0.7 + r() * 0.4), Math.floor(r() * 1e6)]);
  }
  // 无边海零星岛屿
  for (let i = 0; i < 26; i++) {
    const x = 14500 + r() * 7000, y = 13600 + r() * 9800;
    const rad = 80 + r() * 260;
    ISLANDS.push([x, y, rad, rad * 0.8, Math.floor(r() * 1e6)]);
  }

  // ---- 陆地 ----
  const c = makeCanvas(GW, GH);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(1 / G, 0, 0, 1 / G, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  MAINLAND.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath(); ctx.fill();
  for (const [x, y, rx, ry] of EXTRA_LAND) { blobPath(ctx, x, y, rx, ry, x * 7 + y); ctx.fill(); }
  for (const [x, y, rx, ry, sd] of ISLANDS) { blobPath(ctx, x, y, rx, ry, sd); ctx.fill(); }
  ctx.fillStyle = '#000';
  for (const [x, y, rx, ry] of LAKES) { blobPath(ctx, x, y, rx, ry, x + y * 3); ctx.fill(); }
  let img = ctx.getImageData(0, 0, GW, GH).data;
  land = new Float32Array(GW * GH);
  for (let i = 0; i < land.length; i++) land[i] = img[i * 4] / 255;
  boxBlur(land, GW, GH, 2); boxBlur(land, GW, GH, 1);

  // ---- 山脉 ----
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, GW, GH);
  ctx.setTransform(1 / G, 0, 0, 1 / G, 0, 0);
  ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const rd of RIDGES) {
    ctx.lineWidth = rd.w;
    ctx.beginPath();
    rd.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  img = ctx.getImageData(0, 0, GW, GH).data;
  mount = new Float32Array(GW * GH);
  for (let i = 0; i < mount.length; i++) mount[i] = img[i * 4] / 255;
  boxBlur(mount, GW, GH, 3); boxBlur(mount, GW, GH, 2);
  for (let i = 0; i < mount.length; i++) mount[i] = Math.min(1, mount[i] * 1.5) * Math.min(1, land[i] * 1.6);

  // ---- 地貌 ----
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(1 / G, 0, 0, 1 / G, 0, 0);
  for (const bp of BIOME_POLYS) {
    const idx = BIOME_LIST.indexOf(bp.biome);
    ctx.fillStyle = `rgb(${idx * 20},0,0)`;
    if (bp.poly) { ctx.beginPath(); bp.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
    else if (bp.ell) { blobPath(ctx, bp.ell[0], bp.ell[1], bp.ell[2], bp.ell[3], bp.ell[0]); ctx.fill(); }
  }
  img = ctx.getImageData(0, 0, GW, GH).data;
  biome = new Uint8Array(GW * GH);
  colR = new Float32Array(GW * GH); colG = new Float32Array(GW * GH); colB = new Float32Array(GW * GH);
  for (let i = 0; i < biome.length; i++) {
    const b = Math.round(img[i * 4] / 20);
    biome[i] = b;
    const col = BIOME_COLORS[BIOME_LIST[b] || 'plain'];
    colR[i] = col[0]; colG[i] = col[1]; colB[i] = col[2];
  }
  boxBlur(colR, GW, GH, 4); boxBlur(colG, GW, GH, 4); boxBlur(colB, GW, GH, 4);
  console.log('world generated in', Math.round(performance.now() - t0), 'ms');
}

function bil(f: Float32Array, x: number, y: number) {
  const gx = x / G - 0.5, gy = y / G - 0.5;
  let x0 = Math.floor(gx), y0 = Math.floor(gy);
  const tx = gx - x0, ty = gy - y0;
  if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
  const x1 = Math.min(GW - 1, x0 + 1), y1 = Math.min(GH - 1, y0 + 1);
  if (x0 >= GW) x0 = GW - 1; if (y0 >= GH) y0 = GH - 1;
  const a = f[y0 * GW + x0], b = f[y0 * GW + x1], c = f[y1 * GW + x0], d = f[y1 * GW + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export function landNoise(x: number, y: number) { return fbm(x / 900, y / 900, 3) * 0.13 + simplex2(x / 210, y / 210) * 0.045; }
export function landRaw(x: number, y: number) { return bil(land, x, y); }
export function landValue(x: number, y: number) { return bil(land, x, y) + landNoise(x, y); }
export function isLand(x: number, y: number) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
  return landValue(x, y) >= 0.5;
}
export function mountAt(x: number, y: number) { return bil(mount, x, y); }
export function colorAt(x: number, y: number): [number, number, number] { return [bil(colR, x, y), bil(colG, x, y), bil(colB, x, y)]; }
export function biomeAt(x: number, y: number): BiomeId {
  const gx = clamp(Math.floor(x / G), 0, GW - 1), gy = clamp(Math.floor(y / G), 0, GH - 1);
  return BIOME_LIST[biome[gy * GW + gx]] || 'plain';
}

export function regionAtLand(x: number, y: number) {
  const onLand = isLand(x, y);
  for (const rg of REGIONS) {
    if (!pointInPoly(x, y, rg.poly)) continue;
    if (rg.sea && !onLand && rg.id !== 'wubian') return rg;
    if (!rg.sea && onLand) return rg;
    if (rg.sea && onLand && (rg.id === 'neixing' || rg.id === 'waixing')) return rg;
  }
  return REGIONS.find((r) => r.id === 'wubian')!;
}

/** 总览地图（低分辨率） */
let overview: HTMLCanvasElement | null = null;
export function getOverview(): HTMLCanvasElement {
  if (overview) return overview;
  const w = GW, h = GH;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const id = ctx.createImageData(w, h);
  for (let gy = 0; gy < h; gy++) for (let gx = 0; gx < w; gx++) {
    const i = gy * w + gx;
    const x = gx * G + G / 2, y = gy * G + G / 2;
    const l = land[i] + landNoise(x, y);
    let R: number, Gc: number, B: number;
    if (l < 0.5) {
      const d = clamp((0.5 - l) / 0.35, 0, 1);
      R = 178 - 55 * d; Gc = 196 - 48 * d; B = 190 - 28 * d;
      if (l > 0.47) { R = 90; Gc = 88; B = 78; }
    } else {
      R = colR[i]; Gc = colG[i]; B = colB[i];
      const m = mount[i] + fbm(x / 600, y / 600, 2) * 0.2;
      if (m > 0.3) { const t = clamp((m - 0.3) / 0.5, 0, 1); R = R * (1 - t) + 72 * t; Gc = Gc * (1 - t) + 84 * t; B = B * (1 - t) + 76 * t; }
    }
    id.data[i * 4] = R; id.data[i * 4 + 1] = Gc; id.data[i * 4 + 2] = B; id.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  overview = c;
  return c;
}
