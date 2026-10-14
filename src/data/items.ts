// 物品数据库：灵草、材料、丹药、符箓、法器法宝、功法典籍
export type ItemType = 'herb' | 'material' | 'pill' | 'talisman' | 'artifact' | 'manual' | 'misc' | 'bag';

export type ArtKind = 'sword' | 'swarm' | 'ring' | 'needle' | 'shield' | 'armor' | 'mirror' | 'banner' | 'cauldron' | 'wings'
  | 'boat' | 'bell' | 'brick' | 'arrow' | 'fan' | 'mountain' | 'puppet' | 'beast' | 'pearl' | 'flag';

export interface ArtDef {
  kind: ArtKind;
  tier: number; // 0 法器 1 符宝 2 法宝 3 古宝 4 仿通天灵宝 5 通天灵宝
  minRealm: number;
  sense: number; // 神识占用（成套法宝为每件占用）
  power: number; // 伤害倍率（相对攻击力）
  count?: number; // 成套数量
  def?: number; // 防御加成（比例）
  hp?: number; // 气血加成（比例）
  worldSpeed?: number; // 大地图遁速加成（比例）
  senseBonus?: number; // 神识加成（比例）
  element?: 'fire' | 'ice' | 'thunder' | 'metal' | 'wood' | 'ghost' | 'demon' | 'water' | 'earth';
  skill?: string; // 附带神通
  summon?: string; // 召唤单位类型
  color?: number;
}

export interface PillDef {
  exp?: number; hp?: number; mp?: number; heal?: boolean; life?: number; sense?: number;
  breakFor?: number; minRealm?: number; maxRealm?: number; favor?: number;
}

export interface TalDef { kind: 'fire' | 'thunder' | 'shield' | 'escape' | 'revive' | 'ice' | 'sword'; power: number; }

export interface ItemDef {
  id: string; name: string; type: ItemType; rarity: number; price: number; desc: string;
  pill?: PillDef; tal?: TalDef; art?: ArtDef; manual?: string; noSell?: boolean; giftValue?: number;
  herbBase?: boolean;
}

export const RARITY_NAMES = ['凡品', '下品', '中品', '上品', '极品', '至宝'];
export const RARITY_COLORS = ['#cfc8b8', '#7fc28a', '#6fb1e0', '#b98be0', '#f0a040', '#ff5b4a'];
export const TIER_NAMES = ['法器', '符宝', '法宝', '古宝', '仿通天灵宝', '通天灵宝'];
export const HERB_AGES = ['十年', '百年', '三百年', '千年', '三千年', '万年'];

const DB: Record<string, ItemDef> = {};
function add(d: ItemDef) { DB[d.id] = d; }

// ---------------- 灵草 ----------------
const herbs: [string, string, number, number, string][] = [
  ['qinglingcao', '青灵草', 1, 6, '最常见的灵草，炼制聚气丹的主药。'],
  ['zhixuecao', '止血草', 1, 5, '可炼制回春丹，疗伤圣品。'],
  ['huangyahua', '黄芽花', 1, 8, '辅药，可调和药性。'],
  ['lingzhi', '紫纹灵芝', 2, 16, '补充法力，炼制回灵丹。'],
  ['huangjingzhi', '黄精芝', 2, 24, '筑基修士常用的修炼灵药。'],
  ['jinsuicao', '金髓草', 2, 45, '筑基丹的辅药之一。'],
  ['nishangcao', '霓裳草', 2, 30, '香气可引来妖兽，韩立惯用的猎妖手段。'],
  ['zihouhua', '紫猴花', 3, 70, '血色禁地特产，筑基丹主药。'],
  ['tianlingguo', '天灵果', 3, 80, '血色禁地特产，筑基丹主药。'],
  ['chijingzhi', '赤精芝', 3, 130, '降尘丹主药，结丹必备。'],
  ['xuehuncao', '血魂草', 3, 110, '阴寒之地生长，降尘丹辅药。'],
  ['yangshenhua', '养神花', 3, 160, '可炼养魂丹，滋养神识。'],
  ['lingzhuguo', '灵烛果', 4, 320, '传说中的延寿灵果。'],
  ['longlinguo', '龙鳞果', 4, 600, '蕴含磅礴元气，化神丹主药。'],
  ['jiuqulingshen', '九曲灵参', 5, 3500, '已通灵性的灵参，可炼九曲灵参丹，凝结元婴的至宝。'],
];
for (const [id, name, r, p, desc] of herbs) add({ id, name, type: 'herb', rarity: r, price: p, desc, herbBase: true, giftValue: r * 2 });

