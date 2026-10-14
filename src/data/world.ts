// 人界地理：参照原著与读者整理的人界地图（天南 / 天澜草原 / 大晋 / 无边海 / 乱星海 / 极西之地）
export const WORLD_W = 36000;
export const WORLD_H = 24000;

type P = [number, number];

/** 大陆主体轮廓（顺时针） */
export const MAINLAND: P[] = [
  [300, 700], [3000, 350], [6000, 300], [9000, 600], [12000, 450], [15000, 700], [18000, 250], [21000, 450], [24000, 350], [26500, 700],
  [27800, 1300], [28600, 3000], [28100, 4600], [28900, 6200], [28400, 8100], [28900, 9400], [27600, 11000], [26600, 12600],
  [25200, 12900], [24000, 13300], [22600, 12900], [21500, 13100], [20400, 13800], [19300, 13500], [18200, 13300], [17200, 13700],
  [16200, 13000], [15200, 12500], [14400, 12900], [13600, 13800], [13300, 15000], [13500, 16200], [12900, 17200], [12800, 18600],
  [12100, 19500], [11400, 20300], [10200, 20700], [9000, 20400], [8000, 20800], [7000, 20600], [6000, 21100], [5000, 20800],
  [4000, 20400], [3000, 19900], [1800, 19300], [900, 18200], [600, 16500], [300, 14000], [500, 11500], [200, 9000], [600, 6000], [250, 3500],
];

/** 内陆湖泊（ellipse: cx, cy, rx, ry） */
export const LAKES: [number, number, number, number][] = [
  [10400, 19600, 260, 150], // 越国东南湖
  [22800, 4800, 500, 260], // 大晋 天湖
  [12200, 7600, 420, 260], // 天澜 草原湖
  [6800, 10600, 240, 160],
];

/** 额外陆地（半岛 / 大岛） */
export const EXTRA_LAND: [number, number, number, number][] = [
  [14400, 15600, 650, 900], // 天南东部半岛
  [16900, 15200, 700, 420], // 无边海 西岛
  [19200, 15800, 520, 380],
  [12000, 21200, 600, 380], // 越国南岛
];

export type BiomeId = 'plain' | 'forest' | 'steppe' | 'desert' | 'snow' | 'jungle' | 'evil' | 'island' | 'blood' | 'marsh';
export const BIOME_COLORS: Record<BiomeId, [number, number, number]> = {
  plain: [190, 204, 160],
  forest: [150, 178, 132],
  steppe: [206, 206, 150],
  desert: [221, 200, 152],
  snow: [232, 234, 230],
  jungle: [140, 170, 112],
  evil: [138, 126, 140],
  island: [192, 210, 158],
  blood: [160, 110, 96],
  marsh: [150, 160, 128],
};

/** 地貌区域（后绘制者覆盖） */
export const BIOME_POLYS: { biome: BiomeId; poly?: P[]; ell?: [number, number, number, number] }[] = [
  { biome: 'plain', poly: [[0, 0], [36000, 0], [36000, 24000], [0, 24000]] },
  { biome: 'steppe', poly: [[2500, 2000], [15800, 2000], [15800, 9000], [13500, 9300], [2500, 9100]] },
  { biome: 'desert', poly: [[0, 7600], [4100, 8600], [4100, 19800], [1500, 20500], [0, 20000]] },
  { biome: 'snow', poly: [[15000, 0], [29000, 0], [29000, 1700], [22000, 2200], [15000, 1600]] },
  { biome: 'jungle', poly: [[15200, 10200], [19500, 10000], [20500, 13800], [15200, 13600]] },
  { biome: 'forest', ell: [10000, 16300, 1400, 900] },
  { biome: 'forest', ell: [8200, 15900, 900, 700] },
  { biome: 'forest', ell: [6200, 16500, 1100, 900] },
  { biome: 'forest', ell: [11800, 13200, 900, 800] },
  { biome: 'forest', ell: [8800, 12600, 1000, 700] },
  { biome: 'forest', ell: [18800, 7000, 1500, 1000] },
  { biome: 'forest', ell: [24500, 6500, 1800, 1200] },
  { biome: 'forest', ell: [21000, 9800, 1300, 900] },
  { biome: 'forest', ell: [26500, 10500, 1100, 900] },
  { biome: 'marsh', ell: [7000, 19300, 900, 500] },
  { biome: 'evil', ell: [7400, 11900, 700, 520] }, // 坠魔谷
  { biome: 'evil', ell: [25800, 9200, 600, 450] }, // 阴阳窟
  { biome: 'blood', ell: [10900, 16800, 420, 320] }, // 血色禁地
  { biome: 'island', poly: [[13800, 13600], [36000, 13600], [36000, 24000], [13800, 24000]] },
];

