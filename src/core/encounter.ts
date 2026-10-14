// 遭遇：妖兽生成、首领、战利品
import { REALMS, stageMult, beastRealm, realmName } from '../data/realms';
import { MONSTER_TYPES } from './textures';
import type { EnemySpec } from '../scenes/BattleScene';
import { S, NPC, InvEntry, BagData } from './state';
import { npcStats, npcSenseVal } from './npc';
import { rng, uid, RNG } from './rng';
import { allItems, item } from '../data/items';
import type { BiomeId } from '../data/world';

const LV_NAMES = ['凡兽', '一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'];

export const BIOME_MONSTERS: Record<string, [string, number, number][]> = {
  plain: [['wolf', 0, 3], ['boar', 0, 3], ['greywolf', 1, 5], ['snake', 1, 5], ['bear', 2, 6], ['fox', 2, 7], ['ape', 3, 7]],
  forest: [['wolf', 0, 3], ['snake', 0, 5], ['spider', 1, 6], ['bear', 2, 6], ['ape', 3, 8], ['fox', 2, 8], ['bird', 3, 9]],
  steppe: [['greywolf', 0, 6], ['wolf', 0, 3], ['bird', 2, 8], ['bear', 2, 7], ['scorpion', 3, 7], ['bigbeast', 6, 10]],
  desert: [['scorpion', 0, 8], ['snake', 1, 6], ['corpse', 3, 8], ['puppet', 4, 9]],
  snow: [['icebeast', 3, 10], ['greywolf', 1, 6], ['ape2', 4, 9], ['bird', 3, 9]],
  jungle: [['snake', 1, 7], ['spider', 1, 7], ['ape', 2, 8], ['scorpion', 2, 7], ['jiao', 4, 9]],
  evil: [['corpse', 1, 8], ['ghost', 1, 9], ['spider', 1, 6], ['demon', 5, 10]],
  island: [['crab', 1, 6], ['seasnake', 2, 8], ['bird', 2, 8], ['ape2', 3, 8]],
  blood: [['ghost', 1, 6], ['corpse', 1, 6], ['spider', 1, 5], ['snake', 1, 5]],
  marsh: [['snake', 1, 6], ['jiao', 3, 8], ['crab', 1, 5], ['spider', 1, 6]],
  sea: [['shark', 2, 9], ['seasnake', 2, 9], ['crab', 1, 6], ['jiao', 4, 10], ['dragon', 8, 10]],
};

export function pickMonster(biome: BiomeId | 'sea', level: number, r: RNG = rng): string {
  const t = BIOME_MONSTERS[biome] || BIOME_MONSTERS.plain;
  const c = t.filter(([, a, b]) => level >= a && level <= b);
  return (c.length ? r.pick(c) : r.pick(t))[0];
}

export function beastSpec(type: string, level: number, boss = false, name?: string): EnemySpec {
  const [realm, stage] = beastRealm(level);
  const R = REALMS[realm]; const sm = stageMult(realm, stage);
  const t = MONSTER_TYPES[type] || MONSTER_TYPES.wolf;
  const tank = ['bear', 'ape2', 'bigbeast', 'crab', 'icebeast', 'puppet', 'dragon'].includes(type) ? 1.35 : ['ghost', 'bird', 'fox'].includes(type) ? 0.8 : 1;
  const hp = R.hp * sm * 0.9 * tank * (boss ? 4.2 : 1);
  const atk = R.atk * sm * 0.95 * (boss ? 1.25 : 1);
  return {
    name: name || (boss ? t.name + '王' : `${LV_NAMES[level]}·${t.name}`), kind: 'beast', mtype: type, level, realm, stage,
    hp: Math.round(hp), atk: Math.round(atk), def: Math.round(R.def * sm * (boss ? 1.3 : 1)), sense: R.sense * sm, arch: 'beast', arts: [], boss,
    speed: Math.min(340, 165 + level * 15) * (type === 'bear' || type === 'crab' ? 0.8 : type === 'wolf' || type === 'greywolf' || type === 'bird' ? 1.15 : 1),
    scale: boss ? 1.2 : 1, caution: 0,
  };
}

export function npcSpec(n: NPC, boss = false): EnemySpec {
  const st = npcStats(n);
  return {
    name: n.name, kind: 'npc', npcId: n.id, realm: n.realm, stage: n.stage, hp: Math.round(st.hp / (0.5 + 0.5 * n.hpFrac)), hpFrac: n.hpFrac, atk: st.atk, def: st.def, sense: npcSenseVal(n),
    arch: n.arch, arts: n.arts, boss: boss || n.realm >= 4 && !!n.famous, speed: 200 + n.realm * 25, innate: n.innate, caution: n.traits.caution,
  };
}