// ---------------- 材料 ----------------
const YD = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
for (let lv = 1; lv <= 10; lv++) {
  add({ id: 'yd' + lv, name: YD[lv] + '级妖丹', type: 'material', rarity: Math.min(5, Math.ceil(lv / 2)), price: Math.round(12 * Math.pow(2.6, lv - 1)), desc: `${YD[lv]}级妖兽的内丹，可炼丹、炼器，亦可直接卖出。` });
}
add({ id: 'beasthide', name: '妖兽皮', type: 'material', rarity: 0, price: 8, desc: '低阶妖兽皮毛，可卖给坊市。' });
add({ id: 'beastbone', name: '妖兽骨', type: 'material', rarity: 1, price: 18, desc: '炼器的常用辅材。' });
add({ id: 'jiaolin', name: '蛟鳞', type: 'material', rarity: 3, price: 600, desc: '蛟类妖兽的鳞片，坚韧无比。' });
add({ id: 'jinleizhu', name: '金雷竹', type: 'material', rarity: 4, price: 2500, desc: '天下辟邪第一灵木，可炼入青竹蜂云剑，增加飞剑数量。' });
add({ id: 'gengjing', name: '庚精', type: 'material', rarity: 5, price: 30000, desc: '锐金之宝，炼入青竹蜂云剑后可成大庚剑阵（飞剑威力大增）。' });
add({ id: 'leipenggu', name: '雷鹏骨翅', type: 'material', rarity: 5, price: 40000, desc: '化形雷鹏的骨翅，可炼制风雷翅。' });
add({ id: 'xuantie', name: '玄铁', type: 'material', rarity: 2, price: 60, desc: '常见炼器材料。' });
add({ id: 'xutiantu', name: '虚天残图', type: 'material', rarity: 5, price: 20000, desc: '进入虚天殿的凭证之一。' });
add({ id: 'shengxianling', name: '升仙令', type: 'misc', rarity: 3, price: 800, desc: '越国七派所发，持之可直接拜入宗门。' });

