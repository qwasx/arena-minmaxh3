// 大地图渲染：水墨底图 + 装饰物 + 地点 + 人物 + 云雾 + 神识
import type { Game } from './game';
import { FOG_CELL, FOG_W, FOG_H } from './game';
import { CHUNK, Deco } from './terrain';
import { assets } from './assets';
import { LOCATIONS, LocDef, WORLD_SCALE, BIG_LABELS } from '../data/world';
import { hash2, clamp } from '../core/rng';

const LOC_SPRITE: Record<string, { key: string; w: number }> = {
  city: { key: 'town', w: 720 }, town: { key: 'town', w: 430 }, sect: { key: 'sect', w: 780 },
  danger: { key: 'danger', w: 620 }, secret: { key: 'ruins', w: 540 }, isle: { key: 'island', w: 600 },
};
const LOC_SEAL: Record<string, string> = { city: '城', town: '镇', sect: '宗', danger: '险', secret: '秘', isle: '岛' };
const LOC_SEAL_COLOR: Record<string, string> = { city: '#9a3b2c', town: '#8a6a3a', sect: '#2f6b5e', danger: '#5a1f2a', secret: '#3a5a8a', isle: '#2f6a80' };

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }

export class Renderer {
  game: Game;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1; W = 0; H = 0;
  cloud: HTMLCanvasElement;
  particles: Particle[] = [];
  driftClouds: { x: number; y: number; s: number; v: number }[] = [];
  private pendingBuilds = 0;
  // 低分辨率氛围层（迷雾、飘云、神识外暗角），大幅减少全屏绘制开销
  atmo: HTMLCanvasElement; atmoCtx: CanvasRenderingContext2D;
  static AS = 0.25;
  quality: ImageSmoothingQuality = 'medium';
  // 缓存的全屏叠加层（宣纸纹理 + 暗角 + 季节色调）
  overlay: HTMLCanvasElement | null = null; overlayKey = '';
  cloudShadow: HTMLCanvasElement;

