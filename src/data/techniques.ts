// 功法、神通与命格（突破天赋）
export type TechKind = 'main' | 'sense' | 'body' | 'move' | 'spell' | 'passive';

export interface TechDef {
  id: string; name: string; kind: TechKind; desc: string; minRealm: number;
  rate?: number; atk?: number; def?: number; hp?: number; mp?: number; sense?: number; speed?: number;
  conceal?: number; spell?: string; dash?: number; sword?: number; dual?: number; reveal?: boolean; alignment?: number;
}

export const TECHS: Record<string, TechDef> = {
  changchun: { id: 'changchun', name: '长春功', kind: 'main', desc: '修炼速度 ×1.0（筑基后 ×0.7），气血 +10%', minRealm: 0, rate: 1.0, hp: 0.1 },
  qingyuan: { id: 'qingyuan', name: '青元剑诀', kind: 'main', desc: '修炼速度 ×1.25，飞剑威力 +40%，神通：青元剑气', minRealm: 1, rate: 1.25, sword: 0.4, spell: 'swordqi' },
  xuanyin: { id: 'xuanyin', name: '玄阴经', kind: 'main', desc: '修炼速度 ×1.45，攻击 +15%（魔道）', minRealm: 1, rate: 1.45, atk: 0.15, alignment: -1 },
  liuji: { id: 'liuji', name: '六极真魔功', kind: 'main', desc: '修炼速度 ×1.5，攻击 +30%，气血 +20%（魔道）', minRealm: 2, rate: 1.5, atk: 0.3, hp: 0.2, alignment: -1 },
  dayan: { id: 'dayan', name: '大衍诀', kind: 'sense', desc: '神识倍增（层数随境界解锁，最多七层），结丹后可施展惊神刺', minRealm: 1 },
  xiangjia: { id: 'xiangjia', name: '象甲功', kind: 'body', desc: '防御 +20%，气血 +10%', minRealm: 0, def: 0.2, hp: 0.1 },
  tuotian: { id: 'tuotian', name: '托天魔功', kind: 'body', desc: '气血 +60%，防御 +40%', minRealm: 2, hp: 0.6, def: 0.4 },
  mingwang: { id: 'mingwang', name: '明王诀', kind: 'body', desc: '气血 +35%，防御 +25%', minRealm: 2, hp: 0.35, def: 0.25 },
  luoyan: { id: 'luoyan', name: '罗烟步', kind: 'move', desc: '身法冲刺距离 +20%，遁速 +5%', minRealm: 0, dash: 0.2, speed: 0.05 },
  jifeng: { id: 'jifeng', name: '疾风九变', kind: 'move', desc: '身法冲刺距离 +60%，遁速 +20%', minRealm: 2, dash: 0.6, speed: 0.2 },
  lianqi: { id: 'lianqi', name: '敛气术', kind: 'passive', desc: '他人看你的修为低一至两个小境界，被发现距离 -35%', minRealm: 1, conceal: 1 },
  tianyan: { id: 'tianyan', name: '天眼术', kind: 'passive', desc: '神识探查范围 +40%', minRealm: 1, sense: 0.4 },
  mingqing: { id: 'mingqing', name: '明清灵目', kind: 'passive', desc: '看破隐匿，神识范围 +20%，查探精度大增', minRealm: 2, sense: 0.2, reveal: true },
  dianfeng: { id: 'dianfeng', name: '颠凤培元功', kind: 'passive', desc: '双修收益翻倍', minRealm: 1, dual: 1 },
  huodan: { id: 'huodan', name: '火弹术', kind: 'spell', desc: '战斗神通：连发火弹', minRealm: 1, spell: 'fireball' },
  bingzhui: { id: 'bingzhui', name: '冰锥术', kind: 'spell', desc: '战斗神通：冰锥散射并减速', minRealm: 1, spell: 'icecone' },
  zhangxin: { id: 'zhangxin', name: '掌心雷', kind: 'spell', desc: '战斗神通：指定区域落雷', minRealm: 2, spell: 'thunder' },
  yuanci: { id: 'yuanci', name: '元磁神光', kind: 'spell', desc: '战斗神通：禁锢敌方法宝与行动', minRealm: 4, spell: 'yuanci' },
  qianlan: { id: 'qianlan', name: '乾蓝冰焰', kind: 'spell', desc: '战斗神通：冰焰爆发冻结周围敌人', minRealm: 3, spell: 'qianlan' },
};

export function dayanLayer(realm: number, stage: number): number {
  // 一层：筑基中期；二层：筑基后期；三层：结丹初期；四层：结丹后期；五~七层：元婴初/中/后
  const p = realm * 10 + stage;
  const req = [21, 22, 30, 32, 40, 41, 42];
  let l = 0; for (const r of req) if (p >= r) l++;
  return l;
}