/** 山脉（折线 + 宽度） */
export const RIDGES: { pts: P[]; w: number }[] = [
  { pts: [[3600, 9300], [6000, 9000], [8200, 9200], [10600, 8900], [13400, 9300]], w: 520 },
  { pts: [[4100, 8800], [3900, 11500], [4300, 14000], [3900, 16500], [4200, 19400]], w: 600 },
  { pts: [[9400, 15900], [10100, 16200], [10800, 16900], [11200, 17500]], w: 380 }, // 太岳山脉
  { pts: [[8400, 18300], [8900, 18700]], w: 260 }, // 彩霞山
  { pts: [[8800, 17100], [9200, 17400]], w: 220 }, // 太南山
  { pts: [[7400, 14500], [8800, 14300], [10200, 14600], [11400, 14400]], w: 300 },
  { pts: [[4600, 11800], [5400, 12500], [6400, 12400]], w: 300 },
  { pts: [[12400, 11000], [12900, 12500], [12600, 14200]], w: 320 },
  { pts: [[5600, 17500], [6400, 18200], [7000, 17800]], w: 260 },
  { pts: [[15300, 1200], [15700, 4500], [15200, 8000], [15800, 11000], [15500, 12500]], w: 700 },
  { pts: [[16300, 2600], [17600, 2800], [19000, 3600]], w: 500 }, // 天魔山
  { pts: [[19500, 9100], [20200, 9600], [20900, 10300]], w: 520 }, // 昆吾山
  { pts: [[22000, 2200], [22600, 4000], [23200, 6000], [22800, 8200]], w: 420 },
  { pts: [[27600, 2400], [27200, 5000], [27900, 7800], [27000, 10500]], w: 480 },
  { pts: [[18000, 11800], [19800, 12200], [22000, 11900], [24400, 12500]], w: 360 },
  { pts: [[1200, 10500], [2200, 11200], [1800, 12600]], w: 300 },
  { pts: [[10000, 4200], [12500, 3600], [14200, 4500]], w: 300 },
  { pts: [[24300, 17200], [24700, 17600]], w: 260 }, // 天星圣山
];

/** 河流 */
export const RIVERS: P[][] = [
  [[10600, 16900], [10300, 17700], [10500, 18600], [10400, 19500]],
  [[9000, 14400], [8600, 15400], [8900, 16600], [8300, 17600], [7600, 18800], [7200, 20200]],
  [[16000, 5600], [18000, 5900], [20200, 6400], [22000, 6000], [24200, 6900], [26400, 7600], [28700, 7400]],
  [[13000, 5200], [11500, 6200], [9500, 6800], [7200, 7600], [5000, 8000]],
  [[21000, 10200], [21600, 11500], [21900, 12900]],
  [[6000, 12600], [6400, 13600], [6200, 15000], [6700, 16000]],
];

export interface RegionDef { id: string; name: string; poly: P[]; danger: [number, number]; desc: string; sea?: boolean; }

