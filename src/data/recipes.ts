// 丹方：主药年份要求体现掌天瓶的价值
export interface Recipe { id: string; out: string; n: [number, number]; herbs: [string, number][]; minQ: number; base: number; alchLv: number; desc?: string; }

export const RECIPES: Recipe[] = [
  { id: 'r_juqi', out: 'juqidan', n: [3, 4], herbs: [['qinglingcao', 2], ['huangyahua', 1]], minQ: 0, base: 0.8, alchLv: 0 },
  { id: 'r_huichun', out: 'huichundan', n: [3, 4], herbs: [['zhixuecao', 2]], minQ: 0, base: 0.85, alchLv: 0 },
  { id: 'r_huiling', out: 'huilingdan', n: [3, 4], herbs: [['lingzhi', 1], ['qinglingcao', 1]], minQ: 0, base: 0.8, alchLv: 0 },
  { id: 'r_dingyan', out: 'dingyandan', n: [1, 2], herbs: [['nishangcao', 2], ['huangyahua', 1]], minQ: 1, base: 0.6, alchLv: 1 },
  { id: 'r_liaoshang', out: 'liaoshangdan', n: [2, 3], herbs: [['zhixuecao', 2], ['huangjingzhi', 1]], minQ: 1, base: 0.7, alchLv: 1 },
  { id: 'r_huanglong', out: 'huanglongdan', n: [2, 3], herbs: [['huangjingzhi', 2], ['jinsuicao', 1]], minQ: 1, base: 0.65, alchLv: 1 },
  { id: 'r_zhuji', out: 'zhujidan', n: [1, 2], herbs: [['zihouhua', 1], ['tianlingguo', 1], ['jinsuicao', 1]], minQ: 2, base: 0.5, alchLv: 2, desc: '主药需三百年以上' },
  { id: 'r_yanghun', out: 'yanghundan', n: [1, 1], herbs: [['yangshenhua', 2]], minQ: 2, base: 0.5, alchLv: 2 },
  { id: 'r_dingling', out: 'dinglingdan', n: [1, 2], herbs: [['chijingzhi', 1], ['huangjingzhi', 2]], minQ: 2, base: 0.55, alchLv: 3 },
  { id: 'r_jiangchen', out: 'jiangchendan', n: [1, 1], herbs: [['chijingzhi', 2], ['xuehuncao', 1]], minQ: 3, base: 0.4, alchLv: 3, desc: '主药需千年以上' },
  { id: 'r_yanshou', out: 'yanshoudan', n: [1, 1], herbs: [['lingzhuguo', 1], ['lingzhi', 2]], minQ: 3, base: 0.45, alchLv: 3 },
  { id: 'r_yuanling', out: 'yuanlingdan', n: [1, 2], herbs: [['longlinguo', 1], ['chijingzhi', 1]], minQ: 3, base: 0.45, alchLv: 4 },
  { id: 'r_jiuqu', out: 'jiuqudan', n: [1, 1], herbs: [['jiuqulingshen', 1], ['longlinguo', 1]], minQ: 4, base: 0.35, alchLv: 4, desc: '主药需三千年以上' },
  { id: 'r_huashen', out: 'huashendan', n: [1, 1], herbs: [['longlinguo', 2], ['jiuqulingshen', 1]], minQ: 5, base: 0.25, alchLv: 5, desc: '主药需万年' },
];

export const ALCH_TITLES = ['炼丹学徒', '初级丹师', '中级丹师', '高级丹师', '丹道宗师', '丹圣'];
export function alchExpNeed(lv: number) { return [20, 60, 160, 400, 1000, 99999][lv] ?? 99999; }