// 战斗神通定义
export interface SpellDef { id: string; name: string; mp: number; cd: number; desc: string; key?: string; }
export const SPELLS: Record<string, SpellDef> = {
  fireball: { id: 'fireball', name: '火弹术', mp: 6, cd: 1.0, desc: '扇形连发三枚火弹' },
  icecone: { id: 'icecone', name: '冰锥术', mp: 12, cd: 3.5, desc: '冰锥散射，命中减速' },
  thunder: { id: 'thunder', name: '掌心雷', mp: 26, cd: 5, desc: '在目标处落下天雷' },
  swordqi: { id: 'swordqi', name: '青元剑气', mp: 22, cd: 4, desc: '穿透一切的剑气' },
  jingshen: { id: 'jingshen', name: '惊神刺', mp: 35, cd: 11, desc: '神识攻击：神识弱于你的敌人眩晕' },
  bixie: { id: 'bixie', name: '辟邪神雷', mp: 55, cd: 14, desc: '所有青竹蜂云剑释放金色神雷，对魔道鬼物伤害翻倍' },
  qianlan: { id: 'qianlan', name: '乾蓝冰焰', mp: 70, cd: 13, desc: '周身冰焰爆发，冻结敌人' },
  xutian: { id: 'xutian', name: '虚天鼎·收', mp: 90, cd: 25, desc: '青丝缚敌：将气血低于三成的敌人直接收入鼎中' },
  yuanci: { id: 'yuanci', name: '元磁神光', mp: 80, cd: 18, desc: '禁锢所有敌人与其法宝4秒' },
  leidun: { id: 'leidun', name: '雷遁', mp: 20, cd: 3, desc: '风雷翅：雷光一闪，瞬移极远距离（替代身法）' },
};

// 命格：突破时三选一（类鬼谷八荒“逆天改命”）
export interface TalentDef { id: string; name: string; desc: string; rarity: number; minRealm?: number; mods: Record<string, number>; }
export const TALENTS: TalentDef[] = [
  { id: 'tough', name: '铜皮铁骨', desc: '气血 +20%', rarity: 1, mods: { hp: 0.2 } },
  { id: 'mana', name: '灵力充盈', desc: '法力 +25%，法力回复 +30%', rarity: 1, mods: { mp: 0.25, mpRegen: 0.3 } },
  { id: 'sharp', name: '锋芒毕露', desc: '攻击 +15%', rarity: 1, mods: { atk: 0.15 } },
  { id: 'guard', name: '不动如山', desc: '防御 +20%', rarity: 1, mods: { def: 0.2 } },
  { id: 'swift', name: '身轻如燕', desc: '遁速 +12%，冲刺冷却 -20%', rarity: 1, mods: { speed: 0.12, dashCd: 0.2 } },
  { id: 'focus', name: '心如止水', desc: '修炼速度 +15%', rarity: 2, mods: { rate: 0.15 } },
  { id: 'sense1', name: '神识敏锐', desc: '神识 +20%', rarity: 2, mods: { sense: 0.2 } },
  { id: 'sword1', name: '御剑通玄', desc: '飞剑类法宝威力 +30%', rarity: 2, mods: { sword: 0.3 } },
  { id: 'fire1', name: '离火之体', desc: '火属性神通与法宝伤害 +35%', rarity: 2, mods: { fire: 0.35 } },
  { id: 'thunder1', name: '雷灵根变异', desc: '雷属性伤害 +40%', rarity: 2, mods: { thunder: 0.4 } },
  { id: 'alch', name: '丹道天赋', desc: '炼丹成功率 +15%，成丹数 +1', rarity: 2, mods: { alch: 0.15, alchN: 1 } },
  { id: 'luck', name: '福缘深厚', desc: '奇遇好事概率提升，掉落更好', rarity: 2, mods: { luck: 0.2 } },
  { id: 'crit', name: '杀伐果断', desc: '暴击率 +12%，暴击伤害 +30%', rarity: 2, mods: { crit: 0.12, critDmg: 0.3 } },
  { id: 'vamp', name: '血煞之气', desc: '造成伤害的 6% 转化为气血', rarity: 3, mods: { vamp: 0.06 } },
  { id: 'long', name: '寿元绵长', desc: '寿元 +25%', rarity: 2, mods: { life: 0.25 } },
  { id: 'hide', name: '天生敛息', desc: '被他人发现距离 -30%，查探他人更准确', rarity: 2, mods: { stealth: 0.3 } },
  { id: 'puppet1', name: '傀儡宗师', desc: '傀儡与灵兽威力 +40%，神识占用 -30%', rarity: 3, mods: { summon: 0.4, summonSense: 0.3 } },
  { id: 'break1', name: '天道酬勤', desc: '大境界突破成功率 +10%', rarity: 3, mods: { breakB: 0.1 } },
  { id: 'sense2', name: '元神强大', desc: '神识 +40%，神识攻击伤害 +50%', rarity: 3, minRealm: 3, mods: { sense: 0.4, senseAtk: 0.5 } },
  { id: 'escape', name: '遁术天成', desc: '逃跑必定成功，遁速 +20%', rarity: 3, mods: { speed: 0.2, escape: 1 } },
  { id: 'charm', name: '风流倜傥', desc: '与异性交往好感获得 +50%', rarity: 2, mods: { charm: 0.5 } },
  { id: 'regen', name: '生生不息', desc: '战斗中每秒恢复 1.5% 气血', rarity: 3, mods: { regen: 0.015 } },
  { id: 'body1', name: '金刚不坏', desc: '受到伤害 -15%', rarity: 3, mods: { dmgRed: 0.15 } },
  { id: 'lucky2', name: '天命之子', desc: '所有属性 +8%，修炼速度 +10%', rarity: 4, minRealm: 3, mods: { hp: 0.08, atk: 0.08, def: 0.08, sense: 0.08, rate: 0.1 } },
];
