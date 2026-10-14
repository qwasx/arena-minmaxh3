// 玩家属性推导、背包、修炼、突破
import { REALMS, stageMult, expNeeded, maxStage, BREAK_INFO, realmName } from '../data/realms';
import { item, ITEMS, herbPrice, HERB_AGES } from '../data/items';
import { TECHS, TALENTS, dayanLayer } from '../data/techniques';
import { S, InvEntry, Player, YEAR, addNews } from './state';
import { uid, rng } from './rng';
import { bus, toast } from './bus';
import { LOCATIONS } from '../data/world';
import { dist } from './rng';

export interface Stats {
  maxHp: number; maxMp: number; atk: number; def: number; sense: number; senseRadius: number; senseCap: number; senseUsed: number;
  speed: number; moveSpeed: number; crit: number; critDmg: number; rate: number; dash: number; conceal: number; stealth: number;
  mods: Record<string, number>; lifespan: number; dayan: number; reveal: boolean; sword: number;
}

export function talentMods(talents: string[]) {
  const m: Record<string, number> = {};
  for (const t of talents) {
    const d = TALENTS.find((x) => x.id === t);
    if (!d) continue;
    for (const k in d.mods) m[k] = (m[k] || 0) + d.mods[k];
  }
  return m;
}

export function artSense(e: InvEntry, mods: Record<string, number>) {
  const d = item(e.id)?.art; if (!d) return 0;
  const cnt = d.count ? (e.count ?? d.count) : 1;
  let s = d.sense * cnt;
  if ((d.kind === 'puppet' || d.kind === 'beast') && mods.summonSense) s *= 1 - mods.summonSense;
  return Math.ceil(s);
}

export function invFind(p: Player, uidv: string) { return p.inv.find((e) => e.uid === uidv); }
export function countItem(p: Player, id: string) { let n = 0; for (const e of p.inv) if (e.id === id) n += e.n; return n; }

export function addItem(p: Player, id: string, n = 1, extra: Partial<InvEntry> = {}): InvEntry {
  const d = item(id);
  if (!d) { console.warn('unknown item', id); return null as any; }
  const stackable = d.type !== 'artifact' && d.type !== 'bag';
  if (stackable) {
    const q = extra.q ?? (d.herbBase ? 0 : undefined);
    const ex = p.inv.find((e) => e.id === id && e.q === q);
    if (ex) { ex.n += n; return ex; }
    const e: InvEntry = { uid: uid(), id, n, ...extra, q };
    p.inv.push(e); return e;
  }
  let last: InvEntry = null as any;
  for (let i = 0; i < n; i++) {
    last = { uid: uid(), id, n: 1, refine: 0, ...extra };
    if (d.art?.count && last.count === undefined) last.count = d.art.count;
    p.inv.push(last);
  }
  return last;
}

export function removeItem(p: Player, id: string, n = 1, q?: number): boolean {
  let need = n;
  const cands = p.inv.filter((e) => e.id === id && (q === undefined || e.q === q)).sort((a, b) => (a.q ?? 0) - (b.q ?? 0));
  let have = 0; for (const c of cands) have += c.n;
  if (have < n) return false;
  for (const c of cands) {
    const t = Math.min(c.n, need); c.n -= t; need -= t;
    if (c.n <= 0) { p.inv.splice(p.inv.indexOf(c), 1); p.equipped = p.equipped.filter((u) => u !== c.uid); }
    if (need <= 0) break;
  }
  return true;
}
export function removeEntry(p: Player, e: InvEntry, n = 1) {
  e.n -= n;
  if (e.n <= 0) { const i = p.inv.indexOf(e); if (i >= 0) p.inv.splice(i, 1); p.equipped = p.equipped.filter((u) => u !== e.uid); }
}

export function itemLabel(e: InvEntry) {
  const d = item(e.id);
  if (!d) return e.id;
  let n = d.name;
  if (d.herbBase && e.q !== undefined) n = HERB_AGES[e.q] + n;
  if (d.type === 'artifact') {
    if (e.refine) n += ` +${e.refine}`;
    if (d.art?.count && e.count !== undefined && d.art.kind !== 'needle') n += `（${e.count}）`;
  }
  if (d.type === 'bag' && e.bag) n = `${e.bag.owner}的储物袋`;
  return n;
}

