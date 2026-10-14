// 即时斗法场景
import Phaser from 'phaser';
import { S, NPC } from '../core/state';
import { computeStats, invFind, removeItem, countItem } from '../core/player';
import { item, ArtDef } from '../data/items';
import { SPELLS, TECHS } from '../data/techniques';
import { REALMS, realmName } from '../data/realms';
import { input, consume, consumeArr } from '../core/input';
import { bus, toast } from '../core/bus';
import { rng, clamp, dist } from '../core/rng';
import { chibiKey, monsterKey, registerFx } from './texreg';
import { MONSTER_TYPES } from '../core/textures';
import { BIOME_COLORS } from '../data/world';

export interface EnemySpec {
  name: string; kind: 'npc' | 'beast'; npcId?: string; mtype?: string; level?: number; realm: number; stage: number;
  hp: number; atk: number; def: number; sense: number; arch: string; arts: string[]; spells?: string[]; boss?: boolean; scale?: number;
  speed: number; innate?: string; caution?: number; hpFrac?: number;
}
export interface BattleConfig {
  kind: 'monster' | 'npc' | 'boss' | 'spar' | 'event';
  enemies: EnemySpec[]; allies?: string[]; biome: string; title: string; canFlee: boolean; ambush?: boolean;
  onEnd: (r: BattleResult) => void;
}
export interface BattleResult { win: boolean; fled: boolean; died: boolean; killed: string[]; enemyFled: string[]; captured: string[]; beastsKilled: EnemySpec[]; killerName?: string; spar?: boolean; }

const AW = 2000, AH = 1300;
const ELEM: Record<string, number> = { fire: 0xff6a30, ice: 0x88ddff, thunder: 0xfff070, metal: 0xf0f0f0, wood: 0x66ee88, ghost: 0xa080ff, demon: 0xdd2244, water: 0x55aaff, earth: 0xccaa66, none: 0xfff2cc };

interface Unit {
  id: number; side: 0 | 1; x: number; y: number; vx: number; vy: number; r: number;
  hp: number; maxHp: number; mp: number; maxMp: number; atk: number; def: number; speed: number; sense: number;
  spr: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics; label?: Phaser.GameObjects.Text;
  isPlayer?: boolean; spec?: EnemySpec; npc?: NPC; name: string; boss?: boolean; arch: string;
  stun: number; slow: number; shield: number; invuln: number; artLock: number; busy: number; dead: boolean;
  cds: Record<string, number>; patterns: string[]; dodgeCd: number; fleeing: boolean; healed: boolean;
  summon?: { owner: Unit; life: number; kind: string }; facing: number; bob: number; arts: ArtObj[]; crit: number; critDmg: number; vamp: number; dmgRed: number; regen: number;
  ally?: boolean; aimX?: number; aimY?: number; charge?: { tx: number; ty: number; t: number }; lastHitBy?: Unit;
}
interface Proj { x: number; y: number; vx: number; vy: number; r: number; dmg: number; side: 0 | 1; life: number; pierce: number; hit: Set<number>; spr: Phaser.GameObjects.Image; elem: string; slow?: number; stun?: number; homing?: Unit; turn?: number; owner: Unit; block: boolean; spin?: number; trail?: boolean; }
interface Zone { x: number; y: number; r: number; t: number; t0: number; dmg: number; side: 0 | 1; elem: string; stun?: number; spr: Phaser.GameObjects.Image; owner: Unit; shape: 'circle' | 'line'; ang?: number; len?: number; w?: number; g?: Phaser.GameObjects.Graphics; freeze?: number; }
interface ArtObj { owner: Unit; def: ArtDef; id: string; name: string; power: number; count: number; t: number; sprs: Phaser.GameObjects.Image[]; st: { mode: 'orbit' | 'go' | 'back'; tx: number; ty: number; target?: Unit; t: number; x: number; y: number; hit?: boolean }[]; jilian?: boolean; summons?: Unit[]; }
interface Rock { x: number; y: number; r: number; }

