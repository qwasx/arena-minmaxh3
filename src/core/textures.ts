// 程序化绘制：Q版人物、妖兽、法宝图标、特效贴图
import { item, ArtKind, RARITY_COLORS } from '../data/items';

export function cv(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const INK = 'rgba(38,30,26,0.92)';

export const ROBE_COLORS = ['#2f5d57', '#e8e4da', '#3b5f8f', '#c9a64a', '#7a2f3a', '#3a3340', '#5a4a7a', '#7fa0c8', '#d98a8a', '#5f7f4a', '#9a6b3f', '#2b2b2b', '#c4c4d8', '#a04a8a', '#4a7a8a', '#e0b8d0'];
export const HAIR_COLORS = ['#1c1714', '#2a1f1a', '#3a2a22', '#141414', '#d8d8e0', '#5a3a2a'];
export const SKIN = ['#f6dcc6', '#f1d2b8', '#e8c3a4'];

export interface ChibiOpts { robe: string; hair: string; skin?: string; female?: boolean; style?: number; acc?: string; trim?: string; fox?: boolean; bottle?: boolean; sword?: boolean; old?: boolean; hat?: boolean; }

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r * k)); g = Math.max(0, Math.min(255, g * k)); b = Math.max(0, Math.min(255, b * k));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function drawChibi(o: ChibiOpts): HTMLCanvasElement {
  const c = cv(128, 168); const x = c.getContext('2d')!;
  x.lineJoin = 'round'; x.lineCap = 'round';
  const skin = o.skin || SKIN[0];
  // 阴影
  x.fillStyle = 'rgba(30,25,20,0.25)'; x.beginPath(); x.ellipse(64, 158, 34, 8, 0, 0, Math.PI * 2); x.fill();
  // 狐尾
  if (o.fox) { x.fillStyle = '#e8e8f0'; x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(84, 140); x.quadraticCurveTo(128, 120, 112, 80); x.quadraticCurveTo(104, 112, 80, 128); x.closePath(); x.fill(); x.stroke(); }
  // 背剑
  if (o.sword) { x.strokeStyle = '#555'; x.lineWidth = 5; x.beginPath(); x.moveTo(30, 150); x.lineTo(96, 70); x.stroke(); x.strokeStyle = '#a07a3a'; x.lineWidth = 7; x.beginPath(); x.moveTo(88, 80); x.lineTo(100, 66); x.stroke(); }
  // 长发（身后）
  if (o.female) {
    x.fillStyle = o.hair; x.strokeStyle = INK; x.lineWidth = 3;
    x.beginPath(); x.moveTo(30, 60); x.quadraticCurveTo(22, 120, 34, 138); x.lineTo(94, 138); x.quadraticCurveTo(106, 120, 98, 60); x.closePath(); x.fill(); x.stroke();
  }
  // 袍
  const robe = o.robe;
  x.fillStyle = robe; x.strokeStyle = INK; x.lineWidth = 3.2;
  x.beginPath();
  x.moveTo(44, 88); x.quadraticCurveTo(64, 82, 84, 88);
  x.quadraticCurveTo(96, 120, 102, 152); x.quadraticCurveTo(64, 160, 26, 152);
  x.quadraticCurveTo(32, 120, 44, 88); x.closePath(); x.fill(); x.stroke();
  // 衣褶阴影
  x.fillStyle = shade(robe, 0.8); x.beginPath(); x.moveTo(64, 96); x.quadraticCurveTo(70, 128, 66, 154); x.lineTo(60, 154); x.quadraticCurveTo(64, 126, 64, 96); x.fill();
  // 袖子
  for (const s of [-1, 1]) {
    x.fillStyle = shade(robe, 0.92);
    x.beginPath(); x.moveTo(64 + s * 18, 92); x.quadraticCurveTo(64 + s * 42, 104, 64 + s * 40, 132); x.quadraticCurveTo(64 + s * 30, 136, 64 + s * 22, 126); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = skin; x.beginPath(); x.arc(64 + s * 31, 132, 5.5, 0, Math.PI * 2); x.fill(); x.stroke();
  }
  // 领口
  x.fillStyle = o.trim || '#f2ede0'; x.beginPath(); x.moveTo(52, 88); x.lineTo(64, 108); x.lineTo(76, 88); x.lineTo(70, 88); x.lineTo(64, 100); x.lineTo(58, 88); x.closePath(); x.fill();
  // 腰带
  x.fillStyle = o.acc || shade(robe, 0.55); x.fillRect(42, 112, 44, 7); x.strokeRect(42, 112, 44, 7);
  if (o.bottle) { x.fillStyle = '#5ee08a'; x.beginPath(); x.ellipse(80, 124, 5, 7, 0, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(78, 120, 2, 4); }
  // 头
  x.fillStyle = skin; x.strokeStyle = INK; x.lineWidth = 3.2;
  x.beginPath(); x.arc(64, 56, 33, 0, Math.PI * 2); x.fill(); x.stroke();
  // 头发
  x.fillStyle = o.hair;
  x.beginPath();
  x.moveTo(30, 60); x.quadraticCurveTo(28, 22, 64, 20); x.quadraticCurveTo(100, 22, 98, 60);
  if (o.female) { x.quadraticCurveTo(88, 40, 70, 40); x.quadraticCurveTo(64, 48, 56, 40); x.quadraticCurveTo(40, 40, 30, 60); }
  else { x.quadraticCurveTo(86, 36, 64, 38); x.quadraticCurveTo(42, 36, 30, 60); }
  x.closePath(); x.fill(); x.stroke();
  // 发髻 / 发饰
  const st = o.style ?? 0;
  if (!o.female) {
    if (o.hat) { x.fillStyle = '#2a2a2a'; x.fillRect(50, 10, 28, 14); x.strokeRect(50, 10, 28, 14); }
    else { x.fillStyle = o.hair; x.beginPath(); x.arc(64, 18, 10, 0, Math.PI * 2); x.fill(); x.stroke(); x.strokeStyle = o.acc || '#c9a64a'; x.lineWidth = 3; x.beginPath(); x.moveTo(50, 18); x.lineTo(78, 16); x.stroke(); }
    if (o.old) { x.fillStyle = '#e8e8e8'; x.strokeStyle = INK; x.lineWidth = 2; x.beginPath(); x.moveTo(52, 76); x.quadraticCurveTo(64, 104, 76, 76); x.closePath(); x.fill(); x.stroke(); }
  } else {
    x.strokeStyle = INK; x.lineWidth = 3;
    if (st % 3 === 0) { x.fillStyle = o.hair; x.beginPath(); x.arc(40, 26, 10, 0, Math.PI * 2); x.arc(88, 26, 10, 0, Math.PI * 2); x.fill(); }
    else if (st % 3 === 1) { x.fillStyle = o.hair; x.beginPath(); x.ellipse(64, 16, 16, 9, 0, 0, Math.PI * 2); x.fill(); x.stroke(); }
    x.fillStyle = o.acc || '#e05a6a'; x.beginPath(); x.arc(84, 30, 5, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(91, 36, 3.5, 0, Math.PI * 2); x.fill();
  }
  if (o.fox) {
    x.fillStyle = o.hair; x.strokeStyle = INK; x.lineWidth = 3;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(64 + s * 16, 26); x.lineTo(64 + s * 30, 2); x.lineTo(64 + s * 32, 32); x.closePath(); x.fill(); x.stroke(); }
  }
  // 脸
  x.fillStyle = '#2a1e1a';
  for (const s of [-1, 1]) {
    x.beginPath(); x.ellipse(64 + s * 12, 62, 4.2, o.female ? 5.6 : 4.8, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(64 + s * 12 + 1.4, 60, 1.5, 0, Math.PI * 2); x.fill(); x.fillStyle = '#2a1e1a';
  }
  x.fillStyle = 'rgba(240,120,120,0.35)'; x.beginPath(); x.ellipse(46, 72, 6, 3.5, 0, 0, Math.PI * 2); x.ellipse(82, 72, 6, 3.5, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#8a3a3a'; x.lineWidth = 2; x.beginPath(); x.arc(64, 74, 3.5, 0.2, Math.PI - 0.2); x.stroke();
  return c;
}

// ---------------- 妖兽 ----------------
export const MONSTER_TYPES: Record<string, { name: string; color: string; eye: string; shape: string; scale?: number }> = {
  wolf: { name: '赤炎狼', color: '#8a4a3a', eye: '#ffd040', shape: 'wolf' },
  greywolf: { name: '青狼', color: '#6a7070', eye: '#9fffcf', shape: 'wolf' },
  snake: { name: '花斑蟒', color: '#5a7a3a', eye: '#ff5040', shape: 'snake' },
  bear: { name: '铁背熊', color: '#4a3a30', eye: '#ff8040', shape: 'bear' },
  spider: { name: '血纹毒蛛', color: '#3a2a3a', eye: '#ff2040', shape: 'spider' },
  ape: { name: '金睛猿', color: '#9a7a3a', eye: '#ffe060', shape: 'ape' },
  fox: { name: '妖狐', color: '#c8b8a0', eye: '#ff70c0', shape: 'fox' },
  boar: { name: '獠牙野猪', color: '#5a4a3a', eye: '#ff6030', shape: 'bear' },
  jiao: { name: '墨蛟', color: '#2a3a3a', eye: '#ff3030', shape: 'jiao', scale: 1.5 },
  corpse: { name: '尸傀', color: '#6a7a6a', eye: '#60ff90', shape: 'corpse' },
  crab: { name: '铁甲蟹', color: '#a04a2a', eye: '#ffffff', shape: 'crab' },
  shark: { name: '鬼面鲨', color: '#4a5a6a', eye: '#ff4040', shape: 'fish' },
  seasnake: { name: '海蛇妖', color: '#2a6a7a', eye: '#ffef60', shape: 'snake' },
  bird: { name: '赤翎雕', color: '#9a3a2a', eye: '#ffd040', shape: 'bird' },
  ghost: { name: '阴魂', color: '#8a8aa8', eye: '#a0ffff', shape: 'ghost' },
  puppet: { name: '傀儡', color: '#a08060', eye: '#40c0ff', shape: 'corpse' },
  scorpion: { name: '沙蝎', color: '#9a7a4a', eye: '#ff4040', shape: 'spider' },
  icebeast: { name: '冰魄兽', color: '#a8c8e0', eye: '#2060ff', shape: 'bear', scale: 1.4 },
  ape2: { name: '海猿', color: '#4a6a6a', eye: '#ffef60', shape: 'ape' },
  fengxi: { name: '裂风兽', color: '#5a7a9a', eye: '#d0f0ff', shape: 'wolf', scale: 1.6 },
  dragon: { name: '金蛟王', color: '#b89030', eye: '#ff2020', shape: 'jiao', scale: 1.8 },
  demon: { name: '古魔残魂', color: '#4a2040', eye: '#ff2060', shape: 'ghost', scale: 1.6 },
  bigbeast: { name: '圣兽', color: '#d8c8a0', eye: '#ff3030', shape: 'bear', scale: 1.8 },
};

export function drawMonster(type: string): HTMLCanvasElement {
  const t = MONSTER_TYPES[type] || MONSTER_TYPES.wolf;
  const c = cv(160, 140); const x = c.getContext('2d')!;
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.strokeStyle = INK; x.lineWidth = 3.5;
  const col = t.color, dark = shade(col, 0.6), light = shade(col, 1.25);
  x.fillStyle = 'rgba(30,25,20,0.25)'; x.beginPath(); x.ellipse(80, 128, 52, 9, 0, 0, Math.PI * 2); x.fill();
  const eye = (ex: number, ey: number, r = 4.5) => { x.fillStyle = t.eye; x.shadowColor = t.eye; x.shadowBlur = 10; x.beginPath(); x.arc(ex, ey, r, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0; x.fillStyle = '#000'; x.beginPath(); x.arc(ex + 1, ey, r * 0.4, 0, Math.PI * 2); x.fill(); };
  x.fillStyle = col;
  switch (t.shape) {
    case 'wolf': case 'fox': {
      // 尾
      x.fillStyle = t.shape === 'fox' ? light : dark;
      x.beginPath(); x.moveTo(36, 84); x.quadraticCurveTo(4, 70, 10, 40); x.quadraticCurveTo(24, 66, 44, 74); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = col;
      for (const lx of [50, 66, 96, 110]) { x.beginPath(); x.moveTo(lx, 100); x.lineTo(lx - 2, 124); x.stroke(); }
      x.beginPath(); x.ellipse(78, 90, 44, 22, -0.05, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(108, 66); x.quadraticCurveTo(140, 64, 150, 84); x.quadraticCurveTo(136, 96, 112, 94); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(112, 70); x.lineTo(116, 46); x.lineTo(126, 66); x.closePath(); x.fill(); x.stroke();
      eye(132, 76);
      x.fillStyle = light; x.beginPath(); x.ellipse(74, 98, 24, 7, 0, 0, Math.PI * 2); x.fill();
      break;
    }
    case 'snake': {
      x.lineWidth = 22; x.strokeStyle = INK;
      const path = () => { x.beginPath(); x.moveTo(20, 110); x.bezierCurveTo(50, 60, 80, 140, 110, 90); x.quadraticCurveTo(124, 66, 130, 60); };
      path(); x.lineWidth = 26; x.stroke(); path(); x.strokeStyle = col; x.lineWidth = 20; x.stroke();
      x.strokeStyle = light; x.lineWidth = 5; x.setLineDash([6, 10]); path(); x.stroke(); x.setLineDash([]);
      x.strokeStyle = INK; x.lineWidth = 3.5; x.fillStyle = col;
      x.beginPath(); x.ellipse(134, 56, 18, 12, -0.4, 0, Math.PI * 2); x.fill(); x.stroke();
      eye(138, 50, 4);
      x.strokeStyle = '#c03030'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(150, 52); x.lineTo(158, 48); x.moveTo(150, 52); x.lineTo(158, 56); x.stroke();
      break;
    }
    case 'bear': {
      x.beginPath(); x.ellipse(80, 88, 48, 36, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      for (const lx of [50, 108]) { x.beginPath(); x.ellipse(lx, 118, 13, 10, 0, 0, Math.PI * 2); x.fill(); x.stroke(); }
      x.beginPath(); x.arc(80, 52, 26, 0, Math.PI * 2); x.fill(); x.stroke();
      for (const s of [-1, 1]) { x.beginPath(); x.arc(80 + s * 20, 30, 9, 0, Math.PI * 2); x.fill(); x.stroke(); }
      x.fillStyle = light; x.beginPath(); x.ellipse(80, 62, 12, 9, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = light; x.beginPath(); x.ellipse(80, 96, 26, 20, 0, 0, Math.PI * 2); x.fill();
      eye(70, 48, 4); eye(90, 48, 4);
      break;
    }
    case 'spider': {
      x.lineWidth = 5;
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
        x.beginPath(); x.moveTo(80, 84); x.quadraticCurveTo(80 + s * (40 + i * 6), 50 + i * 14, 80 + s * (56 + i * 8), 100 + i * 8); x.stroke();
      }
      x.lineWidth = 3.5;
      x.beginPath(); x.ellipse(80, 96, 30, 24, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.arc(80, 66, 16, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#c02030'; x.beginPath(); x.moveTo(80, 84); x.lineTo(90, 96); x.lineTo(80, 110); x.lineTo(70, 96); x.closePath(); x.fill();
      eye(73, 62, 3); eye(87, 62, 3); eye(80, 70, 2.5);
      break;
    }
    case 'ape': {
      x.beginPath(); x.ellipse(80, 90, 34, 34, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      for (const s of [-1, 1]) { x.lineWidth = 14; x.strokeStyle = INK; x.beginPath(); x.moveTo(80 + s * 28, 80); x.quadraticCurveTo(80 + s * 54, 100, 80 + s * 46, 126); x.stroke(); x.lineWidth = 9; x.strokeStyle = col; x.stroke(); }
      x.strokeStyle = INK; x.lineWidth = 3.5;
      x.beginPath(); x.arc(80, 50, 24, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = light; x.beginPath(); x.ellipse(80, 56, 16, 13, 0, 0, Math.PI * 2); x.fill();
      eye(71, 48, 4); eye(89, 48, 4);
      break;
    }
    case 'jiao': {
      const path = () => { x.beginPath(); x.moveTo(10, 100); x.bezierCurveTo(40, 40, 70, 140, 100, 80); x.quadraticCurveTo(116, 52, 132, 50); };
      path(); x.lineWidth = 34; x.strokeStyle = INK; x.stroke(); path(); x.lineWidth = 27; x.strokeStyle = col; x.stroke();
      x.strokeStyle = light; x.lineWidth = 6; x.setLineDash([3, 9]); path(); x.stroke(); x.setLineDash([]);
      x.strokeStyle = INK; x.lineWidth = 3.5; x.fillStyle = col;
      x.beginPath(); x.ellipse(136, 46, 22, 15, -0.2, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#d8c890'; x.beginPath(); x.moveTo(128, 34); x.lineTo(120, 10); x.lineTo(134, 32); x.fill(); x.stroke(); x.beginPath(); x.moveTo(140, 32); x.lineTo(142, 8); x.lineTo(148, 34); x.fill(); x.stroke();
      x.strokeStyle = '#d8c890'; x.lineWidth = 2; x.beginPath(); x.moveTo(152, 52); x.quadraticCurveTo(160, 70, 150, 80); x.stroke();
      eye(142, 42, 4.5);
      break;
    }
    case 'corpse': {
      x.beginPath(); x.moveTo(60, 70); x.lineTo(100, 70); x.lineTo(104, 124); x.lineTo(56, 124); x.closePath(); x.fill(); x.stroke();
      for (const s of [-1, 1]) { x.lineWidth = 10; x.beginPath(); x.moveTo(80 + s * 20, 76); x.lineTo(80 + s * 52, 80); x.stroke(); x.lineWidth = 3.5; }
      x.beginPath(); x.arc(80, 50, 20, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#e8d070'; x.fillRect(72, 34, 16, 22); x.strokeRect(72, 34, 16, 22);
      x.strokeStyle = '#c02020'; x.lineWidth = 2; x.beginPath(); x.moveTo(76, 40); x.lineTo(84, 40); x.moveTo(80, 38); x.lineTo(80, 52); x.stroke();
      eye(72, 58, 3); eye(88, 58, 3);
      break;
    }
    case 'crab': {
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) { x.lineWidth = 5; x.beginPath(); x.moveTo(80 + s * 30, 96 + i * 6); x.lineTo(80 + s * (58 + i * 4), 110 + i * 8); x.stroke(); }
        x.lineWidth = 3.5; x.beginPath(); x.ellipse(80 + s * 52, 64, 16, 12, s * 0.6, 0, Math.PI * 2); x.fill(); x.stroke();
      }
      x.beginPath(); x.ellipse(80, 92, 40, 26, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      eye(70, 66, 4); eye(90, 66, 4);
      break;
    }
    case 'fish': {
      x.beginPath(); x.moveTo(20, 90); x.quadraticCurveTo(70, 40, 140, 84); x.quadraticCurveTo(70, 124, 20, 90); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(30, 90); x.lineTo(4, 64); x.lineTo(10, 110); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(80, 62); x.lineTo(90, 36); x.lineTo(104, 66); x.fill(); x.stroke();
      x.fillStyle = light; x.beginPath(); x.ellipse(90, 98, 34, 8, 0.1, 0, Math.PI * 2); x.fill();
      eye(122, 80, 4);
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 4; i++) { x.moveTo(126 + i * 3, 92); x.lineTo(128 + i * 3, 98); } x.stroke();
      break;
    }
    case 'bird': {
      x.fillStyle = dark;
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(80, 76); x.quadraticCurveTo(80 + s * 50, 30, 80 + s * 76, 44); x.quadraticCurveTo(80 + s * 50, 70, 80, 92); x.closePath(); x.fill(); x.stroke(); }
      x.fillStyle = col; x.beginPath(); x.ellipse(80, 88, 18, 28, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.arc(80, 56, 13, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#e0b030'; x.beginPath(); x.moveTo(76, 62); x.lineTo(80, 76); x.lineTo(84, 62); x.fill();
      eye(75, 54, 3); eye(85, 54, 3);
      break;
    }
    case 'ghost': {
      const g = x.createLinearGradient(0, 30, 0, 130); g.addColorStop(0, col); g.addColorStop(1, 'rgba(120,120,160,0)');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(50, 70); x.quadraticCurveTo(50, 24, 80, 24); x.quadraticCurveTo(110, 24, 110, 70); x.quadraticCurveTo(116, 110, 100, 130); x.quadraticCurveTo(90, 110, 80, 128); x.quadraticCurveTo(70, 110, 60, 130); x.quadraticCurveTo(44, 110, 50, 70); x.fill();
      x.strokeStyle = 'rgba(30,20,40,0.6)'; x.stroke();
      eye(70, 56, 5); eye(90, 56, 5);
      x.fillStyle = '#100810'; x.beginPath(); x.ellipse(80, 76, 7, 10, 0, 0, Math.PI * 2); x.fill();
      break;
    }
  }
  return c;
}

// ---------------- 图标 ----------------
const iconCache = new Map<string, string>();
const iconCanvasCache = new Map<string, HTMLCanvasElement>();

export function drawIcon(kind: string, color: string, rarity = 1): HTMLCanvasElement {
  const key = kind + color + rarity;
  if (iconCanvasCache.has(key)) return iconCanvasCache.get(key)!;
  const c = cv(64, 64); const x = c.getContext('2d')!;
  x.lineJoin = 'round'; x.lineCap = 'round';
  const glow = RARITY_COLORS[rarity] || '#ccc';
  const rg = x.createRadialGradient(32, 32, 4, 32, 32, 30); rg.addColorStop(0, glow + '55'); rg.addColorStop(1, glow + '00');
  x.fillStyle = rg; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = INK; x.lineWidth = 2.5;
  const col = color;
  switch (kind) {
    case 'herb': {
      x.strokeStyle = '#3a5a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(32, 58); x.quadraticCurveTo(30, 36, 34, 18); x.stroke();
      x.fillStyle = '#5a9a4a'; x.strokeStyle = INK; x.lineWidth = 2;
      for (const [lx, ly, a] of [[24, 40, -0.6], [40, 34, 0.6], [26, 26, -0.5], [38, 48, 0.5]] as [number, number, number][]) { x.beginPath(); x.ellipse(lx, ly, 10, 5, a, 0, Math.PI * 2); x.fill(); x.stroke(); }
      x.fillStyle = col; x.beginPath(); x.arc(34, 16, 7, 0, Math.PI * 2); x.fill(); x.stroke();
      break;
    }
    case 'pill': {
      x.fillStyle = '#c8a050'; x.beginPath(); x.moveTo(22, 20); x.lineTo(42, 20); x.lineTo(44, 26); x.quadraticCurveTo(54, 40, 44, 54); x.lineTo(20, 54); x.quadraticCurveTo(10, 40, 20, 26); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#8a3a2a'; x.fillRect(24, 12, 16, 9); x.strokeRect(24, 12, 16, 9);
      x.fillStyle = col; x.beginPath(); x.arc(32, 40, 8, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(29, 37, 2.5, 0, Math.PI * 2); x.fill();
      break;
    }
    case 'talisman': {
      x.fillStyle = '#e8d070'; x.fillRect(20, 8, 24, 48); x.strokeRect(20, 8, 24, 48);
      x.strokeStyle = col; x.lineWidth = 2.5; x.beginPath(); x.moveTo(26, 16); x.lineTo(38, 16); x.moveTo(32, 14); x.lineTo(32, 48); x.moveTo(25, 26); x.quadraticCurveTo(32, 34, 39, 26); x.moveTo(26, 40); x.lineTo(38, 44); x.stroke();
      break;
    }
    case 'sword': case 'swarm': {
      const n = kind === 'swarm' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        x.save(); x.translate(32 + (i - (n - 1) / 2) * 9, 32); x.rotate(-0.75);
        x.fillStyle = col; x.beginPath(); x.moveTo(0, -26); x.lineTo(4, -18); x.lineTo(4, 14); x.lineTo(-4, 14); x.lineTo(-4, -18); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = '#7a5a2a'; x.fillRect(-9, 14, 18, 4); x.strokeRect(-9, 14, 18, 4); x.fillRect(-2.5, 18, 5, 9);
        x.restore();
      }
      break;
    }
    case 'needle': {
      for (let i = 0; i < 4; i++) { x.strokeStyle = col; x.lineWidth = 2.5; x.beginPath(); x.moveTo(12 + i * 4, 52 - i * 2); x.lineTo(48 + i * 3, 12 + i * 4); x.stroke(); }
      break;
    }
    case 'ring': {
      x.strokeStyle = INK; x.lineWidth = 11; x.beginPath(); x.arc(32, 32, 18, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = col; x.lineWidth = 7; x.beginPath(); x.arc(32, 32, 18, 0, Math.PI * 2); x.stroke();
      break;
    }
    case 'shield': case 'armor': {
      x.fillStyle = col; x.beginPath(); x.moveTo(32, 8); x.lineTo(54, 16); x.quadraticCurveTo(54, 46, 32, 58); x.quadraticCurveTo(10, 46, 10, 16); x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.moveTo(32, 14); x.lineTo(32, 50); x.stroke();
      break;
    }
    case 'mirror': {
      x.fillStyle = '#8a6a3a'; x.beginPath(); x.arc(32, 28, 20, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = col; x.beginPath(); x.arc(32, 28, 14, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#8a6a3a'; x.fillRect(28, 46, 8, 14); x.strokeRect(28, 46, 8, 14);
      break;
    }
    case 'banner': case 'flag': {
      x.strokeStyle = '#5a3a1a'; x.lineWidth = 4; x.beginPath(); x.moveTo(16, 6); x.lineTo(16, 60); x.stroke();
      x.fillStyle = col; x.strokeStyle = INK; x.lineWidth = 2; x.beginPath(); x.moveTo(18, 8); x.lineTo(52, 12); x.lineTo(46, 26); x.lineTo(52, 40); x.lineTo(18, 38); x.closePath(); x.fill(); x.stroke();
      break;
    }
    case 'cauldron': {
      x.fillStyle = col; x.beginPath(); x.moveTo(12, 24); x.lineTo(52, 24); x.quadraticCurveTo(54, 52, 32, 54); x.quadraticCurveTo(10, 52, 12, 24); x.closePath(); x.fill(); x.stroke();
      x.fillRect(8, 20, 48, 6); x.strokeRect(8, 20, 48, 6);
      x.beginPath(); x.moveTo(18, 52); x.lineTo(14, 60); x.moveTo(46, 52); x.lineTo(50, 60); x.stroke();
      break;
    }
    case 'wings': {
      for (const s of [-1, 1]) { x.fillStyle = col; x.beginPath(); x.moveTo(32, 34); x.quadraticCurveTo(32 + s * 18, 6, 32 + s * 30, 12); x.quadraticCurveTo(32 + s * 22, 30, 32 + s * 28, 44); x.quadraticCurveTo(32 + s * 12, 40, 32, 34); x.fill(); x.stroke(); }
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(26, 22); x.lineTo(30, 30); x.lineTo(24, 32); x.lineTo(30, 42); x.stroke();
      break;
    }
    case 'boat': {
      x.fillStyle = col; x.beginPath(); x.moveTo(6, 34); x.quadraticCurveTo(32, 54, 58, 34); x.lineTo(50, 30); x.lineTo(14, 30); x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(80,140,180,0.7)'; x.beginPath(); x.moveTo(4, 46); x.quadraticCurveTo(14, 42, 22, 48); x.moveTo(40, 48); x.quadraticCurveTo(50, 42, 60, 46); x.stroke();
      break;
    }
    case 'bell': {
      x.fillStyle = col; x.beginPath(); x.moveTo(20, 46); x.quadraticCurveTo(18, 14, 32, 12); x.quadraticCurveTo(46, 14, 44, 46); x.lineTo(50, 50); x.lineTo(14, 50); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.arc(32, 54, 4, 0, Math.PI * 2); x.fill(); x.stroke();
      break;
    }
    case 'brick': case 'mountain': {
      if (kind === 'mountain') { x.fillStyle = col; x.beginPath(); x.moveTo(8, 54); x.lineTo(26, 14); x.lineTo(36, 30); x.lineTo(44, 20); x.lineTo(58, 54); x.closePath(); x.fill(); x.stroke(); }
      else { x.fillStyle = col; x.fillRect(12, 20, 40, 26); x.strokeRect(12, 20, 40, 26); x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(14, 22, 36, 6); }
      break;
    }
    case 'arrow': {
      x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.moveTo(10, 54); x.lineTo(52, 12); x.stroke();
      x.fillStyle = col; x.beginPath(); x.moveTo(54, 10); x.lineTo(40, 16); x.lineTo(48, 24); x.closePath(); x.fill(); x.stroke();
      break;
    }
    case 'fan': {
      x.fillStyle = col; x.beginPath(); x.moveTo(32, 56); x.arc(32, 56, 44, -Math.PI * 0.85, -Math.PI * 0.15); x.closePath(); x.fill(); x.stroke();
      for (let i = 0; i < 6; i++) { const a = -Math.PI * 0.85 + i * Math.PI * 0.14; x.beginPath(); x.moveTo(32, 56); x.lineTo(32 + Math.cos(a) * 44, 56 + Math.sin(a) * 44); x.stroke(); }
      break;
    }
    case 'puppet': {
      x.fillStyle = col; x.fillRect(22, 26, 20, 22); x.strokeRect(22, 26, 20, 22);
      x.beginPath(); x.arc(32, 18, 9, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillRect(14, 28, 6, 18); x.strokeRect(14, 28, 6, 18); x.fillRect(44, 28, 6, 18); x.strokeRect(44, 28, 6, 18);
      x.fillRect(24, 48, 6, 12); x.strokeRect(24, 48, 6, 12); x.fillRect(34, 48, 6, 12); x.strokeRect(34, 48, 6, 12);
      x.fillStyle = '#40c0ff'; x.beginPath(); x.arc(29, 17, 2, 0, Math.PI * 2); x.arc(35, 17, 2, 0, Math.PI * 2); x.fill();
      break;
    }
    case 'beast': {
      x.fillStyle = col;
      x.beginPath(); x.ellipse(32, 40, 12, 10, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      for (const [px, py] of [[18, 26], [28, 18], [38, 18], [47, 26]]) { x.beginPath(); x.arc(px, py, 6, 0, Math.PI * 2); x.fill(); x.stroke(); }
      break;
    }
    case 'pearl': {
      const g = x.createRadialGradient(26, 26, 2, 32, 32, 18); g.addColorStop(0, '#fff'); g.addColorStop(1, col);
      x.fillStyle = g; x.beginPath(); x.arc(32, 32, 16, 0, Math.PI * 2); x.fill(); x.stroke();
      break;
    }
    case 'manual': {
      x.fillStyle = '#e8dcc0'; x.fillRect(14, 12, 36, 42); x.strokeRect(14, 12, 36, 42);
      x.fillStyle = col; x.fillRect(14, 12, 8, 42); x.strokeRect(14, 12, 8, 42);
      x.fillStyle = '#fff8e8'; x.fillRect(28, 18, 14, 22); x.strokeStyle = '#333'; x.lineWidth = 1.5; x.strokeRect(28, 18, 14, 22);
      x.beginPath(); x.moveTo(35, 22); x.lineTo(35, 36); x.stroke();
      break;
    }
    case 'yaodan': {
      const g = x.createRadialGradient(28, 28, 2, 32, 32, 16); g.addColorStop(0, '#fff'); g.addColorStop(0.4, col); g.addColorStop(1, shade(col, 0.5));
      x.shadowColor = col; x.shadowBlur = 12;
      x.fillStyle = g; x.beginPath(); x.arc(32, 32, 14, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0; x.stroke();
      break;
    }
    case 'material': {
      x.fillStyle = col; x.beginPath(); x.moveTo(14, 44); x.lineTo(22, 20); x.lineTo(40, 14); x.lineTo(52, 30); x.lineTo(44, 50); x.lineTo(24, 54); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.moveTo(22, 22); x.lineTo(38, 17); x.lineTo(30, 32); x.closePath(); x.fill();
      break;
    }
    case 'bamboo': {
      for (const bx of [24, 38]) { x.fillStyle = col; x.fillRect(bx - 4, 8, 9, 50); x.strokeRect(bx - 4, 8, 9, 50); x.beginPath(); x.moveTo(bx - 4, 24); x.lineTo(bx + 5, 24); x.moveTo(bx - 4, 40); x.lineTo(bx + 5, 40); x.stroke(); }
      break;
    }
    case 'bag': {
      x.fillStyle = col; x.beginPath(); x.moveTo(22, 22); x.quadraticCurveTo(8, 50, 20, 56); x.lineTo(44, 56); x.quadraticCurveTo(56, 50, 42, 22); x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = '#c9a64a'; x.lineWidth = 3; x.beginPath(); x.moveTo(20, 22); x.lineTo(44, 22); x.stroke();
      x.fillStyle = '#c9a64a'; x.beginPath(); x.arc(32, 38, 5, 0, Math.PI * 2); x.fill();
      break;
    }
    case 'bottle': {
      x.fillStyle = '#4fd07a'; x.beginPath(); x.moveTo(26, 12); x.lineTo(38, 12); x.lineTo(38, 22); x.quadraticCurveTo(52, 32, 46, 52); x.lineTo(18, 52); x.quadraticCurveTo(12, 32, 26, 22); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(22, 28, 4, 14);
      x.strokeStyle = '#2a6a3a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(20, 36); x.quadraticCurveTo(32, 30, 44, 36); x.stroke();
      break;
    }
    case 'lingshi': {
      x.fillStyle = '#9fe0f0'; x.beginPath(); x.moveTo(32, 8); x.lineTo(46, 26); x.lineTo(32, 56); x.lineTo(18, 26); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.moveTo(32, 12); x.lineTo(40, 26); x.lineTo(32, 26); x.closePath(); x.fill();
      break;
    }
    default: {
      x.fillStyle = col; x.beginPath(); x.arc(32, 32, 14, 0, Math.PI * 2); x.fill(); x.stroke();
    }
  }
  iconCanvasCache.set(key, c);
  return c;
}

const HERB_COLORS: Record<string, string> = { qinglingcao: '#7fd0a0', zhixuecao: '#e05050', huangyahua: '#f0d040', lingzhi: '#a060d0', huangjingzhi: '#d0a040', jinsuicao: '#f0c860', nishangcao: '#f090c0', zihouhua: '#b050e0', tianlingguo: '#f07030', chijingzhi: '#e03030', xuehuncao: '#a01818', yangshenhua: '#80c0ff', lingzhuguo: '#ffa030', longlinguo: '#40d0b0', jiuqulingshen: '#f8e8b0' };

export function iconKindFor(id: string): [string, string] {
  const d = item(id);
  if (!d) return ['material', '#999'];
  if (id === 'zhangtianping') return ['bottle', '#4fd07a'];
  if (id === 'jinleizhu') return ['bamboo', '#d8c060'];
  if (d.type === 'herb') return ['herb', HERB_COLORS[id] || '#8c8'];
  if (d.type === 'pill') { const cols = ['#e8e0c8', '#7fd0a0', '#70b0f0', '#c080f0', '#f0a040', '#ff5040']; return ['pill', cols[d.rarity] || '#fff']; }
  if (d.type === 'talisman') return ['talisman', '#c02020'];
  if (d.type === 'manual') return ['manual', ['#888', '#4a7a4a', '#3a5a8a', '#6a3a8a', '#a06020', '#a02020'][d.rarity]];
  if (d.type === 'bag') return ['bag', '#7a5a3a'];
  if (d.type === 'misc') return [id === 'danlu' ? 'cauldron' : 'material', id === 'danlu' ? '#8a6a3a' : '#c9a64a'];
  if (d.type === 'material') { if (id.startsWith('yd')) return ['yaodan', ['#fff', '#a0e0a0', '#80c0ff', '#c080ff', '#ffb040', '#ff5050'][d.rarity]]; return ['material', ['#a89880', '#c0b090', '#80a0c0', '#a080c0', '#e0a040', '#ff6040'][d.rarity]]; }
  if (d.art) { const col = '#' + (d.art.color ?? 0xcccccc).toString(16).padStart(6, '0'); return [d.art.kind as string, col]; }
  return ['material', '#aaa'];
}

export function iconURL(id: string): string {
  const key = 'u_' + id;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const [k, col] = iconKindFor(id);
  const d = item(id);
  const url = drawIcon(k, col, d?.rarity ?? 1).toDataURL();
  iconCache.set(key, url);
  return url;
}

// ---------------- 特效贴图 ----------------
export function fxTextures(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};
  { const c = cv(64, 64), x = c.getContext('2d')!; const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); out.glow = c; }
  { const c = cv(16, 16), x = c.getContext('2d')!; const g = x.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 16, 16); out.spark = c; }
  { const c = cv(48, 12), x = c.getContext('2d')!; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(48, 6); x.lineTo(34, 1); x.lineTo(6, 3); x.lineTo(0, 6); x.lineTo(6, 9); x.lineTo(34, 11); x.closePath(); x.fill(); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(4, 5, 30, 2); out.flysword = c; }
  { const c = cv(32, 6), x = c.getContext('2d')!; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 3); x.lineTo(0, 0); x.lineTo(0, 6); x.closePath(); x.fill(); out.needle = c; }
  { const c = cv(32, 32), x = c.getContext('2d')!; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(16, 16, 14, 7, 0.6, 0, Math.PI * 2); x.fill(); out.petal = c; }
  { const c = cv(40, 20), x = c.getContext('2d')!; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(40, 10); x.lineTo(0, 0); x.lineTo(8, 10); x.lineTo(0, 20); x.closePath(); x.fill(); out.shard = c; }
  { const c = cv(128, 128), x = c.getContext('2d')!; x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.22)'; x.fill(); out.tele = c; }
  { const c = cv(128, 64), x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.strokeStyle = g; x.lineWidth = 10; x.beginPath(); x.arc(20, 64, 100, -0.6, 0.0); x.stroke(); out.slash = c; }
  { const c = cv(64, 64), x = c.getContext('2d')!; x.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const a = Math.random() * 6.28, r = 8 + Math.random() * 18; x.beginPath(); x.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3 + Math.random() * 7, 0, Math.PI * 2); x.fill(); } x.beginPath(); x.arc(32, 32, 14, 0, Math.PI * 2); x.fill(); out.ink = c; }
  { const c = cv(64, 24), x = c.getContext('2d')!; x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(32, 12, 30, 10, 0, 0, Math.PI * 2); x.fill(); out.shadow = c; }
  { const c = cv(24, 24), x = c.getContext('2d')!; x.fillStyle = '#fff'; x.beginPath(); x.arc(12, 12, 9, 0, Math.PI * 2); x.fill(); out.dot = c; }
  { const c = cv(64, 64), x = c.getContext('2d')!; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(32, 0); for (let i = 1; i <= 8; i++) x.lineTo(32 + (Math.random() - 0.5) * 22, i * 8); x.stroke(); out.bolt = c; }
  { const c = cv(96, 96), x = c.getContext('2d')!; x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(48, 48, 40, 0, Math.PI * 2); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(48, 48, 30, 0, Math.PI * 2); x.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(48 + Math.cos(a) * 30, 48 + Math.sin(a) * 30); x.lineTo(48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40); x.stroke(); } out.rune = c; }
  return out;
}

// 地图标记
export function drawMarker(type: string): HTMLCanvasElement {
  const c = cv(96, 96); const x = c.getContext('2d')!;
  x.lineJoin = 'round'; x.strokeStyle = INK; x.lineWidth = 3;
  const roof = (cx: number, cy: number, w: number, col: string) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(cx - w * 0.62, cy); x.quadraticCurveTo(cx, cy - w * 0.32, cx + w * 0.62, cy); x.lineTo(cx + w * 0.45, cy - w * 0.12); x.quadraticCurveTo(cx, cy - w * 0.45, cx - w * 0.45, cy - w * 0.12); x.closePath(); x.fill(); x.stroke();
  };
  const wall = (cx: number, cy: number, w: number, h: number) => { x.fillStyle = '#efe6d0'; x.fillRect(cx - w / 2, cy, w, h); x.strokeRect(cx - w / 2, cy, w, h); x.fillStyle = '#8a3a2a'; x.fillRect(cx - w * 0.12, cy + h * 0.35, w * 0.24, h * 0.65); };
  x.fillStyle = 'rgba(30,25,20,0.2)'; x.beginPath(); x.ellipse(48, 86, 36, 7, 0, 0, Math.PI * 2); x.fill();
  if (type === 'city') {
    x.fillStyle = '#b8a888'; x.fillRect(10, 56, 76, 28); x.strokeRect(10, 56, 76, 28);
    for (let i = 0; i < 7; i++) { x.fillRect(10 + i * 11, 50, 7, 7); x.strokeRect(10 + i * 11, 50, 7, 7); }
    wall(48, 38, 30, 20); roof(48, 38, 40, '#3a4a5a'); roof(48, 24, 28, '#3a4a5a');
    x.fillStyle = '#5a3a2a'; x.fillRect(42, 68, 12, 16);
  } else if (type === 'town') {
    wall(32, 56, 26, 24); roof(32, 56, 36, '#4a5a5a'); wall(64, 50, 26, 30); roof(64, 50, 36, '#5a4a3a');
  } else if (type === 'village') {
    wall(48, 56, 30, 24); x.fillStyle = '#b8a060'; x.beginPath(); x.moveTo(26, 58); x.lineTo(48, 38); x.lineTo(70, 58); x.closePath(); x.fill(); x.stroke();
  } else if (type === 'sect') {
    x.fillStyle = '#d8d0b8'; x.fillRect(24, 74, 48, 8); x.strokeRect(24, 74, 48, 8);
    wall(48, 56, 30, 18); roof(48, 56, 44, '#2a5a4a'); wall(48, 38, 22, 14); roof(48, 38, 34, '#2a5a4a'); roof(48, 22, 24, '#2a5a4a');
    x.strokeStyle = '#c9a64a'; x.lineWidth = 3; x.beginPath(); x.moveTo(48, 6); x.lineTo(48, 14); x.stroke();
  } else if (type === 'danger') {
    const g = x.createRadialGradient(48, 52, 4, 48, 52, 40); g.addColorStop(0, 'rgba(160,20,20,0.7)'); g.addColorStop(1, 'rgba(60,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 96, 96);
    x.fillStyle = '#e8e0d0'; x.beginPath(); x.arc(48, 44, 18, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillRect(38, 56, 20, 12); x.strokeRect(38, 56, 20, 12);
    x.fillStyle = '#2a1a1a'; x.beginPath(); x.arc(41, 44, 5, 0, Math.PI * 2); x.arc(55, 44, 5, 0, Math.PI * 2); x.fill();
  } else if (type === 'secret') {
    for (let i = 0; i < 3; i++) { x.strokeStyle = ['rgba(120,60,200,0.8)', 'rgba(80,160,220,0.7)', 'rgba(200,200,255,0.8)'][i]; x.lineWidth = 5 - i; x.beginPath(); x.ellipse(48, 50, 34 - i * 9, 26 - i * 7, i * 0.6, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(48, 50, 6, 0, Math.PI * 2); x.fill();
  } else if (type === 'portal') {
    x.strokeStyle = 'rgba(60,140,200,0.9)'; x.lineWidth = 4; x.beginPath(); x.ellipse(48, 60, 34, 16, 0, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(200,230,255,0.9)'; x.lineWidth = 2; x.beginPath(); x.ellipse(48, 60, 24, 10, 0, 0, Math.PI * 2); x.stroke();
    x.fillStyle = 'rgba(160,220,255,0.35)'; x.fillRect(30, 20, 36, 40);
  } else if (type === 'event') {
    const g = x.createRadialGradient(48, 46, 4, 48, 46, 44); g.addColorStop(0, 'rgba(255,230,140,0.9)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    x.fillStyle = g; x.fillRect(0, 0, 96, 96);
    x.fillStyle = '#b8352b'; x.beginPath(); x.arc(48, 46, 24, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#5a1a14'; x.stroke();
    x.fillStyle = '#fff4e0'; x.font = 'bold 34px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 48, 48);
  }
  return c;
}
