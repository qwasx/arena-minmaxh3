// 建模小工具：三渲二材质、盒子/圆柱/管子、Canvas 贴图
import * as THREE from 'three';

export const PI = Math.PI;
export const TAU = Math.PI * 2;

export const FONT_SERIF = '"Didot","Bodoni 72","Bodoni MT","Playfair Display","Cormorant Garamond",Georgia,"Times New Roman",serif';
export const FONT_SANS = '"Helvetica Neue",Helvetica,Arial,"DejaVu Sans","Noto Sans JP","PingFang SC","Microsoft YaHei",sans-serif';
export const FONT_JP = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Songti SC","SimSun",serif';
export const FONT_JP_SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic","Meiryo","PingFang SC","Microsoft YaHei",sans-serif';

/** 默认挂载点（静态物体组，最后会合并几何体） */
export const ctx = { parent: null };
const P = (p) => p || ctx.parent;

// ---------------------------------------------------------------- textures
export function ct(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (opts.nearest) t.magFilter = THREE.NearestFilter;
  return t;
}

export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function starPath(g, cx, cy, R, r, n = 5, rot = -PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * PI) / n;
    const rad = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath();
}

/** 自动缩小字号直到放得下 */
export function fitText(g, text, maxW, size, font, weight = '') {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 1; } while (g.measureText(text).width > maxW && s > 6);
  return s + 1;
}

// 共享的发光贴图
export const radialTex = ct(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.22, 'rgba(255,255,255,0.6)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
export const softDotTex = ct(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
export const sparkleTex = ct(128, 128, (g, w, h) => {
  g.translate(64, 64);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 20);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 20, 0, 2 * PI); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate((i * PI) / 2);
    g.beginPath(); g.moveTo(0, -3); g.lineTo(62, 0); g.lineTo(0, 3); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate(PI / 4 + (i * PI) / 2);
    g.beginPath(); g.moveTo(0, -2); g.lineTo(30, 0); g.lineTo(0, 2); g.closePath(); g.fill();
    g.restore();
  }
});
export const streakTex = ct(64, 256, (g, w, h) => {
  // 湿地倒影：上亮下暗，被水波打碎成一段段
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const f = Math.pow(1 - y / h, 1.5);
    const band = 0.55 + 0.45 * Math.sin(y * 0.55 + Math.sin(y * 0.13) * 3);
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - w / 2) / (w / 2);
      const wob = 0.15 * Math.sin(y * 0.3);
      const side = Math.max(0, 1 - Math.pow(Math.abs(dx + wob * (1 - dx)), 1.6));
      const a = f * band * side;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
});
export const fadeTex = ct(32, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
export const beamTex = ct(64, 256, (g, w, h) => {
  // 光柱：沿长度渐隐 + 横向中间亮
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const along = Math.pow(1 - y / h, 0.9) * 0.9 + 0.1;
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - w / 2) / (w / 2);
      const across = Math.pow(1 - dx, 0.6);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(along * across * 255);
    }
  }
  g.putImageData(img, 0, 0);
});