export function itemValue(e: InvEntry) {
  const d = item(e.id);
  if (!d) return 0;
  if (d.herbBase) return herbPrice(e.id, e.q ?? 0);
  if (d.art?.kind === 'swarm' && e.count) return Math.round(d.price * (e.count / (d.art.count || 1)));
  return Math.round(d.price * (1 + 0.15 * (e.refine || 0)));
}

export function locAura(x: number, y: number) {
  let best = 1;
  for (const l of LOCATIONS) {
    const d = dist(x, y, l.x, l.y);
    if (d < 420) {
      let a = l.aura ?? (l.type === 'city' ? 1.2 : l.type === 'danger' ? 1.4 : 1.05);
      if (l.sect && S().player.sect !== l.sect && l.type === 'sect') a = 1 + (a - 1) * 0.3; // 非本门弟子
      best = Math.max(best, a);
    }
  }
  return best;
}

export function computeStats(p: Player = S().player): Stats {
  const r = REALMS[p.realm];
  const sm = stageMult(p.realm, p.stage);
  const mods = talentMods(p.talents);
  let hpM = 1 + (mods.hp || 0), mpM = 1 + (mods.mp || 0), atkM = 1 + (mods.atk || 0), defM = 1 + (mods.def || 0), senseM = 1 + (mods.sense || 0) + p.sensePerm;
  let speedM = 1 + (mods.speed || 0), dash = 1, conceal = 0, rateM = 1 + (mods.rate || 0), sword = 1 + (mods.sword || 0);
  let reveal = false;
  for (const t of p.techs) {
    const d = TECHS[t]; if (!d) continue;
    if (d.kind === 'main' && t !== p.mainTech) continue;
    hpM += d.hp || 0; atkM += d.atk || 0; defM += d.def || 0; senseM += d.sense && t !== 'tianyan' ? d.sense : 0; speedM += d.speed || 0; dash += d.dash || 0;
    if (d.conceal && p.conceal) conceal += d.conceal + (p.realm >= 3 ? 1 : 0);
    if (d.sword) sword += d.sword;
    if (d.reveal) reveal = true;
  }
  const main = TECHS[p.mainTech];
  if (main) { let rr = main.rate || 1; if (p.mainTech === 'changchun' && p.realm >= 2) rr = 0.7; rateM *= rr; }
  // 大衍诀
  let dayan = 0;
  if (p.techs.includes('dayan')) { dayan = dayanLayer(p.realm, p.stage); senseM *= 1 + dayan; }
  // 法宝
  let senseUsed = 0;
  for (const u of p.equipped) {
    const e = invFind(p, u); if (!e) continue;
    const a = item(e.id)?.art; if (!a) continue;
    senseUsed += artSense(e, mods);
    defM += a.def || 0; hpM += a.hp || 0; speedM += a.worldSpeed || 0; senseM += a.senseBonus || 0;
  }
  const injury = 1 - p.injury * 0.4;
  const sense = r.sense * sm * senseM;
  let radiusMul = 1;
  if (p.tianyan && p.techs.includes('tianyan')) radiusMul += 0.4;
  const senseRadius = Math.min(9000, (260 + 92 * Math.sqrt(sense)) * radiusMul);
  const lifespan = r.lifespan * (1 + (mods.life || 0)) + p.lifeBonus;
  return {
    maxHp: Math.round(r.hp * sm * hpM * injury), maxMp: Math.round(r.mp * sm * mpM), atk: Math.round(r.atk * sm * atkM * injury), def: Math.round(r.def * sm * defM),
    sense: Math.round(sense), senseRadius, senseCap: Math.round(sense), senseUsed,
    speed: r.speed * speedM * (p.realm === 0 ? 1 : 1) * (1 - p.injury * 0.2), moveSpeed: 230 + 22 * p.realm + 60 * (speedM - 1),
    crit: 0.05 + (mods.crit || 0), critDmg: 1.6 + (mods.critDmg || 0), rate: r.rate * rateM * (1 - p.injury * 0.5), dash, conceal, stealth: mods.stealth || 0,
    mods, lifespan, dayan, reveal, sword,
  };
}

export function lifespanLeft(p: Player = S().player) { return computeStats(p).lifespan - p.age; }

