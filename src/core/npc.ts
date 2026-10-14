// NPC 生成与世界模拟：修炼、寿元、游历、杀人夺宝、记仇、争夺宝物
import { S, NPC, InvEntry, addNews, YEAR, WorldEvent } from './state';
import { FAMOUS, FamousDef, SECTS, SURNAMES, COMPOUND_SURNAMES, M_NAMES, F_NAMES, Archetype } from '../data/characters';
import { REALMS, stageMult, expNeeded, maxStage, realmName, BREAK_INFO, beastRealm } from '../data/realms';
import { LOCATIONS, LocationDef, WORLD_W, WORLD_H, locById } from '../data/world';
import { item, allItems, ITEMS } from '../data/items';
import { RNG, rng, uid, dist, clamp } from './rng';
import { isLand, regionAtLand } from './worldgen';
import { computeStats, invFind, itemValue } from './player';
import { bus, toast } from './bus';

const ARCHS: Archetype[] = ['sword', 'caster', 'body', 'demon', 'summoner', 'talisman'];

export function npcSenseVal(n: NPC) { return REALMS[n.realm].sense * stageMult(n.realm, n.stage) * n.senseMul; }
export function npcSenseRadius(n: NPC) { return Math.min(8000, 260 + 92 * Math.sqrt(npcSenseVal(n))); }

export function npcStats(n: NPC) {
  const r = REALMS[n.realm]; const sm = stageMult(n.realm, n.stage);
  let hp = r.hp * sm, atk = r.atk * sm, def = r.def * sm;
  const a = n.arch;
  if (a === 'body') { hp *= 1.5; def *= 1.35; atk *= 0.95; }
  else if (a === 'sword') { atk *= 1.15; }
  else if (a === 'caster') { atk *= 1.1; hp *= 0.95; }
  else if (a === 'demon') { atk *= 1.2; hp *= 1.05; }
  else if (a === 'summoner') { atk *= 0.85; hp *= 1.0; }
  else if (a === 'beast') { hp *= 1.7; atk *= 1.25; def *= 1.2; }
  let artPow = 0, defB = 0, hpB = 0;
  for (const id of n.arts) { const d = item(id)?.art; if (!d) continue; artPow += d.power * (d.count ? Math.min(d.count, 12) * 0.5 : 1); defB += d.def || 0; hpB += d.hp || 0; }
  def *= 1 + defB; hp *= 1 + hpB;
  hp *= 0.5 + 0.5 * n.hpFrac;
  const power = Math.sqrt(hp * atk * (1 + artPow * 0.35));
  return { hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), power, sense: npcSenseVal(n) };
}

export function playerPower(perceived = false) {
  const p = S().player; const st = computeStats(p);
  let artPow = 0;
  for (const u of p.equipped) { const e = invFind(p, u); const d = e && item(e.id)?.art; if (d) artPow += d.power * (d.count ? Math.min(e.count ?? d.count, 12) * 0.5 : 1); }
  if (!perceived) return Math.sqrt(st.maxHp * st.atk * (1 + artPow * 0.35));
  // 他人感知：考虑敛气术
  let realm = p.realm, stage = p.stage;
  let hide = st.conceal;
  while (hide > 0) { if (stage > 0) stage--; else if (realm > 0) { realm--; stage = maxStage(realm); } hide--; }
  const r = REALMS[realm]; const sm = stageMult(realm, stage);
  return Math.sqrt(r.hp * sm * r.atk * sm * (1 + artPow * 0.2));
}

export function perceivedRealm(): [number, number] {
  const p = S().player; const st = computeStats(p);
  let realm = p.realm, stage = p.stage, hide = st.conceal;
  while (hide > 0) { if (stage > 0) stage--; else if (realm > 0) { realm--; stage = maxStage(realm); } hide--; }
  return [realm, stage];
}

function randomName(r: RNG, g: 'm' | 'f') {
  const sur = r.chance(0.08) ? r.pick(COMPOUND_SURNAMES) : r.pick(SURNAMES.filter((s) => s.length === 1));
  return sur + r.pick(g === 'm' ? M_NAMES : F_NAMES);
}