  constructor(game: Game, canvas: HTMLCanvasElement) {
    this.game = game; this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.cloud = this.makeCloud();
    this.cloudShadow = this.makeCloudShadow();
    this.atmo = document.createElement('canvas');
    this.atmoCtx = this.atmo.getContext('2d')!;
    for (let i = 0; i < 14; i++) this.driftClouds.push({ x: Math.random() * 9000, y: Math.random() * 6000, s: 0.8 + Math.random() * 1.4, v: 18 + Math.random() * 25 });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const isMobile = Math.min(window.innerWidth, window.innerHeight) < 600;
    this.dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2, this.maxDpr ?? 2);
    this.W = this.canvas.clientWidth || window.innerWidth;
    this.H = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    if (this.atmo) { this.atmo.width = Math.ceil(this.W * Renderer.AS); this.atmo.height = Math.ceil(this.H * Renderer.AS); }
    this.overlayKey = '';
  }

  private makeCloudShadow() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.drawImage(this.cloud, 0, 0, 128, 128);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = 'rgb(40,46,44)'; g.fillRect(0, 0, 128, 128);
    return c;
  }

  private buildOverlay(month: number) {
    const W = Math.ceil(this.W), H = Math.ceil(this.H);
    const c = this.overlay ?? document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    // 季节色调
    const tint = month < 3 ? 'rgba(180,220,170,0.06)' : month < 6 ? 'rgba(255,230,160,0.06)' : month < 9 ? 'rgba(230,150,80,0.08)' : 'rgba(170,190,230,0.10)';
    g.fillStyle = tint; g.fillRect(0, 0, W, H);
    // 宣纸纹理（平铺）
    const T = 192, tile = document.createElement('canvas'); tile.width = tile.height = T;
    const tg = tile.getContext('2d')!;
    const img = tg.createImageData(T, T);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random();
      img.data[i] = 70; img.data[i + 1] = 55; img.data[i + 2] = 35; img.data[i + 3] = v * v * 34;
    }
    tg.putImageData(img, 0, 0);
    tg.strokeStyle = 'rgba(110,90,60,0.10)';
    for (let i = 0; i < 40; i++) {
      tg.lineWidth = Math.random() * 0.8;
      tg.beginPath(); const x = Math.random() * T, y = Math.random() * T;
      tg.moveTo(x, y); tg.quadraticCurveTo(x + Math.random() * 20 - 10, y + Math.random() * 20 - 10, x + Math.random() * 30 - 15, y + Math.random() * 30 - 15); tg.stroke();
    }
    g.fillStyle = g.createPattern(tile, 'repeat')!; g.fillRect(0, 0, W, H);
    // 暗角
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(40,30,20,0)'); vg.addColorStop(1, 'rgba(40,30,20,0.32)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    this.overlay = c;
  }

  private makeCloud() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const blobs = [[128, 128, 100], [80, 140, 70], [176, 136, 74], [120, 92, 66], [150, 170, 60], [96, 176, 52], [190, 100, 50]];
    for (const [x, y, r] of blobs) {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(246,242,234,0.95)'); rg.addColorStop(0.6, 'rgba(240,236,228,0.7)'); rg.addColorStop(1, 'rgba(236,232,224,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // 云纹勾线
    g.strokeStyle = 'rgba(150,150,140,0.18)'; g.lineWidth = 2;
    g.beginPath(); g.arc(110, 150, 30, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(160, 140, 24, Math.PI * 1.0, Math.PI * 2.0); g.stroke();
    return c;
  }

  private perfT = 0; private perfN = 0; private perfAcc = 0; private lowered = false;
  private adapt(dt: number) {
    if (this.lowered || dt <= 0) return;
    this.perfT += dt; this.perfN++; this.perfAcc += dt;
    if (this.perfT > 4) {
      const avg = this.perfAcc / this.perfN;
      if (avg > 1 / 38 && this.dpr > 1.01) { this.lowered = true; this.maxDpr = 1; this.resize(); }
      this.perfT = 0; this.perfN = 0; this.perfAcc = 0;
    }
  }
  maxDpr = 2;

  render(dt: number) {
    const { ctx, game } = this;
    this.adapt(dt);
    const z = game.cam.zoom;
    const W = this.W, H = this.H;
    if (this.canvas.clientWidth !== W || this.canvas.clientHeight !== H) this.resize();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = this.quality;
    ctx.fillStyle = '#e9dfc6';
    ctx.fillRect(0, 0, W, H);

    const camX = game.cam.x, camY = game.cam.y;
    const left = camX - W / 2 / z, top = camY - H / 2 / z, right = camX + W / 2 / z, bottom = camY + H / 2 / z;
    // 世界坐标 -> 屏幕
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-camX, -camY);

    // ---------- 1. 底图分块 ----------
    const cx0 = Math.floor(left / CHUNK) - 1, cx1 = Math.floor(right / CHUNK) + 1;
    const cy0 = Math.floor(top / CHUNK) - 1, cy1 = Math.floor(bottom / CHUNK) + 1;
    let builds = 0;
    const maxBuilds = this.pendingBuilds > 0 ? 3 : 6;
    const decos: { y: number; draw: () => void }[] = [];
    // 由近及远构建，避免首帧卡顿
    const order: [number, number, number][] = [];
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const d = Math.hypot((cx + 0.5) * CHUNK - camX, (cy + 0.5) * CHUNK - camY);
      order.push([cx, cy, d]);
    }
    order.sort((a, b) => a[2] - b[2]);
    let missing = 0;
    for (const [cx, cy] of order) {
      if (cx < 0 || cy < 0 || cx * CHUNK > 100000 || cy * CHUNK > 70000) continue;
      let ch = game.terrain.getChunk(cx, cy, false);
      if (!ch && builds < maxBuilds) { ch = game.terrain.getChunk(cx, cy, true); builds++; }
      if (!ch) { missing++; continue; }
      const inView = (cx + 1) * CHUNK > left && cx * CHUNK < right && (cy + 1) * CHUNK > top && cy * CHUNK < bottom;
      if (inView) ctx.drawImage(ch.canvas, cx * CHUNK - 0.6, cy * CHUNK - 0.6, CHUNK + 1.2, CHUNK + 1.2);
      for (const d of ch.decos) {
        if (d.x + d.w / 2 < left || d.x - d.w / 2 > right || d.y < top || d.y - d.h > bottom + 50) continue;
        decos.push({ y: d.y, draw: () => this.drawDeco(d) });
      }
    }
    this.pendingBuilds = missing;

    // ---------- 2. 地点 ----------
    const visibleLocs: LocDef[] = [];
    for (const l of LOCATIONS) {
      const x = l.x * WORLD_SCALE, y = l.y * WORLD_SCALE;
      if (x < left - 800 || x > right + 800 || y < top - 600 || y > bottom + 800) continue;
      visibleLocs.push(l);
      const spec = LOC_SPRITE[l.type];
      const im = assets.img(spec.key);
      if (!im) continue;
      const w = spec.w * (l.scale ?? 1), h = w * im.height / im.width;
      decos.push({ y: y + h * 0.35, draw: () => ctx.drawImage(im, x - w / 2, y - h * 0.65, w, h) });
    }

    // ---------- 3. 人物 ----------
    const p = game.player;
    decos.push({ y: p.y, draw: () => this.drawPlayer() });

    decos.sort((a, b) => a.y - b.y);
    for (const d of decos) d.draw();

    // 粒子
    this.updateParticles(dt);

    // 目的地标记
    if (game.destination) {
      const { x, y } = game.destination;
      const t = game.time;
      ctx.save();
      ctx.strokeStyle = 'rgba(160,50,40,0.85)'; ctx.lineWidth = 3 / z;
      const r = 18 + Math.sin(t * 5) * 4;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.4, r * 0.2, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(160,50,40,0.6)'; ctx.fill();
      ctx.restore();
    }

    // ---------- 4. 氛围层：迷雾 + 飘云 + 神识外暗角（低分辨率缓冲）----------
    this.drawAtmosphere(left, top, right, bottom, dt);
    ctx.drawImage(this.atmo, left, top, right - left, bottom - top);

    // ---------- 5. 地点名牌（在云雾之上，大地点即使未探索也显示）----------
    for (const l of visibleLocs) {
      const x = l.x * WORLD_SCALE, y = l.y * WORLD_SCALE;
      const explored = game.isExplored(x, y);
      if (!explored && !l.major) continue;
      this.drawLabel(l, x, y, explored);
    }

    // ---------- 6. 神识 ----------
    this.drawSense();


    ctx.restore();

    // ---------- 8. 大区域名（缩小时）----------
    if (z < 0.6) {
      const a = clamp((0.6 - z) / 0.3, 0, 1) * 0.55;
      ctx.globalAlpha = a;
      for (const b of BIG_LABELS) {
        const sx = W / 2 + (b.at[0] * WORLD_SCALE - camX) * z, sy = H / 2 + (b.at[1] * WORLD_SCALE - camY) * z;
        if (sx < -400 || sx > W + 400 || sy < -200 || sy > H + 200) continue;
        const spr = this.bigLabel(b.name, Math.round(b.size * 16 + 18));
        const w = spr.width / this.dpr, h = spr.height / this.dpr;
        ctx.drawImage(spr, sx - w / 2, sy - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- 9. 季节色调 + 宣纸纹理 + 暗角（缓存）----------
    const month = Math.floor(game.day / 30) % 12;
    const season = String(Math.floor(month / 3));
    const key = season + ':' + Math.ceil(W) + 'x' + Math.ceil(H);
    if (key !== this.overlayKey) { this.buildOverlay(month); this.overlayKey = key; }
    if (this.overlay) ctx.drawImage(this.overlay, 0, 0, W, H);
  }

  private drawDeco(d: Deco) {
    const ctx = this.ctx;
    ctx.globalAlpha = d.alpha;
    if (d.flip) {
      ctx.save(); ctx.translate(d.x, 0); ctx.scale(-1, 1);
      ctx.drawImage(d.img, -d.w / 2, d.y - d.h, d.w, d.h);
      ctx.restore();
    } else ctx.drawImage(d.img, d.x - d.w / 2, d.y - d.h, d.w, d.h);
    ctx.globalAlpha = 1;
  }

  private drawPlayer() {
    const { ctx, game } = this;
    const p = game.player;
    const t = game.time;
    const flying = game.isFlying;
    const im = assets.img(flying ? 'hanli_sword' : 'hanli_walk');
    // 阴影
    ctx.save();
    const shadowY = p.y + 4;
    ctx.fillStyle = 'rgba(40,40,30,0.28)';
    ctx.beginPath(); ctx.ellipse(p.x, shadowY, flying ? 46 : 24, flying ? 10 : 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!im) return;
    let h: number, w: number, lift = 0, tilt = 0, bob = 0;
    if (flying) {
      h = 96; w = h * im.width / im.height;
      lift = 46 + Math.sin(t * 2.2) * 6;
      tilt = p.moving ? 0.04 : 0;
      // 剑光拖尾
      if (p.moving && Math.random() < 0.8) {
        this.particles.push({ x: p.x - p.facing * 30 + (Math.random() - 0.5) * 20, y: p.y - lift + 30 + (Math.random() - 0.5) * 8, vx: -p.facing * (20 + Math.random() * 30), vy: (Math.random() - 0.5) * 10, life: 0, max: 0.6 + Math.random() * 0.5, size: 3 + Math.random() * 4, color: Math.random() < 0.5 ? '120,230,170' : '200,255,220' });
      }
    } else {
      h = 84; w = h * im.width / im.height;
      if (p.moving) { bob = Math.abs(Math.sin(p.walkT * 9)) * 3.5; tilt = Math.sin(p.walkT * 9) * 0.03; }
      else bob = Math.sin(t * 2) * 0.8;
    }
    ctx.save();
    ctx.translate(p.x, p.y - lift - bob);
    ctx.rotate(tilt * p.facing);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.restore();
  }

  private updateParticles(dt: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.particles = this.particles.filter((pt) => {
      pt.life += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      const k = 1 - pt.life / pt.max;
      if (k <= 0) return false;
      ctx.fillStyle = `rgba(${pt.color},${0.5 * k})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * k, 0, Math.PI * 2); ctx.fill();
      return true;
    });
    ctx.restore();
  }

  private labelCache = new Map<string, HTMLCanvasElement>();
  private fontReady(text: string) {
    try {
      if (!document.fonts) return true;
      const f = '20px "Ma Shan Zheng"';
      if (document.fonts.check(f, text)) return true;
      document.fonts.load(f, text).catch(() => {});
      return false;
    } catch { return true; }
  }
  private cacheSprite(key: string, make: () => HTMLCanvasElement, text = '') {
    let c = this.labelCache.get(key);
    if (c) return c;
    c = make();
    if (this.fontReady(text + '城镇宗险秘岛（传闻）')) {
      if (this.labelCache.size > 400) this.labelCache.clear();
      this.labelCache.set(key, c);
    }
    return c;
  }

  // 地点名牌：按屏幕字号缓存为位图，避免每帧重绘书法字体
  private makeLabel(l: LocDef, explored: boolean, fs: number) {
    const d = this.dpr;
    const m = document.createElement('canvas').getContext('2d')!;
    const font = `${fs}px "Ma Shan Zheng", "STKaiti", "KaiTi", serif`;
    m.font = font;
    const text = explored ? l.name : l.name + '（传闻）';
    const tw = m.measureText(text).width;
    const seal = fs * 1.05, pad = fs * 0.45;
    const bw = tw + seal + pad * 3, bh = fs * 1.5, lw = Math.max(1.2, fs * 0.07);
    const c = document.createElement('canvas');
    c.width = Math.ceil((bw + lw * 2 + 4) * d); c.height = Math.ceil((bh + lw * 2 + 4) * d);
    const g = c.getContext('2d')!;
    g.scale(d, d); g.translate(lw + 2, lw + 2);
    g.fillStyle = 'rgba(246,239,222,0.94)';
    g.strokeStyle = 'rgba(60,50,40,0.75)'; g.lineWidth = lw;
    const r = bh * 0.18;
    g.beginPath();
    g.moveTo(r, 0); g.lineTo(bw - r, 0); g.quadraticCurveTo(bw, 0, bw, r);
    g.lineTo(bw, bh - r); g.quadraticCurveTo(bw, bh, bw - r, bh);
    g.lineTo(r, bh); g.quadraticCurveTo(0, bh, 0, bh - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0);
    g.fill(); g.stroke();
    g.fillStyle = LOC_SEAL_COLOR[l.type];
    const sx = pad, sy = (bh - seal) / 2;
    g.fillRect(sx, sy, seal, seal);
    g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = '#f7eedb';
    g.font = `${seal * 0.78}px "Ma Shan Zheng", "STKaiti", serif`;
    g.fillText(LOC_SEAL[l.type], sx + seal / 2, sy + seal / 2 + seal * 0.04);
    g.fillStyle = explored ? '#2a2620' : '#5a544a';
    g.font = font; g.textAlign = 'left';
    g.fillText(text, sx + seal + pad, bh / 2 + fs * 0.04);
    return c;
  }

  private drawLabel(l: LocDef, x: number, y: number, explored: boolean) {
    const { ctx, game } = this;
    const z = game.cam.zoom;
    if (!l.major && z < 0.35) return;
    const fsW = (l.major ? 22 : 18) / Math.max(z, 0.5) * Math.min(1, 0.55 + z * 0.6);
    const fs = Math.max(8, Math.round(fsW * z));
    const spr = this.cacheSprite(`L|${l.id}|${explored ? 1 : 0}|${fs}|${this.dpr}`, () => this.makeLabel(l, explored, fs), l.name);
    const k = 1 / (z * this.dpr);
    const by = y + 70 / Math.max(z, 0.6) * 0.8;
    ctx.globalAlpha = explored ? 1 : 0.72;
    ctx.drawImage(spr, x - (spr.width * k) / 2, by, spr.width * k, spr.height * k);
    ctx.globalAlpha = 1;
  }

  // 大区域名（缩小时）
  private bigLabel(name: string, size: number) {
    return this.cacheSprite(`B|${name}|${size}|${this.dpr}`, () => {
      const d = this.dpr;
      const font = `${size}px "Ma Shan Zheng", "STKaiti", "KaiTi", serif`;
      const m = document.createElement('canvas').getContext('2d')!; m.font = font;
      const text = [...name].join(' ');
      const tw = m.measureText(text).width;
      const c = document.createElement('canvas'); c.width = Math.ceil((tw + 20) * d); c.height = Math.ceil(size * 1.5 * d);
      const g = c.getContext('2d')!; g.scale(d, d);
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgb(50,45,38)';
      g.fillText(text, (tw + 20) / 2, size * 0.75);
      return c;
    }, name);
  }

  private drawSense() {
    const { ctx, game } = this;
    const p = game.player, R = game.senseRadius, z = game.cam.zoom, t = game.time;
    // 圈外淡淡压暗，突出神识范围
    ctx.save();
    // 圈内微光
    const ig = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    ig.addColorStop(0, 'rgba(160,230,210,0.0)'); ig.addColorStop(0.85, 'rgba(160,230,210,0.05)'); ig.addColorStop(1, 'rgba(120,210,190,0.12)');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
    // 外环
    ctx.strokeStyle = 'rgba(60,130,115,0.55)'; ctx.lineWidth = 2.5 / z;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke();
    // 旋转符纹弧
    ctx.strokeStyle = 'rgba(70,150,130,0.65)'; ctx.lineWidth = 5 / z; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = t * 0.25 + (i * Math.PI) / 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 10 / z, a, a + 0.32); ctx.stroke();
    }
    // 神识扫荡波纹
    const period = 4.5, ph = (t % period) / period;
    ctx.strokeStyle = `rgba(110,200,180,${0.45 * (1 - ph)})`; ctx.lineWidth = (3 + 6 * (1 - ph)) / z;
    ctx.beginPath(); ctx.arc(p.x, p.y, R * ph, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  private drawAtmosphere(left: number, top: number, right: number, bottom: number, dt: number) {
    const { game } = this;
    const a = this.atmoCtx, AW = this.atmo.width, AH = this.atmo.height;
    const k = AW / (right - left);
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.clearRect(0, 0, AW, AH);
    a.setTransform(k, 0, 0, k, -left * k, -top * k);
    a.imageSmoothingEnabled = true;
    // 神识范围外压暗
    const p = game.player, R = game.senseRadius;
    const rg = a.createRadialGradient(p.x, p.y, R * 0.92, p.x, p.y, R * 1.6);
    rg.addColorStop(0, 'rgba(30,36,34,0)'); rg.addColorStop(1, 'rgba(30,36,34,0.22)');
    a.fillStyle = rg; a.fillRect(left, top, right - left, bottom - top);
    // 飘云投影
    const fieldW = 9000, fieldH = 6000;
    const clouds: [number, number, number][] = [];
    for (const c of this.driftClouds) {
      c.x += c.v * dt;
      const s = 1400 * c.s;
      const bx = Math.floor((left - s - c.x) / fieldW) * fieldW + c.x;
      const by = Math.floor((top - s - c.y) / fieldH) * fieldH + c.y;
      for (let x = bx; x < right + s; x += fieldW) for (let y = by; y < bottom + s; y += fieldH) clouds.push([x, y, s]);
    }
    a.globalAlpha = 0.08;
    for (const [x, y, s] of clouds) a.drawImage(this.cloudShadow, x - s / 2 + 220, y - s / 2 + 320, s, s * 0.6);
    // 未探索迷雾
    if (!game.revealAll) {
      const fx0 = Math.max(0, Math.floor(left / FOG_CELL) - 1), fx1 = Math.min(FOG_W - 1, Math.floor(right / FOG_CELL) + 1);
      const fy0 = Math.max(0, Math.floor(top / FOG_CELL) - 1), fy1 = Math.min(FOG_H - 1, Math.floor(bottom / FOG_CELL) + 1);
      const t = game.time;
      a.globalAlpha = 0.97;
      for (let fy = fy0; fy <= fy1; fy++) for (let fx = fx0; fx <= fx1; fx++) {
        if (game.explored[fy * FOG_W + fx]) continue;
        const h1 = hash2(fx, fy, 31), h2 = hash2(fx, fy, 32);
        const s = FOG_CELL * (2.0 + h1 * 0.5);
        const x = (fx + 0.5) * FOG_CELL + (h2 - 0.5) * 300 + Math.sin(t * 0.15 + h1 * 6) * 60;
        const y = (fy + 0.5) * FOG_CELL + (h1 - 0.5) * 300;
        a.drawImage(this.cloud, x - s / 2, y - s / 2, s, s);
      }
    }
    // 飘云
    a.globalAlpha = game.cam.zoom < 0.5 ? 0.42 : 0.26;
    for (const [x, y, s] of clouds) a.drawImage(this.cloud, x - s / 2, y - s / 2, s, s * 0.6);
    a.globalAlpha = 1;
  }
}
