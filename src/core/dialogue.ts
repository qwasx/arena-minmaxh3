// NPC 对话系统。默认规则驱动；预留 LLM 接口（setDialogueProvider）。
import { S, NPC, Player, dateStr } from './state';
import { realmName } from '../data/realms';
import { SECTS } from '../data/characters';
import { locById } from '../data/world';
import { rng } from './rng';

export type Topic = 'greet' | 'chat' | 'news' | 'self' | 'flirt' | 'gift' | 'giftBad' | 'insult' | 'dual' | 'dualNo' | 'follow' | 'followNo' | 'partner' | 'partnerNo' | 'free' | 'spar' | 'trade';
export interface DialogueContext { npc: NPC; player: Player; topic: Topic; text?: string; extra?: any; history?: { who: 'me' | 'npc'; text: string }[]; }
export interface DialogueProvider { name: string; reply(ctx: DialogueContext): Promise<string>; }

/** 为 LLM 构造角色设定（以后接入大模型时使用） */
export function buildPersona(n: NPC): string {
  const s = S();
  const sect = n.sect ? SECTS[n.sect]?.name : '散修';
  return [
    `你是《凡人修仙传》人界中的修士「${n.name}」${n.title ? '（' + n.title + '）' : ''}，${n.gender === 'f' ? '女' : '男'}，${realmName(n.realm, n.stage)}，约${Math.floor(n.age)}岁，出身${sect}，现居${locById(n.home)?.name ?? '各地'}。`,
    n.desc ? `人物设定：${n.desc}` : '',
    `性格：贪婪${n.traits.greed.toFixed(1)}，谨慎${n.traits.caution.toFixed(1)}，善良${n.traits.kind.toFixed(1)}，高傲${n.traits.pride.toFixed(1)}；正邪倾向${n.align.toFixed(1)}（-1魔道，1正道）。`,
    `你对韩立的好感度为${Math.round(n.favor)}（-100~100），仇恨${Math.round(n.grudge)}。${n.partner ? '你是韩立的道侣。' : ''}`,
    `当前时间：${dateStr(s.day)}。韩立当前看起来是${realmName(s.player.realm, s.player.stage)}。`,
    '请用符合古典仙侠小说的口吻、一到三句话回应，不要跳出角色。',
  ].filter(Boolean).join('\n');
}

const pick = <T,>(a: T[]) => a[Math.floor(rng.next() * a.length)];

function addr(n: NPC, p: Player) {
  if (n.partner) return n.gender === 'f' ? pick(['夫君', '韩郎', '立哥']) : '道友';
  if (n.favor > 60) return n.gender === 'f' ? pick(['韩大哥', '韩道友', '韩兄']) : '韩兄';
  if (n.realm > p.realm + 1) return pick(['小辈', '小友']);
  if (n.realm < p.realm) return pick(['前辈', '韩前辈']);
  return '道友';
}