function lifespanFor(realm: number, r: RNG) { return REALMS[realm].lifespan * r.range(0.9, 1.15); }

function genArts(realm: number, r: RNG, arch: Archetype): string[] {
  const pool = allItems().filter((d) => d.art && d.art.minRealm <= realm && d.art.kind !== 'boat' && d.art.kind !== 'pearl' && d.art.kind !== 'wings' && d.art.tier <= (realm <= 1 ? 0 : realm === 2 ? 2 : realm === 3 ? 3 : 4) && d.rarity <= realm + 2 && d.id !== 'xutianding' && d.id !== 'qingzhu' && d.id !== 'shijinchong');
  const n = realm === 0 ? 0 : r.int(1, Math.min(3, realm + 1));
  const out: string[] = [];
  let tries = 0;
  while (out.length < n && tries++ < 30) {
    let d = r.pick(pool);
    if (arch === 'sword' && r.chance(0.6)) { const sw = pool.filter((x) => x.art!.kind === 'sword'); if (sw.length) d = r.pick(sw); }
    if (arch === 'summoner' && r.chance(0.6)) { const sw = pool.filter((x) => x.art!.kind === 'puppet' || x.art!.kind === 'beast'); if (sw.length) d = r.pick(sw); }
    if (!out.includes(d.id)) out.push(d.id);
  }
  return out;
}

function genInv(realm: number, r: RNG): InvEntry[] {
  const inv: InvEntry[] = [];
  const add = (id: string, n: number, q?: number) => inv.push({ uid: uid(), id, n, q });
  const herbs = allItems().filter((d) => d.herbBase && d.rarity <= realm + 1);
  for (let i = 0; i < r.int(0, 3); i++) add(r.pick(herbs).id, r.int(1, 3), r.chance(0.2) ? r.int(1, 2) : 0);
  const pills = realm <= 1 ? ['juqidan', 'huichundan', 'huilingdan'] : realm === 2 ? ['huanglongdan', 'huichundan', 'liaoshangdan', 'huilingdan'] : realm === 3 ? ['dinglingdan', 'liaoshangdan', 'yanshoudan'] : ['yuanlingdan', 'liaoshangdan', 'yanshoudan', 'yanghundan'];
  for (let i = 0; i < r.int(1, 3); i++) add(r.pick(pills), r.int(1, 4));
  const tals = realm <= 1 ? ['huodanfu', 'jingangfu'] : ['jingangfu', 'zhangxinleifu', 'bingzhuifu', 'dundifu'];
  if (r.chance(0.6)) add(r.pick(tals), r.int(1, 4));
  if (realm >= 1 && r.chance(0.12)) { const ms = allItems().filter((d) => d.type === 'manual' && d.rarity <= realm + 1); add(r.pick(ms).id, 1); }
  if (realm >= 2 && r.chance(0.08)) add('zhujidan', 1);
  if (realm >= 3 && r.chance(0.06)) add('jiangchendan', 1);
  if (realm >= 2 && r.chance(0.05)) add('jinleizhu', 1);
  if (realm >= 2 && r.chance(0.1)) add('tishenfu', 1);
  if (realm >= 1) add('yd' + Math.min(10, realm * 2 + r.int(-1, 1)), r.int(1, 3));
  return inv;
}

function look(r: RNG, align: number, female: boolean) {
  const robes = align < -0.3 ? [4, 5, 6, 11, 13] : align > 0.4 ? [1, 2, 3, 7, 12, 14] : [0, 2, 3, 9, 10, 14, 15];
  return { hair: r.chance(0.9) ? r.int(0, 3) : 5, robe: female && r.chance(0.5) ? r.pick([1, 7, 8, 12, 15, 13]) : r.pick(robes), acc: r.int(0, 9), skin: r.int(0, 2) };
}

