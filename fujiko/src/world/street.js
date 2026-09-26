// 街道家具：巴黎路灯、莫里斯广告柱、吉马德地铁口、报亭、长椅、梧桐、华莱士饮水泉、红绿灯、自行车、隔离桩
import * as THREE from 'three';
import {
  ct, M, B, BX, C, plane, noOL, basic, glowMat, glass, PI, rr, ctx, sphere, lathe, tube, group,
  radialTex, softDotTex, FONT_SERIF, FONT_SANS, FONT_JP, fitText, keep, starPath,
} from '../core/helpers.js';
import { rand, rnd, pick } from '../core/rng.js';
import { SW_H, METRO, HALF } from './layout.js';
import { TREE_SPOTS } from './ground.js';
import { railTex } from './haussmann.js';

export const street = { lamps: [], traffic: null, water: [] };

const IRON_GREEN = 0x1f3a2e;
const lanternM = noOL(basic(0xffe0a6, { side: THREE.DoubleSide }));

export function buildStreet(scene) {
  // ---------- 路灯 ----------
  [[-10.6, 1.05], [-2.4, 1.05], [3.85, -5.6], [-3.0, 8.55], [8.9, 8.55], [10.45, -6.6], [3.9, -10.9]].forEach(([x, z]) => lamppost(x, z));

  // ---------- 隔离桩 ----------
  const bollard = (x, z) => {
    const m = M(0x3b2a22);
    C(0.055, 0.065, 0.62, x, SW_H, z, m, null, 8);
    sphere(0.06, x, SW_H + 0.64, z, m, null, 8, 6);
    C(0.075, 0.075, 0.05, x, SW_H + 0.5, z, M(0xc9a45c), null, 8);
  };
  for (let x = -0.9; x <= 3.9; x += 0.8) bollard(x, 1.2);
  for (let z = -1.6; z >= -4.8; z -= 0.8) bollard(4.0, z);
  for (let x = -1.2; x <= 5.2; x += 1.6) if (x < METRO.x1 - 0.3 || x > METRO.x2 + 0.3) bollard(x, 8.25);

  // ---------- 行道树 ----------
  TREE_SPOTS.forEach(([x, z], i) => planeTree(x, z, i === 0 ? 0.85 : 1.0));

  // ---------- 莫里斯广告柱 ----------
  morrisColumn(-4.9, 10.45);
  // ---------- 地铁口 ----------
  metroEntrance(scene);
  // ---------- 报亭 ----------
  kiosk(-10.1, 10.35);
  // ---------- 长椅 ----------
  bench(-0.6, 11.25, PI);
  bench(9.0, 11.25, PI);
  bench(11.3, -1.2, -PI / 2);
  // ---------- 华莱士饮水泉 ----------
  wallaceFountain(11.0, 9.3);
  // ---------- 红绿灯 ----------
  trafficLight(4.05, 1.25);
  // ---------- 自行车（车筐里有法棍） ----------
  bicycle(-1.55, 1.0, 0.05);
  // ---------- 垃圾袋架 ----------
  binHolder(-3.4, 1.15);
  binHolder(10.6, -8.0);
  // ---------- 后巷：垃圾桶、木箱 ----------
  const binM = M(0x2e6a47), lidM = M(0x3a8a5a);
  [[-2.2, -9.6], [-1.4, -9.6]].forEach(([x, z]) => {
    BX(x - 0.3, x + 0.3, 0.02, 0.95, z - 0.3, z + 0.3, binM);
    BX(x - 0.32, x + 0.32, 0.95, 1.02, z - 0.34, z + 0.32, lidM);
  });
  BX(-4.6, -3.9, 0.02, 0.5, -9.8, -9.2, M(0x9a7040));
  BX(-4.5, -4.0, 0.5, 0.9, -9.7, -9.3, M(0xa87a48));
}

