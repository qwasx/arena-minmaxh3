// 隔壁咖啡馆「LE CHAT NOIR」：红色遮阳篷、露天座（椅子倒扣在桌上）、TABAC 菱形灯牌、小黑板
import * as THREE from 'three';
import {
  ct, M, B, BX, WB, C, plane, noOL, basic, glowMat, glass, PI, rr, ctx, prism, sphere, lathe, tube, group,
  radialTex, FONT_SERIF, FONT_SANS, fitText, keep,
} from '../core/helpers.js';
import { rand, rnd, pick } from '../core/rng.js';
import { CAFE, HC, SW_H } from './layout.js';
import { glassPanes } from '../core/registry.js';
import {
  stoneM, rusticM, trimM, trimDarkM, ironM, zincM, zincDarkM, plasterM, facadeFrame, stoneWindow,
  balconnet, cornice, stringCourse, insetPoly, slopeQuad, dormer, chimney,
} from './haussmann.js';

export const cafe = {};
const RED = 0x7a1a22;

export function buildCafe(scene) {
  const F = [[CAFE.x1, CAFE.z1], [CAFE.x2, CAFE.z1], [CAFE.x2, CAFE.z2], [CAFE.x1, CAFE.z2]];
  const frFront = facadeFrame(CAFE.x1, CAFE.z2, CAFE.x2, CAFE.z2);
  const frLeft = facadeFrame(CAFE.x1, CAFE.z1, CAFE.x1, CAFE.z2);
  const frBack = facadeFrame(CAFE.x2, CAFE.z1, CAFE.x1, CAFE.z1);
  const woodM = M(RED);
  const goldM = M(0xd4ae62);

  // 主体：上层实心，底层前 3 米是咖啡馆室内
  prism(F, HC.g1, HC.cornice, stoneM);
  WB(CAFE.x1, CAFE.x2, 0, HC.g1, CAFE.z1, -4, rusticM);
  WB(CAFE.x1, CAFE.x1 + 0.2, 0, HC.g1, -4, CAFE.z2, rusticM);
  WB(CAFE.x2 - 0.05, CAFE.x2, 0, HC.g1, -4, CAFE.z2, rusticM);

  // ---------- 室内 ----------
  const tileTex = ct(128, 128, (g) => {
    g.fillStyle = '#b8563a'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#6a2c1c'; g.lineWidth = 2;
    const r = 16, hh = r * Math.sqrt(3);
    for (let y = -1; y < 6; y++) for (let x = -1; x < 6; x++) {
      const cx = x * r * 3 + (y % 2 ? r * 1.5 : 0), cy = y * hh / 2;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = (k / 6) * 2 * PI; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.stroke();
    }
  }, { repeat: [1, 1] });
  prism([[CAFE.x1 + 0.2, -4], [CAFE.x2, -4], [CAFE.x2, CAFE.z2], [CAFE.x1 + 0.2, CAFE.z2]], 0.04, 0.13, M(0xffffff, { map: tileTex }));
  const ceil = plane(5.8, 3, noOL(M(0xe8d3aa))); ceil.rotation.x = PI / 2; ceil.position.set(-9, HC.g1 - 0.01, -2.5);
  // 吧台后墙：酒架
  const barTex = ct(512, 256, (g, w, h) => {
    g.fillStyle = '#3a1c14'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a3a22';
    [60, 120, 180].forEach((y) => g.fillRect(0, y, w, 8));
    const cols = ['#2f7a45', '#a8362c', '#e0c060', '#3a5fa0', '#d9d2c0', '#7a3a70', '#c8762c'];
    [60, 120, 180].forEach((y) => {
      for (let x = 10; x < w - 10; x += rand(14, 22)) {
        const bh = rand(26, 44), bw = rand(8, 12);
        g.fillStyle = pick(cols); g.fillRect(x, y - bh, bw, bh);
        g.fillRect(x + bw / 2 - 2, y - bh - 10, 4, 10);
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x + 2, y - bh + 4, 2, bh - 8);
      }
    });
    // 镜子 + 手写菜单
    g.fillStyle = 'rgba(190,200,210,0.55)'; g.fillRect(300, 196, 190, 56);
    g.fillStyle = '#fff'; g.font = `italic 22px ${FONT_SERIF}`; g.fillText('Café 2,50 · Kir 5 · Vin 6', 310, 232);
  });
  const barWall = plane(5.6, 3.7, noOL(M(0xffffff, { map: barTex })));
  barWall.position.set(-9, 1.95, -3.99);
  // 锌吧台
  BX(-11.4, -8.4, 0.13, 1.0, -3.7, -3.2, woodM);
  BX(-11.45, -8.35, 1.0, 1.06, -3.75, -3.15, M(0xb9c0cc));
  [-11.1, -10.4, -9.7, -9.0].forEach((x) => { C(0.12, 0.12, 0.04, x, 0.75, -2.95, M(0x2a1a14), null, 10); C(0.02, 0.02, 0.62, x, 0.13, -2.95, ironM, null, 6); });
  // 室内小圆桌
  [[-10.2, -1.9], [-8.2, -2.2], [-7.0, -1.8]].forEach(([x, z]) => bistroTable(x, z, false));
  // 吊灯
  [-10.5, -9, -7.5].forEach((x) => {
    tube([x, HC.g1, -2.4], [x, 3.1, -2.4], 0.01, ironM);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 12, 1, true), M(0x2f5a3a, { side: THREE.DoubleSide }));
    shade.position.set(x, 3.05, -2.4); ctx.parent.add(shade);
    sphere(0.06, x, 2.98, -2.4, noOL(basic(0xffe2a8)), null, 8, 6);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xffc27a, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(x, 2.95, -2.4); halo.scale.set(1.3, 1.3, 1); keep(halo); ctx.parent.add(halo);
  });

  // ---------- 底层立面 ----------
  {
    const fr = frFront, L = frFront.userData.len;
    BX(0, L, 0, 0.5, 0, 0.12, woodM, fr);
    BX(0, L, 2.9, 3.75, 0, 0.16, M(0x14100f), fr);
    BX(-0.02, L + 0.02, 3.75, HC.g1, 0, 0.22, goldM, fr);
    const signTex = ct(1024, 150, (g, w, h) => {
      g.fillStyle = '#141011'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a45c'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
      const gr = g.createLinearGradient(0, 30, 0, 120);
      gr.addColorStop(0, '#ffeec0'); gr.addColorStop(1, '#c9953e');
      g.fillStyle = gr; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, 'Le Chat Noir', 640, 104, FONT_SERIF, 'italic 700');
      g.fillText('Le Chat Noir', w / 2 + 40, 80);
      // 黑猫剪影
      drawCat(g, 150, 118, 1.25, '#e2b964');
      drawCat(g, w - 150, 118, -1.25, '#e2b964');
    });
    const s = plane(L - 0.1, 0.8, noOL(basic(0xe8e0d0, { map: signTex })), fr); s.position.set(L / 2, 3.33, 0.165);
    const wins = [[0.25, 2.0], [2.2, 3.95], [5.2, 5.8]];
    wins.forEach(([a, b]) => {
      const gp = plane(b - a, 2.35, glass(0xffe6c0, 0.08), fr); gp.position.set((a + b) / 2, 0.5 + 1.2, 0.03);
      glassPanes.push({ mesh: gp, w: b - a, h: 2.35 });
      BX(a, b, 1.35, 1.4, 0, 0.06, woodM, fr); // 中横档
      // 手写菜单（窗贴）
    });
    const piers = [0, 2.0, 3.95, 5.05, 5.8];
    [[0, 0.25], [2.0, 2.2], [3.95, 4.15], [5.05, 5.2], [5.8, L]].forEach(([a, b]) => BX(a, b, 0.5, 2.9, 0, 0.16, woodM, fr));
    void piers;
    // 门
    const door = plane(0.9, 2.5, glass(0xffe6c0, 0.12), fr); door.position.set(4.6, SW_H + 1.25, 0.03);
    BX(4.15, 5.05, 2.55, 2.9, 0, 0.12, woodM, fr);
    BX(4.58, 4.62, SW_H, 2.55, 0, 0.08, woodM, fr);
    // 窗上贴字
    const decal = ct(512, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,240,210,0.95)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic 700 54px ${FONT_SERIF}`; g.fillText('Café · Tabac', w / 2, 44);
      g.font = `600 30px ${FONT_SERIF}`; g.fillText('Vins · Bières · Croque-Monsieur', w / 2, 98);
    });
    const d = plane(1.6, 0.4, noOL(basic(0xffffff, { map: decal, transparent: true, depthWrite: false })), fr); d.position.set(1.12, 2.35, 0.05);
    const d2 = plane(1.6, 0.4, noOL(basic(0xffffff, { map: decal, transparent: true, depthWrite: false })), fr); d2.position.set(3.07, 2.35, 0.05);

    // 遮阳篷（红底白字 + 波浪边）
    const awnTex = ct(1024, 256, (g, w, h) => {
      g.fillStyle = '#b3162f'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, 0, 32, h); }
    });
    const valTex = ct(1024, 96, (g, w, h) => {
      g.fillStyle = '#b3162f'; g.fillRect(0, 0, w, h - 26);
      for (let x = 0; x < w; x += 48) { g.beginPath(); g.arc(x + 24, h - 26, 24, 0, PI); g.fill(); }
      g.fillStyle = '#fff4e0'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 40px ${FONT_SERIF}`; g.fillText('CAFÉ  ·  BRASSERIE  ·  TABAC', w / 2, 36);
    });
    const awnW = L - 0.4, out = 1.5, y1 = 3.35, y2 = 2.8;
    const awnM = M(0xffffff, { map: awnTex, side: THREE.DoubleSide });
    const slopeLen = Math.hypot(out, y1 - y2);
    const aw = plane(awnW, slopeLen, awnM, fr);
    aw.rotation.x = -PI / 2 + Math.atan2(y1 - y2, out);
    aw.position.set(L / 2, (y1 + y2) / 2, out / 2);
    const val = plane(awnW, 0.36, noOL(M(0xffffff, { map: valTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })), fr);
    val.position.set(L / 2, y2 - 0.18, out);
    [0.2 + 0.05, L - 0.25].forEach((x) => tube([x, y2, out], [x, 2.9, 0.02], 0.02, ironM, fr));
    cafe.awning = { fr, out, y2 };
  }

  // TABAC 菱形灯牌（伸出墙面，会闪）
  {
    const tabTex = ct(256, 256, (g, w, h) => {
      g.fillStyle = '#e0142c';
      g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w - 4, h / 2); g.lineTo(w / 2, h - 4); g.lineTo(4, h / 2); g.closePath(); g.fill();
      g.strokeStyle = '#ffd6dc'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w - 20, h / 2); g.lineTo(w / 2, h - 20); g.lineTo(20, h / 2); g.closePath(); g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 50px ${FONT_SANS}`;
      g.fillText('TABAC', w / 2, h / 2 + 3);
    });
    const tabM = noOL(basic(0xffffff, { map: tabTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    const g = new THREE.Group(); g.position.set(CAFE.x2 - 0.45, 4.42, CAFE.z2 + 0.55); ctx.parent.add(g); keep(g);
    tube([0, 0.5, -0.55], [0, 0.5, 0.0], 0.025, ironM, g);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), tabM); p.rotation.y = PI / 2; g.add(p);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xff2040, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(2.6, 2.6, 1); g.add(halo);
    cafe.tabac = { mesh: p, mat: tabM, halo, flick: 0, next: rand(3, 8) };
  }

  // 露天座：打烊后椅子倒扣在桌上
  [[-11.2, 0.25], [-9.9, 0.3], [-8.6, 0.25], [-7.3, 0.3]].forEach(([x, z], i) => {
    bistroTable(x, z, i !== 2);
    if (i === 2) {
      // 这桌还留着一杯没喝完的咖啡
      bistroChair(x - 0.45, z + 0.1, PI / 2 + 0.2);
      bistroChair(x + 0.45, z + 0.05, -PI / 2 - 0.1);
      C(0.05, 0.04, 0.07, x + 0.05, SW_H + 0.76, z, M(0xf7f4ee), null, 10);
      C(0.09, 0.09, 0.01, x + 0.05, SW_H + 0.755, z, M(0xf7f4ee), null, 14);
    }
  });
  // 叠起来的椅子
  for (let k = 0; k < 3; k++) bistroChair(-6.6, -0.72, PI, SW_H + k * 0.1);
  // 小黑板
  {
    const bTex = ct(256, 320, (g, w, h) => {
      g.fillStyle = '#1e2522'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#8a6a44'; g.lineWidth = 14; g.strokeRect(0, 0, w, h);
      g.fillStyle = '#f2efe6'; g.textAlign = 'center';
      g.font = `italic 700 34px ${FONT_SERIF}`; g.fillText('Plat du jour', w / 2, 56);
      g.font = `italic 24px ${FONT_SERIF}`;
      ['Soupe à l\u2019oignon', 'Croque-madame', 'Tarte Tatin', '—', 'Ce soir :', 'jazz à 22h ♪'].forEach((s, i) => g.fillText(s, w / 2, 104 + i * 36));
      g.fillStyle = '#ff9fb0'; g.font = `700 22px ${FONT_SERIF}`; g.fillText('♡', w / 2 + 70, 290);
    });
    const g = group(-6.25, SW_H, 0.95, -0.45);
    const bm = M(0xffffff, { map: bTex });
    const a = plane(0.5, 0.64, bm, g); a.position.set(0, 0.42, 0.12); a.rotation.x = -0.18;
    const b = plane(0.5, 0.64, bm, g); b.position.set(0, 0.42, -0.12); b.rotation.set(0.18, PI, 0);
    [-0.23, 0.23].forEach((x) => { tube([x, 0, 0.24], [x, 0.74, 0.02], 0.015, M(0x8a6a44), g); tube([x, 0, -0.24], [x, 0.74, -0.02], 0.015, M(0x8a6a44), g); });
  }

  // ---------- 上层 ----------
  {
    const fr = frFront, L = frFront.userData.len;
    stringCourse(fr, 0, L, HC.g1, 0.14);
    const geraniumM = M(0xd8203a), leafM = M(0x2f6a3a), boxM = M(0x5a3a2a);
    [1.0, 3.0, 5.0].forEach((x) => {
      stoneWindow(fr, x, HC.f1 + 0.15, 1.0, 2.1, { pediment: x === 3.0, lit: 0.55 });
      balconnet(fr, x, 1.0, HC.f1 + 0.12);
      // 花箱
      BX(x - 0.5, x + 0.5, HC.f1 + 0.12, HC.f1 + 0.3, 0.02, 0.2, boxM, fr);
      for (let k = 0; k < 7; k++) {
        const px = x - 0.42 + k * 0.14;
        sphere(0.07, px, HC.f1 + 0.36, 0.11, leafM, fr, 7, 5);
        if (k % 2 === 0) sphere(0.045, px + 0.03, HC.f1 + 0.44, 0.14, geraniumM, fr, 6, 5);
      }
    });
    cornice(fr, -0.02, L + 0.02, HC.f1top);
  }
  // 侧墙（底座边缘露出来的山墙）+ 褪色广告
  {
    const fr = frLeft;
    const gh = ct(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(25,25,35,0.55)'; g.fillRect(24, 24, w - 48, h - 48);
      drawCat(g, w / 2, 250, 5.2, 'rgba(240,225,190,0.6)');
      g.fillStyle = 'rgba(240,225,190,0.62)'; g.textAlign = 'center';
      g.font = `italic 900 70px ${FONT_SERIF}`; g.fillText('Le Chat Noir', w / 2, 360);
      g.font = `600 34px ${FONT_SERIF}`; g.fillText('CABARET · DEPUIS 1881', w / 2, 420);
    });
    const p = plane(3.4, 3.4, noOL(M(0xffffff, { map: gh, transparent: true, depthWrite: false })), fr);
    p.position.set(4.3, 5.4, 0.02);
    stringCourse(fr, 0, 8, HC.g1, 0.08);
    cornice(fr, -0.02, 8.02, HC.f1top, 0.24);
  }
  // 背立面
  [1.5, 4.5].forEach((x) => stoneWindow(frBack, x, 4.5, 0.8, 1.6, { lit: 0.3 }));
  cornice(frBack, 0, 6, HC.f1top, 0.24);
  BX(4.4, 5.3, SW_H, 2.2, 0, 0.08, M(0x3a2c26), frBack);

  // ---------- 孟莎屋顶 ----------
  const I = insetPoly(F, [HC.inset, 0, HC.inset, HC.inset]);
  // 边：0 后 / 1 右(山墙,不做坡) / 2 前 / 3 左
  [0, 2, 3].forEach((i) => slopeQuad(F[(i + 1) % 4], F[i], I[i], I[(i + 1) % 4], HC.cornice, HC.top, zincM));
  prism(I, HC.top - 0.1, HC.top, M(0x59647a));
  [1.5, 4.5].forEach((x) => dormer(frFront, x, HC.cornice + 0.1, { w: 0.8, h: 1.0, lit: 0.5 }));
  dormer(frLeft, 4, HC.cornice + 0.1, { w: 0.8, h: 1.0 });
  dormer(frBack, 3, HC.cornice + 0.1, { w: 0.8, h: 1.0 });
  chimney(-11.0, -10.4, -6.8, -4.2, HC.top - 0.6, HC.top + 0.9);
  chimney(-8.6, -8.0, -8.4, -7.8, HC.top - 0.6, HC.top + 0.7);
  // 屋顶上的小窗台 + 花盆（有人住的感觉）
  C(0.1, 0.08, 0.16, -9.6, HC.top, -2.2, M(0xb35a3a), null, 10);
  sphere(0.14, -9.6, HC.top + 0.24, -2.2, M(0x3f7a44), null, 8, 6);
}

// 小黑猫剪影（招牌 / 广告用）
export function drawCat(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, Math.abs(s)); g.fillStyle = color;
  g.beginPath();
  g.ellipse(0, -14, 13, 16, 0, 0, 2 * PI); // 身体
  g.moveTo(10, -34); g.arc(4, -36, 9, 0, 2 * PI); // 头
  g.fill();
  g.beginPath(); g.moveTo(-2, -42); g.lineTo(0, -52); g.lineTo(4, -44); g.fill();
  g.beginPath(); g.moveTo(6, -44); g.lineTo(11, -52); g.lineTo(12, -41); g.fill();
  g.lineWidth = 4; g.strokeStyle = color; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-10, -4); g.bezierCurveTo(-30, 0, -30, -30, -20, -36); g.stroke();
  g.restore();
}

// 小圆桌（大理石面 + 铸铁腿）；flipChairs=true 时两把椅子倒扣在桌面上
export function bistroTable(x, z, flipChairs = true) {
  const y0 = SW_H;
  C(0.16, 0.18, 0.03, x, y0, z, ironM, null, 12);
  C(0.025, 0.025, 0.68, x, y0 + 0.03, z, ironM, null, 6);
  C(0.3, 0.3, 0.035, x, y0 + 0.71, z, M(0xf1ede4), null, 20);
  C(0.305, 0.305, 0.012, x, y0 + 0.705, z, M(0xa0a8b2), null, 20);
  if (flipChairs) {
    bistroChair(x - 0.12, z, 0.3, y0 + 0.745 + 0.47, true);
    bistroChair(x + 0.14, z + 0.04, PI - 0.2, y0 + 0.745 + 0.47, true);
  }
}
const chairWeave = ct(64, 64, (g) => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = (x + y) % 2 ? '#c63a3a' : '#f1e3c4'; g.fillRect(x * 8, y * 8, 8, 8);
  }
});
/** 巴黎咖啡馆藤编椅 */
export function bistroChair(x, z, ry, y = SW_H, flipped = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  if (flipped) g.rotation.x = PI;
  ctx.parent.add(g);
  const cane = M(0xb98a52);
  const seat = M(0xffffff, { map: chairWeave });
  BX(-0.18, 0.18, 0.44, 0.47, -0.18, 0.18, seat, g);
  [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].forEach(([a, b]) => tube([a, 0, b], [a * 0.9, 0.45, b * 0.9], 0.015, cane, g, 5));
  tube([-0.16, 0.45, -0.16], [-0.16, 0.86, -0.18], 0.015, cane, g, 5);
  tube([0.16, 0.45, -0.16], [0.16, 0.86, -0.18], 0.015, cane, g, 5);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 12, 1, true, -0.75, 1.5), M(0xffffff, { map: chairWeave, side: THREE.DoubleSide }));
  back.rotation.y = PI; back.position.set(0, 0.74, 0.04); g.add(back);
  return g;
}

export function animateCafe(dt, t) {
  const tb = cafe.tabac;
  if (tb) {
    tb.next -= dt;
    if (tb.next < 0) { tb.flick = rand(0.3, 0.9); tb.next = rand(4, 11); }
    let on = 1;
    if (tb.flick > 0) { tb.flick -= dt; on = Math.sin(t * 60) > 0.2 ? 1 : 0.15; }
    tb.mat.color.setScalar(0.35 + 0.65 * on);
    tb.halo.material.opacity = 0.55 * on;
  }
}
