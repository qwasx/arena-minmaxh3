// 奇遇事件（大地图上的“问号”）。无主线，全部随机触发。
import type { EnemySpec } from '../scenes/BattleScene';
import type { NPC, Player } from '../core/state';
import type { RNG } from '../core/rng';

export interface EvAPI {
  p: Player; r: RNG; level: number; biome: string; region: string;
  give(id: string, n?: number, q?: number): string;
  lingshi(n: number): string;
  exp(frac: number): string;
  hurt(frac: number): string;
  days(n: number): void;
  battle(enemies: EnemySpec[], title: string, onWin?: () => string | void): void;
  beast(level: number, boss?: boolean): EnemySpec;
  spawnNPC(opt: { female?: boolean; beauty?: boolean; realm?: number; align?: number }): NPC;
  npcSpec(n: NPC): EnemySpec;
  favor(n: NPC, v: number): void;
  randomHerb(maxRarity: number): string;
  randomTreasure(level: number): string;
  sense(): number;
}
export interface EvChoice { label: string; req?: (a: EvAPI) => string | null; run: (a: EvAPI) => string | void; }
export interface EvDef { id: string; title: string; weight: number; minRealm?: number; maxRealm?: number; text: (a: EvAPI) => string; choices: EvChoice[]; }

export const EVENTS: EvDef[] = [
  {
    id: 'injured', title: '受伤的修士', weight: 10,
    text: () => '路边草丛中躺着一名浑身是血的修士，气息微弱，腰间的储物袋却鼓鼓囊囊。他看见你，艰难地抬起手：“道友……救我……”',
    choices: [
      {
        label: '赠一枚回春丹救他', req: (a) => (a.p.inv.some((e) => e.id === 'huichundan') ? null : '需要回春丹'),
        run: (a) => {
          const i = a.p.inv.find((e) => e.id === 'huichundan')!; i.n--; if (i.n <= 0) a.p.inv.splice(a.p.inv.indexOf(i), 1);
          const n = a.spawnNPC({ realm: Math.max(1, a.p.realm), align: 0.5 }); a.favor(n, 45);
          a.p.rep.good += 3;
          if (a.r.chance(0.6)) return `修士服下丹药，脸色渐渐红润。他自称${n.name}，千恩万谢，赠你一份谢礼：${a.give(a.randomTreasure(a.level))}。（${n.name}好感 +45）`;
          return `${n.name}伤势好转，郑重抱拳：“此恩${n.name}铭记于心，日后道友若有差遣，万死不辞！”（好感 +45）`;
        },
      },
      {
        label: '杀人夺宝', run: (a) => {
          const n = a.spawnNPC({ realm: Math.max(1, a.p.realm), align: 0 }); n.hpFrac = 0.25;
          a.p.rep.evil += 4;
          a.battle([a.npcSpec(n)], '趁他病，要他命');
        },
      },
      { label: '不惹麻烦，转身离开', run: () => '修仙界尔虞我诈，谁知这是不是陷阱？你头也不回地走了。' },
    ],
  },
  {
    id: 'cave', title: '古修洞府', weight: 7,
    text: () => '山壁上一道几不可察的禁制光幕微微闪烁，似乎是一位前辈修士的洞府。禁制已经十分薄弱。',
    choices: [
      {
        label: '破禁而入', run: (a) => {
          if (a.r.chance(0.45)) {
            a.battle([a.beast(a.level + 1, true)], '洞府守护兽', () => `击败守护兽后，你在石室中找到：${a.give(a.randomTreasure(a.level + 1))}、${a.lingshi(Math.round(60 * Math.pow(3.2, a.level)))}`);
            return;
          }
          if (a.r.chance(0.3)) return `洞府中空空如也，只留一具枯骨。你在骨堆中翻出 ${a.give(a.randomTreasure(a.level))}。`;
          return `你触动了残余禁制，被炸得灰头土脸。${a.hurt(0.35)}。洞中物品早已被人取走。`;
        },
      },
      { label: '神识探查后再入', req: (a) => (a.sense() >= 20 ? null : '神识需达 20'), run: (a) => `你小心以神识探查，避开了致命禁制，取得 ${a.give(a.randomTreasure(a.level))}。` },
      { label: '离开', run: () => '你记下了此处，却终究没敢冒险。' },
    ],
  },
  {
    id: 'lingmai', title: '灵脉节点', weight: 8,
    text: () => '此处灵气异常浓郁，地底似有一条小灵脉。若在此打坐，事半功倍。',
    choices: [
      { label: '闭关三十日', run: (a) => { a.days(30); return `你在灵脉节点闭关三十日，${a.exp(0.45)}`; } },
      { label: '只打坐片刻', run: (a) => { a.days(3); return `你打坐片刻，${a.exp(0.08)}`; } },
    ],
  },
  {
    id: 'peddler', title: '神秘摊贩', weight: 7,
    text: (a) => `一个戴斗笠的散修蹲在路边，面前摆着几样看不出来历的旧物：“道友，有缘之物，只要 ${Math.round(40 * Math.pow(3, a.p.realm))} 灵石，买不了吃亏买不了上当。”`,
    choices: [
      {
        label: '买下一件', req: (a) => (a.p.lingshi >= Math.round(40 * Math.pow(3, a.p.realm)) ? null : '灵石不足'),
        run: (a) => {
          a.p.lingshi -= Math.round(40 * Math.pow(3, a.p.realm));
          const roll = a.r.next();
          if (roll < 0.35) return `回去一看，是一块普通的石头……你被坑了。`;
          if (roll < 0.85) return `你买下的是 ${a.give(a.randomTreasure(a.p.realm * 2))}，倒也不亏。`;
          return `捡到宝了！竟是 ${a.give(a.randomTreasure(a.p.realm * 2 + 3))}！`;
        },
      },
      { label: '摇头离开', run: () => '那散修嘿嘿一笑，也不挽留。' },
    ],
  },
  {
    id: 'robbers', title: '劫修拦路', weight: 9, minRealm: 1,
    text: (a) => `三名${a.p.realm >= 2 ? '筑基' : '炼气'}劫修从林中闪出，呈品字形将你围住：“此路是我开！留下储物袋，饶你不死！”`,
    choices: [
      {
        label: '迎战', run: (a) => {
          const ns = [0, 1, 2].map((i) => { const n = a.spawnNPC({ realm: Math.max(1, a.p.realm - (i ? 0 : 0)), align: -0.7 }); if (i) n.stage = Math.max(0, a.p.stage - 2); return n; });
          a.battle(ns.map((n) => a.npcSpec(n)), '劫修拦路');
        },
      },
      { label: '交出三成灵石', run: (a) => { const v = Math.floor(a.p.lingshi * 0.3); a.p.lingshi -= v; return `你忍气吞声交出了 ${v} 灵石，劫修扬长而去。`; } },
      { label: '施展身法逃走', run: (a) => (a.r.chance(0.6) ? '你脚下一点，化作一道青烟遁走，劫修追之不及。' : (a.battle([a.npcSpec(a.spawnNPC({ realm: Math.max(1, a.p.realm), align: -0.7 }))], '没逃掉！'), undefined)) },
    ],
  },
  {
    id: 'fairy', title: '仙子遇险', weight: 7, minRealm: 1,
    text: () => '远处传来一声娇呼——一名女修正被妖兽围攻，法器灵光已经黯淡，眼看支撑不住了。',
    choices: [
      {
        label: '出手相救', run: (a) => {
          const n = a.spawnNPC({ female: true, beauty: true, realm: Math.max(1, a.p.realm), align: 0.4 });
          a.battle([a.beast(a.level), a.beast(Math.max(0, a.level - 1))], '英雄救美', () => { a.favor(n, 50); return `${n.name}收起法器，向你盈盈一礼：“多谢道友援手……小女子${n.name}，敢问道友高姓大名？”（好感 +50，可在人物中查看）`; });
        },
      },
      { label: '坐山观虎斗', run: (a) => (a.r.chance(0.5) ? `女修最终拼死逃走，妖兽也受了重伤。你轻松收拾了残局：${a.give('yd' + Math.max(1, Math.min(10, a.level)))}` : '女修香消玉殒，妖兽叼着她的储物袋跑了。你心中莫名有些不是滋味。') },
      { label: '离开', run: () => '你默默离开了。' },
    ],
  },
  {
    id: 'remains', title: '坐化遗骸', weight: 6,
    text: () => '一处隐秘的山洞内，一具盘坐的枯骨保持着打坐姿势，身前放着一只储物袋和一枚玉简。',
    choices: [
      {
        label: '取走遗物', run: (a) => {
          if (a.r.chance(0.2)) {
            if (a.sense() > 25 * (a.p.realm + 1)) { a.p.sensePerm += 0.05; return `枯骨中突然窜出一道残魂想要夺舍！你神识强大，反将其炼化，神识永久 +5%！并获得 ${a.give(a.randomTreasure(a.level + 1))}。`; }
            return `一道残魂猛地扑入你识海，你拼死抵抗才将其驱散。${a.hurt(0.5)}。`;
          }
          return `你恭敬地拜了三拜，取走遗物：${a.give(a.randomTreasure(a.level))}、${a.lingshi(Math.round(30 * Math.pow(3.5, a.level)))}`;
        },
      },
      { label: '埋葬前辈', run: (a) => { a.p.rep.good += 2; return a.r.chance(0.5) ? `你将前辈遗骨安葬，冥冥之中似有所感。${a.exp(0.15)}` : '你将前辈遗骨安葬，立了一块无字碑。'; } },
    ],
  },
  {
    id: 'herbfield', title: '野生灵药园', weight: 8,
    text: () => '山谷中雾气缭绕，竟有一小片野生灵药，周围似乎没有妖兽守护……',
    choices: [
      {
        label: '采摘', run: (a) => {
          if (a.r.chance(0.35)) { a.battle([a.beast(a.level + 1)], '护药妖兽', () => `赶走护药妖兽后，你采得 ${a.give(a.randomHerb(Math.ceil(a.level / 2) + 2), 2, 1)}、${a.give(a.randomHerb(Math.ceil(a.level / 2) + 1), 2)}`); return; }
          return `你采得 ${a.give(a.randomHerb(Math.ceil(a.level / 2) + 1), a.r.int(2, 3))}、${a.give(a.randomHerb(Math.ceil(a.level / 2) + 1), a.r.int(1, 2), a.r.chance(0.3) ? 1 : 0)}`;
        },
      },
    ],
  },
  {
    id: 'enlighten', title: '顿悟', weight: 4,
    text: () => '看着天边舒卷的云霞，你心中忽有所感，似乎触摸到了某种玄妙。',
    choices: [
      { label: '静心参悟', run: (a) => { a.days(5); return `你闭目参悟五日，${a.exp(0.3)}`; } },
      { label: '赶路要紧', run: () => '灵光一闪即逝，你摇了摇头继续赶路。' },
    ],
  },
  {
    id: 'meteor', title: '天降异石', weight: 4,
    text: () => '一道流光划破天际，坠落在不远处的山坳里，砸出一个大坑，坑中隐隐有光芒透出。',
    choices: [
      { label: '前去查看', run: (a) => (a.r.chance(0.12) && a.p.realm >= 2 ? `坑中竟是一截紫金色的竹子——${a.give('jinleizhu')}！` : `坑中是一块天外陨铁：${a.give('xuantie', a.r.int(2, 4))}`) },
    ],
  },
  {
    id: 'ghostmarket', title: '鬼市', weight: 3, minRealm: 1,
    text: () => '夜色中，一片阴气森森的集市凭空出现，摊主们都用黑袍裹住身形，交易的多是来路不明的东西。',
    choices: [
      {
        label: '花灵石淘宝', req: (a) => (a.p.lingshi >= 150 * Math.pow(3, a.p.realm) ? null : `需要 ${Math.round(150 * Math.pow(3, a.p.realm))} 灵石`),
        run: (a) => { a.p.lingshi -= Math.round(150 * Math.pow(3, a.p.realm)); return `你淘到了 ${a.give(a.randomTreasure(a.p.realm * 2 + 2))}。`; },
      },
      { label: '出手抢夺', run: (a) => { a.p.rep.evil += 3; a.battle([a.npcSpec(a.spawnNPC({ realm: Math.min(5, a.p.realm + 1), align: -0.8 }))], '鬼市摊主'); } },
      { label: '离开', run: () => '鬼市如雾气般消散了。' },
    ],
  },
  {
    id: 'demoness', title: '魔道妖女', weight: 4, minRealm: 2,
    text: () => '一位身着薄纱的妖娆女修拦住去路，眼波流转：“好俊俏的道友……可愿与妾身共参欢喜大道？”她身上隐隐有魔功气息。',
    choices: [
      { label: '欣然同往', run: (a) => (a.r.chance(0.45) ? `一夜缠绵，她竟真心与你双修。${a.exp(0.35)}` : (a.p.exp *= 0.75, `中计了！她暗施采补之术，你修为大损（-25%），她已飘然而去。`)) },
      { label: '斩妖除魔', run: (a) => { const n = a.spawnNPC({ female: true, beauty: true, realm: a.p.realm, align: -0.8 }); a.p.rep.good += 2; a.battle([a.npcSpec(n)], '斩妖除魔'); } },
      { label: '婉拒', run: () => '“哼，不解风情。”她咯咯一笑，化作粉色烟雾散去。' },
    ],
  },
  {
    id: 'beastlair', title: '妖兽巢穴', weight: 7,
    text: (a) => `前方山洞中传来低沉的咆哮，洞口散落着兽骨——这里栖息着一头${a.level + 1}级妖兽，巢中或许有它收集的宝物。`,
    choices: [
      { label: '挑战妖兽', run: (a) => { a.battle([a.beast(a.level + 1, true)], '妖兽巢穴', () => `你在巢穴中找到 ${a.give(a.randomHerb(Math.ceil(a.level / 2) + 2), 1, a.r.int(1, 2))}、${a.lingshi(Math.round(50 * Math.pow(3, a.level)))}`); } },
      { label: '绕道而行', run: () => '你绕开巢穴，悄然离去。' },
    ],
  },
  {
    id: 'auction', title: '散修小会', weight: 4,
    text: () => '一群散修在山谷中举行小型交易会，有人正在叫卖一枚筑基丹，引得众人眼红。',
    choices: [
      { label: '出价购买筑基丹（1500灵石）', req: (a) => (a.p.lingshi >= 1500 ? null : '灵石不足'), run: (a) => { a.p.lingshi -= 1500; a.p.heat = Math.min(100, a.p.heat + 25); return `你拍下了筑基丹！${a.give('zhujidan')}。不过，你感到几道不怀好意的目光盯上了你……（怀璧其罪）`; } },
      { label: '旁观', run: (a) => (a.r.chance(0.3) ? `买下筑基丹的那人刚出谷就被截杀了。你在混乱中捡到 ${a.give('huichundan', 2)}。` : '交易会平静地结束了。') },
    ],
  },
];