// ---------------- 丹药 ----------------
add({ id: 'juqidan', name: '聚气丹', type: 'pill', rarity: 1, price: 30, desc: '炼气期修士增进修为。', pill: { exp: 260, maxRealm: 1 } });
add({ id: 'huichundan', name: '回春丹', type: 'pill', rarity: 1, price: 22, desc: '战斗中恢复四成气血。', pill: { hp: 0.4 } });
add({ id: 'huilingdan', name: '回灵丹', type: 'pill', rarity: 1, price: 22, desc: '战斗中恢复五成法力。', pill: { mp: 0.5 } });
add({ id: 'liaoshangdan', name: '疗伤丹', type: 'pill', rarity: 2, price: 120, desc: '治愈暗伤，立即恢复伤势。', pill: { heal: true, hp: 1 } });
add({ id: 'huanglongdan', name: '黄龙丹', type: 'pill', rarity: 2, price: 220, desc: '筑基修士增进修为。', pill: { exp: 1900, minRealm: 2, maxRealm: 2 } });
add({ id: 'zhujidan', name: '筑基丹', type: 'pill', rarity: 3, price: 1800, desc: '炼气大圆满冲击筑基时服用，大幅提升成功率。', pill: { breakFor: 2 } });
add({ id: 'dinglingdan', name: '定灵丹', type: 'pill', rarity: 3, price: 950, desc: '结丹修士增进修为。', pill: { exp: 7200, minRealm: 3, maxRealm: 3 } });
add({ id: 'jiangchendan', name: '降尘丹', type: 'pill', rarity: 4, price: 9000, desc: '筑基大圆满冲击结丹时服用。', pill: { breakFor: 3 } });
add({ id: 'yuanlingdan', name: '元灵丹', type: 'pill', rarity: 4, price: 4200, desc: '元婴修士增进修为。', pill: { exp: 26000, minRealm: 4, maxRealm: 4 } });
add({ id: 'jiuqudan', name: '九曲灵参丹', type: 'pill', rarity: 5, price: 65000, desc: '结丹大圆满凝结元婴时服用。', pill: { breakFor: 4 } });
add({ id: 'huashendan', name: '天元化神丹', type: 'pill', rarity: 5, price: 200000, desc: '元婴大圆满冲击化神时服用。', pill: { breakFor: 5 } });
add({ id: 'yanshoudan', name: '延寿丹', type: 'pill', rarity: 4, price: 6000, desc: '增加二十年寿元。', pill: { life: 20 } });
add({ id: 'yanghundan', name: '养魂丹', type: 'pill', rarity: 3, price: 1500, desc: '永久提升神识。', pill: { sense: 0.05 } });
add({ id: 'dingyandan', name: '定颜丹', type: 'pill', rarity: 3, price: 900, desc: '可令容颜永驻，女修梦寐以求的赠礼。', giftValue: 30, pill: { favor: 30 } });

// ---------------- 符箓 ----------------
add({ id: 'huodanfu', name: '火弹符', type: 'talisman', rarity: 0, price: 10, desc: '激发后射出一串火弹。', tal: { kind: 'fire', power: 2.2 } });
add({ id: 'jingangfu', name: '金刚符', type: 'talisman', rarity: 1, price: 18, desc: '激发后形成护体金光，吸收伤害。', tal: { kind: 'shield', power: 0.35 } });
add({ id: 'bingzhuifu', name: '冰锥符', type: 'talisman', rarity: 1, price: 30, desc: '冰锥散射，冻结迟缓敌人。', tal: { kind: 'ice', power: 2.6 } });
add({ id: 'zhangxinleifu', name: '掌心雷符', type: 'talisman', rarity: 2, price: 70, desc: '引落天雷，范围重创敌人。', tal: { kind: 'thunder', power: 5 } });
add({ id: 'dundifu', name: '土遁符', type: 'talisman', rarity: 2, price: 50, desc: '土遁脱离战斗（对高出一个大境界的敌人可能失败）。', tal: { kind: 'escape', power: 1 } });
add({ id: 'jianfu', name: '剑符（符宝）', type: 'talisman', rarity: 3, price: 700, desc: '结丹修士封印的一道剑气，威力惊人。', tal: { kind: 'sword', power: 14 } });
add({ id: 'tishenfu', name: '替身符', type: 'talisman', rarity: 4, price: 4000, desc: '身死时自动生效，以替身代死一次。', tal: { kind: 'revive', power: 0.5 } });
add({ id: 'liuding', name: '六丁天甲符', type: 'talisman', rarity: 5, price: 50000, desc: '顶级护身之宝，身死时自动生效并满血复活。', tal: { kind: 'revive', power: 1 } });

