// 境界体系
export interface RealmDef {
  id: number; name: string; stages: string[];
  hp: number; mp: number; atk: number; def: number; sense: number; speed: number;
  rate: number; // 基础修炼速度（修为/天）
  lifespan: number; // 寿元（年）
  expBase: number; // 每小境界所需修为基数
  color: string;
}

const LAYERS = ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层', '十层', '十一层', '十二层', '十三层'];
const FOUR = ['初期', '中期', '后期', '大圆满'];

export const REALMS: RealmDef[] = [
  { id: 0, name: '凡人', stages: ['武者'], hp: 120, mp: 30, atk: 12, def: 4, sense: 3, speed: 190, rate: 2, lifespan: 80, expBase: 60, color: '#8a8070' },
  { id: 1, name: '炼气', stages: LAYERS, hp: 220, mp: 110, atk: 22, def: 8, sense: 12, speed: 230, rate: 4, lifespan: 120, expBase: 110, color: '#5d8a6a' },
  { id: 2, name: '筑基', stages: FOUR, hp: 650, mp: 320, atk: 60, def: 22, sense: 40, speed: 360, rate: 12, lifespan: 220, expBase: 4000, color: '#3f7f9a' },
  { id: 3, name: '结丹', stages: FOUR, hp: 1900, mp: 950, atk: 170, def: 60, sense: 140, speed: 500, rate: 40, lifespan: 500, expBase: 14000, color: '#9a6b2f' },
  { id: 4, name: '元婴', stages: FOUR, hp: 5200, mp: 2600, atk: 480, def: 170, sense: 500, speed: 680, rate: 120, lifespan: 1000, expBase: 45000, color: '#8a3f8f' },
  { id: 5, name: '化神', stages: FOUR, hp: 14500, mp: 7200, atk: 1300, def: 460, sense: 1800, speed: 900, rate: 400, lifespan: 2000, expBase: 150000, color: '#b8352b' },
];

export function stageMult(realm: number, stage: number) {
  if (realm === 1) return 1 + 0.075 * stage;
  return 1 + 0.18 * stage;
}

export function expNeeded(realm: number, stage: number): number {
  const r = REALMS[realm];
  if (realm === 0) return r.expBase;
  if (realm === 1) return Math.round(r.expBase * Math.pow(1.25, stage));
  const m = [1, 1.5, 2.25, 3.25][stage] ?? 3.25;
  return Math.round(r.expBase * m);
}

export function realmName(realm: number, stage: number) {
  const r = REALMS[realm];
  if (!r) return '???';
  if (realm === 0) return '凡人';
  return r.name + (r.stages[stage] ?? '');
}

export function maxStage(realm: number) { return REALMS[realm].stages.length - 1; }

/** 战力指数：用于 AI 估算 & 妖兽等级换算 */
export function powerIndex(realm: number, stage: number) {
  const r = REALMS[realm];
  const base = r.atk * r.hp;
  return Math.sqrt(base) * stageMult(realm, stage);
}

/** 妖兽等级 → 等效境界 */
export function beastRealm(level: number): [number, number] {
  const t: [number, number][] = [[0, 0], [1, 2], [1, 7], [1, 11], [2, 0], [2, 2], [3, 0], [3, 2], [4, 0], [4, 2], [5, 0]];
  return t[Math.max(0, Math.min(10, level))];
}

export const BEAST_LEVEL_NAMES = ['', '一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'];

/** 大境界突破 */
export const BREAK_INFO: Record<number, { base: number; pill: string; pillBonus: number; name: string }> = {
  1: { base: 0.95, pill: '', pillBonus: 0, name: '引气入体' },
  2: { base: 0.18, pill: 'zhujidan', pillBonus: 0.35, name: '筑基' },
  3: { base: 0.1, pill: 'jiangchendan', pillBonus: 0.3, name: '结丹' },
  4: { base: 0.06, pill: 'jiuqudan', pillBonus: 0.32, name: '凝结元婴' },
  5: { base: 0.03, pill: 'huashendan', pillBonus: 0.3, name: '化神' },
};