export function createFamous(f: FamousDef): NPC {
  const r = new RNG(f.key.length * 977 + f.name.charCodeAt(0));
  const home = locById(f.home)!;
  const inv: InvEntry[] = (f.items || []).map(([id, n]) => ({ uid: uid(), id, n }));
  inv.push(...genInv(f.realm, r).slice(0, 2));
  const n: NPC = {
    id: 'f_' + f.key, name: f.name, gender: f.gender, famous: f.key, portrait: f.portrait, title: f.title,
    realm: f.realm, stage: f.stage, exp: 0, age: f.age, lifespan: Math.max(f.age + 50, REALMS[f.realm].lifespan * 1.05), sect: f.sect, home: f.home,
    align: f.align, arch: f.arch, traits: { ...f.traits }, x: home.x + r.range(-120, 120), y: home.y + r.range(-80, 120), tx: home.x, ty: home.y,
    goal: 'idle', goalT: r.range(5, 30), lingshi: Math.round(80 * Math.pow(4.2, f.realm) * r.range(0.6, 1.4)), inv, arts: [...f.arts], alive: true,
    favor: f.key === 'lifeiyu' ? 40 : f.key === 'chenqiaoqian' ? 10 : f.key === 'mocaihuan' ? 20 : 0, grudge: 0, met: false, hpFrac: 1, beauty: f.beauty,
    lastGift: -99, lastDual: -99, lastTalk: -99, conceal: f.key === 'modaifu' ? 1 : f.realm >= 4 ? 1 : 0, senseMul: f.key === 'dayan' ? 3 : 1, techs: f.techs, innate: f.innate,
    look: look(r, f.align, f.gender === 'f'), wander: f.wander ?? 0.2, desc: f.desc, lines: f.lines, likes: f.likes,
  };
  return n;
}

function regionTier(loc: LocationDef) {
  const rg = regionAtLand(loc.x, loc.y).id;
  if (['yue', 'jiang', 'cheqi', 'zijin', 'yuanwu'].includes(rg)) return 0;
  if (['xiguo', 'jiuguo', 'jixi', 'tianlan', 'neixing'].includes(rg)) return 1;
  return 2;
}

export function createRandomNPC(r: RNG, loc: LocationDef, forceRealm?: number): NPC {
  const tier = regionTier(loc);
  const weights: [number, number][][] = [
    [[1, 70], [2, 24], [3, 5], [4, 0.6]],
    [[1, 45], [2, 38], [3, 14], [4, 2.5]],
    [[1, 22], [2, 40], [3, 28], [4, 8], [5, 0.8]],
  ];
  let realm = forceRealm ?? r.weighted(weights[tier]);
  if (loc.id === 'qixuan' || loc.id === 'qingniu') realm = forceRealm ?? r.weighted([[0, 80], [1, 20]]);
  if (loc.sect && SECTS[loc.sect] && SECTS[loc.sect].minRealm > realm) realm = SECTS[loc.sect].minRealm;
  const stage = r.int(0, maxStage(realm));
  const gender: 'm' | 'f' = r.chance(0.38) ? 'f' : 'm';
  const sect = loc.type === 'sect' ? loc.sect : undefined;
  const sectAlign = sect ? SECTS[sect]?.align ?? 0 : r.range(-0.8, 0.8);
  const align = clamp(sectAlign + r.range(-0.35, 0.35), -1, 1);
  const arch: Archetype = r.pick(ARCHS);
  const age = realm === 0 ? r.range(15, 50) : REALMS[realm].lifespan * r.range(0.15, 0.75);
  let name = randomName(r, gender);
  let title: string | undefined;
  if (realm >= 3 && r.chance(0.5)) { title = name; name = name.slice(0, name.length > 3 ? 2 : 1) + (gender === 'm' ? r.pick(['老怪', '真人', '上人', '居士', '道人', align < -0.3 ? '老魔' : '散人']) : r.pick(['仙子', '夫人', '道姑'])); }
  const traits = { greed: r.range(0, 1), caution: r.range(0.1, 1), lust: r.range(0, 1), kind: clamp(r.range(0, 1) + align * 0.3, 0, 1), pride: r.range(0, 1) };
  if (align < -0.3) traits.greed = clamp(traits.greed + 0.25, 0, 1);
  const n: NPC = {
    id: 'n_' + uid(), name, gender, realm, stage, exp: r.range(0, expNeeded(realm, stage)), age, lifespan: Math.max(age + 5, lifespanFor(realm, r)), sect, home: loc.id,
    align, arch, traits, x: loc.x + r.range(-300, 300), y: loc.y + r.range(-300, 300), tx: loc.x, ty: loc.y, goal: 'idle', goalT: r.range(1, 40),
    lingshi: Math.round(30 * Math.pow(4, realm) * r.range(0.3, 1.8)), inv: genInv(realm, r), arts: genArts(realm, r, arch), alive: true, favor: 0, grudge: 0, met: false,
    hpFrac: 1, beauty: gender === 'f' && r.chance(0.25), lastGift: -99, lastDual: -99, lastTalk: -99, conceal: r.chance(0.15) ? 1 : 0, senseMul: r.range(0.85, 1.2),
    look: look(r, align, gender === 'f'), wander: r.range(0.1, 0.6), title,
  };
  if (!isLand(n.x, n.y)) { n.x = loc.x; n.y = loc.y; }
  return n;
}