export class BattleScene extends Phaser.Scene {
  cfg!: BattleConfig;
  units: Unit[] = []; projs: Proj[] = []; zones: Zone[] = []; rocks: Rock[] = [];
  player!: Unit; uidc = 1; ended = false; result!: BattleResult;
  keys: any; emitters: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};
  fleeT = 0; hudT = 0; elapsed = 0; attackCd = 0; dashCd = 0; itemCd = 0; skillCds: Record<string, number> = {};
  playerSpells: string[] = []; diffDmg = 1; diffHp = 1; dashMul = 1; dashCdMax = 1.2; swordMul = 1; mods: Record<string, number> = {};
  bgKey = ''; pointerDown = false; aimAngle = 0; mouseAim = false; slowmo = 1; lastBolt = 0;

  constructor() { super('battle'); }

  init(cfg: BattleConfig) {
    this.cfg = cfg; this.units = []; this.projs = []; this.zones = []; this.rocks = []; this.ended = false;
    this.result = { win: false, fled: false, died: false, killed: [], enemyFled: [], captured: [], beastsKilled: [], spar: cfg.kind === 'spar' };
    this.fleeT = 0; this.elapsed = 0; this.attackCd = 0; this.dashCd = 0; this.skillCds = {}; this.emitters = {};
  }

  create() {
    registerFx(this);
    const d = S().difficulty;
    this.diffDmg = d === 'easy' ? 0.55 : d === 'normal' ? 0.8 : 1.05;
    this.diffHp = d === 'easy' ? 0.8 : d === 'normal' ? 0.95 : 1.1;
    this.drawArena();
    this.cameras.main.setBounds(0, 0, AW, AH);
    this.cameras.main.setBackgroundColor('#1d1a16');
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    for (const [k, c] of Object.entries(ELEM)) {
      this.emitters[k] = this.add.particles(0, 0, 'spark', { speed: { min: 60, max: 260 }, lifespan: { min: 250, max: 600 }, scale: { start: 1.4, end: 0 }, tint: c, blendMode: 'ADD', emitting: false }).setDepth(9000);
    }
    this.emitters.ink = this.add.particles(0, 0, 'ink', { speed: { min: 30, max: 160 }, lifespan: 700, scale: { start: 0.9, end: 0.1 }, alpha: { start: 0.8, end: 0 }, tint: 0x201812, emitting: false, rotate: { min: 0, max: 360 } }).setDepth(50);
    this.createPlayer();
    for (const id of this.cfg.allies || []) { const n = S().npcs.find((x) => x.id === id && x.alive); if (n) this.createNPCUnit(n, 0, this.player.x - 80 + rng.range(-40, 40), this.player.y + rng.range(-60, 60)); }
    const ne = this.cfg.enemies.length;
    this.cfg.enemies.forEach((e, i) => {
      const a = (i / Math.max(1, ne)) * Math.PI - Math.PI / 2;
      const x = this.cfg.ambush ? this.player.x + Math.cos(a * 2) * 260 : AW * 0.72 + Math.cos(a) * 160;
      const y = this.cfg.ambush ? this.player.y + Math.sin(a * 2) * 260 : AH / 2 + Math.sin(a) * 260;
      this.createEnemy(e, clamp(x, 80, AW - 80), clamp(y, 80, AH - 80));
    });
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,R,F,ONE,TWO,THREE,FOUR,SHIFT,G');
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (input.touch) return; if (p.rightButtonDown()) input.dash = true; else this.pointerDown = true; this.mouseAim = true; });
    this.input.on('pointerup', () => { this.pointerDown = false; });
    this.input.on('pointermove', () => { if (!input.touch) this.mouseAim = true; });
    this.cameras.main.startFollow(this.player.spr, true, 0.12, 0.12);
    this.cameras.main.fadeIn(350, 20, 16, 12);
    bus.emit('battleStart', { title: this.cfg.title, spells: this.playerSpells, canFlee: this.cfg.canFlee, boss: this.units.find((u) => u.boss)?.name });
    bus.emit('sfx', 'battle');
    this.events.once('shutdown', () => { this.scale.off('resize', this.fitZoom, this); if (this.textures.exists(this.bgKey)) this.textures.remove(this.bgKey); });
  }

  fitZoom() {
    const w = this.scale.width, h = this.scale.height;
    const z = Math.min(1.25, Math.max(0.55, Math.min(w / 1100, h / 720)));
    this.cameras.main.setZoom(z);
  }

  drawArena() {
    const c = document.createElement('canvas'); c.width = AW / 2; c.height = AH / 2;
    const x = c.getContext('2d')!;
    const col = (BIOME_COLORS as any)[this.cfg.biome] || BIOME_COLORS.plain;
    const sea = this.cfg.biome === 'sea';
    const base = sea ? [150, 178, 184] : col;
    x.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rng.chance(0.5) ? '255,250,235' : '40,35,28'},${rng.range(0.02, 0.06)})`; x.beginPath(); x.arc(rng.range(0, c.width), rng.range(0, c.height), rng.range(2, 18), 0, 6.28); x.fill(); }
    if (sea) { x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2; for (let i = 0; i < 120; i++) { const yy = rng.range(0, c.height), xx = rng.range(0, c.width); x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 20, yy - 6, xx + 40, yy); x.stroke(); } }
    else { x.strokeStyle = 'rgba(60,70,50,0.35)'; x.lineWidth = 2; for (let i = 0; i < 260; i++) { const xx = rng.range(0, c.width), yy = rng.range(0, c.height); x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + rng.range(-4, 4), yy - rng.range(6, 14)); x.stroke(); } }
    // 石头
    const nR = sea ? 4 : rng.int(5, 9);
    for (let i = 0; i < nR; i++) {
      const rx = rng.range(200, AW - 200), ry = rng.range(150, AH - 150), rr = rng.range(28, 62);
      if (dist(rx, ry, 360, AH / 2) < 220 || dist(rx, ry, AW * 0.72, AH / 2) < 300) continue;
      this.rocks.push({ x: rx, y: ry, r: rr });
      const X = rx / 2, Y = ry / 2, R = rr / 2;
      const g = x.createLinearGradient(X - R, Y - R, X + R, Y + R); g.addColorStop(0, sea ? '#6a8890' : '#7a8070'); g.addColorStop(1, '#2e3430');
      x.fillStyle = 'rgba(20,15,10,0.25)'; x.beginPath(); x.ellipse(X + 4, Y + R * 0.7, R * 1.1, R * 0.4, 0, 0, 6.28); x.fill();
      x.fillStyle = g; x.strokeStyle = 'rgba(30,26,22,0.9)'; x.lineWidth = 2.5;
      x.beginPath(); for (let k = 0; k <= 9; k++) { const a = (k / 9) * 6.28; const rad = R * (0.8 + 0.25 * Math.sin(k * 2.3 + i)); const px = X + Math.cos(a) * rad, py = Y + Math.sin(a) * rad * 0.85; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(240,235,220,0.35)'; x.beginPath(); x.moveTo(X - R * 0.4, Y - R * 0.3); x.lineTo(X, Y - R * 0.6); x.stroke();
    }
    // 边缘暗角
    const vg = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.3, c.width / 2, c.height / 2, c.width * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(25,18,12,0.55)');
    x.fillStyle = vg; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = 'rgba(30,24,18,0.8)'; x.lineWidth = 6; x.strokeRect(3, 3, c.width - 6, c.height - 6);
    this.bgKey = 'arena_' + Date.now();
    this.textures.addCanvas(this.bgKey, c);
    this.add.image(0, 0, this.bgKey).setOrigin(0).setScale(2).setDepth(-10);
  }

  // ---------------- 单位创建 ----------------
  mkUnit(side: 0 | 1, tex: string, x: number, y: number, scale: number, name: string): Unit {
    const shadow = this.add.image(x, y, 'shadow').setDepth(1).setScale(scale * 1.1);
    const spr = this.add.image(x, y, tex).setOrigin(0.5, 0.92).setScale(scale);
    const bar = this.add.graphics().setDepth(8000);
    const u: Unit = {
      id: this.uidc++, side, x, y, vx: 0, vy: 0, r: 24 * scale * 2, hp: 100, maxHp: 100, mp: 100, maxMp: 100, atk: 10, def: 5, speed: 200, sense: 10,
      spr, shadow, bar, name, arch: 'caster', stun: 0, slow: 0, shield: 0, invuln: 0, artLock: 0, busy: 0, dead: false, cds: {}, patterns: [], dodgeCd: 0, fleeing: false, healed: false,
      facing: 1, bob: rng.range(0, 6), arts: [], crit: 0.05, critDmg: 1.6, vamp: 0, dmgRed: 0, regen: 0,
    };
    u.r = Math.max(18, 26 * scale * 1.6);
    if (side === 1 || name) {
      u.label = this.add.text(x, y, name, { fontFamily: 'LXGW WenKai, KaiTi, serif', fontSize: '15px', color: side === 1 ? '#ffd6c8' : '#d8ffe8', stroke: '#1a120c', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(8001);
    }
    this.units.push(u);
    return u;
  }

  createPlayer() {
    const p = S().player; const st = computeStats(p);
    const u = this.mkUnit(0, chibiKey(this, 'hanli'), 360, AH / 2, 0.5, '');
    u.isPlayer = true; u.maxHp = st.maxHp; u.hp = clamp(p.hp, st.maxHp * 0.2, st.maxHp); u.maxMp = st.maxMp; u.mp = p.mp; u.atk = st.atk; u.def = st.def; u.sense = st.sense;
    u.speed = st.moveSpeed; u.crit = st.crit; u.critDmg = st.critDmg; this.mods = st.mods;
    u.vamp = st.mods.vamp || 0; u.dmgRed = st.mods.dmgRed || 0; u.regen = st.mods.regen || 0;
    this.dashMul = st.dash; this.dashCdMax = 1.1 * (1 - (st.mods.dashCd || 0)); this.swordMul = st.sword;
    this.player = u;
    // 法宝
    for (const uid of p.equipped) {
      const e = invFind(p, uid); if (!e) continue;
      const d = item(e.id); if (!d.art) continue;
      this.addArt(u, e.id, d.art, d.name, (1 + 0.1 * (e.refine || 0)) * (e.jilian ? 0.5 : 1), d.art.count ? (e.count ?? d.art.count) : 1, !!e.jilian);
    }
    // 神通
    const spells: string[] = [];
    for (const t of p.techs) { const td = TECHS[t]; if (td?.spell && (td.kind === 'spell' || t === p.mainTech)) spells.push(td.spell); }
    if (p.techs.includes('dayan') && p.realm >= 3) spells.push('jingshen');
    for (const uid of p.equipped) { const e = invFind(p, uid); const sk = e && item(e.id).art?.skill; if (sk && sk !== 'leidun') spells.push(sk); }
    if (p.inv.some((e) => e.id === 'jinleizhu') || p.equipped.some((x) => invFind(p, x)?.id === 'qingzhu')) { /* bixie via qingzhu skill */ }
    this.playerSpells = [...new Set(spells)].slice(0, 4);
  }

  createNPCUnit(n: NPC, side: 0 | 1, x: number, y: number, spec?: EnemySpec): Unit {
    const scale = 0.5 * (spec?.scale || 1);
    const u = this.mkUnit(side, chibiKey(this, n), x, y, scale, (side === 1 ? '' : '✦') + n.name);
    u.npc = n; u.spec = spec;
    const realm = n.realm;
    const sm = 1;
    const base = spec || ({} as EnemySpec);
    u.maxHp = Math.round((base.hp || REALMS[realm].hp) * (side === 1 ? this.diffHp : 1) * sm); u.hp = u.maxHp * (spec?.hpFrac ?? n.hpFrac ?? 1);
    if (side === 0) { u.hp = u.maxHp; }
    u.atk = base.atk || REALMS[realm].atk; u.def = base.def || REALMS[realm].def; u.sense = base.sense || REALMS[realm].sense;
    u.maxMp = 9999; u.mp = 9999; u.speed = 200 + realm * 20; u.arch = n.arch;
    u.patterns = this.patternsFor(n.arch, realm, !!spec?.boss, spec?.innate || n.innate, n.techs);
    for (const id of n.arts) { const d = item(id); if (d?.art && d.art.kind !== 'boat') this.addArt(u, id, d.art, d.name, 1, d.art.count || 1, false); }
    if (side === 0) u.ally = true;
    return u;
  }

  createEnemy(e: EnemySpec, x: number, y: number) {
    if (e.kind === 'npc' && e.npcId) {
      const n = S().npcs.find((k) => k.id === e.npcId);
      if (n) { const u = this.createNPCUnit(n, 1, x, y, e); u.boss = e.boss; u.label!.setText(n.name + ' · ' + realmName(n.realm, n.stage)); return u; }
    }
    const t = MONSTER_TYPES[e.mtype || 'wolf'];
    const scale = 0.55 * (e.scale || t?.scale || 1) * (e.boss ? 1.25 : 1);
    const u = this.mkUnit(1, monsterKey(this, e.mtype || 'wolf'), x, y, scale, e.name);
    u.spec = e; u.boss = e.boss; u.arch = 'beast';
    u.maxHp = Math.round(e.hp * this.diffHp); u.hp = u.maxHp; u.atk = e.atk; u.def = e.def; u.sense = e.sense; u.speed = e.speed; u.mp = 9999; u.maxMp = 9999;
    const shape = t?.shape || 'wolf';
    const pats = ['bite'];
    if (shape === 'snake' || shape === 'spider' || shape === 'fish') pats.push('spit');
    if (shape === 'ghost') { pats.length = 0; pats.push('bolt', 'spread'); }
    if (shape === 'jiao' || shape === 'bird') pats.push('spread');
    if (shape === 'bear' || shape === 'ape') pats.push('charge');
    if ((e.level ?? 0) >= 5) pats.push('aoe');
    if (e.boss) pats.push('ring', 'aoe', 'charge');
    if (e.innate === 'shihuo') pats.push('shihuo');
    u.patterns = [...new Set(pats)];
    if (u.label) u.label.setText(e.name + (e.level !== undefined ? ` · ${e.level}级` : ''));
    return u;
  }

  patternsFor(arch: string, realm: number, boss: boolean, innate?: string, techs?: string[]) {
    const p: string[] = [];
    switch (arch) {
      case 'sword': p.push('bolt', 'spread'); break;
      case 'caster': p.push('bolt', 'spread'); if (realm >= 2) p.push('aoe'); break;
      case 'body': p.push('charge', 'claw'); break;
      case 'demon': p.push('bolt', 'aoe'); if (realm >= 2) p.push('summon'); break;
      case 'summoner': p.push('bolt', 'summon'); break;
      case 'talisman': p.push('spread', 'aoe', 'shieldup'); break;
      case 'beast': p.push('bite', 'charge', 'spread'); break;
    }
    if (realm === 0) { p.length = 0; p.push('claw', 'charge'); }
    if (boss || realm >= 4) p.push('ring');
    if (innate === 'shihuo') p.push('shihuo');
    if (techs?.includes('yuanci')) p.push('beam');
    return [...new Set(p)];
  }

  addArt(owner: Unit, id: string, def: ArtDef, name: string, mul: number, count: number, jilian: boolean) {
    const passive = ['shield', 'armor', 'pearl', 'boat', 'wings'];
    if (passive.includes(def.kind)) {
      if (def.kind === 'shield' && owner.isPlayer) { /* 视觉护盾 */ }
      return;
    }
    const ao: ArtObj = { owner, def, id, name, power: def.power * mul, count, t: rng.range(0.3, 1.5), sprs: [], st: [], jilian };
    const tint = def.color ?? 0xffffff;
    const n = def.kind === 'swarm' || def.kind === 'needle' || def.kind === 'beast' && def.count ? Math.min(count, def.kind === 'swarm' ? 72 : 30) : def.kind === 'sword' || def.kind === 'arrow' ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const tex = def.kind === 'needle' ? 'needle' : def.kind === 'beast' ? 'dot' : 'flysword';
      const s = this.add.image(owner.x, owner.y, tex).setTint(tint).setDepth(7000).setBlendMode(Phaser.BlendModes.ADD);
      s.setScale(def.kind === 'swarm' ? 0.7 : def.kind === 'needle' ? 0.8 : def.kind === 'beast' ? 0.4 : 1.15);
      ao.sprs.push(s); ao.st.push({ mode: 'orbit', tx: 0, ty: 0, t: rng.range(0, 1), x: owner.x, y: owner.y });
    }
    if (def.kind === 'ring') {
      const rings = id === 'wuxinghuan' ? 5 : 1;
      for (let i = 0; i < rings; i++) { const s = this.add.image(owner.x, owner.y, 'rune').setTint(tint).setDepth(6999).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(rings > 1 ? 0.35 : 0.9); ao.sprs.push(s); ao.st.push({ mode: 'orbit', tx: 0, ty: 0, t: i / rings, x: 0, y: 0 }); }
    }
    if (def.kind === 'puppet' || def.kind === 'beast' && !def.count) {
      this.time.delayedCall(300, () => this.spawnSummon(owner, def, ao));
    }
    owner.arts.push(ao);
  }

  spawnSummon(owner: Unit, def: ArtDef, ao: ArtObj) {
    if (owner.dead || this.ended) return;
    const kind = def.summon || 'puppet1';
    const texMap: Record<string, string> = { puppet1: 'puppet', puppet2: 'puppet', puppet3: 'puppet', puppet5: 'puppet', spider: 'spider', tihun: 'ghost', tujia: 'bear', demon5: 'demon', jiao: 'jiao', ghost: 'ghost', bonegod: 'ghost' };
    const cnt = kind === 'demon5' ? 3 : 1;
    for (let i = 0; i < cnt; i++) {
      const u = this.mkUnit(owner.side, monsterKey(this, texMap[kind] || 'puppet'), owner.x + rng.range(-60, 60), owner.y + rng.range(-60, 60), kind === 'puppet5' || kind === 'demon5' ? 0.5 : 0.38, '');
      u.label?.destroy(); u.label = undefined;
      const m = 1 + (owner.isPlayer ? (this.mods.summon || 0) : 0);
      u.maxHp = Math.round(owner.maxHp * 0.35 * def.power * m); u.hp = u.maxHp; u.atk = owner.atk * 0.55 * def.power * m; u.def = owner.def * 0.8; u.speed = 210; u.mp = 9999;
      u.patterns = kind.startsWith('puppet') ? ['bolt'] : ['bite']; u.arch = 'beast';
      u.summon = { owner, life: 9999, kind }; u.ally = owner.side === 0;
      u.spr.setAlpha(0.95);
      this.emitters.wood.explode(14, u.x, u.y);
    }
  }

  // ---------------- 主循环 ----------------
  update(_t: number, dms: number) {
    if (this.ended) return;
    let dt = Math.min(0.05, dms / 1000) * this.slowmo;
    this.elapsed += dt;
    this.handlePlayer(dt);
    for (const u of this.units) if (!u.dead && !u.isPlayer) this.aiUnit(u, dt);
    for (const u of this.units) if (!u.dead) this.stepPhysics(u, dt);
    for (const u of this.units) if (!u.dead) this.updateArts(u, dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    for (const u of this.units) this.drawUnit(u);
    this.checkEnd();
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      const p = this.player;
      const boss = this.units.find((u) => u.boss && !u.dead) || this.units.find((u) => u.side === 1 && !u.dead && !u.summon);
      bus.emit('battleHud', { hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, cds: this.skillCds, spells: this.playerSpells, dashCd: this.dashCd, dashMax: this.dashCdMax, flee: this.fleeT, boss: boss ? { name: boss.label?.text || boss.name, hp: boss.hp, maxHp: boss.maxHp } : null, enemies: this.units.filter((u) => u.side === 1 && !u.dead && !u.summon).length });
    }
  }

  nearestEnemy(u: Unit, range = 99999): Unit | undefined {
    let best: Unit | undefined, bd = range;
    for (const o of this.units) { if (o.dead || o.side === u.side) continue; const d = dist(u.x, u.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  handlePlayer(dt: number) {
    const u = this.player; const k = this.keys;
    if (u.dead) return;
    let mx = 0, my = 0;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1; if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1; if (k.S.isDown || k.DOWN.isDown) my += 1;
    if (Math.abs(input.jx) > 0.1 || Math.abs(input.jy) > 0.1) { mx = input.jx; my = input.jy; }
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const sp = u.speed * (u.slow > 0 ? 0.55 : 1) * (u.stun > 0 ? 0 : 1);
    u.vx = mx * sp; u.vy = my * sp;
    if (mx) u.facing = mx > 0 ? 1 : -1;
    // 瞄准
    const tgt = this.nearestEnemy(u, 900);
    let ax: number, ay: number;
    if (!input.touch && this.mouseAim && !(k.SHIFT.isDown && tgt)) { const p = this.input.activePointer; ax = p.worldX; ay = p.worldY; }
    else if (tgt) { ax = tgt.x; ay = tgt.y - 20; }
    else { ax = u.x + u.facing * 100; ay = u.y; }
    u.aimX = ax; u.aimY = ay;
    this.aimAngle = Math.atan2(ay - (u.y - 24), ax - u.x);
    // 冷却
    this.attackCd -= dt; this.dashCd -= dt; this.itemCd -= dt;
    for (const s in this.skillCds) this.skillCds[s] -= dt;
    u.mp = Math.min(u.maxMp, u.mp + u.maxMp * 0.025 * dt * (1 + (this.mods.mpRegen || 0)));
    if (u.regen) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.regen * dt);
    if (u.stun > 0) return;
    // 普攻
    const wantAtk = this.pointerDown || input.attack || k.SHIFT.isDown || (input.touch && tgt && dist(u.x, u.y, tgt.x, tgt.y) < 560 && (S().flags.autoAttack ?? true));
    if (wantAtk && this.attackCd <= 0) this.playerBasic();
    // 身法
    if ((Phaser.Input.Keyboard.JustDown(k.SPACE) || consume('dash')) && this.dashCd <= 0) this.playerDash(mx, my);
    // 神通
    const sk = [k.Q, k.E, k.R, k.F];
    for (let i = 0; i < 4; i++) if (Phaser.Input.Keyboard.JustDown(sk[i]) || consumeArr(input.skill, i)) this.castSpell(u, this.playerSpells[i], ax, ay);
    const it = [k.ONE, k.TWO, k.THREE, k.FOUR];
    for (let i = 0; i < 4; i++) if (Phaser.Input.Keyboard.JustDown(it[i]) || consumeArr(input.item, i)) this.useQuick(i);
    if (Phaser.Input.Keyboard.JustDown(k.G) || consume('flee')) this.tryTalismanFlee();
    // 遁逃：贴近边缘
    const edge = u.x < 50 || u.y < 50 || u.x > AW - 50 || u.y > AH - 50;
    const near = this.units.some((o) => !o.dead && o.side === 1 && !o.summon && dist(o.x, o.y, u.x, u.y) < 170);
    if (edge && this.cfg.canFlee && !near) { this.fleeT += dt; if (this.fleeT > 1.4 || this.mods.escape) this.endBattle('fled'); }
    else this.fleeT = Math.max(0, this.fleeT - dt * 2);
  }

  playerBasic() {
    const u = this.player; const p = S().player;
    if (p.realm === 0) {
      // 眨眼剑法：近身剑光
      this.attackCd = 0.42;
      const a = this.aimAngle;
      const sx = u.x + Math.cos(a) * 46, sy = u.y - 24 + Math.sin(a) * 46;
      const sl = this.add.image(sx, sy, 'slash').setRotation(a).setTint(0xfff2cc).setBlendMode(Phaser.BlendModes.ADD).setDepth(7500).setScale(0.8);
      this.tweens.add({ targets: sl, alpha: 0, scale: 1.1, duration: 180, onComplete: () => sl.destroy() });
      for (const o of this.units) if (!o.dead && o.side === 1 && dist(sx, sy, o.x, o.y - 20) < 70 + o.r * 0.5) this.hit(o, u.atk * 1.05, u, 'metal');
      bus.emit('sfx', 'slash');
      return;
    }
    this.attackCd = 0.32;
    const a = this.aimAngle + rng.range(-0.04, 0.04);
    this.fire(u, a, 640, u.atk * 0.62, 'none', { r: 10, scale: 0.55, tex: 'glow' });
    if (Date.now() - this.lastBolt > 90) { bus.emit('sfx', 'bolt'); this.lastBolt = Date.now(); }
  }

  playerDash(mx: number, my: number) {
    const u = this.player; const p = S().player;
    const hasWings = p.equipped.some((x) => invFind(p, x)?.id === 'fengleichi');
    let a = Math.hypot(mx, my) > 0.1 ? Math.atan2(my, mx) : this.aimAngle;
    if (hasWings && u.mp >= 20) {
      u.mp -= 20; this.dashCd = 0.9;
      const d = 400; const ox = u.x, oy = u.y;
      u.x = clamp(u.x + Math.cos(a) * d, 30, AW - 30); u.y = clamp(u.y + Math.sin(a) * d, 30, AH - 30);
      u.invuln = 0.35;
      const g = this.add.graphics().setDepth(7600); g.lineStyle(5, 0x99ccff, 0.9); g.beginPath(); g.moveTo(ox, oy - 20);
      for (let i = 1; i <= 6; i++) g.lineTo(ox + (u.x - ox) * i / 6 + rng.range(-16, 16), oy - 20 + (u.y - oy) * i / 6 + rng.range(-16, 16)); g.strokePath();
      this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
      for (const o of this.units) if (!o.dead && o.side === 1 && this.pointSegDist(o.x, o.y, ox, oy, u.x, u.y) < 50) this.hit(o, u.atk * 0.9, u, 'thunder', { stun: 0.3 });
      this.emitters.thunder.explode(20, u.x, u.y - 20);
      bus.emit('sfx', 'thunder');
      return;
    }
    this.dashCd = this.dashCdMax;
    const d = 170 * this.dashMul;
    const tx = clamp(u.x + Math.cos(a) * d, 30, AW - 30), ty = clamp(u.y + Math.sin(a) * d, 30, AH - 30);
    u.invuln = 0.28;
    const ghost = this.add.image(u.x, u.y, u.spr.texture.key).setOrigin(0.5, 0.92).setScale(u.spr.scaleX, u.spr.scaleY).setAlpha(0.5).setTint(0x88ccaa).setDepth(u.spr.depth - 1);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
    this.tweens.add({ targets: u, x: tx, y: ty, duration: 140, ease: 'Quad.easeOut' });
    bus.emit('sfx', 'dash');
  }

  pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return dist(px, py, ax + dx * t, ay + dy * t);
  }

  useQuick(i: number) {
    if (this.itemCd > 0) return;
    const p = S().player; const id = p.quick[i]; if (!id) return;
    if (countItem(p, id) <= 0) { toast('该物品已用尽', 'bad'); return; }
    const d = item(id); const u = this.player;
    if (d.pill) {
      if (d.pill.hp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * d.pill.hp);
      if (d.pill.mp) u.mp = Math.min(u.maxMp, u.mp + u.maxMp * d.pill.mp);
      if (!d.pill.hp && !d.pill.mp) { toast('战斗中无法服用此丹', 'bad'); return; }
      this.emitters.wood.explode(18, u.x, u.y - 20);
      this.itemCd = 2.5;
    } else if (d.tal) {
      if (!this.useTalisman(u, d.tal.kind, d.tal.power)) return;
      this.itemCd = 0.6;
    } else return;
    removeItem(p, id, 1);
    bus.emit('refresh');
  }

  useTalisman(u: Unit, kind: string, power: number): boolean {
    const a = this.aimAngle;
    switch (kind) {
      case 'fire': for (let i = -2; i <= 2; i++) this.fire(u, a + i * 0.12, 560, u.atk * power * 0.45 + 30, 'fire', { r: 14, scale: 0.8 }); bus.emit('sfx', 'fire'); return true;
      case 'ice': for (let i = -3; i <= 3; i++) this.fire(u, a + i * 0.1, 600, u.atk * power * 0.35 + 25, 'ice', { r: 12, tex: 'shard', slow: 2 }); bus.emit('sfx', 'ice'); return true;
      case 'thunder': { const t = this.nearestEnemy(u, 800); const x = t ? t.x : u.aimX!, y = t ? t.y : u.aimY!; this.zone(u, x, y, 130, 0.45, u.atk * power + 80, 'thunder', { stun: 0.6 }); return true; }
      case 'shield': u.shield = Math.max(u.shield, u.maxHp * power); this.emitters.metal.explode(20, u.x, u.y - 20); toast('金光护体', 'good'); return true;
      case 'sword': { const t = this.nearestEnemy(u, 900); this.fire(u, t ? Math.atan2(t.y - u.y, t.x - u.x) : a, 900, u.atk * power + 300, 'metal', { r: 30, scale: 3, tex: 'flysword', pierce: 99 }); this.cameras.main.shake(200, 0.006); bus.emit('sfx', 'sword'); return true; }
      case 'escape': return this.tryTalismanFlee(true);
      default: toast('此符无法主动使用', 'bad'); return false;
    }
  }

  tryTalismanFlee(fromItem = false): boolean {
    if (!this.cfg.canFlee) { toast('此地被禁制笼罩，无法遁逃！', 'bad'); return false; }
    const p = S().player;
    if (!fromItem) { if (countItem(p, 'dundifu') <= 0) { toast('没有土遁符。贴近战场边缘可遁逃。', 'bad'); return false; } }
    const strongest = Math.max(...this.units.filter((u) => u.side === 1 && !u.dead).map((u) => u.spec?.realm ?? 0));
    const ok = strongest <= p.realm || rng.chance(0.4) || this.mods.escape;
    if (!fromItem) removeItem(p, 'dundifu', 1);
    if (ok) { this.emitters.earth.explode(30, this.player.x, this.player.y); this.endBattle('fled'); }
    else toast('遁术被对方神识锁定，失败了！', 'bad');
    return true;
  }

  castSpell(u: Unit, id: string | undefined, ax: number, ay: number) {
    if (!id) return;
    const sp = SPELLS[id]; if (!sp) return;
    if ((this.skillCds[id] ?? 0) > 0) return;
    if (u.mp < sp.mp) { toast('法力不足', 'bad'); return; }
    const a = Math.atan2(ay - (u.y - 24), ax - u.x);
    const atk = u.atk; const st = S().player;
    let ok = true;
    switch (id) {
      case 'fireball': for (let i = -1; i <= 1; i++) this.fire(u, a + i * 0.16, 560, atk * 1.0, 'fire', { r: 14, scale: 0.75 }); bus.emit('sfx', 'fire'); break;
      case 'icecone': for (let i = -2; i <= 2; i++) this.fire(u, a + i * 0.12, 620, atk * 0.8, 'ice', { r: 12, tex: 'shard', slow: 2.2 }); bus.emit('sfx', 'ice'); break;
      case 'thunder': this.zone(u, ax, ay, 120, 0.5, atk * 2.8, 'thunder', { stun: 0.5 }); break;
      case 'swordqi': this.fire(u, a, 760, atk * 2.3 * this.swordMul, 'wood', { r: 26, scale: 2.4, tex: 'flysword', pierce: 99 }); bus.emit('sfx', 'sword'); break;
      case 'jingshen': {
        const t = this.nearestEnemy(u, 650);
        if (!t) { ok = false; break; }
        if (u.sense > t.sense) { t.stun = Math.max(t.stun, 2.2 * Math.min(2, u.sense / t.sense) * 0.7); this.hit(t, atk * 1.2 * (1 + (this.mods.senseAtk || 0)), u, 'ghost'); this.floatText(t.x, t.y - 70, '神魂受创', '#c8a0ff'); }
        else this.floatText(t.x, t.y - 70, '神识不及', '#aaaaaa');
        const g = this.add.image(t.x, t.y - 30, 'rune').setTint(0xb080ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7600).setScale(0.3);
        this.tweens.add({ targets: g, scale: 1.4, alpha: 0, duration: 450, onComplete: () => g.destroy() });
        bus.emit('sfx', 'sense'); break;
      }
      case 'bixie': {
        const qz = u.arts.find((x) => x.def.kind === 'swarm');
        const n = qz ? qz.count : 6;
        for (const o of this.units) {
          if (o.dead || o.side === u.side || dist(o.x, o.y, u.x, u.y) > 700) continue;
          const evil = o.npc && o.npc.align < -0.3 || o.spec?.mtype === 'ghost' || o.spec?.mtype === 'corpse' || o.spec?.mtype === 'demon';
          this.hit(o, atk * 0.55 * Math.pow(n, 0.62) * (evil ? 2 : 1) * (1 + (this.mods.thunder || 0)), u, 'thunder', { stun: 0.4 });
          this.lightning(u.x, u.y - 30, o.x, o.y - 20, 0xffe060);
        }
        this.cameras.main.flash(120, 255, 240, 160); bus.emit('sfx', 'thunder'); break;
      }
      case 'qianlan': {
        const ring = this.add.image(u.x, u.y - 10, 'glow').setTint(0x66ccff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7000).setScale(0.5);
        this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        for (const o of this.units) if (!o.dead && o.side !== u.side && dist(o.x, o.y, u.x, u.y) < 240) { this.hit(o, atk * 2.2, u, 'ice'); o.stun = Math.max(o.stun, 1.8); o.spr.setTint(0x88ddff); }
        this.emitters.ice.explode(50, u.x, u.y); bus.emit('sfx', 'ice'); break;
      }
      case 'xutian': {
        const t = this.units.filter((o) => !o.dead && o.side !== u.side && dist(o.x, o.y, u.x, u.y) < 600 && o.hp / o.maxHp < 0.3).sort((p1, p2) => p1.hp / p1.maxHp - p2.hp / p2.maxHp)[0];
        if (!t) { toast('没有气血低于三成的目标', 'bad'); ok = false; break; }
        this.lightning(u.x, u.y - 30, t.x, t.y - 20, 0x66ddff);
        this.tweens.add({ targets: [t.spr], scale: 0.05, alpha: 0, x: u.x, y: u.y - 40, duration: 600 });
        this.result.captured.push(t.npc?.id || t.name);
        this.kill(t, u, true); bus.emit('sfx', 'capture'); break;
      }
      case 'yuanci': {
        for (const o of this.units) if (!o.dead && o.side !== u.side) { o.stun = Math.max(o.stun, 3); o.artLock = 4; }
        this.cameras.main.flash(200, 200, 200, 255); bus.emit('sfx', 'sense'); break;
      }
      default: ok = false;
    }
    if (!ok) return;
    u.mp -= sp.mp;
    this.skillCds[id] = sp.cd;
    void st;
  }

  // ---------------- AI ----------------
  aiUnit(u: Unit, dt: number) {
    for (const c in u.cds) u.cds[c] -= dt;
    u.busy -= dt; u.dodgeCd -= dt;
    if (u.summon && u.summon.owner.dead) { this.kill(u, undefined, true); return; }
    if (u.stun > 0) { u.vx = u.vy = 0; return; }
    if (u.charge) {
      u.charge.t -= dt;
      const a = Math.atan2(u.charge.ty - u.y, u.charge.tx - u.x);
      u.vx = Math.cos(a) * u.speed * 3.2; u.vy = Math.sin(a) * u.speed * 3.2;
      for (const o of this.units) if (!o.dead && o.side !== u.side && dist(o.x, o.y, u.x, u.y) < u.r + o.r) { this.hit(o, u.atk * 1.5, u, 'none'); u.charge = undefined; break; }
      if (u.charge && (u.charge.t <= 0 || dist(u.x, u.y, u.charge.tx, u.charge.ty) < 20)) u.charge = undefined;
      return;
    }
    const hpF = u.hp / u.maxHp;
    // 逃跑
    if (u.side === 1 && !u.boss && !u.summon && u.npc && hpF < 0.22 && (u.spec?.caution ?? 0.5) > 0.4 && this.cfg.kind !== 'spar') {
      if (!u.fleeing) { u.fleeing = true; this.floatText(u.x, u.y - 80, '想逃！', '#ffcc66'); }
    }
    if (u.fleeing) {
      if (!u.healed && u.npc && rng.chance(0.4)) { u.healed = true; u.hp += u.maxHp * 0.25; this.emitters.wood.explode(14, u.x, u.y - 20); this.floatText(u.x, u.y - 80, '服下丹药', '#aaffaa'); }
      if (u.npc && rng.chance(0.004)) { this.floatText(u.x, u.y - 80, '血遁！', '#ff6666'); this.emitters.demon.explode(40, u.x, u.y); this.enemyEscape(u); return; }
      const ex = u.x < AW / 2 ? 0 : AW, ey = u.y < AH / 2 ? 0 : AH;
      const tx = Math.abs(u.x - ex) < Math.abs(u.y - ey) ? ex : u.x, ty = Math.abs(u.x - ex) < Math.abs(u.y - ey) ? u.y : ey;
      const a = Math.atan2(ty - u.y, tx - u.x);
      u.vx = Math.cos(a) * u.speed * 1.1; u.vy = Math.sin(a) * u.speed * 1.1;
      if (u.x < 25 || u.y < 25 || u.x > AW - 25 || u.y > AH - 25) this.enemyEscape(u);
      return;
    }
    // 回血
    if (!u.healed && u.npc && hpF < 0.4 && rng.chance(0.01)) { u.healed = true; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.3); this.emitters.wood.explode(14, u.x, u.y - 20); }
    // 目标
    let t: Unit | undefined;
    if (u.side === 1 && rng.chance(0.98) && !this.player.dead) {
      const pd = dist(u.x, u.y, this.player.x, this.player.y);
      const n = this.nearestEnemy(u);
      t = n && dist(u.x, u.y, n.x, n.y) < pd * 0.6 ? n : this.player;
    } else t = this.nearestEnemy(u);
    if (!t) { u.vx = u.vy = 0; return; }
    const d = dist(u.x, u.y, t.x, t.y);
    const a = Math.atan2(t.y - u.y, t.x - u.x);
    // 闪避
    const dodgeSkill = u.side === 1 ? (S().difficulty === 'easy' ? 0.2 : S().difficulty === 'normal' ? 0.4 : 0.6) : 0.5;
    if (u.dodgeCd <= 0 && u.arch !== 'beast') {
      for (const p of this.projs) {
        if (p.side === u.side) continue;
        const dx = u.x - p.x, dy = u.y - 20 - p.y; const dd = Math.hypot(dx, dy);
        if (dd > 170) continue;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const dot = (dx * p.vx + dy * p.vy) / (dd * sp);
        if (dot > 0.93) {
          u.dodgeCd = rng.range(1.2, 2.6);
          if (rng.chance(dodgeSkill)) {
            const pa = Math.atan2(p.vy, p.vx) + (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
            this.tweens.add({ targets: u, x: clamp(u.x + Math.cos(pa) * 110, 30, AW - 30), y: clamp(u.y + Math.sin(pa) * 110, 30, AH - 30), duration: 130 });
            u.invuln = 0.15;
            return;
          }
          break;
        }
      }
    }
    // 移动：保持距离并绕行
    const pref = this.prefRange(u);
    let mvx = 0, mvy = 0;
    if (d > pref + 40) { mvx = Math.cos(a); mvy = Math.sin(a); }
    else if (d < pref - 60) { mvx = -Math.cos(a); mvy = -Math.sin(a); }
    const strafe = Math.sin(this.elapsed * 0.9 + u.id) > 0 ? 1 : -1;
    if (pref > 100) { mvx += Math.cos(a + Math.PI / 2) * 0.6 * strafe; mvy += Math.sin(a + Math.PI / 2) * 0.6 * strafe; }
    for (const o of this.units) { if (o === u || o.dead || o.side !== u.side) continue; const od = dist(u.x, u.y, o.x, o.y); if (od < 70 && od > 0) { mvx += (u.x - o.x) / od * 0.8; mvy += (u.y - o.y) / od * 0.8; } }
    const ml = Math.hypot(mvx, mvy) || 1;
    const sp = u.speed * (u.slow > 0 ? 0.55 : 1) * (u.busy > 0 ? 0.25 : 1);
    u.vx = (mvx / ml) * sp * (ml > 0.05 ? 1 : 0); u.vy = (mvy / ml) * sp * (ml > 0.05 ? 1 : 0);
    if (Math.abs(u.vx) > 5) u.facing = u.vx > 0 ? 1 : -1;
    // 攻击
    if (u.busy > 0) return;
    const ready = u.patterns.filter((p) => (u.cds[p] ?? 0) <= 0 && this.patternInRange(p, d));
    if (!ready.length) return;
    const pat = rng.pick(ready);
    this.doPattern(u, pat, t, d, a);
  }

  prefRange(u: Unit) {
    if (u.arch === 'beast') return u.patterns.includes('bolt') ? 300 : 30;
    return ({ sword: 260, caster: 360, body: 50, demon: 300, summoner: 430, talisman: 320 } as any)[u.arch] ?? 300;
  }
  patternInRange(p: string, d: number) {
    switch (p) { case 'bite': return d < 260; case 'claw': return d < 95; case 'charge': return d > 140 && d < 560; case 'spit': return d < 520; case 'beam': return d < 700; default: return d < 720; }
  }

  doPattern(u: Unit, pat: string, t: Unit, d: number, a: number) {
    const lead = (sp: number) => { const tt = d / sp; return Math.atan2(t.y + t.vy * tt * 0.7 - u.y, t.x + t.vx * tt * 0.7 - u.x); };
    const elem = u.npc ? (u.npc.align < -0.3 ? 'demon' : ['fire', 'ice', 'thunder', 'wood', 'water', 'metal'][u.npc.look.acc % 6]) : (u.spec?.mtype === 'ghost' ? 'ghost' : 'none');
    switch (pat) {
      case 'bite': {
        u.cds.bite = 1.8; u.busy = 0.5;
        this.telegraphLine(u, a, Math.min(d + 40, 260), 26, 0.42, () => { u.charge = { tx: u.x + Math.cos(a) * Math.min(d + 40, 260), ty: u.y + Math.sin(a) * Math.min(d + 40, 260), t: 0.25 }; });
        break;
      }
      case 'claw': {
        u.cds.claw = 1.3; u.busy = 0.4;
        this.zone(u, u.x + Math.cos(a) * 55, u.y + Math.sin(a) * 55, 70, 0.35, u.atk * 1.2, 'none', {});
        break;
      }
      case 'charge': {
        u.cds.charge = 4.5; u.busy = 0.8;
        const L = Math.min(d + 120, 600);
        this.telegraphLine(u, a, L, 44, 0.65, () => { u.charge = { tx: u.x + Math.cos(a) * L, ty: u.y + Math.sin(a) * L, t: 0.5 }; });
        break;
      }
      case 'spit': case 'bolt': {
        u.cds[pat] = u.arch === 'beast' ? 2.2 : 1.5; u.busy = 0.25;
        const sp = 430 + u.sense * 0.2;
        this.fire(u, lead(sp), Math.min(620, sp), u.atk * 0.85, pat === 'spit' ? 'wood' : elem, { r: 12, scale: 0.7 });
        break;
      }
      case 'spread': {
        u.cds.spread = 3.2; u.busy = 0.4;
        const n = 3 + Math.min(4, Math.floor((u.spec?.realm ?? 1) / 1.5));
        for (let i = 0; i < n; i++) this.fire(u, a + (i - (n - 1) / 2) * 0.17, 400, u.atk * 0.7, elem, { r: 11, scale: 0.6 });
        break;
      }
      case 'aoe': {
        u.cds.aoe = 4.5; u.busy = 0.5;
        const tx = t.x + t.vx * 0.6, ty = t.y + t.vy * 0.6;
        this.zone(u, tx, ty, 110 + (u.boss ? 50 : 0), 0.85, u.atk * 2.0, elem, { stun: 0.3 });
        break;
      }
      case 'ring': {
        u.cds.ring = u.boss ? 5 : 7; u.busy = 0.8;
        const n = u.boss ? 18 : 12; const off = rng.range(0, 1);
        this.floatText(u.x, u.y - 90, u.boss ? '神通！' : '', '#ff8866');
        for (let w = 0; w < (u.boss ? 2 : 1); w++) this.time.delayedCall(w * 350, () => { if (u.dead) return; for (let i = 0; i < n; i++) this.fire(u, ((i + off + w * 0.5) / n) * Math.PI * 2, 300, u.atk * 0.8, elem, { r: 12, scale: 0.65 }); });
        break;
      }
      case 'summon': {
        u.cds.summon = 12; u.busy = 0.6;
        const cnt = this.units.filter((x) => x.summon && x.summon.owner === u && !x.dead).length;
        if (cnt >= 3) break;
        for (let i = 0; i < 2; i++) {
          const m = this.mkUnit(u.side, monsterKey(this, u.npc && u.npc.align < -0.3 ? 'corpse' : 'puppet'), u.x + rng.range(-70, 70), u.y + rng.range(-70, 70), 0.4, '');
          m.label?.destroy(); m.label = undefined;
          m.maxHp = u.maxHp * 0.22; m.hp = m.maxHp; m.atk = u.atk * 0.5; m.def = u.def * 0.5; m.speed = 190; m.patterns = ['bite']; m.arch = 'beast'; m.summon = { owner: u, life: 20, kind: 'minion' }; m.mp = 9999;
          this.emitters.demon.explode(16, m.x, m.y);
        }
        break;
      }
      case 'shihuo': {
        u.cds.shihuo = 6; u.busy = 0.5;
        this.floatText(u.x, u.y - 90, '天都尸火', '#66ff99');
        for (let i = 0; i < 4; i++) this.fire(u, a + (i - 1.5) * 0.5, 260, u.atk * 1.0, 'wood', { r: 16, scale: 1.0, homing: t, turn: 2.2, life: 4 });
        break;
      }
      case 'beam': {
        u.cds.beam = 5; u.busy = 0.8;
        this.telegraphLine(u, a, 700, 34, 0.7, () => { this.lineDamage(u, a, 700, 34, u.atk * 2.2, 'metal'); });
        break;
      }
      case 'shieldup': {
        u.cds.shieldup = 14; u.shield = u.maxHp * 0.3; this.emitters.metal.explode(16, u.x, u.y - 20); this.floatText(u.x, u.y - 80, '金刚符', '#ffe080');
        break;
      }
    }
  }

  telegraphLine(u: Unit, a: number, len: number, w: number, delay: number, cb: () => void) {
    const g = this.add.graphics().setDepth(5);
    const draw = (k: number) => { g.clear(); g.fillStyle(0xff3020, 0.12 + k * 0.25); g.save(); g.translateCanvas(u.x, u.y); g.rotateCanvas(a); g.fillRect(0, -w / 2, len * Math.max(0.15, k), w); g.restore(); };
    let t = 0;
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => { t += 0.016; draw(Math.min(1, t / delay)); if (u.dead || u.stun > 0) { ev.remove(); g.destroy(); } } });
    this.time.delayedCall(delay * 1000, () => { ev.remove(); g.destroy(); if (!u.dead && u.stun <= 0) cb(); });
  }

  lineDamage(u: Unit, a: number, len: number, w: number, dmg: number, elem: string) {
    const ex = u.x + Math.cos(a) * len, ey = u.y + Math.sin(a) * len;
    const g = this.add.graphics().setDepth(7600).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(w, ELEM[elem] ?? 0xffffff, 0.8); g.lineBetween(u.x, u.y - 20, ex, ey - 20);
    this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    for (const o of this.units) if (!o.dead && o.side !== u.side && this.pointSegDist(o.x, o.y, u.x, u.y, ex, ey) < w / 2 + o.r * 0.6) this.hit(o, dmg, u, elem);
  }

  // ---------------- 法宝 ----------------
  updateArts(u: Unit, dt: number) {
    for (const ao of u.arts) {
      const k = ao.def.kind;
      const locked = u.artLock > 0;
      ao.t -= dt;
      const tgt = this.nearestEnemy(u, k === 'ring' ? 160 : 620);
      const dmgBase = u.atk * ao.power * (u.isPlayer && (k === 'sword' || k === 'swarm') ? this.swordMul : 1) * (u.isPlayer && ao.def.element === 'fire' ? 1 + (this.mods.fire || 0) : 1) * (u.isPlayer && ao.def.element === 'thunder' ? 1 + (this.mods.thunder || 0) : 1);
      if (k === 'sword' || k === 'swarm' || k === 'needle' || (k === 'beast' && ao.def.count)) {
        const n = ao.sprs.length;
        const orbitR = k === 'swarm' ? 62 + Math.min(40, n) : 52;
        for (let i = 0; i < n; i++) {
          const s = ao.sprs[i], st = ao.st[i];
          st.t += dt;
          if (st.mode === 'orbit') {
            const ang = this.elapsed * (k === 'swarm' ? 1.6 : 2.4) + (i / n) * Math.PI * 2;
            const ox = u.x + Math.cos(ang) * orbitR, oy = u.y - 26 + Math.sin(ang) * orbitR * 0.55;
            st.x += (ox - st.x) * Math.min(1, dt * 10); st.y += (oy - st.y) * Math.min(1, dt * 10);
            s.setRotation(k === 'beast' ? 0 : ang + Math.PI / 2);
          } else if (st.mode === 'go') {
            const T = st.target;
            if (T && !T.dead) { st.tx = T.x; st.ty = T.y - 20; }
            const a = Math.atan2(st.ty - st.y, st.tx - st.x);
            const sp = k === 'needle' ? 1300 : k === 'beast' ? 500 : 950;
            st.x += Math.cos(a) * sp * dt; st.y += Math.sin(a) * sp * dt; s.setRotation(a);
            if (dist(st.x, st.y, st.tx, st.ty) < 22 || st.t > 1.2) {
              if (T && !T.dead && dist(st.x, st.y, T.x, T.y - 20) < 60) {
                const per = k === 'swarm' ? dmgBase : k === 'needle' ? dmgBase : k === 'beast' ? dmgBase * 0.6 : dmgBase;
                this.hit(T, per * (k === 'beast' ? 1 : 1), u, ao.def.element || 'metal', { ignoreDef: k === 'beast', small: k !== 'sword' });
              }
              st.mode = 'back'; st.t = 0;
            }
          } else {
            const ox = u.x, oy = u.y - 26; const a = Math.atan2(oy - st.y, ox - st.x);
            st.x += Math.cos(a) * 900 * dt; st.y += Math.sin(a) * 900 * dt; s.setRotation(a + Math.PI);
            if (dist(st.x, st.y, ox, oy) < orbitR + 10 || st.t > 1) { st.mode = 'orbit'; st.t = 0; }
          }
          s.setPosition(st.x, st.y).setDepth(st.y + 40);
        }
        if (ao.t <= 0 && tgt && !locked) {
          ao.t = k === 'swarm' ? 1.6 : k === 'needle' ? 2.6 : k === 'beast' ? 0.8 : 1.15;
          const enemies = this.units.filter((o) => !o.dead && o.side !== u.side && dist(o.x, o.y, u.x, u.y) < 650);
          const launch = k === 'swarm' ? Math.max(1, Math.ceil(n * 0.5)) : n;
          let c = 0;
          for (let i = 0; i < n && c < launch; i++) {
            if (ao.st[i].mode !== 'orbit') continue;
            ao.st[i].mode = 'go'; ao.st[i].t = 0; ao.st[i].target = enemies[(i + c) % enemies.length] || tgt; c++;
          }
          if (c && u.isPlayer) bus.emit('sfx', k === 'needle' ? 'needle' : 'sword');
        }
        continue;
      }
      if (k === 'ring') {
        const rings = ao.sprs.length;
        for (let i = 0; i < rings; i++) {
          const s = ao.sprs[i];
          if (rings === 1) { s.setPosition(u.x, u.y - 10).setRotation(this.elapsed * 4).setDepth(u.y - 1); }
          else { const ang = this.elapsed * 2 + (i / rings) * Math.PI * 2; s.setPosition(u.x + Math.cos(ang) * 80, u.y - 20 + Math.sin(ang) * 46).setRotation(this.elapsed * 6).setDepth(u.y + Math.sin(ang) * 46); }
        }
        if (ao.t <= 0 && !locked) {
          ao.t = 0.45;
          for (const o of this.units) if (!o.dead && o.side !== u.side && dist(o.x, o.y, u.x, u.y) < 120) this.hit(o, dmgBase * 0.45, u, ao.def.element || 'fire', { small: true, slow: ao.def.element === 'ice' ? 1 : 0 });
          if (rings === 1 && ao.def.element === 'fire') this.emitters.fire.explode(3, u.x + rng.range(-80, 80), u.y + rng.range(-40, 30));
        }
        continue;
      }
      if (ao.t > 0 || locked || !tgt && !['bell', 'cauldron'].includes(k)) continue;
      const T = tgt!;
      const ang = T ? Math.atan2(T.y - u.y, T.x - u.x) : 0;
      switch (k) {
        case 'mirror': {
          ao.t = 3;
          const beams = ao.id === 'bamenjing' ? 8 : 1;
          for (let b = 0; b < beams; b++) this.lineDamage(u, beams > 1 ? ang + (b / beams) * Math.PI * 2 : ang, 650, 22, dmgBase * (beams > 1 ? 0.7 : 1), ao.def.element || 'metal');
          if (u.isPlayer) bus.emit('sfx', 'beam');
          break;
        }
        case 'banner': {
          ao.t = 6;
          if (ao.def.summon === 'jiao') { this.fire(u, ang, 520, dmgBase * 1.4, 'water', { r: 30, scale: 1.8, pierce: 99, tex: 'glow' }); }
          else { for (let i = 0; i < (ao.def.summon === 'bonegod' ? 3 : 2); i++) this.fire(u, ang + (i - 0.5) * 0.5, 280, dmgBase * 0.9, 'ghost', { r: 16, scale: 1.1, homing: T, turn: 2.5, life: 4 }); }
          break;
        }
        case 'bell': {
          ao.t = 5;
          const r = this.add.image(u.x, u.y - 20, 'rune').setTint(ao.def.color ?? 0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7000).setScale(0.4);
          this.tweens.add({ targets: r, scale: 4.6, alpha: 0, duration: 520, onComplete: () => r.destroy() });
          if (ao.id === 'hualan') for (let i = 0; i < 16; i++) this.fire(u, (i / 16) * Math.PI * 2, 330, dmgBase * 0.5, 'wood', { r: 10, tex: 'petal', scale: 0.7, spin: 8 });
          else for (const o of this.units) if (!o.dead && o.side !== u.side && dist(o.x, o.y, u.x, u.y) < 230) { this.hit(o, dmgBase * 0.7, u, 'metal'); o.stun = Math.max(o.stun, 0.8); }
          if (u.isPlayer) bus.emit('sfx', 'bell');
          break;
        }
        case 'cauldron': {
          ao.t = 7;
          u.shield = Math.max(u.shield, u.maxHp * 0.12 * ao.power);
          if (T) this.zone(u, T.x, T.y, 100, 0.6, dmgBase * 1.2, ao.def.element || 'fire', { freeze: ao.def.element === 'ice' ? 1.2 : 0 });
          break;
        }
        case 'brick': case 'mountain': {
          ao.t = k === 'mountain' ? 5 : 4;
          this.zone(u, T.x + T.vx * 0.5, T.y + T.vy * 0.5, k === 'mountain' ? 170 : 110, 0.9, dmgBase * 1.4, 'earth', { stun: 0.6 });
          break;
        }
        case 'arrow': {
          ao.t = 3.4;
          this.fire(u, ang, 1100, dmgBase, ao.def.element || 'metal', { r: 16, scale: 1.6, tex: 'flysword', pierce: 99 });
          if (u.isPlayer) bus.emit('sfx', 'sword');
          break;
        }
        case 'fan': {
          ao.t = 4;
          for (let i = -4; i <= 4; i++) this.fire(u, ang + i * 0.1, 480, dmgBase * 0.5, 'fire', { r: 20, scale: 1.2, pierce: 3 });
          bus.emit('sfx', 'fire');
          break;
        }
        case 'flag': {
          ao.t = 5;
          this.zone(u, T.x, T.y, 140, 0.7, dmgBase * 0.9, ao.def.element || 'water', { stun: ao.id === 'panlongdai' ? 1.5 : 0.2 });
          break;
        }
        case 'puppet': case 'beast': {
          ao.t = 15;
          const alive = this.units.filter((x) => x.summon && x.summon.owner === u && !x.dead && x.summon.kind === ao.def.summon).length;
          if (!alive) this.spawnSummon(u, ao.def, ao);
          break;
        }
      }
    }
  }

  // ---------------- 投射物 ----------------
  fire(u: Unit, a: number, speed: number, dmg: number, elem: string, o: { r?: number; scale?: number; tex?: string; pierce?: number; slow?: number; stun?: number; homing?: Unit; turn?: number; life?: number; spin?: number } = {}) {
    const tex = o.tex || 'glow';
    const sx = u.x + Math.cos(a) * 20, sy = u.y - 24 + Math.sin(a) * 20;
    const spr = this.add.image(sx, sy, tex).setTint(ELEM[elem] ?? 0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7500).setScale(o.scale ?? 0.6).setRotation(a);
    this.projs.push({ x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: o.r ?? 10, dmg, side: u.side, life: o.life ?? 1.6, pierce: o.pierce ?? 0, hit: new Set(), spr, elem, slow: o.slow, stun: o.stun, homing: o.homing, turn: o.turn, owner: u, block: (o.pierce ?? 0) < 5, spin: o.spin });
  }

  updateProjs(dt: number) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.life -= dt;
      if (p.homing && !p.homing.dead) {
        const want = Math.atan2(p.homing.y - 20 - p.y, p.homing.x - p.x);
        const cur = Math.atan2(p.vy, p.vx); const sp = Math.hypot(p.vx, p.vy);
        let diff = Phaser.Math.Angle.Wrap(want - cur);
        const na = cur + clamp(diff, -(p.turn || 2) * dt, (p.turn || 2) * dt);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.spr.setPosition(p.x, p.y);
      if (p.spin) p.spr.rotation += p.spin * dt; else p.spr.setRotation(Math.atan2(p.vy, p.vx));
      let dead = p.life <= 0 || p.x < -50 || p.y < -50 || p.x > AW + 50 || p.y > AH + 50;
      if (!dead && p.block) for (const r of this.rocks) if (dist(p.x, p.y, r.x, r.y) < r.r) { dead = true; this.emitters[p.elem]?.explode(6, p.x, p.y); break; }
      if (!dead) {
        for (const u of this.units) {
          if (u.dead || u.side === p.side || p.hit.has(u.id)) continue;
          if (dist(p.x, p.y, u.x, u.y - 22) < p.r + u.r * 0.7) {
            p.hit.add(u.id);
            this.hit(u, p.dmg, p.owner, p.elem, { slow: p.slow, stun: p.stun, small: p.dmg < (p.owner?.atk ?? 1) * 0.8 });
            if (p.pierce-- <= 0) { dead = true; break; }
          }
        }
      }
      if (dead) { p.spr.destroy(); this.projs.splice(i, 1); }
    }
  }

  zone(u: Unit, x: number, y: number, r: number, delay: number, dmg: number, elem: string, o: { stun?: number; freeze?: number }) {
    const spr = this.add.image(x, y, 'tele').setTint(u.side === 1 ? 0xff3322 : (ELEM[elem] ?? 0xffffff)).setDepth(4).setScale((r * 2) / 128).setAlpha(0.25);
    this.zones.push({ x, y, r, t: delay, t0: delay, dmg, side: u.side, elem, stun: o.stun, freeze: o.freeze, spr, owner: u, shape: 'circle' });
  }

  updateZones(dt: number) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      const k = 1 - z.t / z.t0;
      z.spr.setAlpha(0.2 + 0.5 * k);
      if (z.t <= 0) {
        if (z.elem === 'thunder') { this.lightning(z.x + rng.range(-20, 20), z.y - 500, z.x, z.y, 0xfff070); bus.emit('sfx', 'thunder'); this.cameras.main.shake(120, 0.004); }
        else if (z.elem === 'earth') { this.cameras.main.shake(160, 0.006); bus.emit('sfx', 'boom'); }
        else bus.emit('sfx', 'boom');
        const fx = this.add.image(z.x, z.y, 'glow').setTint(ELEM[z.elem] ?? 0xffddaa).setBlendMode(Phaser.BlendModes.ADD).setDepth(7400).setScale(z.r / 40);
        this.tweens.add({ targets: fx, alpha: 0, scale: z.r / 26, duration: 320, onComplete: () => fx.destroy() });
        this.emitters[z.elem]?.explode(18, z.x, z.y);
        for (const u of this.units) if (!u.dead && u.side !== z.side && dist(u.x, u.y, z.x, z.y) < z.r + u.r * 0.5) { this.hit(u, z.dmg, z.owner, z.elem, { stun: z.stun }); if (z.freeze) u.stun = Math.max(u.stun, z.freeze); }
        z.spr.destroy(); this.zones.splice(i, 1);
      }
    }
  }

  lightning(x0: number, y0: number, x1: number, y1: number, col: number) {
    const g = this.add.graphics().setDepth(7800).setBlendMode(Phaser.BlendModes.ADD);
    for (const [w, a] of [[7, 0.35], [3, 1]] as [number, number][]) {
      g.lineStyle(w, col, a); g.beginPath(); g.moveTo(x0, y0);
      const n = 8; for (let i = 1; i < n; i++) g.lineTo(x0 + (x1 - x0) * i / n + rng.range(-18, 18), y0 + (y1 - y0) * i / n + rng.range(-18, 18));
      g.lineTo(x1, y1); g.strokePath();
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  // ---------------- 伤害 ----------------
  hit(t: Unit, raw: number, src: Unit | undefined, elem: string, o: { stun?: number; slow?: number; ignoreDef?: boolean; small?: boolean } = {}) {
    if (t.dead || t.invuln > 0) return;
    let dmg = raw;
    if (!o.ignoreDef) dmg *= 1 - t.def / (t.def + (src?.atk ?? raw) * 1.5 + 10);
    let crit = false;
    if (src && rng.chance(src.crit)) { dmg *= src.critDmg; crit = true; }
    dmg *= rng.range(0.9, 1.1);
    if (t.side === 0 && !t.summon) dmg *= this.diffDmg;
    if (t.isPlayer) dmg *= 1 - t.dmgRed;
    if (src?.isPlayer && src.vamp) src.hp = Math.min(src.maxHp, src.hp + dmg * src.vamp);
    if (t.shield > 0) { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; if (ab > 0) this.emitters.metal.explode(3, t.x, t.y - 20); }
    dmg = Math.max(1, Math.round(dmg));
    t.hp -= dmg; t.lastHitBy = src;
    if (o.stun) t.stun = Math.max(t.stun, o.stun);
    if (o.slow) t.slow = Math.max(t.slow, o.slow);
    t.spr.setTintFill(0xffffff);
    this.time.delayedCall(60, () => { if (!t.dead) t.spr.clearTint(); });
    this.emitters[elem]?.explode(o.small ? 4 : 9, t.x, t.y - 22);
    if (!o.small || crit || t.isPlayer) this.floatText(t.x + rng.range(-12, 12), t.y - 60, String(dmg), t.side === 0 ? '#ff7766' : crit ? '#ffd040' : '#fff6e0', crit ? 26 : 18);
    if (t.isPlayer) { this.cameras.main.shake(90, 0.003); bus.emit('sfx', 'hurt'); } else if (!o.small) bus.emit('sfx', 'hit');
    // 切磋
    if (this.cfg.kind === 'spar' && !t.summon && t.hp < t.maxHp * 0.12) {
      t.hp = Math.max(1, t.hp);
      this.endBattle(t.isPlayer ? 'sparLose' : 'sparWin');
      return;
    }
    if (t.hp <= 0) this.kill(t, src);
  }

  kill(t: Unit, src?: Unit, silent = false) {
    if (t.dead) return;
    if (t.isPlayer) {
      const p = S().player;
      const rev = p.inv.find((e) => e.id === 'liuding') || p.inv.find((e) => e.id === 'tishenfu');
      if (rev) {
        removeItem(p, rev.id, 1);
        t.hp = t.maxHp * (rev.id === 'liuding' ? 1 : 0.5); t.invuln = 2;
        this.floatText(t.x, t.y - 90, rev.id === 'liuding' ? '六丁天甲符护体！' : '替身符生效！', '#ffe080', 24);
        this.emitters.metal.explode(50, t.x, t.y - 20); this.cameras.main.flash(300, 255, 240, 200);
        toast(`${item(rev.id).name}替你挡下了一死！`, 'gold');
        return;
      }
      t.dead = true; t.hp = 0;
      this.result.killerName = src?.npc?.name || src?.summon?.owner?.npc?.name;
      this.emitters.ink.explode(20, t.x, t.y - 20);
      this.endBattle('died');
      return;
    }
    if (t.npc && !t.summon && !silent) {
      const rv = t.npc.inv.find((e) => e.id === 'liuding' || e.id === 'tishenfu');
      if (rv) {
        rv.n--; if (rv.n <= 0) t.npc.inv.splice(t.npc.inv.indexOf(rv), 1);
        t.hp = t.maxHp * (rv.id === 'liuding' ? 1 : 0.5); t.invuln = 1.5;
        this.floatText(t.x, t.y - 90, rv.id === 'liuding' ? '六丁天甲符！' : '替身符！', '#ffe080', 24);
        this.emitters.metal.explode(40, t.x, t.y - 20);
        return;
      }
    }
    t.dead = true;
    this.emitters.ink.explode(silent ? 6 : 16, t.x, t.y - 20);
    if (!silent) bus.emit('sfx', 'kill');
    this.tweens.add({ targets: [t.spr, t.shadow], alpha: 0, duration: 400 });
    t.label?.destroy(); t.bar.destroy();
    for (const ao of t.arts) for (const s of ao.sprs) s.destroy();
    if (t.side === 1 && !t.summon) {
      if (t.npc) this.result.killed.push(t.npc.id);
      else if (t.spec) this.result.beastsKilled.push(t.spec);
    }
    if (t.ally && t.npc && !t.summon) { t.npc.hpFrac = 0.2; this.floatText(t.x, t.y - 60, '重伤退出', '#ffaaaa'); }
    // 召唤物随主人消失
    for (const u of this.units) if (u.summon && u.summon.owner === t && !u.dead) this.kill(u, undefined, true);
  }

  enemyEscape(u: Unit) {
    if (u.dead) return;
    u.dead = true;
    this.tweens.add({ targets: [u.spr, u.shadow], alpha: 0, duration: 300 });
    u.label?.destroy(); u.bar.destroy(); for (const ao of u.arts) for (const s of ao.sprs) s.destroy();
    if (u.npc) { this.result.enemyFled.push(u.npc.id); u.npc.hpFrac = u.hp / u.maxHp; }
    this.floatText(u.x, u.y - 60, '遁走了', '#ffcc66');
    for (const s of this.units) if (s.summon && s.summon.owner === u && !s.dead) this.kill(s, undefined, true);
  }

  stepPhysics(u: Unit, dt: number) {
    if (u.stun > 0) u.stun -= dt; if (u.slow > 0) u.slow -= dt; if (u.invuln > 0) u.invuln -= dt; if (u.artLock > 0) u.artLock -= dt;
    if (u.summon && u.summon.life < 9000) { u.summon.life -= dt; if (u.summon.life <= 0) { this.kill(u, undefined, true); return; } }
    u.x += u.vx * dt; u.y += u.vy * dt;
    for (const r of this.rocks) { const d = dist(u.x, u.y, r.x, r.y); const m = r.r + u.r * 0.5; if (d < m && d > 0) { u.x = r.x + (u.x - r.x) / d * m; u.y = r.y + (u.y - r.y) / d * m; } }
    u.x = clamp(u.x, 15, AW - 15); u.y = clamp(u.y, 30, AH - 10);
  }

  drawUnit(u: Unit) {
    if (u.dead) return;
    u.bob += 0.016 * (Math.abs(u.vx) + Math.abs(u.vy) > 10 ? 14 : 4);
    const bobY = Math.sin(u.bob) * (Math.abs(u.vx) + Math.abs(u.vy) > 10 ? 3 : 1.5);
    u.spr.setPosition(u.x, u.y + bobY).setDepth(u.y + 10);
    u.spr.setFlipX(u.facing < 0 && !u.isPlayer && u.arch === 'beast' ? false : u.facing < 0);
    if (u.arch === 'beast' && !u.npc) u.spr.setFlipX(u.facing < 0);
    u.shadow.setPosition(u.x, u.y + 2).setDepth(2);
    if (u.invuln > 0) u.spr.setAlpha(0.5 + 0.5 * Math.sin(this.elapsed * 40)); else if (u.spr.alpha < 1 && !u.summon) u.spr.setAlpha(1);
    if (u.stun > 0 && Math.floor(this.elapsed * 10) % 2 === 0) u.spr.setTint(0xaaaaff); else if (u.stun <= 0 && u.slow <= 0 && u.spr.isTinted && !u.spr.tintFill) u.spr.clearTint();
    const h = u.spr.displayHeight;
    u.bar.clear();
    if (!u.isPlayer) {
      const w = u.boss ? 110 : u.summon ? 40 : 64;
      const by = u.y - h - 6;
      u.bar.fillStyle(0x1a120c, 0.8); u.bar.fillRect(u.x - w / 2 - 1, by - 1, w + 2, 7);
      u.bar.fillStyle(u.side === 1 ? 0xd04030 : 0x40c080, 1); u.bar.fillRect(u.x - w / 2, by, w * clamp(u.hp / u.maxHp, 0, 1), 5);
      if (u.shield > 0) { u.bar.fillStyle(0xffe080, 1); u.bar.fillRect(u.x - w / 2, by - 3, w * clamp(u.shield / u.maxHp, 0, 1), 2); }
      u.label?.setPosition(u.x, by - 3);
    } else if (u.shield > 0) {
      u.bar.lineStyle(2, 0xffe080, 0.7); u.bar.strokeCircle(u.x, u.y - 26, 36);
    }
  }

  floatText(x: number, y: number, s: string, color: string, size = 18) {
    if (!s) return;
    const t = this.add.text(x, y, s, { fontFamily: 'LXGW WenKai, KaiTi, serif', fontSize: size + 'px', color, stroke: '#1a120c', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(9500);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  checkEnd() {
    if (this.ended) return;
    const alive = this.units.some((u) => u.side === 1 && !u.dead && !u.summon);
    if (!alive) this.endBattle('win');
  }

  endBattle(kind: 'win' | 'fled' | 'died' | 'sparWin' | 'sparLose') {
    if (this.ended) return;
    this.ended = true;
    const r = this.result;
    r.win = kind === 'win' || kind === 'sparWin'; r.fled = kind === 'fled'; r.died = kind === 'died';
    const p = S().player;
    p.hp = Math.max(1, this.player.hp); p.mp = this.player.mp;
    if (kind === 'win' || kind === 'sparWin') { this.slowmo = 0.3; this.cameras.main.flash(250, 255, 240, 200); }
    bus.emit('sfx', kind === 'died' ? 'fail' : kind === 'fled' ? 'dash' : 'win');
    this.time.delayedCall(kind === 'died' ? 900 : 650, () => {
      this.cameras.main.fadeOut(300, 20, 16, 12);
      this.time.delayedCall(320, () => {
        bus.emit('battleEnd');
        this.scene.stop();
        this.cfg.onEnd(r);
      });
    });
  }
}

export function spellName(id: string) { return SPELLS[id]?.name || id; }
