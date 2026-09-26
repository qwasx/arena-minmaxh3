// 奥斯曼式建筑小工具：石材立面、法式长窗、铁艺阳台、锌皮孟莎屋顶、老虎窗、烟囱
import * as THREE from 'three';
import { ct, M, B, BX, C, plane, noOL, basic, PI, rr, ctx, lathe } from '../core/helpers.js';
import { rand, rnd, pick } from '../core/rng.js';

// ---------------------------------------------------------------- 贴图 / 材质
export const limestoneTex = ct(256, 256, (g, w, h) => {
  g.fillStyle = '#e6d9bf'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(${rand(150, 200) | 0},${rand(130, 170) | 0},${rand(100, 130) | 0},${rand(0.04, 0.12)})`;
    g.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 3));
  }
  // 石材分层（每 0.5 单位一道）
  g.strokeStyle = 'rgba(120,100,70,0.35)'; g.lineWidth = 2;
  for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 64 : 0;
    for (let x = off; x < w; x += 128) { g.beginPath(); g.moveTo(x, r * 64); g.lineTo(x, r * 64 + 64); g.stroke(); }
  }
  // 雨水痕
  for (let i = 0; i < 10; i++) {
    const x = rand(0, w);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(90,80,70,0.10)'); gr.addColorStop(1, 'rgba(90,80,70,0)');
    g.fillStyle = gr; g.fillRect(x, 0, rand(2, 6), h);
  }
}, { repeat: [0.5, 0.5] });

export const rusticTex = ct(256, 256, (g, w, h) => {
  g.fillStyle = '#ddcfb3'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = `rgba(140,120,90,${rand(0.04, 0.1)})`;
    g.fillRect(rand(0, w), rand(0, h), 2, 2);
  }
  // 底层横向深缝（rustication）
  for (let y = 0; y <= h; y += 51) {
    g.fillStyle = 'rgba(90,75,55,0.55)'; g.fillRect(0, y - 3, w, 6);
    g.fillStyle = 'rgba(255,250,235,0.35)'; g.fillRect(0, y + 3, w, 2);
  }
}, { repeat: [0.5, 0.5] });

export const zincTex = ct(256, 256, (g, w, h) => {
  g.fillStyle = '#66738a'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) {
    g.fillStyle = 'rgba(200,215,240,0.35)'; g.fillRect(x, 0, 3, h);
    g.fillStyle = 'rgba(20,25,40,0.35)'; g.fillRect(x + 3, 0, 2, h);
  }
  for (let i = 0; i < 14; i++) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(30,35,50,0.18)'); gr.addColorStop(1, 'rgba(30,35,50,0)');
    g.fillStyle = gr; g.fillRect(rand(0, w), rand(0, h * 0.5), rand(3, 10), h);
  }
}, { repeat: [1, 1] });

export const railTex = (() => {
  const t = ct(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff';
    g.lineWidth = 7; g.beginPath(); g.moveTo(0, 6); g.lineTo(w, 6); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, h - 5); g.lineTo(w, h - 5); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(0, 30); g.lineTo(w, 30); g.stroke();
    // 竖杆
    g.lineWidth = 3.5;
    for (let x = 8; x < w; x += 16) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, h - 5); g.stroke(); }
    // 顶部一排小圆圈 + S 形卷草
    g.lineWidth = 3;
    for (let x = 16; x < w; x += 32) {
      g.beginPath(); g.arc(x, 18, 9, 0, 2 * PI); g.stroke();
      g.beginPath(); g.arc(x, 70, 13, 0, 2 * PI); g.stroke();
      g.beginPath(); g.arc(x, 70, 4, 0, 2 * PI); g.fill();
    }
    for (let x = 0; x < w; x += 64) {
      g.beginPath(); g.moveTo(x + 32, 100); g.bezierCurveTo(x + 10, 96, x + 10, 118, x + 26, 118); g.stroke();
      g.beginPath(); g.moveTo(x + 32, 100); g.bezierCurveTo(x + 54, 96, x + 54, 118, x + 38, 118); g.stroke();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
})();

export const stoneM = M(0xffffff, { map: limestoneTex });
export const rusticM = M(0xffffff, { map: rusticTex });
export const trimM = M(0xeee3cc);
export const trimDarkM = M(0xcdbd9e);
export const ironM = M(0x1b1d24);
export const zincM = M(0xffffff, { map: zincTex, side: THREE.DoubleSide });
export const zincDarkM = M(0x505b6e);
export const railM = noOL(M(0x16181e, { map: railTex, alphaTest: 0.5, side: THREE.DoubleSide }));
export const potM = M(0xc2653d);
export const plasterM = M(0xd8c8ad);

// 窗户贴图：亮灯（不同窗帘）/ 黑窗
function winTex(lit, variant) {
  return ct(96, 192, (g, w, h) => {
    if (lit) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      const warm = ['#ffd99a', '#ffc97a', '#ffe6b8', '#ffbf8a'][variant % 4];
      gr.addColorStop(0, warm); gr.addColorStop(1, '#e89a52');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // 室内剪影：吊灯 / 书架
      g.fillStyle = 'rgba(120,60,20,0.35)';
      if (variant % 3 === 0) { g.fillRect(10, 110, 76, 8); g.fillRect(14, 60, 20, 50); g.fillRect(58, 70, 22, 40); }
      if (variant % 3 === 1) { g.beginPath(); g.arc(48, 40, 10, 0, 2 * PI); g.fill(); g.fillRect(47, 0, 2, 32); }
      // 窗帘
      const cur = ['rgba(150,30,40,0.85)', 'rgba(230,220,200,0.8)', 'rgba(60,90,70,0.8)', 'rgba(170,120,60,0.8)'][variant % 4];
      g.fillStyle = cur;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(26, 0); g.quadraticCurveTo(14, 90, 22, h); g.lineTo(0, h); g.fill();
      g.beginPath(); g.moveTo(w, 0); g.lineTo(w - 26, 0); g.quadraticCurveTo(w - 14, 90, w - 22, h); g.lineTo(w, h); g.fill();
    } else {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#1d2745'); gr.addColorStop(0.5, '#121a33'); gr.addColorStop(1, '#0c1226');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(160,185,255,0.12)';
      g.beginPath(); g.moveTo(0, h * 0.2); g.lineTo(w, 0); g.lineTo(w, h * 0.12); g.lineTo(0, h * 0.34); g.fill();
      if (variant % 2) { g.fillStyle = 'rgba(200,190,170,0.18)'; g.fillRect(4, 0, 18, h); g.fillRect(w - 22, 0, 18, h); }
    }
    // 法式窗格：中缝 + 横档
    g.fillStyle = lit ? '#f4eee2' : '#c9c2b4';
    g.fillRect(w / 2 - 2.5, 0, 5, h);
    [h * 0.3, h * 0.55, h * 0.8].forEach((y) => g.fillRect(0, y - 2, w, 4));
    g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
  });
}
export const winLitMats = [0, 1, 2, 3].map((v) => noOL(basic(0xffffff, { map: winTex(true, v) })));
export const winDarkMats = [0, 1].map((v) => noOL(M(0xffffff, { map: winTex(false, v) })));

/** 会随机开关灯的窗户 */
export const toggleWindows = [];

// ---------------------------------------------------------------- 立面坐标系
/**
 * 立面局部坐标：原点在 a 点，x 沿 a→b，z 朝外（法线），y 向上
 */
export function facadeFrame(ax, az, bx, bz, parent) {
  const g = new THREE.Group();
  g.position.set(ax, 0, az);
  g.rotation.y = Math.atan2(-(bz - az), bx - ax);
  g.userData.len = Math.hypot(bx - ax, bz - az);
  (parent || ctx.parent).add(g);
  return g;
}

/** 石框法式长窗 */
export function stoneWindow(fr, lx, y0, w, h, opts = {}) {
  const litChance = opts.lit ?? 0.35;
  const lit = rnd() < litChance;
  const mat = lit ? pick(winLitMats) : pick(winDarkMats);
  const p = plane(w, h, mat, fr);
  p.position.set(lx, y0 + h / 2, 0.015);
  if (opts.toggle !== false && rnd() < 0.35) {
    p.userData.keep = true;
    toggleWindows.push({ mesh: p, lit, next: rand(4, 30) });
  }
  const T = opts.trim || trimM;
  BX(lx - w / 2 - 0.12, lx - w / 2, y0 - 0.04, y0 + h + 0.04, 0, 0.07, T, fr);
  BX(lx + w / 2, lx + w / 2 + 0.12, y0 - 0.04, y0 + h + 0.04, 0, 0.07, T, fr);
  BX(lx - w / 2 - 0.18, lx + w / 2 + 0.18, y0 - 0.1, y0, 0, 0.13, T, fr);
  if (opts.pediment) {
    // 三角山花
    const sh = new THREE.Shape();
    const hw = w / 2 + 0.24;
    sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(0, 0.34); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
    const m = new THREE.Mesh(geo, T);
    m.position.set(lx, y0 + h + 0.16, 0);
    fr.add(m);
    BX(lx - hw, lx + hw, y0 + h + 0.04, y0 + h + 0.16, 0, 0.16, T, fr);
  } else {
    BX(lx - w / 2 - 0.16, lx + w / 2 + 0.16, y0 + h + 0.04, y0 + h + 0.2, 0, 0.1, T, fr);
    BX(lx - 0.08, lx + 0.08, y0 + h - 0.06, y0 + h + 0.24, 0, 0.12, T, fr); // 拱心石
  }
  return p;
}

/** 铁艺栏杆（贴图 + 扶手） */
export function railing(fr, x1, x2, y, h, z, withTop = true) {
  const len = x2 - x1;
  const geo = new THREE.PlaneGeometry(len, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 0.7));
  const m = new THREE.Mesh(geo, railM);
  m.position.set((x1 + x2) / 2, y + h / 2, z);
  fr.add(m);
  if (withTop) BX(x1, x2, y + h - 0.02, y + h + 0.03, z - 0.035, z + 0.035, ironM, fr);
  return m;
}

/** 通长阳台（楼板 + 牛腿 + 栏杆） */
export function balcony(fr, x1, x2, y, depth = 0.42, h = 0.8) {
  BX(x1, x2, y - 0.1, y, 0, depth, trimM, fr);
  BX(x1, x2, y - 0.16, y - 0.1, 0, depth - 0.06, trimDarkM, fr);
  for (let x = x1 + 0.3; x < x2 - 0.1; x += 0.9) BX(x - 0.06, x + 0.06, y - 0.4, y - 0.1, 0, depth - 0.08, trimM, fr);
  railing(fr, x1, x2, y, h, depth - 0.03);
}

/** 窗前小阳台 */
export function balconnet(fr, lx, w, y) {
  BX(lx - w / 2 - 0.1, lx + w / 2 + 0.1, y - 0.06, y, 0, 0.22, trimM, fr);
  railing(fr, lx - w / 2 - 0.08, lx + w / 2 + 0.08, y, 0.45, 0.2);
}

/** 檐口线脚 */
export function cornice(fr, x1, x2, y, depth = 0.34) {
  BX(x1, x2, y, y + 0.12, 0, depth * 0.5, trimM, fr);
  BX(x1, x2, y + 0.12, y + 0.26, 0, depth * 0.8, trimDarkM, fr);
  BX(x1, x2, y + 0.26, y + 0.4, 0, depth, trimM, fr);
}
export function stringCourse(fr, x1, x2, y, depth = 0.1) {
  BX(x1, x2, y, y + 0.12, 0, depth, trimM, fr);
}

// ---------------------------------------------------------------- 屋顶
/** 凸多边形内缩（offs：每条边的内缩距离；点序为 x-z 平面逆时针） */
export function insetPoly(pts, offs) {
  const n = pts.length, lines = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const nx = -dz / L, nz = dx / L;
    lines.push({ px: ax + nx * offs[i], pz: az + nz * offs[i], dx: dx / L, dz: dz / L });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n], l2 = lines[i];
    const det = l1.dx * l2.dz - l1.dz * l2.dx;
    const t = ((l2.px - l1.px) * l2.dz - (l2.pz - l1.pz) * l2.dx) / det;
    out.push([l1.px + l1.dx * t, l1.pz + l1.dz * t]);
  }
  return out;
}

/** 孟莎坡面：底边 a→b（高 y1），顶边 c→d（高 y2），UV 按底边方向投影 */
export function slopeQuad(a, b, c, d, y1, y2, mat, parent) {
  const geo = new THREE.BufferGeometry();
  const P = [[a[0], y1, a[1]], [b[0], y1, b[1]], [c[0], y2, c[1]], [d[0], y2, d[1]]];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L;
  const slope = Math.hypot(y2 - y1, Math.hypot(d[0] - a[0], d[1] - a[1]) * 0 + 1.0);
  const uvs = P.map(([x, y, z]) => [((x - a[0]) * ux + (z - a[1]) * uz) / 2, ((y - y1) / (y2 - y1)) * slope / 2]);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  (parent || ctx.parent).add(m);
  return m;
}

/** 老虎窗（在立面局部坐标里，站在孟莎坡面上） */
export function dormer(fr, lx, yBase, opts = {}) {
  const w = opts.w || 0.86, h = opts.h || 1.1;
  const zf = opts.zf ?? -0.28; // 正面位置（墙线往里）
  BX(lx - w / 2, lx + w / 2, yBase, yBase + h, zf - 0.9, zf, plasterM, fr);
  BX(lx - w / 2 - 0.06, lx + w / 2 + 0.06, yBase, yBase + h, zf - 0.02, zf + 0.04, trimM, fr);
  const lit = rnd() < (opts.lit ?? 0.4);
  const p = plane(w * 0.62, h * 0.72, lit ? pick(winLitMats) : pick(winDarkMats), fr);
  p.position.set(lx, yBase + h * 0.46, zf + 0.05);
  // 三角小屋顶（锌皮）
  const sh = new THREE.Shape();
  const hw = w / 2 + 0.12;
  sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(0, 0.42); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.05, bevelEnabled: false });
  const roof = new THREE.Mesh(geo, zincDarkM);
  roof.position.set(lx, yBase + h, zf - 0.98);
  fr.add(roof);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry((() => {
    const s = new THREE.Shape(); const hw2 = w / 2 + 0.02;
    s.moveTo(-hw2, 0); s.lineTo(hw2, 0); s.lineTo(0, 0.34); s.closePath(); return s;
  })(), { depth: 0.06, bevelEnabled: false }), trimM);
  ped.position.set(lx, yBase + h + 0.02, zf - 0.02);
  fr.add(ped);
  return p;
}

/** 烟囱：一排陶土烟囱管 */
export function chimney(x1, x2, z1, z2, yBot, yTop, parent) {
  BX(x1, x2, yBot, yTop, z1, z2, plasterM, parent);
  BX(x1 - 0.05, x2 + 0.05, yTop - 0.12, yTop, z1 - 0.05, z2 + 0.05, trimDarkM, parent);
  const alongX = x2 - x1 > z2 - z1;
  const L = alongX ? x2 - x1 : z2 - z1;
  const n = Math.max(1, Math.floor(L / 0.34));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = alongX ? x1 + t * (x2 - x1) : (x1 + x2) / 2;
    const z = alongX ? (z1 + z2) / 2 : z1 + t * (z2 - z1);
    const hh = rand(0.28, 0.42);
    C(0.075, 0.095, hh, x, yTop, z, potM, parent, 10);
    if (rnd() < 0.3) C(0.1, 0.06, 0.12, x, yTop + hh, z, zincDarkM, parent, 8);
  }
}
