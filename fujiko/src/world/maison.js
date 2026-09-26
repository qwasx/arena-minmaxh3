// 主楼：ÉTOILE 珠宝店（街角切角的奥斯曼式建筑，底商 + 两层 + 孟莎屋顶 + 天窗沙龙）
import * as THREE from 'three';
import {
  ct, M, B, BX, WB, C, plane, noOL, basic, glowMat, glass, PI, rr, ctx, prism, sphere, lathe, tube,
  radialTex, sparkleTex, softDotTex, FONT_SERIF, FONT_SANS, fitText, starPath, quad, keep, thinOL,
} from '../core/helpers.js';
import { rand, rnd, pick } from '../core/rng.js';
import { onUpdate, state, glassPanes } from '../core/registry.js';
import { MAISON, H, SKY, SW_H } from './layout.js';
import {
  stoneM, rusticM, trimM, trimDarkM, ironM, zincM, zincDarkM, plasterM, facadeFrame, stoneWindow,
  balcony, balconnet, cornice, stringCourse, insetPoly, slopeQuad, dormer, chimney, railing,
} from './haussmann.js';

export const maison = { sparkles: [], lasers: [] };

const GREEN = 0x173a30;
const GOLD = 0xd4ae62;

export function buildMaison(scene) {
  const F = [[-6, -9], [2, -9], [2, -2.4], [0.6, -1], [-6, -1]];
  const greenM = M(GREEN);
  const goldM = M(GOLD);

  const frFront = facadeFrame(-6, -1, 0.6, -1);
  const frCham = facadeFrame(0.6, -1, 2, -2.4);
  const frRight = facadeFrame(2, -2.4, 2, -9);
  const frBack = facadeFrame(2, -9, -6, -9);
  const chamLen = frCham.userData.len;

  // ======================================================= 主体
  prism(F, H.g1, H.cornice, stoneM);
  // 底层：住宅门厅（左）+ 后部（面包店）两个实心块，中间是珠宝店
  WB(-6, -3.2, 0, H.g1, -9, -1, rusticM);
  WB(-3.2, 2, 0, H.g1, -9, -6.6, rusticM);

  // ======================================================= 珠宝店室内
  const marbleTex = ct(256, 256, (g, w, h) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#1e1c22' : '#efe9df';
      g.fillRect(i * 128, j * 128, 128, 128);
    }
    for (let k = 0; k < 40; k++) {
      g.strokeStyle = `rgba(150,140,130,${rand(0.08, 0.2)})`; g.lineWidth = rand(0.5, 1.5);
      g.beginPath(); const x = rand(0, 256), y = rand(0, 256);
      g.moveTo(x, y); g.bezierCurveTo(x + rand(-40, 40), y + rand(-40, 40), x + rand(-40, 40), y + rand(-40, 40), x + rand(-60, 60), y + rand(-60, 60));
      g.stroke();
    }
  }, { repeat: [1, 1] });
  prism([[-3.2, -6.6], [2, -6.6], [2, -2.4], [0.6, -1], [-3.2, -1]], 0.04, 0.13, M(0xffffff, { map: marbleTex }));

  const panelTex = ct(512, 256, (g, w, h) => {
    g.fillStyle = '#1d3b31'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = 16 + i * 124;
      g.strokeStyle = '#c9a45c'; g.lineWidth = 3; g.strokeRect(x, 20, 104, 140);
      g.strokeRect(x, 176, 104, 60);
      if (i % 2 === 0) { // 镜面
        const gr = g.createLinearGradient(x, 20, x + 104, 160);
        gr.addColorStop(0, '#8d9bb0'); gr.addColorStop(0.5, '#c8d2de'); gr.addColorStop(1, '#6f7c90');
        g.fillStyle = gr; g.fillRect(x + 8, 28, 88, 124);
      }
    }
  });
  {
    const pm = M(0xffffff, { map: panelTex });
    const p1 = plane(5.6, 3.8, pm); p1.rotation.y = PI / 2; p1.position.set(-3.19, 2.0, -3.8);
    const p2 = plane(5.2, 3.8, pm); p2.position.set(-0.6, 2.0, -6.59);
    // 天花（米白）+ 金色线脚
    const ceil = plane(5.2, 5.6, noOL(M(0xf3ead6))); ceil.rotation.x = PI / 2; ceil.position.set(-0.6, H.g1 - 0.01, -3.8);
  }
  // 吊灯
  {
    const g = new THREE.Group(); g.position.set(-0.7, 3.0, -3.7); ctx.parent.add(g);
    tube([0, 0.9, 0], [0, 0.25, 0], 0.015, goldM, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 24), goldM); ring.rotation.x = PI / 2; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 20), goldM); ring2.rotation.x = PI / 2; ring2.position.y = 0.18; g.add(ring2);
    const bulb = basic(0xfff1c8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      sphere(0.05, Math.cos(a) * 0.42, 0.06, Math.sin(a) * 0.42, noOL(bulb), g, 8, 6);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(2.2, 2.2, 1); halo.position.copy(g.position); keep(halo); scene.add(halo);
  }
  // 柜台
  const woodM = M(0x4a2a1c);
  const velvetM = M(0x5b1224);
  const counter = (x1, x2, z1, z2) => {
    BX(x1, x2, 0.13, 0.95, z1, z2, woodM);
    BX(x1 - 0.03, x2 + 0.03, 0.95, 1.0, z1 - 0.03, z2 + 0.03, goldM);
    BX(x1 + 0.05, x2 - 0.05, 1.0, 1.02, z1 + 0.05, z2 - 0.05, velvetM);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.32, z2 - z1), glass(0xd7e8ff, 0.16));
    gl.position.set((x1 + x2) / 2, 1.18, (z1 + z2) / 2); ctx.parent.add(gl);
    for (let i = 0; i < 4; i++) addJewel((x1 + x2) / 2 + rand(-0.4, 0.4) * (x2 - x1), 1.05, (z1 + z2) / 2 + rand(-0.3, 0.3) * (z2 - z1), 0.8);
  };
  counter(-2.6, -0.6, -6.2, -5.7);
  counter(-2.9, -2.4, -5.2, -2.6);
  counter(-1.2, 0.4, -4.1, -3.6);

  // ======================================================= 底商立面（绿色木作 + 金字招牌）
  const signTex = ct(1024, 210, (g, w, h) => {
    g.fillStyle = '#10291f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9a45c'; g.lineWidth = 4; g.strokeRect(12, 12, w - 24, h - 24);
    const gr = g.createLinearGradient(0, 40, 0, 170);
    gr.addColorStop(0, '#fff0c0'); gr.addColorStop(0.5, '#e2b964'); gr.addColorStop(1, '#a8772e');
    g.fillStyle = gr; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'ÉTOILE', 560, 128, FONT_SERIF, '700');
    g.fillText('ÉTOILE', w / 2, 112);
    g.font = `600 30px ${FONT_SERIF}`; g.fillText('J O A I L L I E R   ·   P A R I S', w / 2, 178);
    g.fillStyle = '#e2b964';
    starPath(g, 110, 105, 34, 14); g.fill(); starPath(g, w - 110, 105, 34, 14); g.fill();
  });
  const signTex2 = ct(1024, 210, (g, w, h) => {
    g.fillStyle = '#10291f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9a45c'; g.lineWidth = 4; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#e2b964'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'HAUTE JOAILLERIE', 820, 84, FONT_SERIF, '700');
    g.fillText('HAUTE JOAILLERIE', w / 2, 96);
    g.font = `600 28px ${FONT_SERIF}`; g.fillText('M A I S O N   F O N D É E   E N   1 8 9 7', w / 2, 168);
  });
  const signM = (t) => noOL(basic(0xe8e0d0, { map: t }));

  function shopfront(fr, x1, x2, sign, windows) {
    BX(x1, x2, 0, 0.55, 0, 0.12, greenM, fr);                 // 底座
    BX(x1, x2, 2.95, 3.78, 0, 0.16, greenM, fr);              // 招牌板
    BX(x1 - 0.02, x2 + 0.02, 3.78, H.g1, 0, 0.24, goldM, fr);  // 顶部金线
    BX(x1, x2, 0.55, 0.6, 0, 0.14, goldM, fr);
    if (sign) {
      const s = plane(x2 - x1 - 0.1, 0.76, signM(sign), fr);
      s.position.set((x1 + x2) / 2, 3.365, 0.165);
    }
    windows.forEach(([a, b]) => {
      const gp = plane(b - a, 2.35, glass(0xcfe3ff, 0.1), fr);
      gp.position.set((a + b) / 2, 0.6 + 2.35 / 2, 0.03);
      glassPanes.push({ mesh: gp, w: b - a, h: 2.35 });
      BX(a, b, 2.9, 2.95, 0, 0.12, goldM, fr);
      // 橱窗展台
      BX(a + 0.05, b - 0.05, 0.13, 0.95, -0.75, -0.08, velvetM, fr);
      BX(a + 0.03, b - 0.03, 0.95, 0.99, -0.77, -0.06, goldM, fr);
      const n = Math.max(1, Math.round((b - a) / 0.6));
      for (let i = 0; i < n; i++) {
        const lx = a + ((i + 0.5) / n) * (b - a);
        const wp = new THREE.Vector3(lx, 0.99, -0.4).applyMatrix4(fr.matrixWorld);
        if (i % 2 === 0) bust(fr, lx, -0.42); else addJewel(wp.x, wp.y + 0.05, wp.z, 1.0);
      }
    });
    // 壁柱
    const piers = [x1, ...windows.map((w) => w[1]), x2];
    piers.forEach((x, i) => {
      const a = i === 0 ? x : i === piers.length - 1 ? x - 0.22 : x - 0.02;
      const b = i === 0 ? x + 0.22 : i === piers.length - 1 ? x : x + 0.2;
      BX(a, b, 0.55, 2.95, 0, 0.18, greenM, fr);
      BX(a - 0.02, b + 0.02, 2.75, 2.95, 0, 0.21, goldM, fr);
    });
  }
  frFront.updateMatrixWorld(true); frRight.updateMatrixWorld(true); frCham.updateMatrixWorld(true);
  shopfront(frFront, 2.8, 6.6, signTex, [[3.0, 4.6], [4.82, 6.4]]);
  shopfront(frRight, 0, 4.3, signTex2, [[0.22, 2.05], [2.27, 4.08]]);

  // 切角：入口
  {
    const fr = frCham, L = chamLen;
    BX(0, 0.25, 0, 3.78, 0, 0.18, greenM, fr);
    BX(L - 0.25, L, 0, 3.78, 0, 0.18, greenM, fr);
    BX(0, L, 2.75, 3.78, 0, 0.16, greenM, fr);
    BX(-0.02, L + 0.02, 3.78, H.g1, 0, 0.24, goldM, fr);
    // 玻璃门
    const door = plane(L - 0.6, 2.55, glass(0xe3eeff, 0.16), fr); door.position.set(L / 2, 0.13 + 1.275, 0.03);
    glassPanes.push({ mesh: door, w: L - 0.6, h: 2.55 });
    BX(0.25, L - 0.25, 2.62, 2.75, 0, 0.12, goldM, fr);
    BX(L / 2 - 0.03, L / 2 + 0.03, 0.13, 2.62, 0, 0.08, goldM, fr);
    BX(0.28, 0.34, 0.13, 2.62, 0, 0.08, goldM, fr); BX(L - 0.34, L - 0.28, 0.13, 2.62, 0, 0.08, goldM, fr);
    C(0.015, 0.015, 0.5, L / 2 - 0.12, 1.1, 0.1, goldM, fr, 6); C(0.015, 0.015, 0.5, L / 2 + 0.12, 1.1, 0.1, goldM, fr, 6);
    BX(0.2, L - 0.2, SW_H, SW_H + 0.08, 0, 0.36, M(0xe9e4da), fr); // 大理石台阶
    // 圆形徽章
    const medTex = ct(256, 256, (g) => {
      g.fillStyle = '#10291f'; g.beginPath(); g.arc(128, 128, 124, 0, 2 * PI); g.fill();
      g.strokeStyle = '#e2b964'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 112, 0, 2 * PI); g.stroke();
      g.fillStyle = '#e2b964'; starPath(g, 128, 120, 70, 28); g.fill();
      g.fillStyle = '#10291f'; g.font = `700 64px ${FONT_SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('É', 128, 124);
    });
    const med = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), signM(medTex));
    med.position.set(L / 2, 3.26, 0.17); fr.add(med);
    // 玻璃雨棚（marquise）
    const mq = new THREE.Group(); mq.position.set(L / 2, 3.28, 0); fr.add(mq);
    const mqGlass = new THREE.Mesh(new THREE.BoxGeometry(L + 0.3, 0.03, 0.95), glass(0xd6e6ff, 0.22));
    mqGlass.position.set(0, 0, 0.5); mqGlass.rotation.x = -0.12; mq.add(mqGlass);
    BX(-L / 2 - 0.15, L / 2 + 0.15, -0.04, 0.02, 0.92, 0.98, ironM, mq);
    [-L / 2 - 0.1, L / 2 + 0.1].forEach((x) => {
      tube([x, 0.0, 0.0], [x, 0.02, 0.95], 0.02, ironM, mq);
      tube([x, -0.55, 0.0], [x, -0.02, 0.8], 0.018, ironM, mq);
    });
    maison.marquise = mq;
  }

  // 左侧：住宅大门（porte cochère）+ 门牌
  {
    const fr = frFront, cx = 1.4;
    BX(cx - 0.95, cx + 0.95, 0, 3.4, 0, 0.1, trimM, fr);                 // 门套
    BX(cx - 0.75, cx + 0.75, SW_H, 2.7, 0.05, 0.13, M(0x1f3a2e), fr);     // 门扇
    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24, 0, PI), M(0x1f3a2e));
    arch.position.set(cx, 2.7, 0.13); fr.add(arch);
    const archTrim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.08, 6, 24, PI), trimM);
    archTrim.position.set(cx, 2.7, 0.13); fr.add(archTrim);
    BX(cx - 0.12, cx + 0.12, 3.35, 3.65, 0, 0.18, trimM, fr);
    BX(cx - 0.02, cx + 0.02, SW_H, 2.7, 0.13, 0.15, M(0x0f231b), fr);
    [[-0.4, 0.8], [0.4, 0.8], [-0.4, 1.9], [0.4, 1.9]].forEach(([dx, y]) => BX(cx + dx - 0.25, cx + dx + 0.25, y - 0.4, y + 0.4, 0.13, 0.17, M(0x264a3a), fr));
    sphere(0.05, cx - 0.15, 1.35, 0.2, goldM, fr, 8, 6); sphere(0.05, cx + 0.15, 1.35, 0.2, goldM, fr, 8, 6);
    const numTex = ct(128, 96, (g, w, h) => {
      g.fillStyle = '#1b3f8f'; rr(g, 2, 2, w - 4, h - 4, 10); g.fill();
      g.strokeStyle = '#3aa37a'; g.lineWidth = 5; rr(g, 6, 6, w - 12, h - 12, 8); g.stroke();
      g.fillStyle = '#fff'; g.font = `700 60px ${FONT_SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('12', w / 2, h / 2 + 3);
    });
    const num = plane(0.34, 0.26, signM(numTex), fr); num.position.set(cx + 1.2, 2.9, 0.02);
    // 左侧底层两扇小窗（带铁栅）
    [0.35, 2.45].forEach((x) => {
      const w = plane(0.34, 1.2, pick([0, 1]) ? basic(0x2a3558) : basic(0x3a3040), fr); w.position.set(x, 1.6, 0.02);
      for (let i = 0; i < 4; i++) BX(x - 0.15 + i * 0.1 - 0.01, x - 0.15 + i * 0.1 + 0.01, 1.0, 2.2, 0.03, 0.05, ironM, fr);
    });
  }

  // 右侧后段：面包店（已拉下卷帘门）
  {
    const fr = frRight;
    const shutterTex = ct(256, 256, (g, w, h) => {
      g.fillStyle = '#8c929e'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(40,44,56,0.45)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, y + 2, w, 1); }
      g.save(); g.translate(128, 150); g.rotate(-0.08);
      g.font = `900 italic 52px ${FONT_SANS}`; g.textAlign = 'center';
      g.lineWidth = 8; g.strokeStyle = '#1b1b2a'; g.strokeText('F ♡ L', 0, 0);
      g.fillStyle = '#ff5fa8'; g.fillText('F ♡ L', 0, 0);
      g.restore();
    });
    const sh = plane(1.9, 2.6, M(0xffffff, { map: shutterTex }), fr); sh.position.set(5.4, SW_H + 1.3, 0.03);
    BX(4.35, 6.5, 2.72, 2.85, 0, 0.14, M(0x6c7280), fr);
    const bTex = ct(512, 96, (g, w, h) => {
      g.fillStyle = '#233a6e'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f3e6c4'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, 'BOULANGERIE · PÂTISSERIE', w - 40, 44, FONT_SERIF, '700');
      g.fillText('BOULANGERIE · PÂTISSERIE', w / 2, h / 2 + 2);
    });
    const bs = plane(2.1, 0.42, M(0xffffff, { map: bTex }), fr); bs.position.set(5.42, 3.2, 0.12);
    BX(4.35, 6.5, 2.95, 3.45, 0, 0.1, M(0x233a6e), fr);
  }

  // 警铃盒（报警时红灯闪）
  {
    const fr = frFront;
    const box = BX(2.35, 2.75, 3.1, 3.55, 0, 0.14, M(0xc0262d), fr);
    const lampMat = noOL(basic(0x551010));
    const lamp = sphere(0.09, 2.55, 3.62, 0.08, lampMat, fr, 10, 8);
    keep(lamp);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xff2a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(2.4, 2.4, 1); halo.position.set(2.55, 3.62, 0.3); fr.add(halo); keep(halo);
    maison.alarmLamp = { lamp, halo, lampMat };
    void box;
  }

  // ======================================================= 楼层立面
  const upper = [
    { fr: frFront, wins: [0.9, 2.9, 4.9], len: 6.6 },
    { fr: frCham, wins: [chamLen / 2], len: chamLen, narrow: true },
    { fr: frRight, wins: [1.7, 3.7, 5.7], len: 6.6 },
  ];
  upper.forEach(({ fr, wins, len, narrow }) => {
    const w = narrow ? 0.86 : 1.0;
    stringCourse(fr, 0, len, H.g1, 0.14);
    balcony(fr, -0.02, len + 0.02, H.f1 + 0.1, 0.44);
    wins.forEach((x) => stoneWindow(fr, x, H.f1 + 0.15, w, 2.2, { pediment: true, lit: 0.45 }));
    stringCourse(fr, 0, len, H.f1top, 0.1);
    wins.forEach((x) => { stoneWindow(fr, x, H.f2 + 0.15, w, 1.95, { lit: 0.4 }); balconnet(fr, x, w, H.f2 + 0.12); });
    cornice(fr, -0.02, len + 0.02, H.f2top);
    railing(fr, -0.02, len + 0.02, H.cornice, 0.62, 0.3);
  });
  // 背立面（朴素）
  [1.5, 4.0, 6.5].forEach((x) => {
    stoneWindow(frBack, x, 4.5, 0.8, 1.6, { lit: 0.3 });
    stoneWindow(frBack, x, 7.4, 0.8, 1.6, { lit: 0.3 });
  });
  stringCourse(frBack, 0, 8, H.g1, 0.1);
  cornice(frBack, 0, 8, H.f2top, 0.26);
  // 后门 + 雨水管
  BX(2.6, 3.5, SW_H, 2.3, 0, 0.08, M(0x3a2c26), frBack);
  C(0.05, 0.05, H.cornice, 0.35, 0, 0.12, zincDarkM, frBack, 8);
  C(0.05, 0.05, H.cornice, 7.6, 0, 0.12, zincDarkM, frBack, 8);
  // 背立面底层小窗
  [5.2, 6.4].forEach((x) => { const p = plane(0.5, 0.9, basic(0x2a3558), frBack); p.position.set(x, 1.7, 0.02); });

  // 街牌（蓝底白字绿边）
  const streetSign = (name) => ct(512, 170, (g, w, h) => {
    g.fillStyle = '#16307a'; rr(g, 2, 2, w - 4, h - 4, 18); g.fill();
    g.strokeStyle = '#2f9a72'; g.lineWidth = 10; rr(g, 12, 12, w - 24, h - 24, 12); g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 26px ${FONT_SANS}`; g.fillText('2ᵉ Arrᵗ', w / 2, 44);
    fitText(g, name, w - 70, 58, FONT_SANS, '700');
    g.fillText(name, w / 2, 108);
  });
  { const p = plane(0.95, 0.32, signM(streetSign('RUE DE LA PAIX')), frFront); p.position.set(6.02, 5.9, 0.02); }
  { const p = plane(0.95, 0.32, signM(streetSign('RUE DAUNOU')), frRight); p.position.set(0.62, 5.9, 0.02); }

  // ======================================================= 孟莎屋顶
  const I = insetPoly(F, [H.inset, H.inset, H.inset, H.inset, 0]);
  maison.topPoly = I;
  for (let i = 0; i < 4; i++) {
    slopeQuad(F[i + 1], F[i], I[i], I[i + 1], H.cornice, H.top, zincM);
  }
  // 屋顶平台（天窗处开洞）
  {
    const shape = new THREE.Shape(I.map(([x, z]) => new THREE.Vector2(x, -z)));
    const hole = new THREE.Path();
    hole.moveTo(SKY.x1, -SKY.z1); hole.lineTo(SKY.x2, -SKY.z1); hole.lineTo(SKY.x2, -SKY.z2); hole.lineTo(SKY.x1, -SKY.z2); hole.closePath();
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    geo.rotateX(-PI / 2); geo.translate(0, H.top - 0.12, 0);
    ctx.parent.add(new THREE.Mesh(geo, M(0x59647a)));
    // 屋脊压边
    for (let i = 0; i < 4; i++) {
      const [ax, az] = I[i], [bx, bz] = I[i + 1];
      tube([ax, H.top + 0.02, az], [bx, H.top + 0.02, bz], 0.05, zincDarkM, null, 6);
    }
  }
  // 山墙（高出咖啡馆屋顶的那一截）
  quad([-6, H.cornice, -9], [-6, H.cornice, -1], [-6, H.top, -2], [-6, H.top, -8], plasterM);
  {
    const ghost = ct(512, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(160,60,40,0.42)'; g.fillRect(20, 20, w - 40, h - 40);
      g.fillStyle = 'rgba(245,230,200,0.6)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, 'CHOCOLAT', w - 90, 80, FONT_SERIF, '900'); g.fillText('CHOCOLAT', w / 2, 90);
      fitText(g, 'L\u2019ÉTOILE', w - 160, 64, FONT_SERIF, 'italic 700'); g.fillText('L\u2019ÉTOILE', w / 2, 170);
    });
    const gm = noOL(M(0xffffff, { map: ghost, transparent: true, depthWrite: false }));
    const p = plane(3.6, 1.8, gm); p.rotation.y = -PI / 2; p.position.set(-6.02, 11.0, -5.0);
  }
  // 老虎窗
  [0.9, 2.9, 4.9].forEach((x) => dormer(frFront, x, H.cornice + 0.12));
  dormer(frCham, chamLen / 2, H.cornice + 0.12, { w: 0.7 });
  [1.7, 3.7, 5.7].forEach((x) => dormer(frRight, x, H.cornice + 0.12));
  [2.2, 5.6].forEach((x) => dormer(frBack, x, H.cornice + 0.12, { lit: 0.6 }));
  // 烟囱
  chimney(-6.3, -5.65, -7.7, -2.3, 9.3, 13.35);
  chimney(-2.35, -1.45, -8.8, -8.15, 10.3, 13.2);
  chimney(1.2, 1.85, -7.9, -7.15, 10.3, 13.05);
  // 电视天线
  {
    const aM = M(0x9aa2b5);
    tube([-1.9, 13.2, -8.45], [-1.9, 14.6, -8.45], 0.02, aM);
    [14.1, 14.35, 14.55].forEach((y, i) => tube([-2.35 + i * 0.1, y, -8.45], [-1.45 - i * 0.1, y, -8.45], 0.012, aM));
  }

  // ======================================================= 天窗 + 沙龙（钻石原本展示的地方）
  buildSkylight(scene);
}

// 小首饰（金环 + 钻石闪光）
function addJewel(x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); ctx.parent.add(g);
  const gold = M(0xe0b860);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.012 * s, 6, 14), gold);
  ring.rotation.x = PI / 2 - 0.3; ring.position.y = 0.04 * s; g.add(ring);
  sphere(0.022 * s, 0, 0.09 * s, 0, noOL(basic(0xeaf6ff)), g, 8, 6);
  addSparkle(x, y + 0.1 * s, z, 0.35 * s);
}
function addSparkle(x, y, z, size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.position.set(x, y, z); sp.scale.setScalar(size); keep(sp);
  ctx.parent.add(sp);
  maison.sparkles.push({ sp, size, ph: rand(0, 10), sp2: rand(1.5, 3.5) });
}
// 橱窗里的项链展示胸像
function bust(fr, lx, lz) {
  const g = new THREE.Group(); g.position.set(lx, 0.99, lz); fr.add(g);
  const vel = M(0x14161c);
  lathe([[0, 0], [0.2, 0], [0.22, 0.05], [0.2, 0.12], [0.1, 0.22], [0.06, 0.3], [0.055, 0.45], [0.07, 0.5], [0, 0.52]], vel, g, 16);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.016, 6, 20), M(0xe7c170));
  neck.position.set(0, 0.2, 0.02); neck.rotation.x = PI / 2 - 0.5; g.add(neck);
  sphere(0.035, 0, 0.13, 0.1, noOL(basic(0xc9e7ff)), g, 8, 6);
  fr.updateMatrixWorld(true);
  const wp = new THREE.Vector3(0, 0.14, 0.12); g.updateMatrixWorld(true); wp.applyMatrix4(g.matrixWorld);
  addSparkle(wp.x, wp.y, wp.z, 0.45);
}

function buildSkylight(scene) {
  const { x1, x2, z1, z2, h } = SKY;
  const y0 = H.top, curbH = 0.22;
  const xc = (x1 + x2) / 2, zc = (z1 + z2) / 2;
  // 沙龙地面 & 墙
  const floorTex = ct(256, 256, (g) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 ? '#1b1a20' : '#ece6da'; g.fillRect(i * 64, j * 64, 64, 64);
    }
  }, { repeat: [1, 1] });
  const fl = plane(x2 - x1, z2 - z1, noOL(M(0xffffff, { map: floorTex })));
  fl.rotation.x = -PI / 2; fl.position.set(xc, H.cornice + 0.06, zc);
  const wallTex = ct(512, 256, (g, w, hh) => {
    g.fillStyle = '#5c1020'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,200,150,0.05)'; g.beginPath(); g.arc(rand(0, w), rand(0, hh), rand(4, 10), 0, 2 * PI); g.fill(); }
    [[40, 50, 120, 90], [220, 40, 90, 120], [360, 60, 110, 80]].forEach(([x, y, ww, hh2]) => {
      g.fillStyle = '#c9a45c'; g.fillRect(x - 8, y - 8, ww + 16, hh2 + 16);
      const gr = g.createLinearGradient(x, y, x + ww, y + hh2);
      gr.addColorStop(0, '#2b3a55'); gr.addColorStop(1, '#6a4a3a');
      g.fillStyle = gr; g.fillRect(x, y, ww, hh2);
    });
    g.fillStyle = '#c9a45c'; g.fillRect(0, hh - 30, w, 6);
  });
  const wm = noOL(M(0xffffff, { map: wallTex, side: THREE.DoubleSide }));
  const hWall = y0 - H.cornice;
  const wall = (w, x, z, ry) => { const p = plane(w, hWall, wm); p.position.set(x, H.cornice + hWall / 2, z); p.rotation.y = ry; };
  wall(x2 - x1, xc, z1 + 0.01, 0);
  wall(x2 - x1, xc, z2 - 0.01, PI);
  wall(z2 - z1, x1 + 0.01, zc, PI / 2);
  wall(z2 - z1, x2 - 0.01, zc, -PI / 2);

  // 展台（空的）+ 丝绒垫 + 唇印卡片
  const px = xc - 0.2, pz = zc - 0.1;
  lathe([[0, 0], [0.3, 0], [0.3, 0.08], [0.2, 0.12], [0.16, 0.2], [0.14, 0.85], [0.2, 0.9], [0.26, 0.95], [0.26, 1.0], [0, 1.0]], M(0xf2eee6), null, 20)
    .position.set(px, H.cornice + 0.06, pz);
  BX(px - 0.2, px + 0.2, H.cornice + 1.06, H.cornice + 1.14, pz - 0.2, pz + 0.2, M(0x8c1026));
  const cardTex = makeCardTexture();
  const card = plane(0.26, 0.17, noOL(basic(0xffffff, { map: cardTex })));
  card.rotation.x = -PI / 2; card.rotation.z = 0.3; card.position.set(px, H.cornice + 1.145, pz);
  // 被掀开的玻璃罩
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, PI * 2, 0, PI / 2), glass(0xdff0ff, 0.25));
  dome.position.set(px + 0.75, H.cornice + 0.06, pz + 0.55); dome.rotation.z = 1.9; ctx.parent.add(dome);

  // 激光网
  const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  const beamMat = noOL(new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glowGeo = new THREE.PlaneGeometry(0.12, 1);
  const glowM = glowMat(softDotTex, 0xff2a3a, 0.5);
  const lasers = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(beamGeo, beamMat);
    const gl1 = new THREE.Mesh(glowGeo, glowM); const gl2 = new THREE.Mesh(glowGeo, glowM); gl2.rotation.y = PI / 2;
    g.add(b, gl1, gl2);
    keep(g);
    scene.add(g);
    lasers.push({
      g, y: H.cornice + 0.35 + i * 0.3, ph: rand(0, 6), sp: rand(0.3, 0.8),
      horiz: i % 2 === 0,
    });
  }
  maison.lasers = lasers;
  maison.salon = { x1, x2, z1, z2, y: H.cornice };

  // 天窗外框
  const curbM = M(0x4a5468);
  BX(x1 - 0.12, x2 + 0.12, y0 - 0.02, y0 + curbH, z1 - 0.12, z1, curbM);
  BX(x1 - 0.12, x2 + 0.12, y0 - 0.02, y0 + curbH, z2, z2 + 0.12, curbM);
  BX(x1 - 0.12, x1, y0 - 0.02, y0 + curbH, z1, z2, curbM);
  BX(x2, x2 + 0.12, y0 - 0.02, y0 + curbH, z1, z2, curbM);
  const yb = y0 + curbH, yr = yb + h - 0.2, zr = zc;
  // 铁框
  tube([x1, yr, zr], [x2, yr, zr], 0.03, ironM);
  tube([x1, yb, z2], [x2, yb, z2], 0.025, ironM);
  tube([x1, yb, z1], [x2, yb, z1], 0.025, ironM);
  for (let i = 0; i <= 5; i++) {
    const x = x1 + (i / 5) * (x2 - x1);
    tube([x, yb, z2], [x, yr, zr], 0.018, ironM, null, 5);
    tube([x, yb, z1], [x, yr, zr], 0.018, ironM, null, 5);
  }
  // 玻璃（前坡开了个圆洞）
  const paneLen = Math.hypot(yr - yb, z2 - zr);
  const holeU = 0.62, holeV = 0.42, holeR = 0.3;
  const paneTex = ct(512, 256, (g, w, hh) => {
    g.fillStyle = 'rgba(200,225,255,0.34)'; g.fillRect(0, 0, w, hh);
    const cx = holeU * w, cy = (1 - holeV) * hh;
    const rx = (holeR / (x2 - x1)) * w, ry = (holeR / paneLen) * hh;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 2 * PI); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 2 * PI); g.stroke();
    // 玻璃裂纹
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const a = rand(0, 2 * PI), r0 = 1.0, r1 = rand(1.3, 2.2);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * rx * r0, cy + Math.sin(a) * ry * r0);
      g.lineTo(cx + Math.cos(a + rand(-0.15, 0.15)) * rx * r1, cy + Math.sin(a) * ry * r1); g.stroke();
    }
  });
  paneTex.colorSpace = THREE.SRGBColorSpace;
  const paneM = noOL(new THREE.MeshBasicMaterial({ map: paneTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  const paneM2 = glass(0xc8e1ff, 0.3);
  const front = plane(x2 - x1, paneLen, paneM);
  const ang = Math.atan2(yr - yb, z2 - zr);
  front.rotation.x = -ang; front.position.set(xc, (yb + yr) / 2, (z2 + zr) / 2);
  const back = plane(x2 - x1, paneLen, paneM2);
  back.rotation.set(ang, PI, 0); back.position.set(xc, (yb + yr) / 2, (z1 + zr) / 2);
  const tri = (x, flip) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, yb, z1, x, yb, z2, x, yr, zr], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([flip, 0, 0, flip, 0, 0, flip, 0, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    const m = new THREE.Mesh(g, paneM2); ctx.parent.add(m);
  };
  tri(x1, -1); tri(x2, 1);
  // 洞的世界坐标
  const hx = x1 + holeU * (x2 - x1);
  const hy = yb + holeV * (yr - yb);
  const hz = z2 - holeV * (z2 - zr);
  maison.hole = new THREE.Vector3(hx, hy, hz);
  maison.ridge = new THREE.Vector3(hx, yr + 0.03, zr);
  maison.pedestal = new THREE.Vector3(px, H.cornice + 1.1, pz);

  // 抓钩 + 绳子：从屋脊垂下，穿过玻璃上的圆洞，一直垂到沙龙地板
  const hookM = M(0x8a8f9c);
  C(0.035, 0.035, 0.14, hx, yr - 0.02, zr, hookM, null, 8);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * PI * 2;
    tube([hx, yr + 0.02, zr], [hx + Math.cos(a) * 0.12, yr - 0.02, zr + Math.sin(a) * 0.12 - 0.02], 0.012, hookM, null, 4);
  }
  const pts = [
    new THREE.Vector3(hx, yr + 0.08, zr),
    new THREE.Vector3(hx + 0.02, yr + 0.04, zr + 0.25),
    new THREE.Vector3(hx + 0.03, (yr + hy) / 2 + 0.05, (zr + hz) / 2 + 0.05),
    new THREE.Vector3(hx + 0.02, hy + 0.02, hz + 0.02),
    new THREE.Vector3(hx, hy - 0.6, hz + 0.02),
    new THREE.Vector3(hx - 0.02, hy - 1.6, hz),
    new THREE.Vector3(hx - 0.05, H.cornice + 0.4, hz - 0.02),
    new THREE.Vector3(hx + 0.12, H.cornice + 0.07, hz - 0.2),
    new THREE.Vector3(hx + 0.35, H.cornice + 0.07, hz - 0.3),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const ropeGeo = new THREE.TubeGeometry(curve, 90, 0.022, 6, false);
  const rope = new THREE.Mesh(ropeGeo, thinOL(M(0x9c2f2a), 0.0012));
  rope.userData.keep = true; rope.frustumCulled = false;
  ctx.parent.add(rope);
  maison.rope = { mesh: rope, rest: Float32Array.from(ropeGeo.attributes.position.array), top: hy, bot: H.cornice + 0.4 };
}

export function makeCardTexture() {
  return ct(256, 170, (g, w, h) => {
    g.fillStyle = '#fbf6ee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9a45c'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#2a1a1a'; g.textAlign = 'center';
    g.font = `italic 600 26px ${FONT_SERIF}`; g.fillText('Merci pour', w / 2, 42);
    g.fillText('l\u2019Étoile ♡', w / 2, 74);
    g.font = `italic 700 22px ${FONT_SERIF}`; g.fillText('— F.', w / 2 + 50, 150);
    // 唇印
    g.save(); g.translate(78, 128); g.rotate(-0.25); g.fillStyle = '#c8102e';
    g.beginPath(); g.moveTo(-30, 0); g.bezierCurveTo(-24, -16, -8, -18, 0, -8); g.bezierCurveTo(8, -18, 24, -16, 30, 0);
    g.bezierCurveTo(20, 4, 10, 3, 0, 3); g.bezierCurveTo(-10, 3, -20, 4, -30, 0); g.fill();
    g.beginPath(); g.moveTo(-30, 2); g.bezierCurveTo(-18, 22, 18, 22, 30, 2); g.bezierCurveTo(18, 7, -18, 7, -30, 2); g.fill();
    g.restore();
  });
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);
/** 动画：闪光、激光、警铃 */
export function animateMaison(dt, t) {
  maison.sparkles.forEach((s) => {
    const k = Math.pow(Math.max(0, Math.sin(t * s.sp2 + s.ph)), 6);
    s.sp.material.opacity = 0.15 + 0.85 * k;
    s.sp.scale.setScalar(s.size * (0.5 + 0.7 * k));
    s.sp.material.rotation = t * 0.5 + s.ph;
  });
  const S = maison.salon;
  if (S) {
    const alarm = state.alarm;
    maison.lasers.forEach((L, i) => {
      const sweep = Math.sin(t * L.sp * (alarm ? 3 : 1) + L.ph);
      const a = _a, b = _b;
      if (L.horiz) {
        const z = S.z1 + 0.2 + (S.z2 - S.z1 - 0.4) * (0.5 + 0.5 * sweep);
        a.set(S.x1 + 0.02, L.y, z); b.set(S.x2 - 0.02, L.y + 0.15 * Math.sin(t + i), (S.z1 + S.z2) - z);
      } else {
        const x = S.x1 + 0.2 + (S.x2 - S.x1 - 0.4) * (0.5 + 0.5 * sweep);
        a.set(x, L.y, S.z1 + 0.02); b.set((S.x1 + S.x2) - x, L.y - 0.1, S.z2 - 0.02);
      }
      const len = a.distanceTo(b);
      L.g.position.copy(a).add(b).multiplyScalar(0.5);
      L.g.quaternion.setFromUnitVectors(_UP, _d.copy(b).sub(a).normalize());
      L.g.scale.set(1, len, 1);
      L.g.children[0].material.opacity = alarm ? 0.6 + 0.4 * Math.sin(t * 20) : 0.9;
    });
  }
  if (maison.rope) {
    const R = maison.rope, pos = R.mesh.geometry.attributes.position, arr = pos.array, rest = R.rest;
    const sw = Math.sin(t * 1.3) * 0.06 + Math.sin(t * 3.1) * 0.015;
    const sw2 = Math.cos(t * 1.1) * 0.04;
    for (let k = 0; k < pos.count; k++) {
      const y = rest[k * 3 + 1];
      const f = y < R.top && y > R.bot - 0.1 ? Math.sin(Math.min(1, (R.top - y) / (R.top - R.bot)) * PI * 0.5) : 0;
      arr[k * 3] = rest[k * 3] + sw * f;
      arr[k * 3 + 2] = rest[k * 3 + 2] + sw2 * f;
    }
    pos.needsUpdate = true;
  }
  if (maison.alarmLamp) {
    const on = state.alarm && Math.sin(t * 12) > 0;
    maison.alarmLamp.lampMat.color.setHex(on ? 0xff3030 : 0x551010);
    maison.alarmLamp.halo.material.opacity = on ? 0.9 : 0;
  }
}