function ruleReply(c: DialogueContext): string {
  const { npc: n, player: p } = c;
  const a = addr(n, p);
  const cold = n.favor < -20, warm = n.favor > 40, love = n.favor > 75 || n.partner;
  const evil = n.align < -0.3;
  switch (c.topic) {
    case 'greet':
      if (n.lines?.length && rng.chance(0.6)) return pick(n.lines);
      if (cold) return pick([`哼，又是你。`, `${a}最好离我远一些。`, `有话快说。`]);
      if (love) return pick([`${a}，你来了~`, `正想着你呢，${a}。`, `${a}这些日子可还安好？`]);
      if (warm) return pick([`${a}别来无恙！`, `哈，是${a}啊，快请坐。`]);
      if (n.realm > p.realm + 1) return pick([`嗯？一个${realmName(p.realm, p.stage)}的小辈，找本座何事？`, `小辈，有事？`]);
      return evil ? pick([`道友看着面生……`, `嘿嘿，道友一个人？`]) : pick([`道友请了。`, `幸会幸会。`, `这位道友有何指教？`]);
    case 'chat':
      if (cold) return '我与你没什么好聊的。';
      return pick([
        `最近${locById(n.home)?.name ?? '这里'}附近不太平，听说有人杀人夺宝。`,
        `修仙之路漫漫，${a}可要保重。`,
        n.realm >= 3 ? '结丹之后才知，大道之上，皆是孤独。' : '若能筑基，便有两百年寿元了……',
        evil ? '修仙界弱肉强食，心软的人活不长。' : '与人为善，总归不会错的。',
        `听说${pick(['坠魔谷', '虚天殿', '昆吾山', '血色禁地', '外星海'])}中藏着上古宝物，可惜凶险得很。`,
        `${a}可知哪里有年份高的灵药？我愿出高价。`,
      ]);
    case 'news': {
      const ns = S().news.filter((x) => x.kind === 'world' || x.kind === 'kill' || x.kind === 'event').slice(0, 8);
      if (!ns.length) return '最近倒是风平浪静。';
      return '听说……' + pick(ns).text;
    }
    case 'self':
      return n.desc ? `${n.desc}` : `在下${n.name}，${n.sect ? SECTS[n.sect]?.name + '弟子' : '一介散修'}，修为${realmName(n.realm, n.stage)}。`;
    case 'flirt':
      if (n.gender === 'm') return '……道友莫开玩笑。';
      if (love) return pick(['讨厌~ 就会说好听的。', '……你再说一遍？', '傻子，人家早就是你的人了。']);
      if (warm) return pick(['你、你说什么呢……', '哼，油嘴滑舌。', '（脸颊微红）……']);
      if (n.traits.pride > 0.6) return '登徒子！再胡言乱语，休怪我不客气！';
      return pick(['道友请自重。', '……']);
    case 'gift': return love ? pick([`${a}待我真好……`, '这个我很喜欢，谢谢你。']) : warm ? pick(['多谢！这份情谊我记下了。', '道友太客气了。']) : pick(['这……那我便收下了。', '无功不受禄，不过……多谢。']);
    case 'giftBad': return pick(['这东西对我没什么用。', '……多谢好意。']);
    case 'insult': return n.realm > p.realm ? `找死！` : `你……你给我等着！`;
    case 'dual': return n.partner ? pick(['嗯……今夜便在洞府中共参大道吧。', '（轻轻靠在你肩上）']) : '……只此一次。';
    case 'dualNo': return pick(['我们还没有到那一步。', '登徒子！', '道友请自重。']);
    case 'follow': return pick(['好，我便随你走一遭。', '有我在，保你无虞。', `愿随${a}同行！`]);
    case 'followNo': return pick(['我还有要事在身。', '我与你还没那么熟。']);
    case 'partner': return n.gender === 'f' ? '……此生此世，愿与你结为道侣，长生同途。' : '……此生愿与你共参大道。';
    case 'partnerNo': return pick(['此事……容我再想想。', '我们之间还差些火候。']);
    case 'spar': return n.realm > p.realm + 1 ? '凭你？罢了，让你三招。' : '好！点到为止。';
    case 'trade': return '看看吧，价钱公道。';
    case 'free': {
      const t = c.text || '';
      if (/宝|法宝|灵石/.test(t)) return evil ? '嘿嘿，道友问这个做什么？' : '宝物乃身外之物，修为才是根本。';
      if (/美|漂亮|好看|喜欢/.test(t)) return n.gender === 'f' ? (warm ? '……就会哄人开心。' : '道友请自重。') : '哈哈，道友说笑了。';
      if (/哪|去|地方/.test(t)) return `往${pick(['东', '西', '南', '北'])}去便是${pick(['越京', '天星城', '晋京', '阗天城', '落云宗'])}。`;
      if (/修炼|突破|境界/.test(t)) return '突破之事，丹药与机缘缺一不可。';
      return pick(['哦？', '原来如此。', '道友所言甚是。', '……', '嗯。']);
    }
  }
  return '……';
}

const ruleProvider: DialogueProvider = { name: 'rule', reply: async (c) => ruleReply(c) };
let provider: DialogueProvider = ruleProvider;

export function setDialogueProvider(p: DialogueProvider | null) { provider = p || ruleProvider; }
export function dialogueProviderName() { return provider.name; }

export async function npcSay(c: DialogueContext): Promise<string> {
  try { return await provider.reply(c); } catch (e) { console.warn(e); return ruleReply(c); }
}
/** 同步版本（规则引擎），用于即时 UI */
export function npcSaySync(c: DialogueContext) { return ruleReply(c); }

/**
 * 接入 LLM 的示例（OpenAI 兼容接口）：
 * setDialogueProvider({ name: 'llm', reply: async (c) => {
 *   const r = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ system: buildPersona(c.npc), topic: c.topic, text: c.text, history: c.history }) });
 *   return (await r.json()).text;
 * }});
 */
