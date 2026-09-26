// 木底座 + 铜牌（和 rainy_konbini 一样的"桌上手办"感）
import * as THREE from 'three';
import { ct, M, BX, plane, noOL, radialTex, PI, FONT_SERIF, FONT_JP, fitText } from '../core/helpers.js';
import { rand } from '../core/rng.js';
import { HALF, METRO } from './layout.js';

export function buildBase(scene) {
  const woodTex = ct(1024, 128, (g, w, h) => {
    g.fillStyle = '#3a2820'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${rand(15, 35) | 0},${rand(8, 18) | 0},6,${rand(0.2, 0.55)})`;
      g.lineWidth = rand(1, 3.5);
      const y = rand(0, h);
      g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + rand(-8, 8), w * 0.6, y + rand(-8, 8), w, y + rand(-5, 5));
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { // 木节
      const x = rand(0, w), y = rand(10, h - 10);
      g.strokeStyle = 'rgba(20,10,5,0.4)'; g.lineWidth = 1.5;
      for (let r = 3; r < 14; r += 3) { g.beginPath(); g.ellipse(x, y, r * 2.2, r * 0.7, 0, 0, 2 * PI); g.stroke(); }
    }
  });
  const baseMat = M(0xffffff, { map: woodTex });
  // 木底座：顶面不画（地铁口要往下开洞）
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  BX(-HALF - 0.35, HALF + 0.35, -1.6, -0.14, -HALF - 0.35, HALF + 0.35, [baseMat, baseMat, hidden, baseMat, baseMat, baseMat], scene);
  // 深色顶板（绕开地铁口）
  const plate = 0x23262f, e = HALF + 0.15;
  BX(-e, e, -0.14, 0.0, -e, METRO.z1, plate);
  BX(-e, e, -0.14, 0.0, METRO.z2, e, plate);
  BX(-e, METRO.x1, -0.14, 0.0, METRO.z1, METRO.z2, plate);
  BX(METRO.x2, e, -0.14, 0.0, METRO.z1, METRO.z2, plate);
  // 金色压条
  const trim = M(0xc9a45c), t0 = HALF + 0.37, t1 = HALF + 0.3;
  BX(-t0, t0, -0.2, -0.14, t1, t0, trim);
  BX(-t0, t0, -0.2, -0.14, -t0, -t1, trim);
  BX(-t0, -t1, -0.2, -0.14, -t1, t1, trim);
  BX(t1, t0, -0.2, -0.14, -t1, t1, trim);

  // 铜牌
  const plaqueTex = ct(1024, 200, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#f0d594'); gr.addColorStop(0.5, '#d4ad62'); gr.addColorStop(1, '#a47b37');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6d4e1f'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 1.5; g.strokeRect(20, 20, w - 40, h - 40);
    g.fillStyle = '#3f2a0f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'パリの雨夜 · 峰不二子', w - 120, 62, FONT_JP, '700');
    g.fillText('パリの雨夜 · 峰不二子', w / 2, 78);
    fitText(g, 'THE WOMAN ON THE ROOF  —  PARIS  ·  1 : 64', w - 140, 34, FONT_SERIF, '600');
    g.fillText('THE WOMAN ON THE ROOF  —  PARIS  ·  1 : 64', w / 2, 142);
    // 小钻石装饰
    g.fillStyle = '#6d4e1f';
    [[70, 100], [w - 70, 100]].forEach(([x, y]) => {
      g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 16, y); g.lineTo(x, y + 22); g.lineTo(x - 16, y); g.closePath(); g.fill();
    });
  });
  const p = plane(5.4, 1.05, M(0xffffff, { map: plaqueTex }));
  p.position.set(0, -0.86, HALF + 0.352);

  // 底座下方的柔和阴影
  const s = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    noOL(new THREE.MeshBasicMaterial({ map: radialTex, color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false })),
  );
  s.rotation.x = -PI / 2; s.position.y = -1.62;
  scene.add(s);
}
