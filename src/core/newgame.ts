import { S, setState, GameState, Player, EXPLORE_W, EXPLORE_H, addNews } from './state';
import { initNPCs } from './npc';
import { addItem, computeStats } from './player';
import { generateWorld } from './worldgen';

let worldReady = false;
export function ensureWorld() { if (!worldReady) { generateWorld(); worldReady = true; } }

export function newGame(difficulty: 'easy' | 'normal' | 'hard', slot: number, ironman = false): GameState {
  const seed = (Math.random() * 1e9) | 0;
  const player: Player = {
    name: '韩立', age: 16, realm: 0, stage: 0, exp: 0, hp: 120, mp: 30, x: 8700, y: 18620, lingshi: 20,
    inv: [], equipped: [], techs: ['changchun', 'luoyan'], mainTech: 'changchun', talents: [],
    sect: 'qixuan', sectRank: 0, contribution: 0, injury: 0,
    bottle: { drops: 1, progress: 0, max: 3 }, alchLv: 0, alchExp: 0, heat: 0,
    rep: { good: 0, evil: 0 }, bounty: 0, sensePerm: 0, lifeBonus: 0, deaths: 0, lastSafe: 'qixuan', conceal: false, tianyan: false,
    quick: ['huichundan', 'huodanfu', 'jingangfu', 'huilingdan'], kills: 0, meditating: false,
  };
  const s: GameState = {
    version: 1, seed, day: 0, player, npcs: [], explored: new Uint8Array(EXPLORE_W * EXPLORE_H), news: [], difficulty, ironman,
    flags: { autoAttack: true }, herbTaken: {}, events: [], secretOpen: {}, known: { qixuan: true, qingniu: true, jiayuan: true }, slot, playSec: 0,
  };
  setState(s);
  ensureWorld();
  addItem(player, 'zhangtianping');
  addItem(player, 'huichundan', 4);
  addItem(player, 'huodanfu', 3);
  addItem(player, 'jingangfu', 1);
  addItem(player, 'qinglingcao', 2);
  addItem(player, 'zhixuecao', 2);
  addItem(player, 'danlu');
  s.npcs = initNPCs();
  const st = computeStats(player); player.hp = st.maxHp; player.mp = st.maxMp;
  addNews('韩立，镜州青牛镇人士，年方十六，经三叔引荐入七玄门为记名弟子。某日于山中拾得一只神秘小绿瓶……', 'event');
  addNews('越国七派、魔道六宗、乱星海星宫、大晋天魔宗……人界广袤，一切皆由你自己书写。', 'event');
  return S();
}