export interface BossDef { name: string; mtype: string; level: number; loot: [string, number][]; first?: string; innate?: string; hpMul?: number; }
export const BOSSES: Record<string, BossDef> = {
  mojiao: { name: '墨蛟', mtype: 'jiao', level: 3, loot: [['zihouhua', 0.8], ['tianlingguo', 0.8], ['yd3', 1], ['jiaolin', 0.5]] },
  gumo: { name: '古魔残魂', mtype: 'demon', level: 7, loot: [['xuemojian', 0.35], ['yd7', 1], ['jiangchendan', 0.4], ['m_liuji', 0.15]], innate: 'shihuo' },
  dayanpuppet: { name: '大衍神君遗留傀儡', mtype: 'puppet', level: 6, loot: [['kuilei3', 0.5], ['xuantie', 1]], first: 'm_dayan' },
  mulanmaster: { name: '慕兰神师', mtype: 'ghost', level: 7, loot: [['yd7', 1], ['zhangxinleifu', 1], ['m_zhangxin', 0.4]] },
  shengshou: { name: '天澜圣兽', mtype: 'bigbeast', level: 9, loot: [['yd9', 1], ['longlinguo', 0.6], ['yanghundan', 0.5]] },
  yuancha: { name: '元刹圣祖分身', mtype: 'demon', level: 10, loot: [['yd10', 1], ['huashendan', 0.3], ['sanyanshan', 0.3]], innate: 'shihuo', hpMul: 1.3 },
  yinyangbeast: { name: '阴阳窟异兽', mtype: 'icebeast', level: 8, loot: [['yd8', 1], ['yanghunmu', 0.25], ['jiuqulingshen', 0.4]] },
  icebeast: { name: '冰魄兽王', mtype: 'icebeast', level: 9, loot: [['yd9', 1], ['zibingzhuo', 0.4]] },
  haiyuan: { name: '海猿王', mtype: 'ape2', level: 6, loot: [['yd6', 1], ['chijingzhi', 0.6]] },
  xutianguard: { name: '虚天殿守护冰蛟', mtype: 'jiao', level: 8, loot: [['yd8', 1], ['qianlanzhu', 0.3], ['m_qianlan', 0.3]], first: 'xutianding' },
  fengxi: { name: '化形雷鹏', mtype: 'fengxi', level: 9, loot: [['yd9', 1]], first: 'leipenggu' },
  yinming: { name: '阴冥兽', mtype: 'ghost', level: 8, loot: [['yd8', 1], ['yanghundan', 0.6], ['tihunshou', 0.15]] },
  jinjiaowang: { name: '金蛟王', mtype: 'dragon', level: 10, loot: [['yd10', 1], ['jiaolin', 1], ['gengjing', 0.25]] },
};

export function bossSpec(key: string): EnemySpec {
  const b = BOSSES[key] || BOSSES.mojiao;
  const s = beastSpec(b.mtype, b.level, true, b.name);
  if (b.hpMul) s.hp = Math.round(s.hp * b.hpMul);
  s.innate = b.innate;
  return s;
}

/** 妖兽掉落 */
export function beastLoot(spec: EnemySpec): { id: string; n: number; q?: number }[] {
  const out: { id: string; n: number; q?: number }[] = [];
  const lv = spec.level ?? 0;
  if (lv >= 1 && rng.chance(spec.boss ? 1 : 0.5)) out.push({ id: 'yd' + Math.min(10, lv), n: 1 });
  if (lv <= 3 && rng.chance(0.5)) out.push({ id: 'beasthide', n: rng.int(1, 2) });
  if (lv >= 2 && rng.chance(0.25)) out.push({ id: 'beastbone', n: 1 });
  if (rng.chance(0.18 + (S().player.talents.includes('luck') ? 0.1 : 0))) {
    const herbs = allItems().filter((d) => d.herbBase && d.rarity <= Math.ceil((lv + 1) / 2) + 1);
    out.push({ id: rng.pick(herbs).id, n: 1, q: rng.chance(0.15) ? 1 : 0 });
  }
  if (lv >= 6 && rng.chance(0.06)) out.push({ id: 'jiaolin', n: 1 });
  return out;
}

/** 修士的储物袋 */
export function makeBag(n: NPC, playerSense: number): InvEntry {
  const items: InvEntry[] = n.inv.map((e) => ({ ...e, uid: uid() }));
  // 法宝：一部分在斗法中损毁
  for (const a of n.arts) {
    const d = item(a); if (!d) continue;
    const keep = n.famous ? 0.85 : 0.6;
    if (rng.chance(keep)) items.push({ uid: uid(), id: a, n: 1, refine: 0, count: d.art?.count, jilian: 6 * (d.art!.tier + 1) * (1 + d.art!.minRealm), from: n.name });
  }
  const need = Math.round(npcSenseVal(n) * 0.6);
  const ratio = need / Math.max(1, playerSense);
  const days = Math.round(Math.max(3, 8 * (n.realm + 1) * ratio));
  const bag: BagData = { owner: n.name, realm: n.realm, items, lingshi: n.lingshi, need, days, started: false };
  n.inv = []; n.lingshi = 0;
  return { uid: uid(), id: 'bag', n: 1, bag };
}

export function describeRealmGap(nr: number, pr: number) {
  const d = nr - pr;
  if (d >= 2) return '深不可测（远超于你）';
  if (d === 1) return '强于你';
  if (d === 0) return '旗鼓相当';
  if (d === -1) return '弱于你';
  return '不堪一击';
}
export { realmName };
