// 游戏状态、存档
import type { Archetype } from '../data/characters';
import { WORLD_W, WORLD_H } from '../data/world';

export const DAYS_PER_SEC = 0.5; // 现实 1 分钟 = 游戏 1 个月
export const YEAR = 360;
export const EXPLORE_CELL = 256;
export const EXPLORE_W = Math.ceil(WORLD_W / EXPLORE_CELL);
export const EXPLORE_H = Math.ceil(WORLD_H / EXPLORE_CELL);

export interface BagData { owner: string; realm: number; items: InvEntry[]; lingshi: number; need: number; days: number; started: boolean; }
export interface InvEntry { uid: string; id: string; n: number; q?: number; refine?: number; count?: number; jilian?: number; bag?: BagData; from?: string; }

export interface Player {
  name: string; age: number; realm: number; stage: number; exp: number;
  hp: number; mp: number; x: number; y: number; lingshi: number;
  inv: InvEntry[]; equipped: string[]; techs: string[]; mainTech: string; talents: string[];
  sect?: string; sectRank: number; contribution: number; injury: number;
  bottle: { drops: number; progress: number; max: number };
  alchLv: number; alchExp: number; heat: number;
  rep: { good: number; evil: number }; bounty: number; sensePerm: number; lifeBonus: number;
  deaths: number; lastSafe: string; conceal: boolean; tianyan: boolean; quick: string[]; kills: number;
  meditating: boolean; pendingTalents?: string[]; spar?: boolean;
}

export interface NPC {
  id: string; name: string; gender: 'm' | 'f'; famous?: string; portrait?: string; title?: string;
  realm: number; stage: number; exp: number; age: number; lifespan: number; sect?: string; home: string;
  align: number; arch: Archetype; traits: { greed: number; caution: number; lust: number; kind: number; pride: number };
  x: number; y: number; tx: number; ty: number; goal: string; goalT: number; target?: string;
  lingshi: number; inv: InvEntry[]; arts: string[]; alive: boolean; favor: number; grudge: number; met: boolean;
  hpFrac: number; beauty?: boolean; partner?: boolean; companion?: boolean; lastGift: number; lastDual: number; lastTalk: number;
  conceal: number; senseMul: number; techs?: string[]; innate?: string; look: { hair: number; robe: number; acc: number; skin: number };
  killedBy?: string; wander: number; desc?: string; lines?: string[]; likes?: string[]; deathDay?: number; noticed?: number;
}

export interface NewsItem { day: number; text: string; kind?: string; }
export interface WorldEvent { id: string; kind: 'treasure' | 'beast' | 'war' | 'auction'; x: number; y: number; name: string; until: number; level: number; taken?: boolean; }

export interface GameState {
  version: number; seed: number; day: number; player: Player; npcs: NPC[];
  explored: Uint8Array; news: NewsItem[]; difficulty: 'easy' | 'normal' | 'hard'; ironman: boolean;
  flags: Record<string, any>; herbTaken: Record<string, number>; events: WorldEvent[];
  secretOpen: Record<string, number>; known: Record<string, boolean>; slot: number; playSec: number;
}

let _state: GameState | null = null;
export function S(): GameState { return _state!; }
export function setState(s: GameState) { _state = s; }
export function hasState() { return !!_state; }

export function dateStr(day: number) {
  const y = Math.floor(day / YEAR) + 1;
  const m = Math.floor((day % YEAR) / 30) + 1;
  const d = Math.floor(day % 30) + 1;
  return `第${y}年${m}月${d}日`;
}

export function addNews(text: string, kind = 'info') {
  const s = S();
  s.news.unshift({ day: s.day, text, kind });
  if (s.news.length > 200) s.news.length = 200;
}

// ---------- 存档 ----------
const KEY = 'fanren_renjie_save_';

function toB64(u: Uint8Array) { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
function fromB64(b: string) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }

export function serialize(s: GameState): string {
  const o: any = { ...s, explored: toB64(s.explored) };
  return JSON.stringify(o);
}
export function deserialize(str: string): GameState {
  const o = JSON.parse(str);
  o.explored = fromB64(o.explored);
  if (o.explored.length !== EXPLORE_W * EXPLORE_H) { const u = new Uint8Array(EXPLORE_W * EXPLORE_H); u.set(o.explored.subarray(0, u.length)); o.explored = u; }
  return o as GameState;
}

export function saveGame(slot?: number) {
  const s = S();
  if (slot === undefined) slot = s.slot;
  try {
    localStorage.setItem(KEY + slot, serialize(s));
    localStorage.setItem(KEY + slot + '_meta', JSON.stringify({ day: s.day, realm: s.player.realm, stage: s.player.stage, age: s.player.age, time: Date.now(), ironman: s.ironman, difficulty: s.difficulty }));
    return true;
  } catch (e) { console.error(e); return false; }
}

export function loadGame(slot: number): GameState | null {
  const str = localStorage.getItem(KEY + slot);
  if (!str) return null;
  try { const s = deserialize(str); s.slot = slot; return s; } catch (e) { console.error(e); return null; }
}

export function slotMeta(slot: number): any | null {
  const m = localStorage.getItem(KEY + slot + '_meta');
  return m ? JSON.parse(m) : null;
}
export function deleteSlot(slot: number) { localStorage.removeItem(KEY + slot); localStorage.removeItem(KEY + slot + '_meta'); }

export function exportSave(): string { return serialize(S()); }
export function importSave(str: string, slot: number) { const s = deserialize(str); s.slot = slot; localStorage.setItem(KEY + slot, str); return s; }
