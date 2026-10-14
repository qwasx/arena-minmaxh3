// 大地图场景：水墨分块渲染、神识圈、迷雾、NPC/妖兽/灵草/奇遇
import Phaser from 'phaser';
import { S, NPC, DAYS_PER_SEC, EXPLORE_CELL, EXPLORE_W, EXPLORE_H, addNews, saveGame, WorldEvent } from '../core/state';
import { computeStats, playerDayTick, addItem, addExp, deathPenalty, Stats } from '../core/player';
import { updateNPCs, npcSenseVal, inSafeZone, treasureLoot, secretIsOpen } from '../core/npc';
import { isLand, biomeAt, regionAtLand, getOverview, ISLANDS } from '../core/worldgen';
import { renderChunk, CHUNK, CRES, CSCALE, renderMid, MID, MRES, MSCALE } from '../core/mapRender';
import { WORLD_W, WORLD_H, LOCATIONS, LocationDef } from '../data/world';
import { REALMS, realmName, expNeeded, stageMult } from '../data/realms';
import { item, allItems } from '../data/items';
import { bus, toast } from '../core/bus';
import { input } from '../core/input';
import { rng, hash2, clamp, dist, RNG } from '../core/rng';
import { chibiKey, markerKey, monsterKey, itemTexKey, registerFx } from './texreg';
import { beastSpec, npcSpec, pickMonster, beastLoot, makeBag, bossSpec, BOSSES } from '../core/encounter';
import type { BattleConfig, BattleResult, EnemySpec } from './BattleScene';
import { EVENTS } from '../data/events';

export let world: WorldScene;

interface Mon { id: number; type: string; level: number; x: number; y: number; tx: number; ty: number; spr: Phaser.GameObjects.Image; t: number; aggro: boolean; sea: boolean; }
interface Herb { key: string; id: string; q: number; x: number; y: number; spr?: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Image; }
interface EvSpot { key: string; x: number; y: number; spr?: Phaser.GameObjects.Image; }

const HERB_CELL = 520, EV_CELL = 2300;
const FOG_COLOR = [233, 225, 205];