/** 增加修为 */
export function addExp(amount: number, silent = false) {
  const p = S().player;
  p.exp += amount;
  const ms = maxStage(p.realm);
  let changed = false;
  while (p.exp >= expNeeded(p.realm, p.stage) && p.stage < ms) {
    p.exp -= expNeeded(p.realm, p.stage);
    p.stage++; changed = true;
    toast(`修为精进，晋入 ${realmName(p.realm, p.stage)}！`, 'gold');
    bus.emit('sfx', 'levelup');
    if (p.realm === 1 && p.stage === 6) offerTalents();
  }
  const need = expNeeded(p.realm, p.stage);
  if (p.stage >= ms && p.exp >= need) {
    p.exp = need;
    if (!S().flags['bottleneck_' + p.realm] && !silent) { S().flags['bottleneck_' + p.realm] = true; toast(p.realm === 0 ? '长春功已入门，可尝试引气入体！' : '修为已至瓶颈，需突破大境界。', 'gold'); }
  }
  if (changed) { const st = computeStats(p); p.hp = st.maxHp; p.mp = st.maxMp; }
  bus.emit('refresh');
}

export function canBreak(p: Player = S().player) {
  return p.realm < 5 && p.stage >= maxStage(p.realm) && p.exp >= expNeeded(p.realm, p.stage);
}

export function breakChance(p: Player = S().player, usePill = true) {
  const info = BREAK_INFO[p.realm + 1]; if (!info) return 0;
  const mods = talentMods(p.talents);
  let c = info.base + (mods.breakB || 0);
  const diff = S().difficulty;
  c += diff === 'easy' ? 0.15 : diff === 'normal' ? 0.07 : 0;
  if (usePill && info.pill && p.inv.some((e) => e.id === info.pill)) c += info.pillBonus;
  c -= p.injury * 0.3;
  if (p.realm === 0) c = 0.98;
  return Math.max(0.02, Math.min(0.97, c));
}

export function tryBreakthrough(usePill = true): boolean {
  const p = S().player;
  if (!canBreak(p)) return false;
  const info = BREAK_INFO[p.realm + 1];
  const chance = breakChance(p, usePill);
  if (usePill && info.pill) removeItem(p, info.pill, 1);
  const ok = rng.next() < chance;
  if (ok) {
    p.realm++; p.stage = 0; p.exp = 0; p.injury = 0;
    S().flags['bottleneck_' + (p.realm - 1)] = false;
    const st = computeStats(p); p.hp = st.maxHp; p.mp = st.maxMp;
    toast(`${info.name}成功！晋入${realmName(p.realm, 0)}！`, 'gold');
    addNews(`韩立${info.name}成功，晋入${REALMS[p.realm].name}期。`, 'good');
    bus.emit('sfx', 'breakthrough');
    if (p.realm >= 1) offerTalents();
    if (p.realm === 2) toast('筑基修士可御器飞行，海面不再阻拦你的去路。', 'good');
  } else {
    p.exp = Math.floor(p.exp * 0.6);
    p.injury = Math.min(1, p.injury + 0.35);
    toast(`${info.name}失败……经脉受创，修为跌落。`, 'bad');
    bus.emit('sfx', 'fail');
  }
  bus.emit('refresh');
  return ok;
}

export function offerTalents() {
  const p = S().player;
  const pool = TALENTS.filter((t) => !p.talents.includes(t.id) && (t.minRealm ?? 0) <= p.realm);
  const luck = talentMods(p.talents).luck || 0;
  const picks: string[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const w = pool.map((t) => [t, t.rarity === 1 ? 10 : t.rarity === 2 ? 6 + luck * 10 : t.rarity === 3 ? 2.5 + luck * 8 : 0.8 + luck * 4] as [any, number]);
    const t = rng.weighted(w);
    picks.push(t.id); pool.splice(pool.indexOf(t), 1);
  }
  p.pendingTalents = picks;
  bus.emit('talents');
}

export function chooseTalent(id: string) {
  const p = S().player;
  p.talents.push(id); p.pendingTalents = undefined;
  const st = computeStats(p); p.hp = Math.min(p.hp, st.maxHp);
  bus.emit('refresh');
}

