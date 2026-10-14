// 第一步：人界大地图 —— 游戏核心（状态、循环、输入、相机）
import { Terrain } from './terrain';
import { assets } from './assets';
import { Renderer } from './render';
import { REALMS, realmName } from '../data/realms';
import { LOCATIONS, LocDef, WORLD_SCALE, WORLD_W, WORLD_H, regionAt, Region } from '../data/world';
import { clamp } from '../core/rng';
import { audio } from './audio';

export const DAYS_PER_SEC = 0.5;    // 现实 1 分钟 = 游戏 1 个月（30 天）
export const FOG_CELL = 1000;
export const FOG_W = Math.ceil(WORLD_W / FOG_CELL);
export const FOG_H = Math.ceil(WORLD_H / FOG_CELL);
const SAVE_KEY = 'fanren_step1_save';

export interface PlayerState {
  name: string; x: number; y: number; realm: number; stage: number;
  facing: 1 | -1; moving: boolean; flying: boolean; walkT: number;
}

export interface UIState {
  date: { year: number; month: number; season: string };
  region: string; regionParent: string;
  nearby: LocDef | null;
  realmText: string; sense: number; senseRadius: number;
  flying: boolean; canFlyNative: boolean;
  zoom: number; px: number; py: number;
  explored: number;
}

export interface Toast { id: number; text: string; kind?: 'info' | 'warn' | 'region' }

export class Game {
  terrain: Terrain;
  renderer!: Renderer;
  canvas!: HTMLCanvasElement;
  player: PlayerState;
  day = 60; // 从第一年三月开始
  explored = new Uint8Array(FOG_W * FOG_H);
  revealAll = false;
  destination: { x: number; y: number } | null = null;
  cam = { x: 0, y: 0, zoom: 0.8, targetZoom: 0.8 };
  input = { keys: new Set<string>(), joy: { x: 0, y: 0 } };
  paused = false;
  running = false;
  time = 0;
  ui!: UIState;
  listeners = new Set<() => void>();
  toasts: Toast[] = [];
  toastListeners = new Set<() => void>();
  private uiTimer = 0; private regionTimer = 0; private saveTimer = 0; private blockedTimer = 0;
  private currentRegionId = '';
  private last = 0;
  private raf = 0;
  onOpenMap?: () => void;
  overview!: HTMLCanvasElement;     // 1000×700 全图缩略（小地图/世界地图共用）
  debugTeleport = false;            // 体验：世界地图点选瞬移

  constructor(terrain: Terrain) {
    this.terrain = terrain;
    const start = LOCATIONS.find((l) => l.id === 'qixuan')!;
    this.player = { name: '韩立', x: start.x * WORLD_SCALE + 260, y: start.y * WORLD_SCALE + 420, realm: 1, stage: 0, facing: 1, moving: false, flying: false, walkT: 0 };
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.updateUI();
  }

  /** 新开一局 */
  reset() {
    const start = LOCATIONS.find((l) => l.id === 'qixuan')!;
    Object.assign(this.player, { x: start.x * WORLD_SCALE + 260, y: start.y * WORLD_SCALE + 420, realm: 1, stage: 0, facing: 1, moving: false, flying: false, walkT: 0 });
    this.day = 60; this.explored.fill(0); this.revealAll = false; this.destination = null; this.debugTeleport = false;
    this.cam.x = this.player.x; this.cam.y = this.player.y; this.cam.zoom = this.cam.targetZoom = 0.8;
    this.currentRegionId = '';
    this.updateUI();
  }