// ================================================================ 路灯
function lamppost(x, z, h = 3.9) {
  const g = group(x, SW_H, z, 0);
  const iron = M(IRON_GREEN);
  C(0.17, 0.2, 0.12, 0, 0, 0, iron, g, 10);
  C(0.12, 0.17, 0.45, 0, 0.12, 0, iron, g, 10);
  C(0.15, 0.15, 0.05, 0, 0.57, 0, iron, g, 10);
  C(0.045, 0.068, h - 1.05, 0, 0.62, 0, iron, g, 8);
  C(0.08, 0.05, 0.12, 0, h - 0.43, 0, iron, g, 8);
  // 灯笼
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.12, 0.46, 4, 1, true), lanternM);
  lan.rotation.y = PI / 4; lan.position.y = h - 0.08; g.add(lan);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.24, 4), iron);
  cap.rotation.y = PI / 4; cap.position.y = h + 0.27; g.add(cap);
  C(0.24, 0.24, 0.04, 0, h + 0.13, 0, iron, g, 4).rotation.y = PI / 4;
  C(0.12, 0.09, 0.05, 0, h - 0.34, 0, iron, g, 4).rotation.y = PI / 4;
  sphere(0.035, 0, h + 0.43, 0, iron, g, 6, 5);
  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + (i * PI) / 2 + PI / 4;
    tube([Math.cos(a) * 0.12, h - 0.31, Math.sin(a) * 0.12], [Math.cos(a) * 0.21, h + 0.15, Math.sin(a) * 0.21], 0.012, iron, g, 4);
  }
  street.lamps.push({ x, z, y: SW_H + h - 0.08 });
}

// ================================================================ 梧桐
const barkTex = ct(128, 256, (g, w, h) => {
  g.fillStyle = '#b7ad86'; g.fillRect(0, 0, w, h);
  const cols = ['#8b8a5e', '#d8cfa6', '#6f6d4a', '#c9c08f', '#9da070'];
  for (let i = 0; i < 70; i++) {
    g.fillStyle = pick(cols);
    g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(6, 18), rand(8, 26), rand(0, PI), 0, 2 * PI); g.fill();
  }
}, { repeat: [1, 1] });
function planeTree(x, z, s = 1) {
  const g = group(x, SW_H, z, rand(0, PI * 2));
  const bark = M(0xffffff, { map: barkTex });
  C(0.12 * s, 0.17 * s, 2.5 * s, 0, 0, 0, bark, g, 9);
  const forks = [[0.75, 3.5, 0.3], [-0.6, 3.6, 0.45], [0.1, 3.8, -0.7], [-0.2, 3.3, 0.1]];
  forks.forEach(([fx, fy, fz]) => tube([0, 2.3 * s, 0], [fx * s, fy * s, fz * s], 0.07 * s, bark, g, 6, 0.04 * s));
  const leafA = M(0x2c5a3c), leafB = M(0x3d7348), leafC = M(0x24493a);
  const blobs = [[0, 4.3, 0, 1.25], [0.9, 3.9, 0.4, 0.9], [-0.9, 4.0, 0.3, 0.95], [0.2, 3.9, -0.95, 0.9], [-0.3, 4.9, -0.2, 0.85], [0.5, 4.7, 0.7, 0.8], [-0.6, 3.6, -0.6, 0.75]];
  blobs.forEach(([bx, by, bz, r], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), [leafA, leafB, leafC][i % 3]);
    m.position.set(bx * s, by * s, bz * s); m.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(m);
  });
  // 树干护栏
  const iron = M(IRON_GREEN);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    tube([Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], [Math.cos(a) * 0.3, 1.0, Math.sin(a) * 0.3], 0.014, iron, g, 4);
  }
  [0.35, 1.0].forEach((y, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(i ? 0.3 : 0.35, 0.02, 4, 20), iron);
    r.rotation.x = PI / 2; r.position.y = y; g.add(r);
  });
}