export class WorldScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Image; pShadow!: Phaser.GameObjects.Image; pSword!: Phaser.GameObjects.Image;
  senseG!: Phaser.GameObjects.Graphics; pulseG!: Phaser.GameObjects.Graphics; pulseT = 0;
  chunks = new Map<string, { img: Phaser.GameObjects.Image; used: number }>(); mids = new Map<string, Phaser.GameObjects.Image>();
  queue: string[] = []; midQueue: string[] = []; needT = 0;
  fogTex!: Phaser.Textures.CanvasTexture; fogImg!: Phaser.GameObjects.Image; fogData!: ImageData; fogDirty = false; fogT = 0;
  markers: { loc: LocationDef; img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  npcSprites = new Map<string, { spr: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }>();
  mons: Mon[] = []; monId = 1; monT = 0;
  herbs = new Map<string, Herb>(); evSpots = new Map<string, EvSpot>(); scanT = 0;
  evMarkers = new Map<string, Phaser.GameObjects.Image>();
  keys: any; moveTarget: { x: number; y: number } | null = null; clickMark!: Phaser.GameObjects.Image;
  st!: Stats; stT = 0; zoomMul = 1; curZoom = 0.8; dayAcc = 0; saveT = 0; region = ''; busy = false; immune = 0; seaWarn = 0;
  facing = 1; bob = 0; interactT = 0; nearLoc: LocationDef | null = null; nearNpc: NPC | null = null; hudT = 0; locCheckT = 0;

  constructor() { super('world'); }

  init() {
    this.chunks = new Map(); this.mids = new Map(); this.queue = []; this.midQueue = []; this.markers = []; this.npcSprites = new Map();
    this.mons = []; this.herbs = new Map(); this.evSpots = new Map(); this.evMarkers = new Map(); this.moveTarget = null;
    this.zoomMul = 1; this.dayAcc = 0; this.saveT = 0; this.region = ''; this.busy = false; this.immune = 3; this.nearLoc = null; this.nearNpc = null;
  }

  create() {
    world = this;
    registerFx(this);
    const s = S(); const p = s.player;
    this.st = computeStats(p);
    // 总览底图
    const ov = getOverview();
    if (!this.textures.exists('overview')) this.textures.addCanvas('overview', ov);
    this.add.image(0, 0, 'overview').setOrigin(0).setScale(WORLD_W / ov.width, WORLD_H / ov.height).setDepth(-30);
    // 迷雾
    if (this.textures.exists('fog')) this.textures.remove('fog');
    this.fogTex = this.textures.createCanvas('fog', EXPLORE_W, EXPLORE_H)!;
    const fctx = this.fogTex.getContext();
    this.fogData = fctx.createImageData(EXPLORE_W, EXPLORE_H);
    for (let i = 0; i < EXPLORE_W * EXPLORE_H; i++) { this.fogData.data[i * 4] = FOG_COLOR[0]; this.fogData.data[i * 4 + 1] = FOG_COLOR[1]; this.fogData.data[i * 4 + 2] = FOG_COLOR[2]; this.fogData.data[i * 4 + 3] = s.explored[i] ? 0 : 235; }
    fctx.putImageData(this.fogData, 0, 0); this.fogTex.refresh();
    this.fogImg = this.add.image(0, 0, 'fog').setOrigin(0).setScale(EXPLORE_CELL).setDepth(4000);
    // 地点标记
    for (const l of LOCATIONS) {
      const img = this.add.image(l.x, l.y, markerKey(this, l.type)).setDepth(900).setOrigin(0.5, 0.75);
      const label = this.add.text(l.x, l.y, l.name, { fontFamily: 'LXGW WenKai, KaiTi, serif', fontSize: '20px', color: l.type === 'danger' ? '#7a1f1a' : l.type === 'secret' ? '#5a2a7a' : '#1f1a14', stroke: '#f3ead6', strokeThickness: 5, resolution: 2 }).setOrigin(0.5, 0).setDepth(901);
      this.markers.push({ loc: l, img, label });
    }
    // 玩家
    this.pShadow = this.add.image(p.x, p.y, 'shadow').setDepth(1999);
    this.pSword = this.add.image(p.x, p.y, 'flysword').setTint(0x9fe0d0).setBlendMode(Phaser.BlendModes.ADD).setDepth(1999).setVisible(false);
    this.player = this.add.image(p.x, p.y, chibiKey(this, 'hanli')).setOrigin(0.5, 0.92).setDepth(2000);
    this.senseG = this.add.graphics().setDepth(3000);
    this.pulseG = this.add.graphics().setDepth(3000);
    this.clickMark = this.add.image(0, 0, 'rune').setTint(0x2f5d57).setAlpha(0).setDepth(950);
    this.cameras.main.setBackgroundColor('#9fb4b4');
    this.cameras.main.setBounds(-2000, -2000, WORLD_W + 4000, WORLD_H + 4000);
    this.cameras.main.centerOn(p.x, p.y);
    this.curZoom = this.targetZoom(); this.cameras.main.setZoom(this.curZoom);
    // 输入
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SHIFT,SPACE');
    this.input.on('wheel', (_p: any, _o: any, _dx: number, dy: number) => { this.zoomMul = clamp(this.zoomMul * (dy > 0 ? 0.88 : 1.13), 0.35, 3); });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer, over: any[]) => {
      if (over.length || this.busy) return;
      this.moveTarget = { x: ptr.worldX, y: ptr.worldY };
      this.clickMark.setPosition(ptr.worldX, ptr.worldY).setAlpha(0.9).setScale(0.35 / this.curZoom);
      this.tweens.add({ targets: this.clickMark, alpha: 0, duration: 700 });
    });
    // 双指缩放
    this.input.addPointer(1);
    let pinchD = 0;
    this.input.on('pointermove', () => {
      const a = this.input.pointer1, b = this.input.pointer2;
      if (a.isDown && b.isDown) { const d = dist(a.x, a.y, b.x, b.y); if (pinchD) this.zoomMul = clamp(this.zoomMul * (d / pinchD), 0.35, 3); pinchD = d; this.moveTarget = null; } else pinchD = 0;
    });
    this.revealAround(true);
    this.scale.on('resize', () => { this.curZoom = this.targetZoom(); });
    this.events.on('resume', () => { this.cameras.main.setVisible(true); this.busy = false; });
    bus.emit('worldReady');
    this.checkRegion(true);
  }

  targetZoom() {
    const R = this.st.senseRadius;
    const m = Math.min(this.scale.width, this.scale.height);
    return clamp((m * 0.44) / R * this.zoomMul, 0.04, 1.6);
  }

  // ---------------- 主循环 ----------------
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const s = S(); const p = s.player;
    if (this.busy || input.paused) return;
    this.stT -= dt; if (this.stT <= 0) { this.st = computeStats(p); this.stT = 0.5; }
    if (this.immune > 0) this.immune -= dt;
    s.playSec += dt;
    // 时间
    const dDays = dt * DAYS_PER_SEC;
    s.day += dDays;
    this.dayAcc += dDays;
    if (this.dayAcc >= 1) { const d = Math.floor(this.dayAcc); this.dayAcc -= d; playerDayTick(d, p.meditating); }
    updateNPCs(dt, dDays, { onStalkContact: (n) => this.onAmbush(n), playerX: p.x, playerY: p.y });
    this.movePlayer(dt);
    // 相机
    const tz = this.targetZoom();
    this.curZoom += (tz - this.curZoom) * Math.min(1, dt * 3);
    const cam = this.cameras.main;
    cam.setZoom(this.curZoom);
    cam.centerOn(p.x, p.y - 20 / this.curZoom * 0.3);
    this.updateMap(dt);
    this.drawSense(dt);
    this.fogT -= dt; if (this.fogT <= 0) { this.fogT = 0.25; this.revealAround(false); }
    this.updateMarkers();
    this.updateNPCSprites();
    this.updateMonsters(dt);
    this.scanT -= dt; if (this.scanT <= 0) { this.scanT = 0.5; this.scanNodes(); }
    this.checkPickup();
    this.locCheckT -= dt; if (this.locCheckT <= 0) { this.locCheckT = 0.3; this.checkNear(); this.checkRegion(false); this.checkTreasureEvents(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || (input.interact && (input.interact = false, true))) this.interact();
    this.saveT += dt; if (this.saveT > 75) { this.saveT = 0; saveGame(); }
    this.hudT -= dt; if (this.hudT <= 0) { this.hudT = 0.25; bus.emit('hud'); }
  }

  movePlayer(dt: number) {
    const p = S().player; const k = this.keys;
    let mx = 0, my = 0;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1; if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1; if (k.S.isDown || k.DOWN.isDown) my += 1;
    if (Math.abs(input.jx) > 0.1 || Math.abs(input.jy) > 0.1) { mx = input.jx; my = input.jy; }
    if (mx || my) this.moveTarget = null;
    if (this.moveTarget) {
      const dx = this.moveTarget.x - p.x, dy = this.moveTarget.y - p.y; const d = Math.hypot(dx, dy);
      if (d < 8) this.moveTarget = null; else { mx = dx / d; my = dy / d; }
    }
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const moving = ml > 0.05;
    if (moving && p.meditating) { p.meditating = false; bus.emit('refresh'); }
    const sprint = (k.SHIFT.isDown || (input as any).sprint) && p.mp > 1;
    let sp = this.st.speed * (sprint ? 1.6 : 1) * 1.15;
    if (sprint && moving) p.mp = Math.max(0, p.mp - this.st.maxMp * 0.03 * dt);
    const nx = p.x + mx * sp * dt, ny = p.y + my * sp * dt;
    const canFly = p.realm >= 2;
    const ok = (x: number, y: number) => x > 50 && y > 50 && x < WORLD_W - 50 && y < WORLD_H - 50 && (canFly || isLand(x, y));
    if (moving) {
      if (ok(nx, ny)) { p.x = nx; p.y = ny; }
      else if (ok(nx, p.y)) p.x = nx;
      else if (ok(p.x, ny)) p.y = ny;
      else { this.moveTarget = null; if (!canFly && performance.now() - this.seaWarn > 4000) { this.seaWarn = performance.now(); toast('凡人与炼气修士无法渡海。筑基后可御器飞行，或寻找传送阵。', 'bad'); } }
      if (mx) this.facing = mx > 0 ? 1 : -1;
    }
    this.bob += dt * (moving ? 12 : 3);
    const flying = canFly && (moving || !isLand(p.x, p.y));
    const lift = flying ? 14 + Math.sin(this.bob * 0.5) * 3 : 0;
    const sc = 0.32 / this.curZoom;
    this.player.setPosition(p.x, p.y - lift * sc - (moving && !flying ? Math.abs(Math.sin(this.bob)) * 3 * sc : 0)).setScale(sc).setFlipX(this.facing < 0).setDepth(1000 + p.y / 100 + 0.5);
    this.pShadow.setPosition(p.x, p.y + 2 * sc).setScale(sc * 1.2).setDepth(999);
    this.pSword.setVisible(flying).setPosition(p.x, p.y - lift * sc + 4 * sc).setScale(sc * 2.2, sc * 1.4).setRotation(this.facing < 0 ? Math.PI : 0).setDepth(1000 + p.y / 100 + 0.4);
    if (p.meditating) this.player.setTint(0xd8f0e0); else this.player.clearTint();
  }

  // ---------------- 地图分块 ----------------
  updateMap(dt: number) {
    const cam = this.cameras.main; const v = cam.worldView;
    this.needT -= dt;
    if (this.needT <= 0) {
      this.needT = 0.25;
      const cx = v.centerX, cy = v.centerY;
      if (this.curZoom >= 0.22) {
        const m = CHUNK * 0.5;
        const x0 = Math.max(0, Math.floor((v.x - m) / CHUNK)), x1 = Math.min(Math.ceil(WORLD_W / CHUNK) - 1, Math.floor((v.right + m) / CHUNK));
        const y0 = Math.max(0, Math.floor((v.y - m) / CHUNK)), y1 = Math.min(Math.ceil(WORLD_H / CHUNK) - 1, Math.floor((v.bottom + m) / CHUNK));
        const need: string[] = [];
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = x + ',' + y; const c = this.chunks.get(k); if (c) c.used = this.time.now; else need.push(k); }
        need.sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return dist((ax + 0.5) * CHUNK, (ay + 0.5) * CHUNK, cx, cy) - dist((bx + 0.5) * CHUNK, (by + 0.5) * CHUNK, cx, cy); });
        this.queue = need.slice(0, 40);
      } else this.queue = [];
      if (this.curZoom < 0.5) {
        const m = MID * 0.25;
        const x0 = Math.max(0, Math.floor((v.x - m) / MID)), x1 = Math.min(Math.ceil(WORLD_W / MID) - 1, Math.floor((v.right + m) / MID));
        const y0 = Math.max(0, Math.floor((v.y - m) / MID)), y1 = Math.min(Math.ceil(WORLD_H / MID) - 1, Math.floor((v.bottom + m) / MID));
        const need: string[] = [];
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = x + ',' + y; if (!this.mids.has(k)) need.push(k); }
        need.sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return dist((ax + 0.5) * MID, (ay + 0.5) * MID, cx, cy) - dist((bx + 0.5) * MID, (by + 0.5) * MID, cx, cy); });
        this.midQueue = need;
      } else this.midQueue = [];
      // 回收
      if (this.chunks.size > 56) {
        const arr = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used);
        for (let i = 0; i < arr.length - 48; i++) { const [k, c] = arr[i]; c.img.destroy(); this.textures.remove('ck_' + k); this.chunks.delete(k); }
      }
    }
    const t0 = performance.now();
    let budget = 2;
    while (budget-- > 0 && (this.queue.length || this.midQueue.length) && performance.now() - t0 < 14) {
      if (this.midQueue.length && (this.curZoom < 0.3 || !this.queue.length)) {
        const k = this.midQueue.shift()!; const [x, y] = k.split(',').map(Number);
        if (!this.textures.exists('md_' + k)) this.textures.addCanvas('md_' + k, renderMid(x, y));
        this.mids.set(k, this.add.image(x * MID, y * MID, 'md_' + k).setOrigin(0).setScale(MSCALE * 1.002).setDepth(-20));
      } else if (this.queue.length) {
        const k = this.queue.shift()!; const [x, y] = k.split(',').map(Number);
        if (this.chunks.has(k)) continue;
        if (!this.textures.exists('ck_' + k)) this.textures.addCanvas('ck_' + k, renderChunk(x, y));
        this.chunks.set(k, { img: this.add.image(x * CHUNK, y * CHUNK, 'ck_' + k).setOrigin(0).setScale(CSCALE * 1.001).setDepth(-10), used: this.time.now });
      }
    }
  }

  drawSense(dt: number) {
    const p = S().player; const R = this.st.senseRadius; const z = this.curZoom;
    const g = this.senseG; g.clear();
    g.lineStyle(2.5 / z, 0x2f5d57, 0.55); g.strokeCircle(p.x, p.y, R);
    g.lineStyle(1 / z, 0x2f5d57, 0.25); g.strokeCircle(p.x, p.y, R * 0.985);
    g.fillStyle(0x6fb0a0, 0.035); g.fillCircle(p.x, p.y, R);
    this.pulseT += dt;
    const per = 3.2; const k = (this.pulseT % per) / per;
    if (this.pulseT % per < dt) bus.emit('sfx', 'pulse');
    const pg = this.pulseG; pg.clear();
    pg.lineStyle(3 / z, 0x8fd0c0, 0.5 * (1 - k)); pg.strokeCircle(p.x, p.y, R * k);
  }

  revealAround(full: boolean) {
    const s = S(); const p = s.player; const R = this.st.senseRadius;
    const cr = Math.ceil(R / EXPLORE_CELL);
    const pcx = Math.floor(p.x / EXPLORE_CELL), pcy = Math.floor(p.y / EXPLORE_CELL);
    let changed = false;
    for (let y = pcy - cr; y <= pcy + cr; y++) for (let x = pcx - cr; x <= pcx + cr; x++) {
      if (x < 0 || y < 0 || x >= EXPLORE_W || y >= EXPLORE_H) continue;
      const i = y * EXPLORE_W + x;
      if (s.explored[i]) continue;
      if (dist((x + 0.5) * EXPLORE_CELL, (y + 0.5) * EXPLORE_CELL, p.x, p.y) <= R + EXPLORE_CELL * 0.5) { s.explored[i] = 1; this.fogData.data[i * 4 + 3] = 0; changed = true; }
    }
    // 发现地点
    for (const l of LOCATIONS) if (!s.known[l.id] && dist(l.x, l.y, p.x, p.y) < R + 200 && (!l.hidden || this.st.reveal || dist(l.x, l.y, p.x, p.y) < 300)) {
      s.known[l.id] = true; toast(`发现了「${l.name}」`, 'good'); addNews(`韩立发现了${l.name}。`, 'info');
    }
    if (changed || full) { this.fogTex.getContext().putImageData(this.fogData, 0, 0); this.fogTex.refresh(); }
  }

  updateMarkers() {
    const s = S(); const z = this.curZoom;
    const sc = clamp(0.55 / z, 1.1, 60);
    for (const m of this.markers) {
      const vis = !!s.known[m.loc.id];
      m.img.setVisible(vis); m.label.setVisible(vis && (z > 0.07 || m.loc.type === 'city' || m.loc.type === 'sect'));
      if (!vis) continue;
      const big = m.loc.type === 'city' ? 1.25 : m.loc.type === 'village' ? 0.8 : 1;
      m.img.setScale(sc * big);
      m.label.setScale(0.82 / z).setPosition(m.loc.x, m.loc.y + 14 * sc * big);
      if (m.loc.openEvery) m.label.setText(m.loc.name + (secretIsOpen(m.loc) ? '（开启中）' : ''));
    }
  }

  // ---------------- NPC ----------------
  canSeeNPC(n: NPC) {
    const p = S().player; const d = dist(n.x, n.y, p.x, p.y);
    if (d > this.st.senseRadius) return false;
    if (n.companion) return true;
    if (n.conceal && !this.st.reveal && npcSenseVal(n) > this.st.sense) return d < this.st.senseRadius * 0.45;
    return true;
  }

  updateNPCSprites() {
    const s = S(); const z = this.curZoom; const sc = 0.3 / z;
    const seen = new Set<string>();
    let count = 0;
    for (const n of s.npcs) {
      if (!n.alive || count > 70 || !this.canSeeNPC(n)) continue;
      count++; seen.add(n.id);
      let o = this.npcSprites.get(n.id);
      if (!o) {
        const spr = this.add.image(n.x, n.y, chibiKey(this, n)).setOrigin(0.5, 0.92).setInteractive({ useHandCursor: true });
        spr.on('pointerdown', () => { if (dist(n.x, n.y, S().player.x, S().player.y) < 260 / Math.max(0.3, this.curZoom)) bus.emit('npcInteract', n); else this.moveTarget = { x: n.x, y: n.y }; });
        const label = this.add.text(n.x, n.y, '', { fontFamily: 'LXGW WenKai, KaiTi, serif', fontSize: '17px', color: '#fff', stroke: '#1a120c', strokeThickness: 4, resolution: 2 }).setOrigin(0.5, 1);
        o = { spr, label }; this.npcSprites.set(n.id, o);
      }
      const prevX = o.spr.x;
      o.spr.setPosition(n.x, n.y).setScale(sc).setDepth(1000 + n.y / 100);
      if (Math.abs(n.x - prevX) > 0.5) o.spr.setFlipX(n.x < prevX);
      const showRealm = this.st.sense >= npcSenseVal(n) * 0.75 || n.met;
      const hostile = n.goal === 'stalk' || n.grudge > 40;
      const col = hostile ? '#ff8a7a' : n.partner ? '#ffb0d0' : n.companion ? '#a8ffcf' : n.famous ? '#ffe08a' : n.beauty ? '#ffd0e8' : '#f6efe0';
      const realmTxt = showRealm ? realmName(n.realm, n.stage) : '修为莫测';
      o.label.setText(`${n.name}·${realmTxt}`).setColor(col).setPosition(n.x, n.y - 160 * sc).setScale(0.72 / z).setDepth(1001 + n.y / 100);
      const pl = S().player;
      o.label.setVisible(z > 0.05 && (hostile || n.famous !== undefined || n.partner || n.companion || dist(n.x, n.y, pl.x, pl.y) < 240 || (z < 0.25 && n.realm >= 3)));
    }
    for (const [id, o] of this.npcSprites) if (!seen.has(id)) { o.spr.destroy(); o.label.destroy(); this.npcSprites.delete(id); }
  }

  // ---------------- 妖兽 ----------------
  playerLevel() { const p = S().player; return p.realm === 0 ? 0 : p.realm === 1 ? 1 + p.stage / 5 : [0, 0, 4.5, 6.5, 8.5, 10][p.realm]; }

  updateMonsters(dt: number) {
    const s = S(); const p = s.player; const R = this.st.senseRadius;
    this.monT -= dt;
    const safe = inSafeZone(p.x, p.y);
    if (this.monT <= 0) {
      this.monT = 1.2;
      // 清理远处
      this.mons = this.mons.filter((m) => { if (dist(m.x, m.y, p.x, p.y) > Math.max(2500, R * 3)) { m.spr.destroy(); return false; } return true; });
      const want = safe ? 0 : Math.round(clamp(4 + R / 500, 4, 12));
      if (this.mons.length < want) {
        for (let i = 0; i < 4; i++) {
          const a = rng.range(0, Math.PI * 2), d = rng.range(Math.max(500, R * 0.6), Math.max(1100, R * 1.4));
          const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
          if (x < 100 || y < 100 || x > WORLD_W - 100 || y > WORLD_H - 100) continue;
          if (inSafeZone(x, y)) continue;
          const land = isLand(x, y);
          if (!land && p.realm < 2) continue;
          const rg = regionAtLand(x, y);
          const pl = this.playerLevel();
          let lo = rg.danger[0], hi = rg.danger[1];
          if (rg.id === 'yue' || rg.id === 'jiang') lo = 0;
          const center = clamp(pl + rng.range(-1.5, 1.0), lo, hi);
          const level = clamp(Math.round(center), 0, 10);
          const biome = land ? biomeAt(x, y) : 'sea';
          const type = pickMonster(biome as any, level);
          const spr = this.add.image(x, y, monsterKey(this, type)).setOrigin(0.5, 0.85);
          this.mons.push({ id: this.monId++, type, level, x, y, tx: x, ty: y, spr, t: 0, aggro: false, sea: !land });
          break;
        }
      }
    }
    const z = this.curZoom; const sc = 0.3 / z;
    for (const m of this.mons) {
      const d = dist(m.x, m.y, p.x, p.y);
      const aggroR = (260 + 35 * m.level) * (1 - this.st.stealth) * (p.meditating ? 0.8 : 1);
      const lvGap = m.level - this.playerLevel();
      m.aggro = d < aggroR && !safe && this.immune <= 0 && lvGap > -3;
      const spd = m.aggro ? 150 + m.level * 22 : 50;
      if (m.aggro) { m.tx = p.x; m.ty = p.y; }
      else { m.t -= dt; if (m.t <= 0) { m.t = rng.range(2, 6); m.tx = m.x + rng.range(-250, 250); m.ty = m.y + rng.range(-250, 250); } }
      const dx = m.tx - m.x, dy = m.ty - m.y, dd = Math.hypot(dx, dy);
      if (dd > 5) {
        const nx = m.x + dx / dd * spd * dt, ny = m.y + dy / dd * spd * dt;
        if (isLand(nx, ny) !== m.sea && !inSafeZone(nx, ny)) { m.x = nx; m.y = ny; if (Math.abs(dx) > 2) m.spr.setFlipX(dx < 0); } else m.t = 0;
      }
      const vis = d < R;
      m.spr.setVisible(vis).setPosition(m.x, m.y).setScale(sc * 0.75 * (m.level >= 6 ? 1.2 : 1)).setDepth(1000 + m.y / 100);
      if (m.aggro && vis) m.spr.setTint(0xffb0a0); else m.spr.clearTint();
      if (d < 40 / Math.max(0.35, z) * 0.6 + 25 && !this.busy && this.immune <= 0) { this.monsterBattle(m); break; }
    }
  }

  monsterBattle(m: Mon) {
    const group = this.mons.filter((o) => o !== m && dist(o.x, o.y, m.x, m.y) < 400 && Math.abs(o.level - m.level) <= 2).slice(0, m.level <= 2 ? 2 : 1);
    const all = [m, ...group];
    for (const o of all) { o.spr.destroy(); }
    this.mons = this.mons.filter((o) => !all.includes(o));
    const p = S().player;
    const biome = m.sea ? 'sea' : biomeAt(p.x, p.y);
    this.startBattle({ kind: 'monster', enemies: all.map((o) => beastSpec(o.type, o.level)), biome, title: all.length > 1 ? '妖兽群袭' : '遭遇妖兽', canFlee: true });
  }

  // ---------------- 灵草 & 奇遇 ----------------
  herbAt(gx: number, gy: number): Herb | null {
    const h = hash2(gx, gy, 313);
    if (h > 0.11) return null;
    const x = gx * HERB_CELL + hash2(gx, gy, 314) * HERB_CELL, y = gy * HERB_CELL + hash2(gx, gy, 315) * HERB_CELL;
    if (!isLand(x, y) || inSafeZone(x, y)) return null;
    const key = gx + '_' + gy;
    const taken = S().herbTaken[key];
    if (taken !== undefined && S().day - taken < 150) return null;
    const rg = regionAtLand(x, y);
    const maxR = clamp(Math.ceil((rg.danger[1] + 1) / 2), 1, 5);
    const r = new RNG(Math.floor(h * 1e9) + Math.floor(S().day / 150));
    const pool = allItems().filter((d) => d.herbBase && d.rarity <= maxR && d.rarity >= Math.max(1, maxR - 2));
    const weights: [string, number][] = pool.map((d) => [d.id, d.rarity === 5 ? 0.15 : 6 / d.rarity]);
    const id = r.weighted(weights);
    const q = r.chance(0.12) ? 1 : r.chance(0.02) ? 2 : 0;
    return { key, id, q, x, y };
  }

  scanNodes() {
    const s = S(); const p = s.player; const R = this.st.senseRadius;
    const hasTujia = p.equipped.some((u) => p.inv.find((e) => e.uid === u)?.id === 'tujialong');
    const HR = Math.min(R * (hasTujia ? 1.6 : 1), 6000);
    const seen = new Set<string>();
    const z = this.curZoom; const sc = 0.45 / z;
    const g0x = Math.floor((p.x - HR) / HERB_CELL), g1x = Math.floor((p.x + HR) / HERB_CELL);
    const g0y = Math.floor((p.y - HR) / HERB_CELL), g1y = Math.floor((p.y + HR) / HERB_CELL);
    if ((g1x - g0x) * (g1y - g0y) < 4000) {
      for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
        const key = gx + '_' + gy;
        let h = this.herbs.get(key) || null;
        if (!h) { h = this.herbAt(gx, gy); if (!h) continue; }
        if (dist(h.x, h.y, p.x, p.y) > HR) continue;
        seen.add(key);
        if (!h.spr) {
          h.glow = this.add.image(h.x, h.y, 'glow').setTint(h.q ? 0xffe080 : 0x9fffc0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setDepth(5);
          h.spr = this.add.image(h.x, h.y, itemTexKey(this, h.id)).setDepth(6);
          this.herbs.set(key, h);
        }
        h.spr.setScale(sc * 0.7); h.glow!.setScale(sc * 1.4 * (0.9 + 0.1 * Math.sin(this.time.now / 300)));
      }
    }
    for (const [k, h] of this.herbs) if (!seen.has(k)) { h.spr?.destroy(); h.glow?.destroy(); this.herbs.delete(k); }
    // 奇遇
    const ER = Math.min(R, 6000);
    const seenE = new Set<string>();
    const e0x = Math.floor((p.x - ER) / EV_CELL), e1x = Math.floor((p.x + ER) / EV_CELL), e0y = Math.floor((p.y - ER) / EV_CELL), e1y = Math.floor((p.y + ER) / EV_CELL);
    for (let gy = e0y; gy <= e1y; gy++) for (let gx = e0x; gx <= e1x; gx++) {
      const h = hash2(gx, gy, 777); if (h > 0.3) continue;
      const key = 'e' + gx + '_' + gy;
      const done = s.flags['ev_' + key]; if (done !== undefined && s.day - done < 400) continue;
      const x = gx * EV_CELL + hash2(gx, gy, 778) * EV_CELL, y = gy * EV_CELL + hash2(gx, gy, 779) * EV_CELL;
      if (!isLand(x, y) || inSafeZone(x, y) || dist(x, y, p.x, p.y) > ER) continue;
      seenE.add(key);
      let e = this.evSpots.get(key);
      if (!e) { e = { key, x, y, spr: this.add.image(x, y, markerKey(this, 'event')).setDepth(7) }; this.evSpots.set(key, e); }
      e.spr!.setScale(sc * 0.8).setAlpha(0.75 + 0.25 * Math.sin(this.time.now / 250));
    }
    for (const [k, e] of this.evSpots) if (!seenE.has(k)) { e.spr?.destroy(); this.evSpots.delete(k); }
    // 宝物事件标记
    for (const ev of s.events) {
      if (ev.taken || ev.until < s.day) continue;
      let mk = this.evMarkers.get(ev.id);
      if (!mk) { mk = this.add.image(ev.x, ev.y, 'glow').setTint(0xffd060).setBlendMode(Phaser.BlendModes.ADD).setDepth(8); this.evMarkers.set(ev.id, mk); }
      mk.setScale(sc * 3 * (0.8 + 0.2 * Math.sin(this.time.now / 200)));
    }
    for (const [id, mk] of this.evMarkers) { const ev = s.events.find((e) => e.id === id); if (!ev || ev.taken || ev.until < s.day) { mk.destroy(); this.evMarkers.delete(id); } }
  }

  checkPickup() {
    const s = S(); const p = s.player; const z = this.curZoom;
    const r = Math.max(50, 30 / z);
    for (const [k, h] of this.herbs) {
      if (dist(h.x, h.y, p.x, p.y) < r) {
        s.herbTaken[k] = s.day;
        const n = rng.chance(0.3) ? 2 : 1;
        addItem(p, h.id, n, { q: h.q });
        toast(`采得 ${['', '百年', '三百年'][h.q] || ''}${item(h.id).name} ×${n}`, 'good');
        bus.emit('sfx', 'herb'); bus.emit('refresh');
        h.spr?.destroy(); h.glow?.destroy(); this.herbs.delete(k);
      }
    }
    if (this.busy) return;
    for (const [k, e] of this.evSpots) {
      if (dist(e.x, e.y, p.x, p.y) < r) {
        s.flags['ev_' + k] = s.day;
        e.spr?.destroy(); this.evSpots.delete(k);
        this.triggerRandomEvent(e.x, e.y);
        return;
      }
    }
  }

  triggerRandomEvent(x: number, y: number) {
    const p = S().player;
    const pool = EVENTS.filter((e) => (e.minRealm ?? 0) <= p.realm && (e.maxRealm ?? 9) >= p.realm);
    const ev = rng.weighted(pool.map((e) => [e, e.weight] as [any, number]));
    p.meditating = false;
    this.moveTarget = null;
    bus.emit('randomEvent', ev, x, y);
  }

  checkTreasureEvents() {
    const s = S(); const p = s.player;
    for (const ev of s.events) {
      if (ev.taken || ev.until < s.day) continue;
      if (dist(ev.x, ev.y, p.x, p.y) < 140 && !this.busy) { this.treasureBattle(ev); return; }
    }
  }

  treasureBattle(ev: WorldEvent) {
    const lvl = clamp(ev.level + 1, 1, 10);
    const biome = biomeAt(ev.x, ev.y);
    const type = pickMonster(biome, lvl);
    ev.taken = true;
    this.startBattle({ kind: 'event', enemies: [beastSpec(type, lvl, true, '守宝妖兽')], biome, title: ev.name, canFlee: true }, (r) => {
      if (r.win) { const id = treasureLoot(ev.level); addItem(S().player, id, 1); S().player.heat = Math.min(100, S().player.heat + 10); toast(`夺得宝物：${item(id).name}！`, 'gold'); addNews(`韩立在${ev.name}夺得${item(id).name}。`, 'event'); }
      else ev.taken = false;
    });
  }

  // ---------------- 交互 ----------------
  checkNear() {
    const s = S(); const p = s.player;
    let best: LocationDef | null = null, bd = 1e9;
    for (const l of LOCATIONS) { if (!s.known[l.id]) continue; const d = dist(l.x, l.y, p.x, p.y); if (d < 280 && d < bd) { bd = d; best = l; } }
    let bn: NPC | null = null; let nd = 1e9;
    for (const n of s.npcs) { if (!n.alive) continue; const d = dist(n.x, n.y, p.x, p.y); if (d < 110 && d < nd && this.canSeeNPC(n)) { nd = d; bn = n; } }
    if (best !== this.nearLoc || bn !== this.nearNpc) { this.nearLoc = best; this.nearNpc = bn; bus.emit('nearChange', best, bn); }
    if (best && best.type !== 'danger' && best.type !== 'secret' && best.type !== 'portal') p.lastSafe = best.id;
  }

  interact() {
    if (this.nearNpc) bus.emit('npcInteract', this.nearNpc);
    else if (this.nearLoc) bus.emit('locInteract', this.nearLoc);
  }

  checkRegion(force: boolean) {
    const p = S().player;
    const rg = regionAtLand(p.x, p.y);
    if (rg.name !== this.region || force) { this.region = rg.name; bus.emit('region', rg); }
  }

  // ---------------- 战斗 ----------------
  onAmbush(n: NPC) {
    if (this.busy || this.immune > 0) return;
    n.goal = 'idle'; n.goalT = 20;
    toast(`${n.name}${n.grudge > 40 ? '前来寻仇' : '起了杀人夺宝之心'}，突然出手！`, 'bad');
    bus.emit('sfx', 'warn');
    const p = S().player;
    // 同伙
    const extra = S().npcs.filter((o) => o !== n && o.alive && o.goal === 'stalk' && dist(o.x, o.y, p.x, p.y) < 300);
    extra.forEach((o) => { o.goal = 'idle'; o.goalT = 20; });
    this.startBattle({ kind: 'npc', enemies: [n, ...extra].map((o) => npcSpec(o)), biome: isLand(p.x, p.y) ? biomeAt(p.x, p.y) : 'sea', title: '杀人夺宝', canFlee: true, ambush: true });
  }

  fightNPC(n: NPC, spar = false) {
    const p = S().player;
    this.startBattle({ kind: spar ? 'spar' : 'npc', enemies: [npcSpec(n)], biome: isLand(p.x, p.y) ? biomeAt(p.x, p.y) : 'sea', title: spar ? '切磋' : `斗法·${n.name}`, canFlee: !spar }, (r) => {
      if (spar) {
        if (r.win) { n.favor = Math.min(100, n.favor + 6); toast(`${n.name}：“道友好手段，在下佩服！”（好感 +6）`, 'good'); addExp(expNeeded(p.realm, p.stage) * 0.03); }
        else toast(`${n.name}：“承让了。”`, 'info');
      }
    });
    if (!spar) { n.grudge = Math.max(n.grudge, 60); n.favor = Math.min(n.favor, -30); }
  }

  bossFight(l: LocationDef) {
    const key = l.boss!; const b = BOSSES[key];
    const s = S();
    const last = s.flags['boss_' + l.id];
    if (last !== undefined && s.day - last < 720) { toast(`${b.name}已被斩杀，此地暂时平静（约${Math.ceil((720 - (s.day - last)) / 30)}个月后会有新的妖物盘踞）。`, 'info'); return; }
    const spec = bossSpec(key);
    const adds: EnemySpec[] = b.level >= 6 ? [beastSpec(b.mtype === 'puppet' ? 'puppet' : pickMonster(biomeAt(l.x, l.y), b.level - 2), b.level - 2)] : [];
    this.startBattle({ kind: 'boss', enemies: [spec, ...adds], biome: biomeAt(l.x, l.y), title: `${l.name}·${b.name}`, canFlee: true }, (r) => {
      if (!r.win) return;
      s.flags['boss_' + l.id] = s.day;
      const p = s.player; const got: string[] = [];
      if (b.first && !s.flags['first_' + l.id]) { s.flags['first_' + l.id] = true; addItem(p, b.first, 1); got.push(item(b.first).name); }
      for (const [id, c] of b.loot) if (rng.chance(c)) { addItem(p, id, 1, item(id).herbBase ? { q: rng.int(1, 3) } : {}); got.push(item(id).name); }
      toast(`斩杀${b.name}！获得：${got.join('、')}`, 'gold');
      addNews(`韩立于${l.name}斩杀了${b.name}！`, 'kill');
      bus.emit('lootShow', { title: `斩杀${b.name}`, items: got });
    });
  }

  startBattle(cfg: Omit<BattleConfig, 'onEnd'>, after?: (r: BattleResult) => void) {
    if (this.busy) return;
    this.busy = true; this.moveTarget = null;
    const p = S().player; p.meditating = false;
    const allies = S().npcs.filter((n) => n.alive && n.companion && dist(n.x, n.y, p.x, p.y) < 1500).map((n) => n.id);
    this.cameras.main.setVisible(false);
    this.scene.pause();
    this.scene.launch('battle', { ...cfg, allies, onEnd: (r: BattleResult) => { this.scene.resume(); this.cameras.main.setVisible(true); this.busy = false; this.afterBattle(cfg, r); after?.(r); } } as BattleConfig);
  }

  afterBattle(cfg: Omit<BattleConfig, 'onEnd'>, r: BattleResult) {
    const s = S(); const p = s.player; const st = computeStats(p);
    this.immune = 4;
    const lines: string[] = [];
    if (r.died) {
      const msgs = deathPenalty(r.killerName);
      const home = LOCATIONS.find((l) => l.id === p.lastSafe) || LOCATIONS[0];
      p.x = home.x; p.y = home.y + 120;
      this.immune = 8;
      for (const e of cfg.enemies) if (e.npcId) { const n = s.npcs.find((x) => x.id === e.npcId); if (n) { n.goal = 'idle'; n.goalT = 60; } }
      bus.emit('death', { killer: r.killerName, msgs, place: home.name });
      saveGame();
      return;
    }
    if (r.spar) return;
    // 妖兽
    let expGain = 0, ls = 0;
    for (const b of r.beastsKilled) {
      for (const l of beastLoot(b)) { addItem(p, l.id, l.n, l.q !== undefined ? { q: l.q } : {}); lines.push(`${item(l.id).name}×${l.n}`); }
      const [br, bs] = [b.realm, b.stage];
      expGain += REALMS[br].rate * stageMult(br, bs) * (b.boss ? 30 : 7);
      ls += Math.round(4 * Math.pow(2.4, b.level ?? 0) * rng.range(0.5, 1.2));
    }
    // 修士
    for (const id of [...r.killed, ...r.captured.filter((c) => c.startsWith('n_') || c.startsWith('f_'))]) {
      const n = s.npcs.find((x) => x.id === id); if (!n || !n.alive) continue;
      n.alive = false; n.deathDay = s.day; n.killedBy = '韩立'; n.companion = false;
      const bag = makeBag(n, st.sense);
      p.inv.push(bag);
      lines.push(`${n.name}的储物袋`);
      p.kills++;
      expGain += REALMS[n.realm].rate * stageMult(n.realm, n.stage) * 12;
      const selfDefense = cfg.kind === 'npc' && (cfg as any).ambush || n.align < -0.3 || n.grudge > 40;
      if (!selfDefense) p.rep.evil += n.align > 0.3 ? 6 : 2; else p.rep.good += n.align < -0.3 ? 2 : 0;
      if (n.famous || n.realm >= 3) addNews(`韩立斩杀了${n.name}（${realmName(n.realm, n.stage)}）！`, 'kill');
      // 同门记仇
      if (n.sect) for (const o of s.npcs) if (o.alive && o.sect === n.sect && dist(o.x, o.y, n.x, n.y) < 3500) { o.grudge = Math.min(100, o.grudge + 25); o.favor -= 15; }
      for (const o of s.npcs) if (o.alive && o.partner && n.partner) { /* no-op */ }
      if (n.partner) { toast(`你亲手杀死了道侣${n.name}……`, 'bad'); }
    }
    for (const id of r.enemyFled) { const n = s.npcs.find((x) => x.id === id); if (n) { n.grudge = Math.min(100, n.grudge + 35); n.goal = 'flee'; n.goalT = 15; } }
    if (expGain > 0) { addExp(expGain); lines.unshift(`修为 +${Math.round(expGain)}`); }
    if (ls > 0) { p.lingshi += ls; lines.push(`灵石 +${ls}`); }
    if (r.win && lines.length) bus.emit('lootShow', { title: cfg.title + ' · 胜', items: lines });
    if (r.fled) toast('你成功遁走了。', 'info');
    bus.emit('refresh');
  }

  // ---------------- 外部调用 ----------------
  teleport(x: number, y: number) {
    const p = S().player; p.x = x; p.y = y; this.moveTarget = null;
    for (const m of this.mons) m.spr.destroy(); this.mons = [];
    this.revealAround(true);
    this.cameras.main.flash(300, 240, 235, 220);
  }
}