/** 服用丹药（非战斗） */
export function usePill(e: InvEntry): string | null {
  const p = S().player;
  const d = item(e.id); if (!d?.pill) return '无法服用';
  const pl = d.pill;
  if (pl.breakFor) return '突破时自动服用';
  if (pl.favor) return '此物更适合作为赠礼';
  if (pl.minRealm !== undefined && p.realm < pl.minRealm) return '境界不足，药力过猛';
  if (pl.maxRealm !== undefined && p.realm > pl.maxRealm) {
    // 低阶丹药效果大减
  }
  const st = computeStats(p);
  let msg = '';
  if (pl.exp) {
    let v = pl.exp;
    if (pl.maxRealm !== undefined && p.realm > pl.maxRealm) v = Math.round(v * 0.08);
    // 丹毒：短时间连续服用效果递减
    const k = 'pilltox';
    const tox = S().flags[k] || 0;
    v = Math.round(v * Math.max(0.25, 1 - tox * 0.12));
    S().flags[k] = tox + 1;
    addExp(v); msg += `修为 +${v}`;
  }
  if (pl.hp) { p.hp = Math.min(st.maxHp, p.hp + st.maxHp * pl.hp); msg += ' 气血恢复'; }
  if (pl.mp) { p.mp = Math.min(st.maxMp, p.mp + st.maxMp * pl.mp); msg += ' 法力恢复'; }
  if (pl.heal) { p.injury = 0; msg += ' 伤势痊愈'; }
  if (pl.life) { const used = S().flags.lifeUsed || 0; const v = Math.round(pl.life * Math.pow(0.6, used)); p.lifeBonus += v; S().flags.lifeUsed = used + 1; msg += ` 寿元 +${v}年`; }
  if (pl.sense) { const used = S().flags.senseUsed || 0; const v = pl.sense * Math.pow(0.75, used); p.sensePerm += v; S().flags.senseUsed = used + 1; msg += ` 神识永久 +${Math.round(v * 100)}%`; }
  removeEntry(p, e, 1);
  bus.emit('refresh');
  return msg.trim();
}

/** 学习功法 */
export function learnManual(e: InvEntry): string {
  const p = S().player;
  const d = item(e.id); const t = d?.manual ? TECHS[d.manual] : null;
  if (!t) return '无法参悟';
  if (p.techs.includes(t.id)) return '已经学会了';
  if (p.realm < t.minRealm) return `需要${REALMS[t.minRealm].name}期才能修炼`;
  p.techs.push(t.id);
  if (t.kind === 'main' && (p.mainTech === 'changchun' || !p.mainTech)) p.mainTech = t.id;
  removeEntry(p, e, 1);
  bus.emit('refresh');
  return `习得《${t.name}》`;
}

export function equipToggle(e: InvEntry): string | null {
  const p = S().player;
  const a = item(e.id)?.art; if (!a) return '不是法宝';
  if (p.equipped.includes(e.uid)) { p.equipped = p.equipped.filter((u) => u !== e.uid); bus.emit('refresh'); return null; }
  if (p.realm < a.minRealm) return `需要${REALMS[a.minRealm].name}期才能驾驭`;
  const st = computeStats(p);
  const cost = artSense(e, st.mods);
  if (st.senseUsed + cost > st.senseCap) return `神识不足（需 ${cost}，剩余 ${st.senseCap - st.senseUsed}）`;
  // 同类飞行法器只能一个
  if (a.kind === 'boat' || a.kind === 'wings') {
    for (const u of [...p.equipped]) { const o = invFind(p, u); const oa = o && item(o.id).art; if (oa && (oa.kind === a.kind)) p.equipped = p.equipped.filter((x) => x !== u); }
  }
  p.equipped.push(e.uid);
  bus.emit('refresh');
  return null;
}

/** 每日推进（玩家相关） */
export function playerDayTick(days: number, meditating: boolean) {
  const s = S(); const p = s.player;
  const st = computeStats(p);
  p.age += days / YEAR;
  // 修炼
  const aura = locAura(p.x, p.y);
  const gain = st.rate * aura * (meditating ? 3 : 0.6) * days;
  if (gain > 0) addExp(gain, true);
  // 恢复
  p.hp = Math.min(st.maxHp, p.hp + st.maxHp * 0.02 * days * (meditating ? 3 : 1));
  p.mp = Math.min(st.maxMp, p.mp + st.maxMp * 0.05 * days * (meditating ? 3 : 1));
  if (p.injury > 0) p.injury = Math.max(0, p.injury - 0.004 * days * (meditating ? 3 : 1));
  // 掌天瓶
  p.bottle.progress += days;
  while (p.bottle.progress >= 30) {
    p.bottle.progress -= 30;
    if (p.bottle.drops < p.bottle.max) { p.bottle.drops++; if (p.bottle.drops === 1 || p.bottle.drops === p.bottle.max) toast('掌天瓶又凝聚出一滴绿液。', 'good'); }
  }
  // 丹毒消退
  if (s.flags.pilltox) s.flags.pilltox = Math.max(0, s.flags.pilltox - days * 0.05);
  // 怀璧其罪：热度消退
  if (p.heat > 0) p.heat = Math.max(0, p.heat - days * 0.08);
  // 储物袋抹除印记
  for (const e of p.inv) if (e.bag && e.bag.started && e.bag.days > 0) { e.bag.days -= days; if (e.bag.days <= 0) { e.bag.days = 0; toast(`${e.bag.owner}的储物袋印记已被抹去，可以打开了。`, 'good'); } }
  // 法宝祭炼
  for (const e of p.inv) if (e.jilian && e.jilian > 0) { e.jilian -= days; if (e.jilian <= 0) { e.jilian = 0; toast(`${item(e.id).name}祭炼完成，已可如臂使指。`, 'good'); } }
  // 寿元
  if (p.age >= st.lifespan) bus.emit('lifeEnd');
}