// ================================================================ 莫里斯柱
function morrisColumn(x, z) {
  const g = group(x, SW_H, z, 0.35);
  const green = M(0x24473a);
  C(0.64, 0.68, 0.34, 0, 0, 0, green, g, 20);
  C(0.6, 0.6, 0.08, 0, 0.34, 0, M(0x1a3329), g, 20);
  const posterTex = ct(2048, 680, (g2, w, h) => {
    g2.fillStyle = '#e8e0cc'; g2.fillRect(0, 0, w, h);
    const W = w / 5;
    posterEtoile(g2, 0, 0, W, h);
    posterWanted(g2, W, 0, W, h);
    posterJazz(g2, W * 2, 0, W, h);
    posterCarmen(g2, W * 3, 0, W, h);
    posterCirque(g2, W * 4, 0, W, h);
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.3, 28, 1, true), M(0xffffff, { map: posterTex }));
  body.position.y = 0.42 + 1.15; g.add(body);
  C(0.66, 0.6, 0.14, 0, 2.72, 0, green, g, 20);
  const dome = lathe([[0.68, 0], [0.64, 0.1], [0.52, 0.3], [0.32, 0.48], [0.14, 0.58], [0.1, 0.72], [0.14, 0.78], [0, 0.82]], green, g, 20);
  dome.position.y = 2.86;
  // 顶部小铸铁装饰
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    sphere(0.05, Math.cos(a) * 0.63, 2.94, Math.sin(a) * 0.63, M(0xc9a45c), g, 6, 5);
  }
  street.morris = { g, pos: new THREE.Vector3(x, SW_H + 1.6, z) };
}
function posterEtoile(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, '#0e1f4d'); gr.addColorStop(1, '#1c3f8f');
  g.fillStyle = gr; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  g.fillStyle = '#fff6da'; g.textAlign = 'center';
  // 钻石
  const cx = x + w / 2, cy = y + 250;
  g.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 16; i++) { g.save(); g.translate(cx, cy); g.rotate((i / 16) * PI * 2); g.fillRect(-2, 0, 4, 190); g.restore(); }
  g.fillStyle = '#e8f4ff';
  g.beginPath(); g.moveTo(cx - 90, cy - 40); g.lineTo(cx - 50, cy - 90); g.lineTo(cx + 50, cy - 90); g.lineTo(cx + 90, cy - 40); g.lineTo(cx, cy + 90); g.closePath(); g.fill();
  g.strokeStyle = '#7fa6d8'; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.moveTo(cx - 90, cy - 40); g.lineTo(cx + 90, cy - 40); g.moveTo(cx - 50, cy - 90); g.lineTo(cx - 25, cy - 40); g.lineTo(cx, cy + 90); g.lineTo(cx + 25, cy - 40); g.lineTo(cx + 50, cy - 90); g.stroke();
  g.fillStyle = '#e2b964';
  g.font = `700 48px ${FONT_SERIF}`; g.fillText('L\u2019ÉTOILE', cx, y + 440);
  g.font = `700 40px ${FONT_SERIF}`; g.fillText('DE PARIS', cx, y + 490);
  g.fillStyle = '#fff6da'; g.font = `italic 26px ${FONT_SERIF}`;
  g.fillText('Exposition exceptionnelle', cx, y + 545);
  g.fillText('Maison Étoile · 102 carats', cx, y + 585);
  g.font = `600 22px ${FONT_SERIF}`; g.fillText('JUSQU\u2019AU 26 SEPT.', cx, y + 630);
}
function posterWanted(g, x, y, w, h) {
  g.fillStyle = '#e9d7a6'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  g.strokeStyle = '#6a4a22'; g.lineWidth = 6; g.strokeRect(x + 24, y + 24, w - 48, h - 48);
  g.fillStyle = '#3a2410'; g.textAlign = 'center';
  const cx = x + w / 2;
  g.font = `900 78px ${FONT_SERIF}`; g.fillText('WANTED', cx, y + 110);
  // 人像剪影：尖下巴、鬓角、红西装
  g.fillStyle = '#c8252f';
  g.beginPath(); g.moveTo(cx - 120, y + 470); g.quadraticCurveTo(cx, y + 360, cx + 120, y + 470); g.lineTo(cx + 120, y + 480); g.lineTo(cx - 120, y + 480); g.fill();
  g.fillStyle = '#1d6fa3'; g.beginPath(); g.moveTo(cx - 20, y + 392); g.lineTo(cx + 20, y + 392); g.lineTo(cx, y + 470); g.fill();
  g.fillStyle = '#f2c9a0'; g.beginPath(); g.ellipse(cx, y + 300, 58, 78, 0, 0, 2 * PI); g.fill();
  g.fillStyle = '#1b1210';
  g.beginPath(); g.ellipse(cx, y + 250, 66, 44, 0, PI, 2 * PI); g.fill();
  g.fillRect(cx - 64, y + 250, 16, 70); g.fillRect(cx + 48, y + 250, 16, 70);
  g.beginPath(); g.moveTo(cx - 30, y + 360); g.quadraticCurveTo(cx, y + 385, cx + 34, y + 350); g.lineWidth = 5; g.strokeStyle = '#1b1210'; g.stroke();
  g.fillStyle = '#3a2410';
  g.font = `800 50px ${FONT_SERIF}`; g.fillText('LUPIN III', cx, y + 545);
  g.font = `600 24px ${FONT_SERIF}`; g.fillText('RÉCOMPENSE : 1 000 000 F', cx, y + 590);
  g.font = `italic 20px ${FONT_SERIF}`; g.fillText('Interpol — Insp. Zenigata', cx, y + 630);
}
function posterJazz(g, x, y, w, h) {
  g.fillStyle = '#e8792b'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  g.fillStyle = '#141014'; g.textAlign = 'center';
  const cx = x + w / 2;
  g.font = `900 110px ${FONT_SERIF}`; g.fillText('JAZZ', cx, y + 150);
  g.save(); g.translate(cx, y + 360); g.rotate(-0.4);
  g.fillRect(-12, -150, 24, 230); g.beginPath(); g.ellipse(22, 90, 48, 34, 0.4, 0, 2 * PI); g.fill();
  g.beginPath(); g.moveTo(-12, -150); g.lineTo(-60, -190); g.lineTo(-54, -200); g.lineTo(0, -160); g.fill();
  g.restore();
  g.font = `italic 700 34px ${FONT_SERIF}`; g.fillText('Saint-Germain', cx, y + 560);
  g.font = `600 24px ${FONT_SERIF}`; g.fillText('NUIT DU 26 SEPTEMBRE', cx, y + 610);
}
function posterCarmen(g, x, y, w, h) {
  g.fillStyle = '#9c1026'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  const cx = x + w / 2;
  g.fillStyle = '#1a0a0e';
  for (let i = 0; i < 9; i++) { g.save(); g.translate(cx, y + 380); g.rotate(-PI / 2 + (i - 4) * 0.2); g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, -200); g.lineTo(18, -200); g.fill(); g.restore(); }
  g.fillStyle = '#f5e0b0'; g.textAlign = 'center';
  g.font = `italic 900 84px ${FONT_SERIF}`; g.fillText('Carmen', cx, y + 520);
  g.font = `600 26px ${FONT_SERIF}`; g.fillText('OPÉRA · BIZET', cx, y + 575);
}
function posterCirque(g, x, y, w, h) {
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#f2e6c8' : '#2a4a9a'; g.fillRect(x + 8 + i * (w - 16) / 10, y + 8, (w - 16) / 10, h - 16); }
  g.fillStyle = '#f2e6c8'; g.fillRect(x + 40, y + 200, w - 80, 240);
  g.fillStyle = '#b81c2c'; g.textAlign = 'center';
  g.font = `900 56px ${FONT_SERIF}`; g.fillText('CIRQUE', x + w / 2, y + 290);
  g.font = `900 48px ${FONT_SERIF}`; g.fillText('D\u2019HIVER', x + w / 2, y + 350);
  g.font = `italic 24px ${FONT_SERIF}`; g.fillStyle = '#2a4a9a'; g.fillText('Clowns · Lions · Trapèze', x + w / 2, y + 405);
}

