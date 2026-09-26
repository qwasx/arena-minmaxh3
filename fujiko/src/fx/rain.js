// 雨：雨丝、水洼涟漪、落地水花、屋檐滴水（先长水珠再掉）、橱窗玻璃上的水珠和走走停停的水流
import * as THREE from 'three';
import { softDotTex, ct, PI } from '../core/helpers.js';
import { frand } from '../core/rng.js';
import { state, glassPanes } from '../core/registry.js';
import { RAIN_COUNT, HIGH } from '../core/env.js';
import { HALF, groundAt, CAFE, SW_H } from '../world/layout.js';
import { puddles } from '../world/ground.js';
import { maison } from '../world/maison.js';

const TOP = 18.5;
const WIND = 0.085;
const N = 128;
let grid, cell;
export const rain = { fade: 1 };

function hAt(x, z) {
  let i = Math.floor((x + HALF) / cell), j = Math.floor((z + HALF) / cell);
  if (i < 0) i = 0; else if (i >= N) i = N - 1;
  if (j < 0) j = 0; else if (j >= N) j = N - 1;
  return grid[j * N + i];
}
function inPuddle(x, z) {
  for (const p of puddles) {
    const dx = x - p.x, dz = z - p.z;
    const c = Math.cos(-p.rot), s = Math.sin(-p.rot);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if ((lx * lx) / (p.sx * p.sx) + (lz * lz) / (p.sz * p.sz) < 1) return p;
  }
  return null;
}

// ---------------------------------------------------------------- 点精灵材质（每个点有自己的大小和透明度）
const ptVS = `
attribute float size; attribute float alpha;
uniform float scale;
varying float vA;
void main(){
  vA = alpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * projectionMatrix[1][1] * scale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const ptFS = `