/** 死亡惩罚：扣修为、掉落物品 */
export function deathPenalty(killerName?: string): string[] {
  const s = S(); const p = s.player;
  const st = computeStats(p);
  const half = p.equipped.some((u) => invFind(p, u)?.id === 'yanghunmu');
  const lossFrac = (s.difficulty === 'easy' ? 0.2 : s.difficulty === 'normal' ? 0.3 : 0.4) * (half ? 0.5 : 1);
  const lost = Math.floor(p.exp * lossFrac + expNeeded(p.realm, p.stage) * lossFrac * 0.5);
  p.exp = Math.max(0, p.exp - lost);
  const msgs = [`修为损失 ${lost}`];
  // 掉落物品
  const dropN = s.difficulty === 'easy' ? 1 : 2;
  const dropped: InvEntry[] = [];
  const cands = p.inv.filter((e) => !item(e.id).noSell && e.id !== 'zhangtianping');
  for (let i = 0; i < dropN && cands.length; i++) {
    const e = rng.pick(cands);
    cands.splice(cands.indexOf(e), 1);
    const take = Math.max(1, Math.ceil(e.n / 2));
    dropped.push({ ...e, n: take, uid: uid() });
    removeEntry(p, e, take);
  }
  const ls = Math.floor(p.lingshi * 0.3); p.lingshi -= ls;
  if (ls > 0) msgs.push(`灵石 -${ls}`);
  for (const d of dropped) msgs.push(`失去 ${itemLabel(d)}×${d.n}`);
  p.age += 1;
  msgs.push('寿元 -1年');
  p.injury = Math.min(1, p.injury + 0.3);
  p.hp = st.maxHp * 0.5; p.mp = st.maxMp * 0.5;
  p.deaths++;
  // 掉落物归凶手
  if (killerName) {
    const k = s.npcs.find((n) => n.name === killerName && n.alive);
    if (k) { for (const d of dropped) k.inv.push(d); k.lingshi += ls; k.grudge = Math.max(k.grudge, 10); }
    s.flags.lastKiller = killerName;
  }
  bus.emit('refresh');
  return msgs;
}

export function useBottleOnHerb(e: InvEntry): string | null {
  const p = S().player;
  if (p.bottle.drops <= 0) return '掌天瓶中暂无绿液';
  const d = item(e.id);
  if (!d.herbBase) return '只能滴在灵草上';
  const q = e.q ?? 0;
  if (q >= 5) return '已是万年灵药';
  p.bottle.drops--;
  removeEntry(p, e, 1);
  addItem(p, e.id, 1, { q: q + 1 });
  bus.emit('refresh');
  bus.emit('sfx', 'bottle');
  return `${HERB_AGES[q]}${d.name} → ${HERB_AGES[q + 1]}${d.name}`;
}

export function sellItem(e: InvEntry, n = 1, priceMul = 0.6): number {
  const p = S().player;
  const d = item(e.id);
  if (d.noSell) return 0;
  const v = Math.max(1, Math.floor(itemValue(e) * priceMul)) * n;
  p.lingshi += v;
  // 怀璧其罪：出售高年份灵药会引人注意
  if (d.herbBase && (e.q ?? 0) >= 3) { p.heat = Math.min(100, p.heat + 8 * (e.q! - 2) * n); }
  if (d.rarity >= 4) p.heat = Math.min(100, p.heat + 5 * n);
  removeEntry(p, e, n);
  bus.emit('refresh');
  return v;
}

export { ITEMS };