// ---------------------------------------------------------------- materials
/** 三渲二色阶：3 档硬边（和原版 rainy_konbini 一样的做法） */
export const gradMap = (() => {
  const d = new Uint8Array([95, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const matCache = new Map();
/** 卡通材质（颜色相同的会复用同一个材质，方便后面合并几何体） */
export function M(color, extra) {
  if (!extra) {
    const key = typeof color === 'number' ? color : String(color);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshToonMaterial({ color, gradientMap: gradMap });
    matCache.set(key, m);
    return m;
  }
  return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradMap }, extra));
}
export function noOL(m) { m.userData.outlineParameters = { visible: false }; return m; }
export function thinOL(m, th = 0.0018) { m.userData.outlineParameters = { thickness: th }; return m; }
export function colOL(m, color, th) {
  m.userData.outlineParameters = Object.assign({ color }, th ? { thickness: th } : {});
  return m;
}
const basicCache = new Map();
export function basic(color, extra) {
  if (!extra) {
    if (basicCache.has(color)) return basicCache.get(color);
    const m = new THREE.MeshBasicMaterial({ color });
    basicCache.set(color, m);
    return m;
  }
  return new THREE.MeshBasicMaterial(Object.assign({ color }, extra));
}
/** 发光（叠加混合、不写深度、不描边） */
export function glowMat(tex, color, op = 1) {
  return noOL(new THREE.MeshBasicMaterial({
    map: tex, color, transparent: true, opacity: op,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
}
export function glass(color = 0xbfd8ff, op = 0.12) {
  return noOL(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
}
const asMat = (m) => (typeof m === 'number' || typeof m === 'string' ? M(m) : m);

// ---------------------------------------------------------------- geometry builders
/** 盒子：底面中心定位 */
export function B(w, h, d, x, y, z, m, parent) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(m) ? m.map(asMat) : asMat(m));
  mesh.position.set(x, y + h / 2, z);
  P(parent).add(mesh);
  return mesh;
}
/** 盒子：用最小/最大坐标定位 */
export function BX(x1, x2, y1, y2, z1, z2, m, parent) {
  return B(x2 - x1, y2 - y1, z2 - z1, (x1 + x2) / 2, y1, (z1 + z2) / 2, m, parent);
}
/** 圆柱：底面中心定位 */
export function C(rt, rb, h, x, y, z, m, parent, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asMat(m));
  mesh.position.set(x, y + h / 2, z);
  P(parent).add(mesh);
  return mesh;
}
const _up = new THREE.Vector3(0, 1, 0);
/** 两点之间的细管 */
export function tube(p1, p2, r, m, parent, seg = 8, r2) {
  const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2);
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, len, seg), asMat(m));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(_up, b.clone().sub(a).normalize());
  P(parent).add(mesh);
  return mesh;
}
export function sphere(r, x, y, z, m, parent, ws = 16, hs = 12) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), asMat(m));
  mesh.position.set(x, y, z);
  P(parent).add(mesh);
  return mesh;
}
export function plane(w, h, m, parent) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), asMat(m));
  P(parent).add(mesh);
  return mesh;
}
export function groundPlane(x1, x2, z1, z2, y, m, parent) {
  const p = plane(x2 - x1, z2 - z1, m, parent);
  p.rotation.x = -PI / 2;
  p.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  return p;
}
export function group(x = 0, y = 0, z = 0, ry = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  P(parent).add(g);
  return g;
}
export function lathe(pts, m, parent, seg = 24, phiStart = 0, phiLen = PI * 2) {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen),
    asMat(m),
  );
  P(parent).add(mesh);
  return mesh;
}
/** 任意四边形（p0→p1→p2→p3 逆时针为正面） */
export function quad(p0, p1, p2, p3, m, parent, uvScale = [1, 1]) {
  const g = new THREE.BufferGeometry();
  const v = [...p0, ...p1, ...p2, ...p3];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const w = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const h = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, w * uvScale[0], 0, w * uvScale[0], h * uvScale[1], 0, h * uvScale[1]], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, asMat(m));
  P(parent).add(mesh);
  return mesh;
}
/** 多边形挤出（xz 平面的轮廓，向上挤 h） */
export function prism(points, y1, y2, m, parent) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: y2 - y1, bevelEnabled: false });
  geo.rotateX(-PI / 2);
  geo.translate(0, y1, 0);
  const mesh = new THREE.Mesh(geo, asMat(m));
  P(parent).add(mesh);
  return mesh;
}
/** 让一组物体不参与几何合并（要动画或要点击的） */
export function keep(o) { o.traverse((c) => { c.userData.keep = true; }); return o; }
/** 标记"会整体运动"的组：组内的静态零件会在组的局部坐标里合并 */
export function anim(...objs) { objs.forEach((o) => { o.userData.anim = true; }); return objs[0]; }

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
export function damp(cur, target, lambda, dt) { return lerp(cur, target, 1 - Math.exp(-lambda * dt)); }

/** 把盒子的 UV 改成世界坐标（贴图按真实尺寸平铺，不会被拉伸） */
export function worldUV(geo, scale = 1) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (nx > 0.5) uv.setXY(i, z * scale, y * scale);
    else if (ny > 0.5) uv.setXY(i, x * scale, z * scale);
    else uv.setXY(i, x * scale, y * scale);
  }
  uv.needsUpdate = true;
  return geo;
}
/** 世界 UV 的盒子（用最小/最大坐标定位） */
export function WB(x1, x2, y1, y2, z1, z2, m, parent) {
  const geo = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  geo.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  worldUV(geo);
  const mesh = new THREE.Mesh(geo, asMat(m));
  P(parent).add(mesh);
  return mesh;
}