uniform sampler2D map; uniform vec3 color;
varying float vA;
void main(){
  vec4 t = texture2D(map, gl_PointCoord);
  float a = t.a * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(color * t.rgb, a);
}`;
const pointMats = [];
function pointsMat(color, tex, additive = false) {
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, color: { value: new THREE.Color(color) }, scale: { value: innerHeight / 2 } },
    vertexShader: ptVS, fragmentShader: ptFS, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  m.userData.outlineParameters = { visible: false };
  pointMats.push(m);
  return m;
}
export function setRainPixelScale(h) { pointMats.forEach((m) => { m.uniforms.scale.value = h / 2; }); }

function makePoints(n, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

const dropTex = ct(64, 64, (g) => {
  const gr = g.createRadialGradient(28, 26, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(210,225,255,0.75)');
  gr.addColorStop(0.8, 'rgba(160,180,230,0.35)');
  gr.addColorStop(1, 'rgba(160,180,230,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 2 * PI); g.fill();
});

export function buildRain(scene) {
  // 高度网格（比每次调用 groundAt 快很多）
  cell = (HALF * 2) / N;
  grid = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) grid[j * N + i] = groundAt(-HALF + (i + 0.5) * cell, -HALF + (j + 0.5) * cell);

  // ---------- 雨丝 ----------
  const n = RAIN_COUNT;
  const pos = new Float32Array(n * 6), col = new Float32Array(n * 8);
  const d = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) {
    resetDrop(d, i, true);
    col.set([0.78, 0.85, 1.0, 0.5, 0.78, 0.85, 1.0, 0.0], i * 8);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  lg.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  lines.frustumCulled = false;
  lines.material.userData.outlineParameters = { visible: false };
  scene.add(lines);
  Object.assign(rain, { lines, pos, d, n });

  // ---------- 涟漪（InstancedMesh，一次绘制）----------
  const RIP = HIGH ? 180 : 90;
  const ringGeo = new THREE.RingGeometry(0.78, 1, 28);
  ringGeo.rotateX(-PI / 2);
  const ripples = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), RIP);
  ripples.material.userData.outlineParameters = { visible: false };
  ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ripples.setColorAt(0, new THREE.Color());
  ripples.frustumCulled = false;
  ripples.renderOrder = 3;
  scene.add(ripples);
  rain.ripples = ripples;
  rain.rip = Array.from({ length: RIP }, () => ({ x: 0, y: 0, z: 0, t: 1, dur: 0.6, size: 0.25 }));
  rain.ripIdx = 0;

  // ---------- 水花 ----------
  const SPL = HIGH ? 140 : 70;
  const splashes = makePoints(SPL, pointsMat(0xcfdcff, softDotTex, true));
  scene.add(splashes);
  rain.splashes = splashes;
  rain.spl = Array.from({ length: SPL }, () => ({ x: 0, y: -99, z: 0, t: 1, vy: 0, vx: 0, vz: 0 }));
  rain.splIdx = 0;

  // ---------- 屋檐滴水 ----------
  const src = [];
  for (let x = CAFE.x1 + 0.4; x < CAFE.x2 - 0.3; x += 0.55) src.push([x + frand(-0.1, 0.1), 2.44, CAFE.z2 + 1.5]);
  for (let x = -5.7; x < 0.4; x += 0.8) src.push([x + frand(-0.2, 0.2), 4.04, -0.57]);
  for (let z = -8.7; z < -2.6; z += 0.9) src.push([2.45, 4.04, z + frand(-0.2, 0.2)]);
  for (let x = -5.5; x < 0.3; x += 1.2) src.push([x, 9.98, -0.67]);
  for (let z = -8.5; z < -2.6; z += 1.4) src.push([2.35, 9.98, z]);
  if (maison.marquise) {
    maison.marquise.updateMatrixWorld(true);
    for (let k = 0; k < 5; k++) {
      const p = maison.marquise.localToWorld(new THREE.Vector3(-1.1 + k * 0.55, -0.05, 0.97));
      src.push([p.x, p.y, p.z]);
    }
  }
  for (let k = 0; k < 7; k++) { const a = (k / 7) * PI * 2; src.push([-4.9 + Math.cos(a) * 0.7, SW_H + 2.86, 10.45 + Math.sin(a) * 0.7]); }
  for (let k = 0; k < 7; k++) { const a = (k / 7) * PI * 2 + 0.3; src.push([-10.1 + Math.cos(a) * 1.0, SW_H + 2.2, 10.35 + Math.sin(a) * 1.0]); }
  rain.drips = src.map(([x, y, z]) => ({ x, y, z, grow: frand(0, 1), rate: frand(0.35, 1.1), falling: false, fy: 0, v: 0, g: hAt(x, z) }));
  const beads = makePoints(src.length, pointsMat(0xdfe9ff, dropTex, false));
  scene.add(beads);
  rain.beads = beads;
  const dg = new THREE.BufferGeometry();
  const dpos = new Float32Array(src.length * 6), dcol = new Float32Array(src.length * 8);
  for (let i = 0; i < src.length; i++) dcol.set([0.85, 0.9, 1, 0.85, 0.85, 0.9, 1, 0.0], i * 8);
  dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3).setUsage(THREE.DynamicDrawUsage));
  dg.setAttribute('color', new THREE.BufferAttribute(dcol, 4));
  const dripLines = new THREE.LineSegments(dg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  dripLines.material.userData.outlineParameters = { visible: false };
  dripLines.frustumCulled = false;
  scene.add(dripLines);
  rain.dripLines = dripLines;

  // ---------- 玻璃上的水珠 + 水流 ----------
  scene.updateMatrixWorld(true);
  const panes = glassPanes.map((p) => ({ ...p, mat: p.mesh.matrixWorld.clone() }));
  rain.panes = panes;
  const stat = [];
  panes.forEach((p, pi) => {
    const cnt = Math.round(p.w * p.h * (HIGH ? 16 : 9));
    for (let k = 0; k < cnt; k++) stat.push({ pi, u: frand(0.03, 0.97), v: frand(0.04, 0.98), s: frand(0.018, 0.05), a: frand(0.35, 0.9) });
  });
  const sp = makePoints(stat.length, pointsMat(0xe8f0ff, dropTex, false));
  {
    const P = sp.geometry.attributes.position, S = sp.geometry.attributes.size, A = sp.geometry.attributes.alpha;
    const v = new THREE.Vector3();
    stat.forEach((o, i) => {
      const p = panes[o.pi];
      v.set((o.u - 0.5) * p.w, (o.v - 0.5) * p.h, 0.02).applyMatrix4(p.mat);
      P.setXYZ(i, v.x, v.y, v.z); S.setX(i, o.s); A.setX(i, o.a);
    });
  }
  scene.add(sp);
  rain.glassStatic = sp;
  const RIV = HIGH ? 64 : 32;
  rain.riv = Array.from({ length: RIV }, () => newRivulet(panes));
  const rh = makePoints(RIV, pointsMat(0xf0f6ff, dropTex, false));
  scene.add(rh);
  rain.rivHeads = rh;
  const tg = new THREE.BufferGeometry();
  const tpos = new Float32Array(RIV * 6), tcol = new Float32Array(RIV * 8);
  for (let i = 0; i < RIV; i++) tcol.set([0.9, 0.95, 1, 0.55, 0.9, 0.95, 1, 0.0], i * 8);
  tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3).setUsage(THREE.DynamicDrawUsage));
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 4));
  const trails = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  trails.material.userData.outlineParameters = { visible: false };
  trails.frustumCulled = false;
  scene.add(trails);
  rain.trails = trails;
}

function newRivulet(panes, stagger = true) {
  const pi = Math.floor(Math.random() * panes.length);
  const v0 = frand(0.65, 0.98);
  return { pi, u: frand(0.05, 0.95), v: stagger ? frand(0.05, v0) : v0, v0, speed: 0, wait: frand(0, 3), s: frand(0.035, 0.06), wob: frand(0, 6) };
}

function resetDrop(d, i, initial) {
  const x = frand(-HALF, HALF), z = frand(-HALF, HALF);
  const k = i * 5;
  d[k] = x; d[k + 2] = z;
  d[k + 1] = initial ? frand(hAt(x, z), TOP) : TOP + frand(0, 4);
  d[k + 3] = frand(15, 21);
  d[k + 4] = frand(0.28, 0.46);
}

function spawnRipple(x, y, z, size = 0.26) {
  const r = rain.rip[rain.ripIdx];
  rain.ripIdx = (rain.ripIdx + 1) % rain.rip.length;
  r.x = x; r.y = y; r.z = z; r.t = 0; r.dur = frand(0.5, 0.8); r.size = size * frand(0.7, 1.2);
}
function spawnSplash(x, y, z) {
  for (let k = 0; k < 2; k++) {
    const s = rain.spl[rain.splIdx];
    rain.splIdx = (rain.splIdx + 1) % rain.spl.length;
    s.x = x; s.y = y + 0.02; s.z = z; s.t = 0; s.vy = frand(0.8, 1.6); s.vx = frand(-0.5, 0.5); s.vz = frand(-0.5, 0.5);
  }
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _v = new THREE.Vector3();

export function animateRain(dt, t) {
  const on = state.rain;
  rain.fade += ((on ? 1 : 0) - rain.fade) * Math.min(1, dt * 2.5);
  const fade = rain.fade;
  const { d, pos, n } = rain;
  rain.lines.visible = fade > 0.02;
  rain.lines.material.opacity = fade;
  const active = Math.floor(n * fade);
  // 雨丝
  for (let i = 0; i < n; i++) {
    const k = i * 5, o = i * 6;
    if (i >= active) { pos[o + 1] = pos[o + 4] = -50; continue; }
    const sp = d[k + 3];
    d[k + 1] -= sp * dt;
    d[k] += sp * WIND * dt;
    if (d[k] > HALF) d[k] -= HALF * 2;
    const g = hAt(d[k], d[k + 2]);
    if (d[k + 1] < g) {
      const x = d[k], z = d[k + 2];
      if (g < 0.2) {
        const pd = inPuddle(x, z);
        if (pd) { if (Math.random() < 0.55) spawnRipple(x, pd.y, z); }
        else if (Math.random() < 0.12) spawnSplash(x, g, z);
        else if (Math.random() < 0.05) spawnRipple(x, g + 0.006, z, 0.16);
      } else if (Math.random() < 0.18) spawnSplash(x, g, z);
      resetDrop(d, i, false);
    }
    const len = d[k + 4];
    pos[o] = d[k]; pos[o + 1] = d[k + 1]; pos[o + 2] = d[k + 2];
    pos[o + 3] = d[k] - WIND * len; pos[o + 4] = d[k + 1] + len; pos[o + 5] = d[k + 2];
  }
  rain.lines.geometry.attributes.position.needsUpdate = true;

  // 涟漪
  const R = rain.ripples;
  for (let i = 0; i < rain.rip.length; i++) {
    const r = rain.rip[i];
    if (r.t < 1) {
      r.t += dt / r.dur;
      const k = Math.min(1, r.t);
      const sc = 0.02 + r.size * k;
      _m.compose(_p.set(r.x, r.y, r.z), _q.identity(), _s.set(sc, 1, sc));
      _c.setScalar(0.55 * (1 - k) * (1 - k));
    } else {
      _m.compose(_p.set(0, -99, 0), _q.identity(), _s.set(0.001, 1, 0.001));
      _c.setScalar(0);
    }
    R.setMatrixAt(i, _m); R.setColorAt(i, _c);
  }
  R.instanceMatrix.needsUpdate = true;
  R.instanceColor.needsUpdate = true;

  // 水花
  {
    const P = rain.splashes.geometry.attributes.position, S = rain.splashes.geometry.attributes.size, A = rain.splashes.geometry.attributes.alpha;
    rain.spl.forEach((s, i) => {
      if (s.t < 1) {
        s.t += dt / 0.22;
        s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt; s.vy -= 9 * dt;
        P.setXYZ(i, s.x, s.y, s.z); S.setX(i, 0.07); A.setX(i, 0.8 * (1 - s.t));
      } else A.setX(i, 0);
    });
    P.needsUpdate = S.needsUpdate = A.needsUpdate = true;
  }

  // 屋檐滴水
  {
    const P = rain.beads.geometry.attributes.position, S = rain.beads.geometry.attributes.size, A = rain.beads.geometry.attributes.alpha;
    const L = rain.dripLines.geometry.attributes.position;
    rain.drips.forEach((dr, i) => {
      if (!dr.falling) {
        dr.grow += dt * dr.rate * (0.35 + 0.65 * fade) * (fade > 0.05 ? 1 : 0.02);
        const g = Math.min(1, dr.grow);
        P.setXYZ(i, dr.x, dr.y - 0.02 - g * 0.03, dr.z); S.setX(i, 0.025 + g * 0.05); A.setX(i, 0.35 + g * 0.6);
        L.setXYZ(i * 2, 0, -99, 0); L.setXYZ(i * 2 + 1, 0, -99, 0);
        if (dr.grow >= 1) { dr.falling = true; dr.fy = dr.y - 0.06; dr.v = 0; dr.grow = 0; }
      } else {
        dr.v += 9.8 * dt; dr.fy -= dr.v * dt;
        const tail = Math.min(0.35, dr.v * 0.04);
        L.setXYZ(i * 2, dr.x, dr.fy, dr.z); L.setXYZ(i * 2 + 1, dr.x, dr.fy + tail, dr.z);
        P.setXYZ(i, dr.x, dr.y - 0.02, dr.z); S.setX(i, 0.025); A.setX(i, 0.3);
        if (dr.fy <= dr.g) {
          dr.falling = false;
          const pd = dr.g < 0.2 ? inPuddle(dr.x, dr.z) : null;
          spawnRipple(dr.x, pd ? pd.y : dr.g + 0.006, dr.z, 0.22);
          spawnSplash(dr.x, dr.g, dr.z);
        }
      }
    });
    P.needsUpdate = S.needsUpdate = A.needsUpdate = L.needsUpdate = true;
  }

  // 玻璃水流：走走停停
  {
    const P = rain.rivHeads.geometry.attributes.position, S = rain.rivHeads.geometry.attributes.size, A = rain.rivHeads.geometry.attributes.alpha;
    const T = rain.trails.geometry.attributes.position;
    rain.riv.forEach((r, i) => {
      const p = rain.panes[r.pi];
      if (r.wait > 0) { r.wait -= dt * (0.3 + fade); r.speed = 0; }
      else {
        r.speed = Math.min(0.5, r.speed + dt * 1.2);
        r.v -= (r.speed * dt) / p.h;
        if (Math.random() < dt * 0.9) r.wait = frand(0.2, 1.6) / (0.4 + fade);
      }
      const u = r.u + Math.sin(r.v * 18 + r.wob) * 0.006;
      _v.set((u - 0.5) * p.w, (r.v - 0.5) * p.h, 0.025).applyMatrix4(p.mat);
      P.setXYZ(i, _v.x, _v.y, _v.z); S.setX(i, r.s); A.setX(i, 0.9);
      T.setXYZ(i * 2, _v.x, _v.y, _v.z);
      _v.set((r.u - 0.5) * p.w, (Math.min(r.v0, r.v + 0.35) - 0.5) * p.h, 0.024).applyMatrix4(p.mat);
      T.setXYZ(i * 2 + 1, _v.x, _v.y, _v.z);
      if (r.v < 0.02) Object.assign(r, newRivulet(rain.panes, false));
    });
    P.needsUpdate = S.needsUpdate = A.needsUpdate = T.needsUpdate = true;
  }
}