export const REGIONS: RegionDef[] = [
  { id: 'jibei', name: '极北冰原', poly: [[15000, 0], [29000, 0], [29000, 1700], [22000, 2200], [15000, 1600]], danger: [7, 9], desc: '万里冰封，高阶冰兽出没。' },
  { id: 'nanjiang', name: '南疆', poly: [[15200, 10200], [19500, 10000], [20500, 13800], [15200, 13800]], danger: [5, 8], desc: '大晋南部的蛮荒之地，毒虫遍布，化仙宗所在。' },
  { id: 'dajin', name: '大晋', poly: [[15500, 0], [29500, 0], [29500, 13600], [15500, 13600]], danger: [5, 9], desc: '人界修仙大国，幅员辽阔，化神老怪坐镇。' },
  { id: 'tianlan', name: '天澜草原', poly: [[2500, 0], [15500, 0], [15500, 9300], [2500, 9300]], danger: [4, 7], desc: '慕兰人与突兀人的草原，慕兰法士凶悍。' },
  { id: 'jixi', name: '极西之地', poly: [[0, 0], [4100, 0], [4100, 21000], [0, 21000]], danger: [4, 7], desc: '黄沙万里，千竹教盘踞于此。' },
  { id: 'jiuguo', name: '九国盟', poly: [[4100, 9300], [12000, 9300], [12000, 11400], [4100, 11400]], danger: [3, 5], desc: '天南北部诸国联盟，抵御慕兰人的前线。' },
  { id: 'yuanwu', name: '元武国', poly: [[7200, 11400], [10500, 11400], [10500, 14500], [7200, 14500]], danger: [2, 4], desc: '越国北邻，正道盟总坛所在。' },
  { id: 'zijin', name: '紫金国', poly: [[4100, 11400], [7200, 11400], [7200, 14500], [4100, 14500]], danger: [2, 4], desc: '天道盟势力范围。' },
  { id: 'xiguo', name: '溪国', poly: [[10500, 9300], [14500, 9300], [14500, 14500], [10500, 14500]], danger: [3, 5], desc: '落云宗与古剑门所在。' },
  { id: 'cheqi', name: '车骑国', poly: [[4100, 14500], [7200, 14500], [7200, 18000], [4100, 18000]], danger: [2, 5], desc: '魔道六宗盘踞之地，凶险莫测。' },
  { id: 'jiang', name: '姜国', poly: [[4100, 18000], [7600, 18000], [7600, 21500], [4100, 21500]], danger: [1, 3], desc: '天南南部小国。' },
  { id: 'yue', name: '越国', poly: [[7200, 14500], [15000, 14500], [15000, 21800], [7200, 21800]], danger: [1, 3], desc: '韩立故乡。越国七派：黄枫谷、掩月宗、灵兽山、清虚门、化刀坞、天阙堡、巨剑门。' },
  { id: 'neixing', name: '内星海', poly: [[21000, 13600], [28200, 13600], [28200, 24000], [21000, 24000]], danger: [3, 6], desc: '乱星海内海，星宫统辖，正魔两道混杂。', sea: true },
  { id: 'waixing', name: '外星海', poly: [[28200, 13600], [36000, 13600], [36000, 24000], [28200, 24000]], danger: [6, 10], desc: '妖兽的天下，猎妖修士的乐园与坟场。', sea: true },
  { id: 'wubian', name: '无边海', poly: [[0, 0], [36000, 0], [36000, 24000], [0, 24000]], danger: [5, 8], desc: '茫茫无际的大海，隔开天南与乱星海。', sea: true },
];

export type LocType = 'city' | 'town' | 'village' | 'sect' | 'danger' | 'secret' | 'portal';

export interface LocationDef {
  id: string; name: string; type: LocType; x: number; y: number; desc: string;
  sect?: string; danger?: number; shop?: number; portal?: string[]; hidden?: boolean; island?: number;
  openEvery?: number; maxRealm?: number; minRealm?: number; boss?: string; aura?: number;
}