// ---------------- 法器 / 法宝 ----------------
function art(id: string, name: string, rarity: number, price: number, desc: string, a: ArtDef) { add({ id, name, type: 'artifact', rarity, price, desc, art: a }); }
// 法器
art('qingfengjian', '青锋剑', 1, 90, '最常见的飞剑法器。', { kind: 'sword', tier: 0, minRealm: 1, sense: 3, power: 0.55, element: 'metal', color: 0x9fd4c8 });
art('yinhuijian', '银辉剑', 2, 260, '银光闪耀的上品飞剑法器。', { kind: 'sword', tier: 0, minRealm: 1, sense: 5, power: 0.8, element: 'metal', color: 0xdfe8ff });
art('wulongduo', '乌龙夺', 2, 300, '乌黑钩状法器，专破护体灵光。', { kind: 'sword', tier: 0, minRealm: 1, sense: 6, power: 0.95, element: 'water', color: 0x445566 });
art('guike', '龟壳法器', 1, 150, '防御法器，可抵挡攻击。', { kind: 'shield', tier: 0, minRealm: 1, sense: 4, power: 0, def: 0.25, color: 0x7a8a50 });
art('qingningjing', '青凝镜', 2, 420, '射出青色光柱的镜形法器。', { kind: 'mirror', tier: 0, minRealm: 1, sense: 6, power: 1.2, element: 'wood', color: 0x66ccaa });
art('qingjiaoqi', '青蛟旗', 3, 900, '可化出一条青蛟虚影冲击敌人。', { kind: 'banner', tier: 0, minRealm: 2, sense: 8, power: 1.6, element: 'water', color: 0x3fa08a, summon: 'jiao' });
art('hongxianzhen', '红线遁光针', 3, 1600, '十三枚成套，无影无形，偷袭利器。', { kind: 'needle', tier: 0, minRealm: 2, sense: 1, power: 0.35, count: 13, element: 'metal', color: 0xff4444 });
art('shenfengzhou', '神风舟', 2, 600, '飞行法器，大幅提升赶路速度。', { kind: 'boat', tier: 0, minRealm: 1, sense: 0, power: 0, worldSpeed: 0.35, color: 0xbfe0f0 });
art('kuilei1', '傀儡兽（一级）', 2, 500, '一级傀儡兽，需灵石驱动。', { kind: 'puppet', tier: 0, minRealm: 1, sense: 5, power: 0.7, summon: 'puppet1', color: 0xa08060 });
art('kuilei2', '傀儡人（二级）', 3, 4000, '二级傀儡，可抵筑基修士。', { kind: 'puppet', tier: 0, minRealm: 2, sense: 10, power: 1.2, summon: 'puppet2', color: 0x908070 });
// 法宝
art('lvhuangjian', '绿煌剑', 3, 9000, '木属性飞剑法宝。', { kind: 'sword', tier: 2, minRealm: 3, sense: 22, power: 2.4, element: 'wood', color: 0x55ee77 });
art('qingzhu', '青竹蜂云剑', 4, 60000, '以金雷竹炼制的成套本命飞剑，可炼入金雷竹增加数量（最多七十二口），蕴含辟邪神雷。', { kind: 'swarm', tier: 2, minRealm: 2, sense: 2, power: 0.75, count: 6, element: 'thunder', skill: 'bixie', color: 0x88ffcc });
art('zhuquehuan', '朱雀环', 4, 30000, '南宫婉本命法宝，熔炼朱雀之魂，火环旋转焚尽周身。', { kind: 'ring', tier: 2, minRealm: 3, sense: 26, power: 2.6, element: 'fire', color: 0xff5530 });
art('zhuxieci', '诛邪刺', 3, 12000, '赤红暗芒，专用于偷袭。', { kind: 'needle', tier: 2, minRealm: 3, sense: 18, power: 3.2, count: 1, element: 'fire', color: 0xcc2233 });
art('huanglinjia', '皇鳞甲', 3, 15000, '护身宝甲。', { kind: 'armor', tier: 2, minRealm: 2, sense: 12, power: 0, def: 0.45, hp: 0.25, color: 0xd8b040 });
art('hunyuanbo', '混元钵', 3, 14000, '可罩住自身抵挡攻击。', { kind: 'shield', tier: 2, minRealm: 2, sense: 16, power: 0, def: 0.5, color: 0xc0a060 });
art('tianyangzhen', '天阳鎏金针', 4, 26000, '温天仁的法宝，九枚金针。', { kind: 'needle', tier: 2, minRealm: 3, sense: 3, power: 0.9, count: 9, element: 'fire', color: 0xffcc33 });
art('bamenjing', '八门金光镜（仿）', 4, 90000, '仿制的通天灵宝，八道金光齐射。', { kind: 'mirror', tier: 4, minRealm: 3, sense: 55, power: 3.2, element: 'metal', color: 0xffd966 });
art('panlongdai', '四象蟠龙带', 4, 30000, '可缚住敌人，令其行动迟缓。', { kind: 'flag', tier: 2, minRealm: 3, sense: 24, power: 0.8, element: 'water', color: 0x6688cc });
art('yinzhong', '银钟古宝', 4, 45000, '钟声震荡神魂，周期性眩晕周围敌人。', { kind: 'bell', tier: 3, minRealm: 3, sense: 40, power: 1.5, color: 0xdde4ee });
art('qingtongdun', '青铜古盾', 3, 30000, '上古铜盾，坚不可摧。', { kind: 'shield', tier: 3, minRealm: 3, sense: 30, power: 0, def: 0.7, color: 0x6a9a7a });
art('hualan', '古宝花篮', 4, 40000, '洒出漫天花瓣，花瓣过处一切皆碎。', { kind: 'bell', tier: 3, minRealm: 2, sense: 35, power: 1.8, element: 'wood', color: 0xff99cc });
art('wuxinghuan', '五行环', 4, 42000, '五枚灵环环绕己身，攻守兼备。', { kind: 'ring', tier: 3, minRealm: 3, sense: 38, power: 2.0, def: 0.15, color: 0xffffff });
art('xuepifeng', '血色披风', 3, 25000, '可大幅提升遁速。', { kind: 'armor', tier: 3, minRealm: 3, sense: 20, power: 0, def: 0.2, worldSpeed: 0.3, color: 0xaa2222 });
art('miemojian', '灭魔箭', 4, 38000, '玄骨上人之宝，金光一闪，可穿透一切。', { kind: 'arrow', tier: 2, minRealm: 3, sense: 30, power: 5, element: 'metal', color: 0xffe08a });
art('baigufan', '三神白骨幡', 4, 80000, '六道极圣之宝，召出三尊白骨神魂。', { kind: 'banner', tier: 3, minRealm: 4, sense: 70, power: 2.2, element: 'ghost', summon: 'bonegod', color: 0xeeeedd });
art('guiluofan', '鬼罗幡', 4, 50000, '阴罗宗镇宗之宝，以生魂祭炼，放出厉鬼。', { kind: 'banner', tier: 3, minRealm: 3, sense: 45, power: 1.6, element: 'ghost', summon: 'ghost', color: 0x553366 });
art('zibingzhuo', '紫冰镯', 3, 28000, '寒气逼人，冻结敌人。', { kind: 'ring', tier: 3, minRealm: 3, sense: 28, power: 1.8, element: 'ice', color: 0xaa88ff });
art('lanjinzhuan', '蓝金砖', 3, 16000, '以蓝金之精炼制，砸落重若山岳。', { kind: 'brick', tier: 2, minRealm: 3, sense: 22, power: 3.5, element: 'earth', color: 0x3355aa });
art('ningguangjing', '凝光宝镜', 4, 36000, '射出五色光柱。', { kind: 'mirror', tier: 3, minRealm: 3, sense: 34, power: 2.6, color: 0xcc88ff });
art('zichengdou', '紫铖兜', 4, 33000, '释放玉阳真火，困敌护身。', { kind: 'cauldron', tier: 3, minRealm: 3, sense: 32, power: 1.6, def: 0.3, element: 'fire', color: 0x9944cc });
art('taixuantu', '太玄八卦图', 4, 48000, '上古火属性古宝，八卦火阵。', { kind: 'flag', tier: 3, minRealm: 3, sense: 42, power: 2.4, element: 'fire', color: 0xff7744 });
art('xuemojian', '血魔剑', 4, 35000, '魔器，以精血驱动，威力极大。', { kind: 'sword', tier: 3, minRealm: 3, sense: 30, power: 3.6, element: 'demon', color: 0xdd1133 });
art('languangdun', '蓝光盾', 3, 24000, '水属性防御古宝，克制火攻。', { kind: 'shield', tier: 3, minRealm: 3, sense: 26, power: 0, def: 0.55, color: 0x4499ff });
art('fengleichi', '风雷翅', 5, 300000, '以化形雷鹏骨翅炼成，可施展雷遁，瞬息千里。', { kind: 'wings', tier: 4, minRealm: 3, sense: 30, power: 0, worldSpeed: 0.8, skill: 'leidun', color: 0x99ccff });
art('xutianding', '虚天鼎', 5, 2000000, '乱星海第一至宝，通天灵宝。青丝缚敌收入鼎中，内蕴乾蓝冰焰。', { kind: 'cauldron', tier: 5, minRealm: 3, sense: 110, power: 3.0, def: 0.35, element: 'ice', skill: 'xutian', color: 0x66ddff });
art('yuancishan', '元磁神山', 5, 500000, '以元磁神光炼化的神山，砸落可镇压一切五行法宝。', { kind: 'mountain', tier: 4, minRealm: 4, sense: 90, power: 6, element: 'earth', color: 0x777777 });
art('wuzimo', '五子同心魔', 5, 600000, '五尊元婴级魔头，心意相通。', { kind: 'puppet', tier: 4, minRealm: 4, sense: 120, power: 2.5, summon: 'demon5', element: 'demon', color: 0x552233 });
art('sanyanshan', '三焰扇', 5, 400000, '仿七焰扇炼制的仿通天灵宝，三色火浪横扫一切。', { kind: 'fan', tier: 4, minRealm: 4, sense: 80, power: 5, element: 'fire', color: 0xff8844 });
art('kuilei3', '傀儡（三级）', 4, 30000, '三级傀儡，可抵结丹修士。', { kind: 'puppet', tier: 2, minRealm: 3, sense: 25, power: 2.0, summon: 'puppet3', color: 0x887766 });
art('yuanhoukuilei', '元婴后期傀儡', 5, 800000, '大衍神君遗留的顶级傀儡，需高阶灵石驱动。', { kind: 'puppet', tier: 4, minRealm: 4, sense: 150, power: 4.5, summon: 'puppet5', color: 0x667788 });
// 灵兽（以法宝槽位驾驭）
art('shijinchong', '噬金虫', 5, 120000, '人界奇虫榜第十二，吞噬五金与法宝，几乎无物不噬。', { kind: 'beast', tier: 3, minRealm: 2, sense: 1, power: 0.45, count: 20, element: 'metal', summon: 'bugs', color: 0xffcc22 });
art('xueyuzhizhu', '血玉蜘蛛', 4, 50000, '可喷吐血丝缚敌，克制禁制。', { kind: 'beast', tier: 3, minRealm: 2, sense: 25, power: 1.6, summon: 'spider', color: 0xdd3344 });
art('tihunshou', '啼魂兽', 4, 60000, '专吞魂魄，克制一切鬼物。', { kind: 'beast', tier: 3, minRealm: 3, sense: 30, power: 1.8, element: 'ghost', summon: 'tihun', color: 0x9988cc });
art('tujialong', '土甲龙', 4, 50000, '擅长寻找天材地宝（灵草在神识范围外也能被感知）。', { kind: 'beast', tier: 3, minRealm: 2, sense: 15, power: 1.0, summon: 'tujia', color: 0xaa8855 });
art('yanghunmu', '养魂木', 5, 100000, '三大灵木之一，滋养元神，提升神识三成，身死时修为损失减半。', { kind: 'pearl', tier: 3, minRealm: 1, sense: 0, power: 0, senseBonus: 0.3, color: 0x88aa66 });
art('qianlanzhu', '乾蓝珠', 4, 70000, '可施展乾蓝冰焰。', { kind: 'pearl', tier: 3, minRealm: 3, sense: 25, power: 0, skill: 'qianlan', color: 0x44bbff });

