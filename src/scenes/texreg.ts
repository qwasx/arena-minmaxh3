import Phaser from 'phaser';
import { drawChibi, drawMonster, ROBE_COLORS, HAIR_COLORS, SKIN, fxTextures, drawMarker, drawIcon, iconKindFor } from '../core/textures';
import type { NPC } from '../core/state';
import { item } from '../data/items';

export function ensureTex(scene: Phaser.Scene, key: string, draw: () => HTMLCanvasElement) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  return key;
}

const ACC = ['#c9a64a', '#e05a6a', '#5ab0e0', '#9a5ae0', '#e0e0e0', '#60c080', '#ff8040', '#ffd0e0', '#40d0c0', '#d04040'];

const SPECIAL: Record<string, any> = {
  hanli: { robe: '#2f5d57', hair: '#1c1714', bottle: true, acc: '#1f3a36' },
  nangongwan: { robe: '#f0eee8', hair: '#1c1714', female: true, style: 1, acc: '#e04030', trim: '#d8d0e8' },
  ziling: { robe: '#8a6ac0', hair: '#141414', female: true, style: 1, acc: '#c0a0ff' },
  yuanyao: { robe: '#bcd8ec', hair: '#1c1714', female: true, style: 2, acc: '#80c0ff' },
  chenqiaoqian: { robe: '#e8c060', hair: '#1c1714', female: true, style: 2, acc: '#d08020' },
  dongxuaner: { robe: '#e898a8', hair: '#1c1714', female: true, style: 0, acc: '#ff6090' },
  mocaihuan: { robe: '#f0b8a0', hair: '#1c1714', female: true, style: 0, acc: '#80c080' },
  mupeiling: { robe: '#a8cce8', hair: '#1c1714', female: true, style: 1, acc: '#60b080' },
  yinyue: { robe: '#c8d0e0', hair: '#e0e0ea', female: true, style: 2, fox: true, acc: '#a0c0ff' },
  songyu: { robe: '#e8eef8', hair: '#141414', female: true, style: 1, sword: true, acc: '#4080d0' },
  xinruyin: { robe: '#c8b8e0', hair: '#1c1714', female: true, style: 2, acc: '#9080c0' },
  lingyuling: { robe: '#2a3a6a', hair: '#141414', female: true, style: 1, acc: '#e0c040', trim: '#e0c040' },
  lifeiyu: { robe: '#5a5a5a', hair: '#141414', acc: '#a03030' },
  modaifu: { robe: '#5a4a3a', hair: '#888888', old: true, acc: '#3a2a1a' },
  lihuayuan: { robe: '#d8b860', hair: '#3a3a3a', sword: true, acc: '#7a5a20' },
  linghulaozu: { robe: '#c8a040', hair: '#d8d8d8', old: true },
  jiyin: { robe: '#2a2030', hair: '#3a3a3a', old: true, acc: '#60ff90' },
  wentianren: { robe: '#d8b040', hair: '#141414', acc: '#ffffff' },
  liudao: { robe: '#1a1a1a', hair: '#141414', acc: '#e0e0d0' },
  manhuzi: { robe: '#6a4a2a', hair: '#2a1a10', old: true },
  hulaomo: { robe: '#3a0a10', hair: '#d0d0d0', old: true, acc: '#ff2040' },
  dayan: { robe: '#4a5a6a', hair: '#d0d0d0', old: true, acc: '#40c0ff' },
  xiangzhili: { robe: '#8a8a7a', hair: '#d0d0d0', old: true },
  fengxi: { robe: '#4a6a8a', hair: '#a0c0e0', acc: '#e0f0ff' },
};

export function chibiKey(scene: Phaser.Scene, n: NPC | 'hanli') {
  if (n === 'hanli') return ensureTex(scene, 'ch_hanli', () => drawChibi(SPECIAL.hanli));
  if (n.famous && SPECIAL[n.famous]) return ensureTex(scene, 'ch_' + n.famous, () => drawChibi(SPECIAL[n.famous!]));
  const k = `ch_${n.gender}_${n.look.robe}_${n.look.hair}_${n.look.acc}_${n.look.skin}_${n.arch === 'sword' ? 1 : 0}_${n.realm >= 4 ? 1 : 0}`;
  return ensureTex(scene, k, () => drawChibi({
    robe: ROBE_COLORS[n.look.robe % ROBE_COLORS.length], hair: n.realm >= 4 && n.gender === 'm' ? '#d8d8d8' : HAIR_COLORS[n.look.hair % HAIR_COLORS.length],
    skin: SKIN[n.look.skin % 3], female: n.gender === 'f', style: n.look.acc, acc: ACC[n.look.acc % ACC.length], sword: n.arch === 'sword', old: n.realm >= 4 && n.gender === 'm',
  }));
}

export function chibiCanvasFor(n: NPC): HTMLCanvasElement {
  if (n.famous && SPECIAL[n.famous]) return drawChibi(SPECIAL[n.famous]);
  return drawChibi({ robe: ROBE_COLORS[n.look.robe % ROBE_COLORS.length], hair: HAIR_COLORS[n.look.hair % HAIR_COLORS.length], skin: SKIN[n.look.skin % 3], female: n.gender === 'f', style: n.look.acc, acc: ACC[n.look.acc % ACC.length], sword: n.arch === 'sword', old: n.realm >= 4 && n.gender === 'm' });
}

export function monsterKey(scene: Phaser.Scene, type: string) { return ensureTex(scene, 'mon_' + type, () => drawMonster(type)); }
export function markerKey(scene: Phaser.Scene, type: string) { return ensureTex(scene, 'mk_' + type, () => drawMarker(type)); }
export function itemTexKey(scene: Phaser.Scene, id: string) {
  const [k, col] = iconKindFor(id);
  return ensureTex(scene, 'ic_' + id, () => drawIcon(k, col, item(id)?.rarity ?? 1));
}

export function registerFx(scene: Phaser.Scene) {
  if (scene.textures.exists('glow')) return;
  const fx = fxTextures();
  for (const k in fx) scene.textures.addCanvas(k, fx[k]);
}