export function initNPCs(): NPC[] {
  const r = new RNG(S().seed);
  const out: NPC[] = FAMOUS.map(createFamous);
  for (const loc of LOCATIONS) {
    const cnt = loc.type === 'city' ? 9 : loc.type === 'sect' ? 7 : loc.type === 'town' ? 5 : loc.type === 'village' ? 2 : 0;
    for (let i = 0; i < cnt; i++) out.push(createRandomNPC(r, loc));
  }
  return out;
}

// ---------------- 模拟 ----------------
let dayAcc = 0;
const SAFE_TYPES = new Set(['city', 'town', 'sect', 'village']);

export function inSafeZone(x: number, y: number) {
  for (const l of LOCATIONS) if (SAFE_TYPES.has(l.type) && dist(x, y, l.x, l.y) < 260) return l;
  return null;
}

function lineOnLand(x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(dist(x0, y0, x1, y1) / 250);
  for (let i = 1; i < n; i++) { const t = i / n; if (!isLand(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}

function npcSpeed(n: NPC) { return REALMS[n.realm].speed * (n.goal === 'stalk' ? 0.88 : n.goal === 'flee' ? 0.95 : 0.45); }

function chooseGoal(n: NPC) {
  const s = S();
  const home = locById(n.home)!;
  if (n.companion) { n.goal = 'follow'; n.goalT = 999; return; }
  if (n.partner && rng.chance(0.5)) { n.goal = 'idle'; n.goalT = rng.range(10, 30); n.tx = home.x; n.ty = home.y; return; }
  // 宝物
  const ev = s.events.find((e) => e.kind === 'treasure' && !e.taken && e.until > s.day && dist(n.x, n.y, e.x, e.y) < 2500 + n.realm * 1500 && e.level <= n.realm * 2 + 2);
  if (ev && rng.chance(n.traits.greed * 0.8)) { n.goal = 'treasure'; n.target = ev.id; n.tx = ev.x; n.ty = ev.y; n.goalT = 120; return; }
  const roll = rng.next();
  if (roll < 0.45 - n.wander * 0.3) { n.goal = 'idle'; n.tx = home.x + rng.range(-200, 200); n.ty = home.y + rng.range(-200, 200); n.goalT = rng.range(8, 40); return; }
  if (roll < 0.75) {
    const R = 500 + n.realm * 500;
    for (let i = 0; i < 6; i++) { const tx = home.x + rng.range(-R, R), ty = home.y + rng.range(-R, R); if ((n.realm >= 2 || isLand(tx, ty)) && tx > 0 && ty > 0 && tx < WORLD_W && ty < WORLD_H) { n.goal = 'wander'; n.tx = tx; n.ty = ty; n.goalT = rng.range(10, 40); return; } }
  }
  const range = [2500, 3500, 7000, 14000, 40000, 60000][n.realm];
  const cands = LOCATIONS.filter((l) => l.id !== n.home && SAFE_TYPES.has(l.type) && dist(n.x, n.y, l.x, l.y) < range && (n.realm >= 2 || lineOnLand(n.x, n.y, l.x, l.y)));
  if (cands.length && rng.chance(0.35 + n.wander * 0.4)) {
    const l = rng.pick(cands); n.goal = 'travel'; n.tx = l.x + rng.range(-150, 150); n.ty = l.y + rng.range(-150, 150); n.goalT = rng.range(30, 120);
    if (rng.chance(0.2)) n.home = l.id; // 迁居
    return;
  }
  const dangers = LOCATIONS.filter((l) => l.type === 'danger' && dist(n.x, n.y, l.x, l.y) < range && (l.danger ?? 5) <= n.realm * 2 + 2 && (n.realm >= 2 || lineOnLand(n.x, n.y, l.x, l.y)));
  if (dangers.length && rng.chance(0.4)) { const l = rng.pick(dangers); n.goal = 'hunt'; n.target = l.id; n.tx = l.x; n.ty = l.y; n.goalT = 90; return; }
  n.goal = 'idle'; n.tx = home.x; n.ty = home.y; n.goalT = rng.range(10, 30);
}

export interface SimHooks { onStalkContact(n: NPC): void; playerX: number; playerY: number; }

/** 实时更新（每帧） */
export function updateNPCs(dtReal: number, dtDays: number, hooks: SimHooks) {
  const s = S(); const p = s.player;
  for (const n of s.npcs) {
    if (!n.alive) continue;
    if (n.goal === 'follow') { n.tx = p.x + Math.cos(n.id.length) * 70; n.ty = p.y + 50; }
    if (n.goal === 'stalk') { n.tx = p.x; n.ty = p.y; }
    if (n.goal === 'flee') { const a = Math.atan2(n.y - p.y, n.x - p.x); n.tx = n.x + Math.cos(a) * 500; n.ty = n.y + Math.sin(a) * 500; }
    const dx = n.tx - n.x, dy = n.ty - n.y; const d = Math.hypot(dx, dy);
    let sp = npcSpeed(n) * dtReal;
    if (n.goal === 'follow') sp = Math.max(sp, computeStats(p).speed * dtReal * (d > 200 ? 1.3 : 0.9));
    if (d > 4) {
      const mv = Math.min(d, sp);
      const nx = n.x + (dx / d) * mv, ny = n.y + (dy / d) * mv;
      if (n.realm >= 2 || isLand(nx, ny) || n.goal === 'follow') { n.x = nx; n.y = ny; }
      else { n.goalT = 0; }
    }
    if (n.goal === 'stalk') {
      if (dist(n.x, n.y, p.x, p.y) < 46 && !inSafeZone(p.x, p.y)) hooks.onStalkContact(n);
    }
  }
  dayAcc += dtDays;
  if (dayAcc >= 1) { const days = Math.floor(dayAcc); dayAcc -= days; dailyTick(days); }
}

/** 闭关时的粗粒度模拟 */
export function fastSim(days: number) {
  const s = S();
  let left = days;
  while (left > 0) {
    const step = Math.min(10, left); left -= step;
    for (const n of s.npcs) {
      if (!n.alive || n.goal === 'follow') continue;
      const d = dist(n.x, n.y, n.tx, n.ty);
      const mv = npcSpeed(n) * step * 2;
      if (d > mv) { n.x += ((n.tx - n.x) / d) * mv; n.y += ((n.ty - n.y) / d) * mv; } else { n.x = n.tx; n.y = n.ty; }
      if (n.goal === 'stalk') { n.goal = 'idle'; n.goalT = 0; }
    }
    dailyTick(step, true);
  }
}

function dailyTick(days: number, fast = false) {
  const s = S(); const p = s.player;
  const pst = computeStats(p);
  for (const n of s.npcs) {
    if (!n.alive) continue;
    n.age += days / YEAR;
    if (n.hpFrac < 1) n.hpFrac = Math.min(1, n.hpFrac + 0.01 * days);
    // 修炼
    const rate = REALMS[n.realm].rate * (0.5 + n.senseMul * 0.5) * (n.goal === 'idle' ? 1.6 : 0.8) * (n.famous ? 1.3 : 1);
    n.exp += rate * days;
    const ms = maxStage(n.realm);
    while (n.exp >= expNeeded(n.realm, n.stage) && n.stage < ms) { n.exp -= expNeeded(n.realm, n.stage); n.stage++; }
    if (n.stage >= ms && n.exp >= expNeeded(n.realm, n.stage) && n.realm < 5) {
      n.exp = expNeeded(n.realm, n.stage);
      if (rng.chance(0.004 * days)) {
        const info = BREAK_INFO[n.realm + 1];
        let c = info.base + (n.inv.some((e) => e.id === info.pill) ? info.pillBonus : 0) + (n.famous ? 0.15 : 0);
        if (n.realm === 0) c = 0.3;
        if (rng.chance(c)) {
          n.realm++; n.stage = 0; n.exp = 0; n.lifespan = Math.max(n.lifespan, REALMS[n.realm].lifespan * rng.range(0.95, 1.15));
          if (n.famous || n.realm >= 4) addNews(`${n.name}突破成功，晋入${REALMS[n.realm].name}期！`, 'world');
        } else { n.exp *= 0.6; n.hpFrac = 0.5; }
      }
    }
    // 寿元
    if (n.age >= n.lifespan) {
      n.alive = false; n.deathDay = s.day;
      if (n.famous || n.realm >= 3 || n.met) addNews(`${n.name}（${realmName(n.realm, n.stage)}）寿元耗尽，坐化于${regionAtLand(n.x, n.y).name}。`, 'world');
      continue;
    }
    // 目标
    n.goalT -= days;
    const arrived = dist(n.x, n.y, n.tx, n.ty) < 30;
    if (n.goal === 'hunt' && arrived) {
      const loc = locById(n.target || '');
      const danger = loc?.danger ?? 4;
      const [br] = beastRealm(danger);
      const risk = clamp(0.05 + (br - n.realm) * 0.25, 0.01, 0.7);
      if (rng.chance(risk * 0.4)) {
        n.alive = false; n.deathDay = s.day; n.killedBy = loc?.name;
        if (n.famous || n.met || n.realm >= 3) addNews(`${n.name}在${loc?.name}猎妖时陨落。`, 'world');
        continue;
      }
      n.lingshi += Math.round(20 * Math.pow(3, Math.min(danger, n.realm * 2)) * rng.range(0.5, 1.5));
      n.inv.push({ uid: uid(), id: 'yd' + clamp(danger - rng.int(0, 2), 1, 10), n: rng.int(1, 2) });
      n.goalT = 0;
    }
    if (n.goal === 'treasure') {
      const ev = s.events.find((e) => e.id === n.target);
      if (!ev || ev.taken || ev.until < s.day) { n.goalT = 0; }
      else if (dist(n.x, n.y, ev.x, ev.y) < 60) {
        ev.taken = true;
        const loot = treasureLoot(ev.level);
        n.inv.push({ uid: uid(), id: loot, n: 1 });
        if (item(loot).art && item(loot).art!.minRealm <= n.realm && !n.arts.includes(loot)) n.arts.push(loot);
        addNews(`${n.name}在${ev.name}抢先一步，夺得了${item(loot).name}！`, 'world');
        n.goalT = 0;
      }
    }
    if (n.goal === 'stalk' && (n.goalT <= 0 || inSafeZone(p.x, p.y) && rng.chance(0.15 * days))) { n.goal = 'idle'; n.goalT = 0; }
    if (n.goal === 'flee' && n.goalT <= 0) n.goal = 'idle';
    if (n.goalT <= 0 || (arrived && n.goal !== 'idle' && n.goal !== 'follow' && n.goal !== 'stalk')) chooseGoal(n);
    // 感知玩家：杀人夺宝 / 搭话
    if (!fast) considerPlayer(n, days, pst);
  }
  if (!fast || rng.chance(0.5)) npcEncounters(days);
  // 人口补充
  const alive = s.npcs.filter((n) => n.alive).length;
  if (alive < 380 && rng.chance(0.15 * days)) {
    const locs = LOCATIONS.filter((l) => SAFE_TYPES.has(l.type));
    const n = createRandomNPC(rng, rng.pick(locs), rng.chance(0.85) ? 1 : 2);
    n.age = rng.range(16, 30); n.stage = rng.int(0, 3);
    s.npcs.push(n);
  }
  // 清理死亡久远且无关的 NPC
  if (s.npcs.length > 520) s.npcs = s.npcs.filter((n) => n.alive || n.famous || n.met || (s.day - (n.deathDay ?? 0)) < 720);
  worldEvents(days);
}

function considerPlayer(n: NPC, days: number, pst: ReturnType<typeof computeStats>) {
  const s = S(); const p = s.player;
  if (n.goal === 'follow' || n.partner || n.companion || n.goal === 'stalk' || n.goal === 'flee') return;
  const d = dist(n.x, n.y, p.x, p.y);
  let detect = npcSenseRadius(n) * (1 - pst.stealth) * (p.conceal && p.techs.includes('lianqi') ? 0.65 : 1);
  if (d > detect) return;
  if (inSafeZone(p.x, p.y)) return;
  // 记仇
  const myP = npcStats(n).power;
  const theirP = playerPower(true);
  const ratio = myP / theirP;
  const evil = (1 - n.align) / 2;
  let wantP = 0;
  if (n.grudge > 40 && ratio > 0.75) wantP = 0.35;
  else if (ratio > 1.25) {
    let wealth = p.heat / 100 + Math.min(1, p.lingshi / (300 * Math.pow(4, p.realm)));
    for (const u of p.equipped) { const e = invFind(p, u); if (e) wealth += Math.min(0.5, itemValue(e) / (8000 * Math.pow(3, p.realm))); }
    wantP = n.traits.greed * (0.15 + wealth) * (0.3 + evil * 1.2) * Math.min(1, ratio - 1) * (1 - n.traits.caution * 0.5);
    if (n.favor > 20) wantP *= 0.2;
  }
  const diffMul = s.difficulty === 'easy' ? 0.4 : s.difficulty === 'normal' ? 0.7 : 1;
  wantP *= diffMul;
  if (wantP > 0 && rng.chance(Math.min(0.5, wantP) * 0.25 * days)) {
    n.goal = 'stalk'; n.goalT = 20 + n.traits.greed * 30;
    // 玩家能否察觉
    if (d <= pst.senseRadius && pst.sense >= npcSenseVal(n) * 0.6) {
      bus.emit('stalkWarn', n);
    }
  }
}

function npcEncounters(days: number) {
  const s = S();
  const B = 900; const grid = new Map<string, NPC[]>();
  for (const n of s.npcs) { if (!n.alive || n.goal === 'follow' || n.partner) continue; const k = Math.floor(n.x / B) + ',' + Math.floor(n.y / B); if (!grid.has(k)) grid.set(k, []); grid.get(k)!.push(n); }
  for (const list of grid.values()) {
    if (list.length < 2) continue;
    if (!rng.chance(0.02 * days * list.length)) continue;
    const a = rng.pick(list), b = rng.pick(list);
    if (a === b || a.sect && a.sect === b.sect) continue;
    if (inSafeZone(a.x, a.y)) continue;
    const hostile = (a.align * b.align < -0.2 ? 0.5 : 0.1) + Math.max(a.traits.greed, b.traits.greed) * 0.4 - Math.min(a.traits.caution, b.traits.caution) * 0.3;
    if (!rng.chance(hostile * 0.4)) continue;
    const pa = npcStats(a).power * rng.range(0.7, 1.3), pb = npcStats(b).power * rng.range(0.7, 1.3);
    const [w, l] = pa > pb ? [a, b] : [b, a];
    const ratio = Math.max(pa, pb) / Math.min(pa, pb);
    if (rng.chance(clamp(0.35 + (ratio - 1) * 0.3, 0.2, 0.85))) {
      l.alive = false; l.deathDay = s.day; l.killedBy = w.name;
      w.lingshi += l.lingshi; l.lingshi = 0;
      for (const e of l.inv.splice(0, 3)) w.inv.push(e);
      if (l.arts.length && rng.chance(0.6)) { const art = l.arts.shift()!; w.inv.push({ uid: uid(), id: art, n: 1 }); if (!w.arts.includes(art) && item(art).art!.minRealm <= w.realm && w.arts.length < 4) w.arts.push(art); }
      if (l.famous || w.famous || l.realm >= 3 || l.met || l.partner) addNews(`${w.name}（${realmName(w.realm, w.stage)}）于${regionAtLand(l.x, l.y).name}斩杀了${l.name}（${realmName(l.realm, l.stage)}），夺其储物袋。`, 'kill');
      if (l.partner) toast(`噩耗！你的道侣${l.name}被${w.name}所杀！`, 'bad');
      if (l.partner || l.companion) w.grudge = 0, (w as any).hatedByPlayer = true;
    } else {
      l.hpFrac = 0.3; l.goal = 'idle'; l.goalT = 30; const home = locById(l.home)!; l.tx = home.x; l.ty = home.y;
    }
  }
}

export function treasureLoot(level: number): string {
  const pool = allItems().filter((d) => (d.type === 'artifact' || d.type === 'manual' || d.type === 'herb' || d.type === 'pill') && d.price > 0 && !['xutianding', 'zhangtianping', 'yuanhoukuilei', 'wuzimo'].includes(d.id));
  const target = 200 * Math.pow(2.6, level);
  const c = pool.filter((d) => d.price > target * 0.25 && d.price < target * 4);
  return (c.length ? rng.pick(c) : rng.pick(pool)).id;
}

const TREASURE_NAMES = ['宝光冲天', '灵药出世', '古修洞府现世', '异兽遗骸', '上古法宝残留'];

function worldEvents(days: number) {
  const s = S();
  s.events = s.events.filter((e) => e.until > s.day && !e.taken || (s.day - e.until) < 5 && false);
  if (s.events.length < 4 && rng.chance(0.012 * days)) {
    const p = s.player;
    // 在玩家附近一定范围或随机地区
    for (let i = 0; i < 20; i++) {
      const near = rng.chance(0.6);
      const x = near ? p.x + rng.range(-5000, 5000) : rng.range(1000, WORLD_W - 1000);
      const y = near ? p.y + rng.range(-4000, 4000) : rng.range(1000, WORLD_H - 1000);
      if (!isLand(x, y)) continue;
      const rg = regionAtLand(x, y);
      const level = rng.int(rg.danger[0], rg.danger[1]);
      const nm = rng.pick(TREASURE_NAMES);
      const ev: WorldEvent = { id: 'ev_' + uid(), kind: 'treasure', x, y, name: `${rg.name}·${nm}`, until: s.day + 90, level };
      s.events.push(ev);
      addNews(`传闻${rg.name}一带${nm}，引得各方修士蠢蠢欲动。`, 'event');
      bus.emit('eventSpawn', ev);
      break;
    }
  }
  // 秘境开启
  for (const l of LOCATIONS) {
    if (!l.openEvery) continue;
    const open = secretIsOpen(l);
    const key = 'open_' + l.id;
    if (open && !s.flags[key]) { s.flags[key] = true; addNews(`${l.name}开启了！（持续约一个半月）`, 'event'); toast(`${l.name}开启了！`, 'gold'); }
    if (!open && s.flags[key]) s.flags[key] = false;
  }
}

// 各秘境开启时间错开：首次开启在游戏开始若干年后
function secretOffset(l: LocationDef) {
  const period = l.openEvery! * YEAR;
  let h = 0; for (const ch of l.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return Math.floor(period * 0.3 + (h / 997) * period * 0.25);
}
function secretPhase(l: LocationDef) {
  const period = l.openEvery! * YEAR;
  return (((S().day - secretOffset(l)) % period) + period) % period;
}
export function secretRunId(l: LocationDef) { return Math.floor((S().day - secretOffset(l)) / (l.openEvery! * YEAR)); }
export function secretIsOpen(l: LocationDef) {
  if (!l.openEvery) return true;
  return S().day >= secretOffset(l) && secretPhase(l) < 45;
}

export function daysUntilOpen(l: LocationDef) {
  const period = l.openEvery! * YEAR;
  if (S().day < secretOffset(l)) return secretOffset(l) - S().day;
  return Math.ceil(period - secretPhase(l));
}