// ---------------- 功法典籍 ----------------
function manual(id: string, name: string, rarity: number, price: number, tech: string, desc: string) { add({ id: 'm_' + id, name: '《' + name + '》', type: 'manual', rarity, price, desc, manual: tech }); }
manual('changchun', '长春功', 1, 100, 'changchun', '木属性入门功法，修至第十三层可直入炼气大圆满。');
manual('qingyuan', '青元剑诀', 4, 30000, 'qingyuan', '上古青元子所创剑诀，飞剑威力大增，可施展青元剑气。');
manual('dayan', '大衍诀', 5, 80000, 'dayan', '大衍神君所创神识功法，每修成一层神识倍增，可施展惊神刺。');
manual('xiangjia', '象甲功', 2, 800, 'xiangjia', '炼体法门，提升防御。');
manual('luoyan', '罗烟步', 1, 200, 'luoyan', '七玄门轻身功夫，提升闪避身法。');
manual('xuanyin', '玄阴经', 4, 25000, 'xuanyin', '魔道功法，修炼极快，阴气伤人。');
manual('tuotian', '托天魔功', 5, 90000, 'tuotian', '蛮胡子成名功法，肉身硬抗法宝。');
manual('jifeng', '疾风九变', 4, 20000, 'jifeng', '顶级身法，遁速大增。');
manual('mingwang', '明王诀', 4, 26000, 'mingwang', '佛门炼体诀，气血与防御大增。');
manual('lianqi', '敛气术', 2, 1200, 'lianqi', '收敛气息，令他人神识看低你的修为，神识范围外更难被察觉。');
manual('tianyan', '天眼术', 1, 300, 'tianyan', '开启后神识探查范围扩大四成。');
manual('mingqing', '明清灵目', 4, 18000, 'mingqing', '可看破敛息隐匿的修士与隐藏的宝物。');
manual('huodan', '火弹术', 0, 50, 'huodan', '最基础的攻击法术。');
manual('bingzhui', '冰锥术', 1, 400, 'bingzhui', '冰锥穿刺，减缓敌人。');
manual('zhangxin', '掌心雷', 3, 3500, 'zhangxin', '引动天雷轰击敌人。');
manual('dianfeng', '颠凤培元功', 4, 30000, 'dianfeng', '双修功法，与道侣双修时修为收益翻倍。');
manual('liuji', '六极真魔功', 5, 120000, 'liuji', '六道极圣成名魔功，攻伐无双。');
manual('yuanci', '元磁神光', 5, 150000, 'yuanci', '天星双圣秘传，可禁锢五行法宝。');
manual('qianlan', '乾蓝冰焰秘术', 4, 40000, 'qianlan', '催动乾蓝冰焰，冻结一切。');

// ---------------- 杂物 ----------------
add({ id: 'zhangtianping', name: '掌天瓶', type: 'misc', rarity: 5, price: 0, noSell: true, desc: '神秘的小绿瓶，每隔一段时日凝聚一滴绿液。绿液滴在灵草上可使其年份大增。切记：怀璧其罪，绝不可让旁人知晓。' });
add({ id: 'juhunbo', name: '聚魂钵', type: 'misc', rarity: 4, price: 30000, desc: '可聚拢逝者残魂、重塑肉身。对三年内陨落的道侣或同伴使用，可令其复生（一次性）。' });
add({ id: 'danlu', name: '丹炉', type: 'misc', rarity: 1, price: 150, desc: '炼丹必备。' });
add({ id: 'bag', name: '储物袋', type: 'bag', rarity: 2, price: 0, noSell: true, desc: '他人的储物袋，需以神识抹去原主人印记方可打开。' });

export const ITEMS = DB;
export function item(id: string): ItemDef { return DB[id]; }
export function allItems(): ItemDef[] { return Object.values(DB); }

export function herbPrice(id: string, q: number) { return Math.round(DB[id].price * Math.pow(3.2, q)); }