export const LOCATIONS: LocationDef[] = [
  // ===== 越国 =====
  { id: 'qixuan', name: '七玄门', type: 'sect', sect: 'qixuan', x: 8700, y: 18500, desc: '彩霞山上的凡俗江湖门派，韩立少年时拜入此门。', shop: 0, aura: 1.0 },
  { id: 'qingniu', name: '青牛镇', type: 'village', x: 8150, y: 19150, desc: '镜州一个普普通通的小镇，韩立的故乡。', shop: 0 },
  { id: 'jiayuan', name: '嘉元城', type: 'town', x: 9650, y: 18950, desc: '越国繁华城池，墨府所在。', shop: 1 },
  { id: 'tainan', name: '太南山', type: 'town', x: 9000, y: 17350, desc: '散修聚集的太南小会，常有升仙令等宝物交易。', shop: 1 },
  { id: 'yuejing', name: '越京', type: 'city', x: 10000, y: 17850, desc: '越国都城，修仙坊市繁荣。', shop: 2, portal: ['yuanwucheng', 'jiayuan', 'tiantian'] },
  { id: 'huangfeng', name: '黄枫谷', type: 'sect', sect: 'huangfeng', x: 10200, y: 16450, desc: '越国七派之一，位于太岳山脉。', shop: 2, aura: 1.6 },
  { id: 'yanyue', name: '掩月宗', type: 'sect', sect: 'yanyue', x: 11400, y: 17650, desc: '越国七派之首，门下多女修。', shop: 2, aura: 1.7 },
  { id: 'lingshou', name: '灵兽山', type: 'sect', sect: 'lingshou', x: 8000, y: 15950, desc: '越国七派之一，擅长驭兽。', shop: 1, aura: 1.5 },
  { id: 'qingxu', name: '清虚门', type: 'sect', sect: 'qingxu', x: 11300, y: 15600, desc: '越国七派之一，道家正宗。', shop: 1, aura: 1.5 },
  { id: 'huadao', name: '化刀坞', type: 'sect', sect: 'huadao', x: 7650, y: 17400, desc: '越国七派之一，以刀修闻名。', shop: 1, aura: 1.4 },
  { id: 'tianque', name: '天阙堡', type: 'sect', sect: 'tianque', x: 10900, y: 18850, desc: '越国七派之一。', shop: 1, aura: 1.4 },
  { id: 'jujian', name: '巨剑门', type: 'sect', sect: 'jujian', x: 9300, y: 15200, desc: '越国七派之一，擅长巨剑。', shop: 1, aura: 1.4 },
  { id: 'yanling', name: '燕翎堡', type: 'town', x: 8350, y: 15050, desc: '燕家所在，曾举办夺宝大会。', shop: 1 },
  { id: 'xuese', name: '血色禁地', type: 'secret', x: 10900, y: 16800, desc: '七派共掌的试炼禁地，每五年开启一次，只许炼气弟子进入。内有筑基丹主药。', openEvery: 5, maxRealm: 1, boss: 'mojiao', danger: 3 },
  { id: 'guchuansong', name: '古传送阵', type: 'portal', x: 12000, y: 19900, desc: '上古修士遗留的超远距离传送阵，可直通乱星海魁星岛。', portal: ['kuixing'], hidden: true },
  // ===== 元武 / 紫金 / 溪国 / 九国盟 =====
  { id: 'yuanwucheng', name: '元武城', type: 'city', x: 8800, y: 13000, desc: '元武国都城。', shop: 2, portal: ['yuejing', 'tiantian', 'zijincheng'] },
  { id: 'zhengdao', name: '正道盟', type: 'sect', sect: 'zhengdao', x: 9700, y: 12200, desc: '天南正道联盟总坛。', shop: 2, aura: 1.8 },
  { id: 'zhuimo', name: '坠魔谷', type: 'danger', x: 7400, y: 11900, desc: '上古修士与古魔大战之地，内有古魔残魂与无数宝物，凶险万分。', danger: 7, boss: 'gumo' },
  { id: 'zijincheng', name: '紫金城', type: 'town', x: 5700, y: 13000, desc: '紫金国都城。', shop: 1, portal: ['yuanwucheng'] },
  { id: 'tiandao', name: '天道盟', type: 'sect', sect: 'tiandao', x: 5000, y: 12000, desc: '天南三大势力之一。', shop: 2, aura: 1.8 },
  { id: 'luoyun', name: '落云宗', type: 'sect', sect: 'luoyun', x: 11800, y: 13300, desc: '溪国大宗，灵药园闻名天南。', shop: 2, aura: 1.9 },
  { id: 'xicheng', name: '溪国城', type: 'town', x: 11000, y: 12000, desc: '溪国都城。', shop: 1 },
  { id: 'gujian', name: '古剑门', type: 'sect', sect: 'gujian', x: 12300, y: 11900, desc: '以剑修闻名的大宗。', shop: 1, aura: 1.7 },
  { id: 'tiantian', name: '阗天城', type: 'city', x: 7500, y: 9900, desc: '九国盟抵御慕兰人的第一线雄城。', shop: 2, portal: ['yuejing', 'yuanwucheng'] },
  { id: 'huayi', name: '化意门', type: 'sect', sect: 'huayi', x: 9800, y: 10500, desc: '九国盟盟主宗门，擅长毒道。', shop: 2, aura: 1.7 },
  // ===== 车骑 / 姜国（魔道） =====
  { id: 'hehuan', name: '合欢宗', type: 'sect', sect: 'hehuan', x: 5200, y: 15500, desc: '魔道六宗之一，精研双修采补之术。', shop: 2, aura: 1.7 },
  { id: 'guiling', name: '鬼灵门', type: 'sect', sect: 'guiling', x: 6400, y: 16800, desc: '魔道六宗之一，驭鬼炼魂。', shop: 2, aura: 1.7 },
  { id: 'moyan', name: '魔焰门', type: 'sect', sect: 'moyan', x: 5000, y: 17300, desc: '魔道六宗之一，魔焰滔天。', shop: 1, aura: 1.6 },
  { id: 'yinluo', name: '阴罗宗', type: 'sect', sect: 'yinluo', x: 4900, y: 16200, desc: '魔道大宗，镇宗之宝鬼罗幡。', shop: 2, aura: 1.7 },
  { id: 'cheqicheng', name: '车骑城', type: 'town', x: 6200, y: 15200, desc: '魔道修士往来之城，杀人夺宝屡见不鲜。', shop: 1 },
  { id: 'jiangcheng', name: '姜国城', type: 'town', x: 5600, y: 19300, desc: '姜国都城。', shop: 1 },
  { id: 'xinjia', name: '辛家庄', type: 'village', x: 6500, y: 19850, desc: '隐居山野的阵法世家。', shop: 0 },
  // ===== 极西之地 =====
  { id: 'qianzhu', name: '千竹教', type: 'sect', sect: 'qianzhu', x: 2000, y: 14000, desc: '大衍神君所创之教，傀儡之术天下无双。', shop: 2, aura: 1.6 },
  { id: 'dayanfu', name: '大衍洞府', type: 'danger', x: 1600, y: 10900, desc: '大衍神君坐化之地，傀儡守护，内藏《大衍诀》。', danger: 6, boss: 'dayanpuppet' },
  { id: 'xisha', name: '西沙绿洲', type: 'town', x: 2500, y: 17000, desc: '黄沙中的绿洲坊市。', shop: 1 },
  // ===== 天澜草原 =====
  { id: 'mulan', name: '慕兰圣殿', type: 'danger', x: 7500, y: 5000, desc: '慕兰法士的圣地，法士云集。', danger: 7, boss: 'mulanmaster' },
  { id: 'tianlancheng', name: '天澜城', type: 'town', x: 11500, y: 6400, desc: '草原上的商城。', shop: 1 },
  { id: 'muyuan', name: '牧原集', type: 'village', x: 4500, y: 7500, desc: '牧民聚集之地。', shop: 0 },
  { id: 'shengshou', name: '天澜圣兽巢', type: 'danger', x: 13300, y: 3800, desc: '天澜圣兽栖息之地。', danger: 9, boss: 'shengshou' },
  // ===== 大晋 =====
  { id: 'jinjing', name: '晋京', type: 'city', x: 21500, y: 6000, desc: '大晋都城，人界第一雄城，拍卖会冠绝人界。', shop: 3, portal: ['qingyang', 'donghai', 'yejia'] },
  { id: 'tianmo', name: '天魔宗', type: 'sect', sect: 'tianmo', x: 17500, y: 3300, desc: '大晋十大魔宗之首，化神老怪呼老魔坐镇。', shop: 3, aura: 2.4 },
  { id: 'taiyi', name: '太一门', type: 'sect', sect: 'taiyi', x: 24500, y: 3800, desc: '大晋正道魁首。', shop: 3, aura: 2.3 },
  { id: 'kunwu', name: '昆吾山', type: 'secret', x: 20200, y: 9700, desc: '镇压古魔元刹之地，昆吾殿中藏有八灵尺等通天之宝。', openEvery: 20, minRealm: 4, boss: 'yuancha', danger: 9 },
  { id: 'yinyang', name: '阴阳窟', type: 'danger', x: 25800, y: 9200, desc: '阴阳二气交汇之地，生有奇物。', danger: 8, boss: 'yinyangbeast' },
  { id: 'yejia', name: '叶家', type: 'town', x: 23000, y: 7900, desc: '大晋顶级修仙世家。', shop: 2, portal: ['jinjing'] },
  { id: 'huaxian', name: '化仙宗', type: 'sect', sect: 'huaxian', x: 17500, y: 11500, desc: '南疆大宗。', shop: 2, aura: 2.0 },
  { id: 'qingyang', name: '青羊城', type: 'town', x: 18800, y: 6800, desc: '大晋西部重镇。', shop: 2, portal: ['jinjing'] },
  { id: 'jibeibing', name: '冰魄寒渊', type: 'danger', x: 21000, y: 1100, desc: '极北冰原深处，冰兽王巢穴。', danger: 9, boss: 'icebeast' },
  { id: 'donghai', name: '东海港', type: 'town', x: 26200, y: 12300, desc: '大晋东南港口，有传送阵通往乱星海天星城。', shop: 2, portal: ['jinjing', 'tianxing'] },
  // ===== 乱星海 =====
  { id: 'tianxing', name: '天星城', type: 'city', x: 24500, y: 17500, desc: '乱星海第一城，星宫圣山所在。', shop: 3, portal: ['kuixing', 'donghai', 'qiyuan', 'biling'], island: 1300 },
  { id: 'xinggong', name: '星宫', type: 'sect', sect: 'xinggong', x: 24950, y: 16950, desc: '乱星海最高势力，天星双圣坐镇。', shop: 3, aura: 2.2 },
  { id: 'kuixing', name: '魁星岛', type: 'town', x: 22300, y: 15200, desc: '内星海热闹的大岛，古传送阵另一端。', shop: 2, portal: ['tianxing', 'guchuansong'], island: 650 },
  { id: 'miaoyin', name: '妙音门', type: 'sect', sect: 'miaoyin', x: 25900, y: 19300, desc: '紫灵所在宗门，媚术音功冠绝乱星海。', shop: 2, island: 520, aura: 1.8 },
  { id: 'jiyin', name: '极阴岛', type: 'sect', sect: 'jiyin', x: 27400, y: 14800, desc: '魔道巨擘极阴祖师的老巢。', shop: 2, island: 600, aura: 1.9 },
  { id: 'biling', name: '碧灵岛', type: 'town', x: 23000, y: 20800, desc: '产灵石矿的岛屿。', shop: 1, island: 520, portal: ['tianxing'] },
  { id: 'xiaohuan', name: '小寰岛', type: 'town', x: 26400, y: 21400, desc: '内星海边缘小岛。', shop: 1, island: 420 },
  { id: 'wanfa', name: '万法门', type: 'sect', sect: 'wanfa', x: 21900, y: 18800, desc: '乱星海正道大宗，万天明坐镇。', shop: 2, island: 560, aura: 1.9 },
  { id: 'huangming', name: '皇明岛', type: 'town', x: 23700, y: 22700, desc: '内星海南部岛屿。', shop: 1, island: 450 },
  { id: 'beihuang', name: '北荒岛', type: 'town', x: 28300, y: 14100, desc: '内外星海交界处的荒岛。', shop: 1, island: 420 },
  { id: 'qiyuan', name: '奇渊岛', type: 'town', x: 31500, y: 19200, desc: '外星海猎妖修士的据点。', shop: 2, island: 600, portal: ['tianxing'] },
  { id: 'haiyuan', name: '海猿岛', type: 'danger', x: 29300, y: 16300, desc: '海猿出没的荒岛，灵气充沛。', danger: 6, island: 480, boss: 'haiyuan' },
  { id: 'xutian', name: '虚天殿', type: 'secret', x: 30800, y: 14300, desc: '冰魄仙子所留古殿，每十年开启，内藏乱星海第一至宝虚天鼎。', openEvery: 10, minRealm: 2, boss: 'xutianguard', island: 650, danger: 8 },
  { id: 'wuzhong', name: '雾中岛', type: 'danger', x: 33500, y: 21500, desc: '终年大雾，六级以上妖兽盘踞。', danger: 8, island: 520, boss: 'fengxi' },
  { id: 'guiwu', name: '鬼雾海域', type: 'danger', x: 29800, y: 21000, desc: '传闻通往阴冥之地，进去的人很少出来。', danger: 8, island: 380, boss: 'yinming' },
  { id: 'yaochao', name: '妖兽巢穴', type: 'danger', x: 34000, y: 16500, desc: '外星海深处的妖兽巢穴，有化形大妖。', danger: 10, island: 600, boss: 'jinjiaowang' },
];

export function locById(id: string) { return LOCATIONS.find((l) => l.id === id); }

export function pointInPoly(x: number, y: number, poly: P[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function regionAt(x: number, y: number): RegionDef {
  for (const r of REGIONS) if (pointInPoly(x, y, r.poly)) return r;
  return REGIONS[REGIONS.length - 1];
}