  // ---------- 存档（第一步：仅保存位置、时间与探索进度）----------
  static hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }
  save() {
    try {
      let s = '';
      for (let i = 0; i < this.explored.length; i++) s += this.explored[i] ? '1' : '0';
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, p: this.player, day: this.day, fog: s, zoom: this.cam.targetZoom, revealAll: this.revealAll }));
    } catch { /* ignore */ }
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      Object.assign(this.player, d.p);
      this.day = d.day ?? 60;
      if (d.fog) for (let i = 0; i < Math.min(d.fog.length, this.explored.length); i++) this.explored[i] = d.fog[i] === '1' ? 1 : 0;
      this.cam.x = this.player.x; this.cam.y = this.player.y;
      this.cam.zoom = this.cam.targetZoom = d.zoom ?? 0.8;
      this.revealAll = !!d.revealAll;
      this.destination = null; this.currentRegionId = '';
      this.updateUI();
      return true;
    } catch { return false; }
  }

  // ---------- 派生数值 ----------
  get sense() { return REALMS[this.player.realm].sense[this.player.stage] ?? 0; }
  get senseRadius() {
    const s = this.sense;
    return s <= 0 ? 380 : 450 + 55 * Math.sqrt(s);
  }
  get canFlyNative() { return REALMS[this.player.realm].fly; }
  get isFlying() { return this.player.flying || this.canFlyNative; }
  get speed() {
    const base = REALMS[this.player.realm].speed;
    if (this.player.flying && !this.canFlyNative) return 420; // 体验御剑
    return base;
  }

  // ---------- 生命周期 ----------
  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(this, canvas);
    this.bindInput();
    this.revealAround(true);
    this.updateUI(true);
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.max(0, Math.min(0.1, (t - this.last) / 1000));
      this.last = t;
      this.update(dt);
      this.renderer.render(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  detach() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbind?.();
    this.save();
  }

  // ---------- 主更新 ----------
  update(dt: number) {
    this.time += dt;
    this.terrain.frame++;
    const p = this.player;
    // 相机缩放平滑
    this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * Math.min(1, dt * 10);
    if (!this.paused) {
      this.day += dt * DAYS_PER_SEC;
      // 移动输入
      let mx = 0, my = 0;
      const k = this.input.keys;
      if (k.has('w') || k.has('arrowup')) my -= 1;
      if (k.has('s') || k.has('arrowdown')) my += 1;
      if (k.has('a') || k.has('arrowleft')) mx -= 1;
      if (k.has('d') || k.has('arrowright')) mx += 1;
      mx += this.input.joy.x; my += this.input.joy.y;
      if (mx || my) this.destination = null;
      else if (this.destination) {
        const dx = this.destination.x - p.x, dy = this.destination.y - p.y, d = Math.hypot(dx, dy);
        if (d < 24) this.destination = null;
        else { mx = dx / d; my = dy / d; }
      }
      const len = Math.hypot(mx, my);
      p.moving = len > 0.05;
      if (p.moving) {
        if (len > 1) { mx /= len; my /= len; }
        if (Math.abs(mx) > 0.15) p.facing = mx > 0 ? 1 : -1;
        const factor = this.isFlying ? 1 : this.terrain.walkFactor(p.x, p.y) || 1;
        const sp = this.speed * factor;
        const nx = clamp(p.x + mx * sp * dt, 200, WORLD_W - 200), ny = clamp(p.y + my * sp * dt, 200, WORLD_H - 200);
        if (this.isFlying || this.terrain.walkFactor(nx, ny) > 0) { p.x = nx; p.y = ny; }
        else if (this.terrain.walkFactor(nx, p.y) > 0) { p.x = nx; }
        else if (this.terrain.walkFactor(p.x, ny) > 0) { p.y = ny; }
        else {
          this.destination = null;
          if (this.blockedTimer <= 0) {
            this.toast('前方是茫茫大海。炼气期修士无法渡海，需筑基御器，或寻找传送阵、乘坐渡船。', 'warn');
            this.blockedTimer = 6;
          }
        }
        p.walkT += dt * (this.isFlying ? 1 : factor);
      }
      this.blockedTimer -= dt;
      this.revealAround(false);
    }
    // 相机跟随
    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 6);

    this.regionTimer -= dt;
    if (this.regionTimer <= 0) { this.regionTimer = 0.35; this.checkRegion(); }
    this.uiTimer -= dt;
    if (this.uiTimer <= 0) { this.uiTimer = 0.12; this.updateUI(); }
    this.saveTimer += dt;
    if (this.saveTimer > 15) { this.saveTimer = 0; this.save(); }
  }

  revealAround(force: boolean) {
    const r = this.senseRadius;
    const p = this.player;
    const x0 = Math.max(0, Math.floor((p.x - r) / FOG_CELL)), x1 = Math.min(FOG_W - 1, Math.floor((p.x + r) / FOG_CELL));
    const y0 = Math.max(0, Math.floor((p.y - r) / FOG_CELL)), y1 = Math.min(FOG_H - 1, Math.floor((p.y + r) / FOG_CELL));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const cx = (x + 0.5) * FOG_CELL, cy = (y + 0.5) * FOG_CELL;
      if (Math.hypot(cx - p.x, cy - p.y) < r + FOG_CELL * 0.45 || force && Math.hypot(cx - p.x, cy - p.y) < r + FOG_CELL) this.explored[y * FOG_W + x] = 1;
    }
  }

  isExplored(wx: number, wy: number) {
    if (this.revealAll) return true;
    const x = Math.floor(wx / FOG_CELL), y = Math.floor(wy / FOG_CELL);
    if (x < 0 || y < 0 || x >= FOG_W || y >= FOG_H) return false;
    return this.explored[y * FOG_W + x] === 1;
  }

  private checkRegion() {
    const p = this.player;
    const mx = p.x / WORLD_SCALE, my = p.y / WORLD_SCALE;
    const onLand = this.terrain.isLand(p.x, p.y);
    const r: Region | null = regionAt(mx, my, onLand);
    const id = r ? r.id : 'none';
    if (id !== this.currentRegionId) {
      const first = this.currentRegionId === '';
      this.currentRegionId = id;
      if (r && !first) this.toast(r.parent === r.name ? r.name : `${r.parent} · ${r.name}`, 'region');
    }
  }

  nearbyLocation(): LocDef | null {
    const p = this.player;
    let best: LocDef | null = null, bd = 1e9;
    for (const l of LOCATIONS) {
      const d = Math.hypot(l.x * WORLD_SCALE - p.x, l.y * WORLD_SCALE - p.y);
      const r = l.type === 'city' || l.type === 'sect' ? 620 : 520;
      if (d < r && d < bd) { bd = d; best = l; }
    }
    return best;
  }

  updateUI(force = false) {
    const p = this.player;
    const totalMonths = Math.floor(this.day / 30);
    const year = Math.floor(totalMonths / 12) + 1, month = (totalMonths % 12) + 1;
    const season = month <= 3 ? '春' : month <= 6 ? '夏' : month <= 9 ? '秋' : '冬';
    const mx = p.x / WORLD_SCALE, my = p.y / WORLD_SCALE;
    const r = regionAt(mx, my, this.terrain.isLand(p.x, p.y));
    let ex = 0; for (let i = 0; i < this.explored.length; i++) ex += this.explored[i];
    this.ui = {
      date: { year, month, season },
      region: r ? r.name : '荒野', regionParent: r ? r.parent : '',
      nearby: this.nearbyLocation(),
      realmText: realmName(p.realm, p.stage), sense: this.sense, senseRadius: Math.round(this.senseRadius),
      flying: this.isFlying, canFlyNative: this.canFlyNative,
      zoom: this.cam.targetZoom, px: p.x, py: p.y,
      explored: ex / this.explored.length,
    };
    this.listeners.forEach((f) => f());
  }

  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  subscribeToasts(f: () => void) { this.toastListeners.add(f); return () => { this.toastListeners.delete(f); }; }

  private toastId = 0;
  toast(text: string, kind: Toast['kind'] = 'info') {
    const t = { id: ++this.toastId, text, kind };
    this.toasts = [...this.toasts.slice(-3), t];
    this.toastListeners.forEach((f) => f());
    setTimeout(() => { this.toasts = this.toasts.filter((x) => x.id !== t.id); this.toastListeners.forEach((f) => f()); }, kind === 'region' ? 3200 : 4200);
  }

  // ---------- 操作 ----------
  setZoom(z: number) { this.cam.targetZoom = clamp(z, 0.22, 1.6); this.updateUI(); }
  zoomBy(f: number) { this.setZoom(this.cam.targetZoom * f); }
  toggleFly() {
    if (this.canFlyNative) return;
    this.player.flying = !this.player.flying;
    if (!this.player.flying && !this.terrain.isLand(this.player.x, this.player.y)) {
      this.player.flying = true;
      this.toast('身下是大海，不能在此落下。', 'warn');
      return;
    }
    this.toast(this.player.flying ? '（体验模式）御剑而起，可自由飞越山海。' : '收起飞剑，落地步行。');
    audio.sfx(this.player.flying ? 'whoosh' : 'land');
    this.updateUI();
  }
  setDestination(wx: number, wy: number) {
    this.destination = { x: clamp(wx, 200, WORLD_W - 200), y: clamp(wy, 200, WORLD_H - 200) };
  }
  teleport(wx: number, wy: number) {
    this.player.x = wx; this.player.y = wy; this.cam.x = wx; this.cam.y = wy; this.destination = null;
    this.revealAround(true);
    this.updateUI();
  }

  screenToWorld(sx: number, sy: number) {
    const r = this.canvas.getBoundingClientRect();
    const z = this.cam.zoom;
    return { x: this.cam.x + (sx - r.left - r.width / 2) / z, y: this.cam.y + (sy - r.top - r.height / 2) / z };
  }

  private unbind?: () => void;
  private bindInput() {
    const kd = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      this.input.keys.add(k);
      if (k === 'm') this.onOpenMap?.();
      if (k === 'f') this.toggleFly();
      if (k === '=' || k === '+') this.zoomBy(1.2);
      if (k === '-') this.zoomBy(1 / 1.2);
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => this.input.keys.delete(e.key.toLowerCase());
    const blur = () => this.input.keys.clear();
    const wheel = (e: WheelEvent) => { e.preventDefault(); this.zoomBy(e.deltaY > 0 ? 1 / 1.12 : 1.12); };
    // 指针：点击移动 / 双指缩放
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>();
    let pinchStart = 0, pinchZoom = 1, moved = false;
    const pd = (e: PointerEvent) => {
      this.canvas.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y); pinchZoom = this.cam.targetZoom;
      }
    };
    const pm = (e: PointerEvent) => {
      const pt = pointers.get(e.pointerId);
      if (!pt) return;
      pt.x = e.clientX; pt.y = e.clientY;
      if (Math.hypot(pt.x - pt.sx, pt.y - pt.sy) > 10) moved = true;
      if (pointers.size === 2 && pinchStart > 0) {
        const [a, b] = [...pointers.values()];
        this.setZoom(pinchZoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart);
      }
    };
    const pu = (e: PointerEvent) => {
      const pt = pointers.get(e.pointerId);
      const wasPinch = pointers.size >= 2;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pt && !moved && !wasPinch && e.button === 0) {
        const w = this.screenToWorld(e.clientX, e.clientY);
        this.setDestination(w.x, w.y);
        audio.unlock();
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    this.canvas.addEventListener('wheel', wheel, { passive: false });
    this.canvas.addEventListener('pointerdown', pd);
    this.canvas.addEventListener('pointermove', pm);
    this.canvas.addEventListener('pointerup', pu);
    this.canvas.addEventListener('pointercancel', pu);
    this.unbind = () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
      this.canvas.removeEventListener('wheel', wheel);
      this.canvas.removeEventListener('pointerdown', pd);
      this.canvas.removeEventListener('pointermove', pm);
      this.canvas.removeEventListener('pointerup', pu);
      this.canvas.removeEventListener('pointercancel', pu);
    };
  }
}

export async function createGame(onProgress: (p: number, msg: string) => void) {
  onProgress(0.05, '加载画卷素材…');
  await assets.load((p) => onProgress(0.05 + p * 0.45, '加载画卷素材…'));
  onProgress(0.55, '勾勒人界山川…');
  await new Promise((r) => setTimeout(r, 30));
  const terrain = new Terrain(assets);
  terrain.build();
  onProgress(0.85, '点染江河湖海…');
  await new Promise((r) => setTimeout(r, 30));
  const g = new Game(terrain);
  g.overview = terrain.buildOverview(1);
  onProgress(1, '画卷已成');
  return g;
}