// ================================================================ 吉马德地铁口
function metroEntrance(scene) {
  const { x1, x2, z1, z2, depth } = METRO;
  const tileTex = ct(128, 128, (g) => {
    g.fillStyle = '#d9dde2'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const ox = (y % 2) * 16;
      const gr = g.createLinearGradient(0, y * 16, 0, y * 16 + 16);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c5cad2');
      g.fillStyle = gr; rr(g, x * 32 + ox + 1, y * 16 + 1, 30, 14, 5); g.fill();
    }
  }, { repeat: [1, 1] });
  const tileM = M(0xffffff, { map: tileTex, side: THREE.DoubleSide });
  const yT = SW_H, yB = -depth;
  // 四面内墙
  const wall = (w, h, x, y, z, ry) => { const p = plane(w, h, tileM); p.position.set(x, y, z); p.rotation.y = ry; };
  wall(x2 - x1, yT - yB, (x1 + x2) / 2, (yT + yB) / 2, z1 + 0.001, 0);
  wall(x2 - x1, yT - yB, (x1 + x2) / 2, (yT + yB) / 2, z2 - 0.001, PI);
  wall(z2 - z1, yT - yB, x1 + 0.001, (yT + yB) / 2, (z1 + z2) / 2, PI / 2);
  wall(z2 - z1, yT - yB, x2 - 0.001, (yT + yB) / 2, (z1 + z2) / 2, -PI / 2);
  // 楼梯：从 z2（高）往 z1（低）
  const steps = 10, landing = 0.45;
  const run = (z2 - z1 - landing) / steps;
  const stepM = M(0x8d8f96);
  for (let i = 0; i < steps; i++) {
    const top = yT - ((i + 1) / steps) * (yT - yB);
    const za = z2 - i * run, zb = za - run;
    BX(x1, x2, yB - 0.02, top, zb, za, stepM);
  }
  BX(x1, x2, yB - 0.05, yB, z1, z1 + landing, stepM);
  // 底部：通往站台的门洞（暖光）
  const door = plane(0.9, 1.0, noOL(basic(0xffc978)));
  door.position.set((x1 + x2) / 2, yB + 0.5, z1 + 0.004);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xffb860, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(2.2, 1.8, 1); halo.position.set((x1 + x2) / 2, yB + 0.6, z1 + 0.3); keep(halo); ctx.parent.add(halo);
  // 小标牌
  const mTex = ct(128, 128, (g) => {
    g.fillStyle = '#f5c518'; g.beginPath(); g.arc(64, 64, 60, 0, 2 * PI); g.fill();
    g.fillStyle = '#1c2a55'; g.font = `800 84px ${FONT_SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', 64, 70);
  });
  const mSign = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), noOL(basic(0xffffff, { map: mTex })));
  mSign.position.set((x1 + x2) / 2 + 0.62, yB + 0.72, z1 + 0.006); ctx.parent.add(mSign);

  // 绿色铸铁栏杆（三面）
  const railG = noOL(M(0x2f6a4c, { map: railTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  const rail = (len, x, z, ry) => {
    const geo = new THREE.PlaneGeometry(len, 0.82);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 0.7));
    const m = new THREE.Mesh(geo, railG); m.position.set(x, SW_H + 0.41, z); m.rotation.y = ry; ctx.parent.add(m);
  };
  const gM = M(0x2f6a4c);
  rail(z2 - z1, x1 - 0.03, (z1 + z2) / 2, PI / 2);
  rail(z2 - z1, x2 + 0.03, (z1 + z2) / 2, PI / 2);
  rail(x2 - x1, (x1 + x2) / 2, z1 - 0.03, 0);
  BX(x1 - 0.06, x1, SW_H + 0.8, SW_H + 0.86, z1 - 0.06, z2, gM);
  BX(x2, x2 + 0.06, SW_H + 0.8, SW_H + 0.86, z1 - 0.06, z2, gM);
  BX(x1 - 0.06, x2 + 0.06, SW_H + 0.8, SW_H + 0.86, z1 - 0.06, z1, gM);
  // 吉马德拱门：两根藤蔓般弯曲的柱子 + 橙色"眼睛"灯 + METROPOLITAIN 招牌
  const stem = (sx, dir) => {
    const pts = [
      new THREE.Vector3(sx, SW_H, z2 + 0.05),
      new THREE.Vector3(sx, SW_H + 1.0, z2 + 0.05),
      new THREE.Vector3(sx + dir * 0.05, SW_H + 2.0, z2 + 0.05),
      new THREE.Vector3(sx + dir * 0.18, SW_H + 2.55, z2 + 0.05),
      new THREE.Vector3(sx + dir * 0.34, SW_H + 2.72, z2 + 0.05),
      new THREE.Vector3(sx + dir * 0.46, SW_H + 2.62, z2 + 0.05),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.045, 7), gM); ctx.parent.add(m);
    C(0.09, 0.1, 0.3, sx, SW_H, z2 + 0.05, gM, null, 8);
    const lampM = noOL(basic(0xff9a3a));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), lampM);
    lamp.scale.set(0.8, 1.35, 0.8); lamp.position.set(sx + dir * 0.46, SW_H + 2.46, z2 + 0.05); ctx.parent.add(lamp);
    const h2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xff8a2a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    h2.scale.set(1.1, 1.1, 1); h2.position.copy(lamp.position); keep(h2); ctx.parent.add(h2);
    street.lamps.push({ x: lamp.position.x, z: lamp.position.z, y: lamp.position.y, color: 0xff9a3a, small: true });
  };
  stem(x1 - 0.1, 1);
  stem(x2 + 0.1, -1);
  const signTex = ct(1024, 160, (g, w, h) => {
    g.fillStyle = '#e9dca0'; rr(g, 0, 0, w, h, 30); g.fill();
    g.fillStyle = '#2e5f45'; rr(g, 10, 10, w - 20, h - 20, 24); g.fill();
    g.fillStyle = '#f3e2a2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'MÉTROPOLITAIN', w - 90, 92, FONT_SERIF, '700');
    g.save(); g.translate(w / 2, h / 2 + 4); g.scale(1, 1.15); g.fillText('MÉTROPOLITAIN', 0, 0); g.restore();
  });
  const sign = plane(1.55, 0.26, noOL(basic(0xf0f0f0, { map: signTex, side: THREE.DoubleSide })));
  sign.position.set((x1 + x2) / 2, SW_H + 2.18, z2 + 0.05);
  BX(x1 + 0.05, x2 - 0.05, SW_H + 2.02, SW_H + 2.05, z2 + 0.03, z2 + 0.07, gM);
  street.metro = { pos: new THREE.Vector3((x1 + x2) / 2, SW_H + 2.2, z2) };
}

// ================================================================ 报亭
function kiosk(x, z) {
  const g = group(x, SW_H, z, 0.2);
  const green = M(0x1f4a38);
  const n = 8, r = 0.72;
  const posters = ct(1024, 256, (g2, w, h) => {
    g2.fillStyle = '#1f4a38'; g2.fillRect(0, 0, w, h);
    const heads = [
      ['LE MATIN', '« L\u2019Étoile » volée !', '#f1ece0'], ['PARIS SOIR', 'Une femme sur les toits', '#f6e7b8'],
      ['L\u2019ÉCHO', 'Interpol à Paris', '#e8ecf0'], ['MODE', 'Le rouge de l\u2019automne', '#f3d3d8'],
      ['JAZZ HEBDO', 'Nuit blanche', '#f0e0c0'], ['LE MATIN', 'Lupin encore ?', '#f1ece0'],
      ['CINÉ', 'La femme fatale', '#e8e0f0'], ['SPORT', 'PSG · OM', '#e0f0e8'],
    ];
    heads.forEach(([t, s, c], i) => {
      const px = i * (w / 8) + 8, pw = w / 8 - 16;
      g2.fillStyle = c; g2.fillRect(px, 20, pw, h - 40);
      g2.fillStyle = '#1b1b22'; g2.textAlign = 'center';
      fitText(g2, t, pw - 10, 26, FONT_SERIF, '900'); g2.fillText(t, px + pw / 2, 56);
      g2.fillStyle = i === 3 ? '#c8102e' : '#333';
      g2.fillRect(px + 10, 72, pw - 20, 80);
      g2.fillStyle = '#1b1b22'; fitText(g2, s, pw - 12, 16, FONT_SERIF, 'italic 700'); g2.fillText(s, px + pw / 2, 180);
    });
  });
  C(r, r, 0.3, 0, 0, 0, green, g, n);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.02, r - 0.02, 1.5, n, 1, true), M(0xffffff, { map: posters }));
  body.position.y = 0.3 + 0.75; g.add(body);
  C(r + 0.08, r, 0.2, 0, 1.8, 0, green, g, n);
  const bandTex = ct(1024, 64, (g2, w, h) => {
    g2.fillStyle = '#1f4a38'; g2.fillRect(0, 0, w, h);
    g2.fillStyle = '#e9d9a6'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.font = `700 34px ${FONT_SERIF}`;
    for (let i = 0; i < 4; i++) g2.fillText('JOURNAUX · PRESSE', (i + 0.5) * (w / 4), h / 2 + 2);
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.09, r + 0.09, 0.22, n, 1, true), M(0xffffff, { map: bandTex }));
  band.position.y = 2.1; g.add(band);
  const roof = lathe([[r + 0.28, 0], [r + 0.2, 0.08], [r * 0.7, 0.32], [0.3, 0.5], [0.12, 0.62], [0.08, 0.8], [0, 0.84]], green, g, n);
  roof.position.y = 2.21;
  sphere(0.07, 0, 3.08, 0, M(0xc9a45c), g, 8, 6);
  street.kiosk = { g };
}

// ================================================================ 长椅
function bench(x, z, ry) {
  const g = group(x, SW_H, z, ry);
  const slat = M(0x2f5e40), iron = M(0x1b1d24);
  [-0.72, 0.72].forEach((s) => {
    BX(s - 0.03, s + 0.03, 0, 0.44, -0.2, 0.2, iron, g);
    tube([s, 0.44, -0.2], [s, 0.9, -0.3], 0.025, iron, g, 5);
    tube([s, 0.62, 0.18], [s, 0.64, -0.2], 0.02, iron, g, 5);
  });
  for (let i = 0; i < 4; i++) BX(-0.85, 0.85, 0.42, 0.46, -0.19 + i * 0.1, -0.19 + i * 0.1 + 0.075, slat, g);
  for (let i = 0; i < 3; i++) {
    const b = BX(-0.85, 0.85, 0, 0.07, -0.02, 0.02, slat, g);
    b.position.set(0, 0.56 + i * 0.12, -0.23 - i * 0.025); b.rotation.x = -0.2;
  }
}

// ================================================================ 华莱士饮水泉
function wallaceFountain(x, z) {
  const g = group(x, SW_H, z, 0);
  const green = M(0x1d4a37);
  C(0.42, 0.48, 0.16, 0, 0, 0, green, g, 8);
  C(0.33, 0.38, 0.55, 0, 0.16, 0, green, g, 8);
  C(0.37, 0.37, 0.06, 0, 0.71, 0, green, g, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2 + PI / 4;
    const f = lathe([[0, 0], [0.075, 0], [0.085, 0.22], [0.055, 0.5], [0.07, 0.62], [0.042, 0.72], [0.05, 0.8], [0.034, 0.86], [0, 0.9]], green, g, 8);
    f.position.set(Math.cos(a) * 0.19, 0.77, Math.sin(a) * 0.19);
  }
  C(0.4, 0.4, 0.05, 0, 1.67, 0, green, g, 8);
  const dome = lathe([[0.4, 0], [0.37, 0.06], [0.3, 0.2], [0.18, 0.33], [0.07, 0.4], [0.035, 0.5], [0.05, 0.55], [0, 0.6]], green, g, 8);
  dome.position.y = 1.72;
  // 细细的水流
  const wm = noOL(new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.55, depthWrite: false }));
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 5), wm);
  w.position.y = 1.25; g.add(w); keep(w);
  street.water.push(w);
  street.wallace = { pos: new THREE.Vector3(x, SW_H + 1.2, z) };
}

// ================================================================ 红绿灯（巴黎那种小小的）
function trafficLight(x, z) {
  const g = group(x, SW_H, z, PI / 4);
  const pole = M(0x3a4a44);
  C(0.05, 0.06, 3.1, 0, 0, 0, pole, g, 8);
  BX(-0.15, 0.15, 2.45, 3.25, -0.12, 0.12, M(0x1f2522), g);
  const mk = (c) => noOL(basic(c));
  const off = [0x3a1010, 0x3a2a08, 0x0c2a14];
  const on = [0xff3a2a, 0xffb020, 0x3aff7a];
  const mats = off.map(mk);
  [3.05, 2.85, 2.65].forEach((y, i) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), mats[i]); d.position.set(0, y, 0.125); g.add(d);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12, 1, true, -PI / 2, PI), M(0x1f2522, { side: THREE.DoubleSide }));
    visor.rotation.x = PI / 2; visor.position.set(0, y + 0.01, 0.17); g.add(visor);
  });
  // 行人高度的小重复灯
  BX(-0.07, 0.07, 1.3, 1.7, 0.03, 0.14, M(0x1f2522), g);
  const small = off.map(mk);
  [1.62, 1.5, 1.38].forEach((y, i) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), small[i]); d.position.set(0, y, 0.145); g.add(d); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xff3a2a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.0, 1.0, 1); halo.position.set(0, 2.85, 0.2); g.add(halo);
  g.updateMatrixWorld(true);
  street.traffic = { mats, small, off, on, halo, g, state: -1 };
}

// ================================================================ 自行车 + 法棍
function bicycle(x, z, ry) {
  const g = group(x, SW_H, z, ry);
  g.rotation.x = 0.08;
  const frame = M(0x2a7f96), tire = M(0x16161a), chrome = M(0xc8ccd6);
  [-0.5, 0.5].forEach((wx) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 28), tire); w.position.set(wx, 0.32, 0); g.add(w);
    tube([wx, 0.32, -0.02], [wx, 0.32, 0.02], 0.02, chrome, g, 6);
  });
  const P = { rh: [-0.5, 0.32, 0], bb: [-0.05, 0.3, 0], st: [-0.2, 0.82, 0], hd: [0.36, 0.85, 0], fh: [0.5, 0.32, 0] };
  tube(P.rh, P.bb, 0.018, frame, g, 5); tube(P.bb, P.st, 0.02, frame, g, 5); tube(P.st, P.hd, 0.02, frame, g, 5);
  tube(P.bb, P.hd, 0.022, frame, g, 5); tube(P.rh, P.st, 0.016, frame, g, 5); tube(P.hd, P.fh, 0.018, chrome, g, 5);
  tube([-0.22, 0.82, 0], [-0.24, 0.92, 0], 0.014, chrome, g, 5);
  BX(-0.34, -0.14, 0.92, 0.96, -0.06, 0.06, M(0x3a2418), g);
  tube([0.36, 0.85, 0], [0.33, 0.98, 0], 0.014, chrome, g, 5);
  tube([0.33, 0.98, -0.24], [0.33, 0.98, 0.24], 0.014, chrome, g, 5);
  // 车筐
  const basket = M(0x9a6a38);
  BX(0.42, 0.72, 0.78, 0.8, -0.16, 0.16, basket, g);
  [[0.42, -0.16, 0.72, -0.16], [0.42, 0.16, 0.72, 0.16], [0.42, -0.16, 0.42, 0.16], [0.72, -0.16, 0.72, 0.16]].forEach(([ax, az, bx, bz]) => {
    for (let k = 0; k < 3; k++) tube([ax, 0.8 + k * 0.07, az], [bx, 0.8 + k * 0.07, bz], 0.008, basket, g, 4);
  });
  const bag = tube([0.5, 0.8, -0.05], [0.72, 1.28, 0.05], 0.045, M(0xd9a25a), g, 8);
  void bag;
  street.bike = { g };
}

function binHolder(x, z) {
  const pole = M(0x2f5a44);
  C(0.025, 0.025, 1.0, x, SW_H, z, pole, null, 6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 5, 18), pole);
  ring.rotation.x = PI / 2; ring.position.set(x, SW_H + 0.95, z + 0.22); ctx.parent.add(ring);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), noOL(new THREE.MeshBasicMaterial({ color: 0x9fd9a6, transparent: true, opacity: 0.45, depthWrite: false })));
  bag.scale.set(1, 1.5, 1); bag.position.set(x, SW_H + 0.66, z + 0.22); ctx.parent.add(bag);
}

// ================================================================ 动画
export function animateStreet(dt, t) {
  const T = street.traffic;
  if (T) {
    const c = t % 16;
    const s = c < 7 ? 2 : c < 9 ? 1 : 0; // 绿 → 黄 → 红
    if (s !== T.state) {
      T.state = s;
      for (let i = 0; i < 3; i++) {
        T.mats[i].color.setHex(i === s ? T.on[i] : T.off[i]);
        T.small[i].color.setHex(i === s ? T.on[i] : T.off[i]);
      }
      T.halo.material.color.setHex(T.on[s]);
      T.halo.position.y = [3.05, 2.85, 2.65][s];
      street.trafficColor = T.on[s];
    }
  }
  street.water.forEach((w) => { w.material.opacity = 0.4 + 0.2 * Math.sin(t * 17); w.scale.x = w.scale.z = 1 + 0.3 * Math.sin(t * 23); });
}
