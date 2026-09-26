// 载具：法国警车 ×2（旋转警灯）、鲁邦的黄色菲亚特 500（鲁邦从天窗探出头）、不二子的红色摩托、警用直升机（探照灯）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  ct, M, B, BX, C, plane, noOL, basic, glowMat, glass, PI, rr, sphere, lathe, tube, group,
  radialTex, softDotTex, FONT_SERIF, FONT_SANS, fitText, keep, anim, clamp, lerp,
} from '../core/helpers.js';
import { rand } from '../core/rng.js';
import { state } from '../core/registry.js';
import { ROAD_Y, SW_H, FUJIKO_POS, groundAt } from './layout.js';

export const vehicles = { police: [], heli: null, fiat: null, moto: null, lupin: null };

const glassDark = M(0x1a2238);
const tireM = M(0x151519);
const chromeM = M(0xc9ced8);

function rbox(w, h, d, seg, r, mats) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mats);
}
function wheel(g, x, y, z, r, w) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), tireM);
  m.rotation.x = PI / 2; m.position.set(x, y, z); g.add(m);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12), chromeM);
  hub.rotation.x = PI / 2; hub.position.set(x, y, z); g.add(hub);
  return m;
}
function sprite(color, size, op = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1);
  return s;
}

// ================================================================ 贴图
const policeSide = ct(1024, 192, (g, w, h) => {
  g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1b3a8f'; g.fillRect(0, h * 0.42, w, h * 0.3);
  g.fillStyle = '#e1202e'; g.fillRect(0, h * 0.74, w, h * 0.06);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 64px ${FONT_SANS}`; g.fillText('POLICE', w * 0.5, h * 0.575);
  g.strokeStyle = 'rgba(40,50,70,0.5)'; g.lineWidth = 3;
  [0.36, 0.62].forEach((u) => { g.beginPath(); g.moveTo(w * u, 0); g.lineTo(w * u, h * 0.9); g.stroke(); });
  g.fillStyle = '#1b1d24';
  [0.18, 0.82].forEach((u) => { g.beginPath(); g.ellipse(w * u, h, w * 0.1, h * 0.52, 0, PI, 2 * PI); g.fill(); });
});
const policeFront = ct(512, 192, (g, w, h) => {
  g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1b1d24'; rr(g, w * 0.3, h * 0.45, w * 0.4, h * 0.28, 12); g.fill();
  g.fillStyle = '#fffbe8'; rr(g, w * 0.05, h * 0.38, w * 0.2, h * 0.2, 14); g.fill(); rr(g, w * 0.75, h * 0.38, w * 0.2, h * 0.2, 14); g.fill();
  g.fillStyle = '#1b3a8f'; g.fillRect(0, h * 0.8, w, h * 0.08);
  g.fillStyle = '#f4f4f4'; g.fillRect(w * 0.4, h * 0.82, w * 0.2, h * 0.12);
});
const policeRear = ct(512, 192, (g, w, h) => {
  g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d4101e'; rr(g, w * 0.04, h * 0.35, w * 0.2, h * 0.18, 10); g.fill(); rr(g, w * 0.76, h * 0.35, w * 0.2, h * 0.18, 10); g.fill();
  g.fillStyle = '#fff'; g.fillRect(w * 0.36, h * 0.55, w * 0.28, h * 0.16);
  g.fillStyle = '#1b3a8f'; g.fillRect(0, h * 0.78, w, h * 0.06);
});
const policeTop = ct(512, 256, (g, w, h) => {
  g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w * 0.84, h / 2); g.rotate(PI / 2);
  g.fillStyle = '#1b3a8f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 54px ${FONT_SANS}`;
  g.fillText('POLICE', 0, 0); g.restore();
});
const cabinSide = (body, win) => ct(512, 128, (g, w, h) => {
  g.fillStyle = body; g.fillRect(0, 0, w, h);
  g.fillStyle = win;
  rr(g, w * 0.08, h * 0.16, w * 0.38, h * 0.62, 10); g.fill();
  rr(g, w * 0.52, h * 0.16, w * 0.38, h * 0.62, 10); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(w * 0.1, h * 0.2, w * 0.2, h * 0.08);
});

// ================================================================ 警车
function policeCar(x, z, ry, withLights) {
  const g = group(x, ROAD_Y, z, ry, null);
  const white = M(0xf4f6fa);
  const side = M(0xffffff, { map: policeSide });
  const bodyMats = [M(0xffffff, { map: policeFront }), M(0xffffff, { map: policeRear }), M(0xffffff, { map: policeTop }), M(0x222229), side, side];
  const body = rbox(3.6, 0.64, 1.6, 3, 0.2, bodyMats); body.position.y = 0.54; g.add(body);
  const cs = M(0xffffff, { map: cabinSide('#f4f6fa', '#1a2238') });
  const cab = rbox(1.9, 0.56, 1.44, 3, 0.17, [glassDark, glassDark, white, white, cs, cs]);
  cab.position.set(-0.2, 1.08, 0); g.add(cab);
  [[1.18, 0.74], [-1.18, 0.74], [1.18, -0.74], [-1.18, -0.74]].forEach(([wx, wz]) => wheel(g, wx, 0.31, wz, 0.31, 0.24));
  // 警灯架
  BX(-0.62, 0.22, 1.36, 1.43, -0.5, 0.5, M(0x22252e), g);
  const mkDome = (col, zz) => {
    const mat = noOL(basic(col));
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10, 0, PI * 2, 0, PI / 2), mat);
    d.position.set(-0.2, 1.43, zz); g.add(d);
    const glow = sprite(col, 1.6, 0.0); glow.position.set(-0.2, 1.55, zz); g.add(glow);
    // 旋转光扇
    const fan = new THREE.Group(); fan.position.set(-0.2, 1.5, zz); g.add(fan); anim(fan);
    const fm = glowMat(softDotTex, col, 0.0);
    const fg = new THREE.PlaneGeometry(2.6, 0.5); fg.translate(1.3, 0, 0);
    const f1 = new THREE.Mesh(fg, fm); fan.add(f1);
    const f2 = new THREE.Mesh(fg, fm); f2.rotation.x = PI / 2; fan.add(f2);
    return { mat, glow, fan, fm, col: new THREE.Color(col) };
  };
  const blue = mkDome(0x2f6bff, 0.22);
  const red = mkDome(0xff2a3a, -0.22);
  // 车头灯
  const hl = [0.5, -0.5].map((zz) => { const s = sprite(0xfff4d8, 0.9, 0.85); s.position.set(1.84, 0.62, zz); g.add(s); return s; });
  const tl = [0.55, -0.55].map((zz) => { const s = sprite(0xff2020, 0.6, 0.6); s.position.set(-1.84, 0.66, zz); g.add(s); return s; });
  // 车灯照在路上的光
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), glowMat(radialTex, 0xfff0cc, 0.28));
  pool.rotation.x = -PI / 2; pool.position.set(3.4, 0.03, 0); g.add(pool);
  const car = { g, blue, red, hl, tl, phase: rand(0, 6), withLights, speed: 5.5 };
  vehicles.police.push(car);
  return car;
}

// ================================================================ 鲁邦的菲亚特 500
function fiat500(x, z, ry) {
  const g = group(x, ROAD_Y, z, ry, null);
  const yellow = M(0xf2d24f);
  const sideT = M(0xffffff, { map: cabinSide('#f2d24f', '#1a2238') });
  const roofT = M(0xffffff, {
    map: ct(256, 256, (c, w, h) => {
      c.fillStyle = '#f2d24f'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2b2b30'; rr(c, w * 0.12, h * 0.2, w * 0.76, h * 0.6, 20); c.fill();
      c.fillStyle = '#0c0c10'; rr(c, w * 0.2, h * 0.28, w * 0.6, h * 0.34, 14); c.fill();
    }),
  });
  const frontT = M(0xffffff, {
    map: ct(256, 128, (c, w, h) => {
      c.fillStyle = '#f2d24f'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c9ced8'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(w * 0.3, h * 0.5); c.quadraticCurveTo(w * 0.5, h * 0.38, w * 0.7, h * 0.5); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(w * 0.38, h * 0.74, w * 0.24, h * 0.16);
      c.fillStyle = '#1a1a1a'; c.font = `700 16px ${FONT_SANS}`; c.textAlign = 'center'; c.fillText('L·III', w * 0.5, h * 0.86);
    }),
  });
  const body = rbox(2.5, 0.62, 1.22, 4, 0.28, [frontT, yellow, yellow, M(0x222229), yellow, yellow]);
  body.position.y = 0.48; g.add(body);
  const cab = rbox(1.35, 0.5, 1.08, 4, 0.24, [glassDark, glassDark, roofT, yellow, sideT, sideT]);
  cab.position.set(-0.18, 0.98, 0); g.add(cab);
  [[0.82, 0.55], [-0.82, 0.55], [0.82, -0.55], [-0.82, -0.55]].forEach(([wx, wz]) => wheel(g, wx, 0.2, wz, 0.2, 0.16));
  BX(1.18, 1.28, 0.22, 0.3, -0.58, 0.58, chromeM, g);
  BX(-1.28, -1.18, 0.22, 0.3, -0.58, 0.58, chromeM, g);
  const hlM = noOL(basic(0x8a8570));
  const lamps = [0.4, -0.4].map((zz) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), hlM); l.scale.set(0.5, 1, 1);
    l.position.set(1.2, 0.55, zz); g.add(l);
    C(0.11, 0.11, 0.05, 1.18, 0.55, zz, chromeM, g, 12).rotation.z = PI / 2;
    const s = sprite(0xfff3c8, 1.4, 0); s.position.set(1.32, 0.55, zz); g.add(s);
    return s;
  });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.6), glowMat(radialTex, 0xfff0c8, 0));
  beam.rotation.x = -PI / 2; beam.position.set(3.4, 0.03, 0); g.add(beam);

  // 鲁邦：从天窗探出上半身，痴痴地望着屋顶
  const L = new THREE.Group(); L.position.set(-0.12, 1.12, 0); g.add(L);
  const jacket = M(0xd0262f), shirt = M(0x1f6fb0), skin = M(0xf1c7a0), hair = M(0x17110f);
  const torso = rbox(0.34, 0.34, 0.52, 3, 0.12, jacket); torso.position.y = 0.1; L.add(torso);
  BX(-0.02, 0.16, 0.18, 0.3, -0.06, 0.06, shirt, L).position.x = 0.12;
  BX(0.15, 0.18, 0.08, 0.28, -0.025, 0.025, M(0xf1c232), L);
  const head = new THREE.Group(); head.position.set(0.02, 0.46, 0); L.add(head);
  const hd = sphere(0.15, 0, 0, 0, skin, head, 16, 12); hd.scale.set(1, 1.12, 0.95);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 10, 0, PI * 2, 0, PI * 0.52), hair);
  hairCap.position.set(-0.02, 0.02, 0); hairCap.rotation.z = 0.35; head.add(hairCap);
  BX(0.02, 0.06, -0.12, 0.06, 0.13, 0.155, hair, head); BX(0.02, 0.06, -0.12, 0.06, -0.155, -0.13, hair, head);
  const faceT = ct(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = '#17110f';
    c.beginPath(); c.ellipse(40, 52, 7, 10, 0, 0, 2 * PI); c.fill(); c.beginPath(); c.ellipse(88, 52, 7, 10, 0, 0, 2 * PI); c.fill();
    c.fillStyle = '#ff5f86'; c.font = `900 26px ${FONT_SANS}`; c.textAlign = 'center';
    c.fillText('♥', 40, 60); c.fillText('♥', 88, 60);
    c.strokeStyle = '#6a2a1a'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.arc(64, 82, 24, 0.15 * PI, 0.85 * PI); c.stroke();
    c.fillStyle = '#b02a3a'; c.beginPath(); c.arc(64, 88, 13, 0, PI); c.fill();
  });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.152, 16, 12, -PI * 0.28, PI * 0.56, PI * 0.25, PI * 0.5), noOL(basic(0xffffff, { map: faceT, transparent: true, depthWrite: false })));
  face.rotation.y = PI; face.scale.set(1, 1.12, 0.95); head.add(face);
  // 挥手的胳膊
  const arm = new THREE.Group(); arm.position.set(0, 0.22, -0.26); L.add(arm);
  tube([0, 0, 0], [0.05, 0.34, -0.12], 0.05, jacket, arm, 8);
  sphere(0.06, 0.06, 0.38, -0.13, skin, arm, 10, 8);
  anim(L, head, arm);
  vehicles.fiat = { g, lamps, beam, flash: 0, hlM };
  vehicles.lupin = { g: L, head, arm, wave: 0 };
  return g;
}

// ================================================================ 不二子的摩托（红 + 奶油色）
function motorcycle(x, z, ry) {
  const g = group(x, SW_H, z, ry, null);
  g.rotation.z = 0.0;
  const inner = new THREE.Group(); inner.rotation.x = -0.16; g.add(inner); // 侧撑倾斜
  const red = M(0xc8102e), cream = M(0xf1e4c6), black = M(0x16161a);
  [-0.68, 0.68].forEach((wx) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.07, 8, 24), tireM); w.position.set(wx, 0.36, 0); inner.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), chromeM); hub.rotation.x = PI / 2; hub.position.set(wx, 0.36, 0); inner.add(hub);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * PI * 2; tube([wx, 0.36, 0], [wx + Math.cos(a) * 0.26, 0.36 + Math.sin(a) * 0.26, 0], 0.006, chromeM, inner, 3); }
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 5, 14, PI * 0.9), red);
    fender.position.set(wx, 0.36, 0); fender.rotation.z = wx > 0 ? PI * 0.12 : PI * -0.02; inner.add(fender);
  });
  const tank = sphere(0.2, 0.18, 0.86, 0, red, inner, 16, 12); tank.scale.set(1.6, 0.75, 0.8);
  const stripe = sphere(0.202, 0.18, 0.86, 0, cream, inner, 16, 12); stripe.scale.set(1.55, 0.3, 0.82);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.1, 0.26, 2, 0.05), black); seat.position.set(-0.3, 0.86, 0); inner.add(seat);
  const engine = BX(-0.18, 0.3, 0.36, 0.7, -0.14, 0.14, M(0x5b606c), inner);
  void engine;
  for (let k = 0; k < 4; k++) BX(0.0, 0.26, 0.5 + k * 0.05, 0.52 + k * 0.05, -0.17, 0.17, chromeM, inner);
  tube([0.25, 0.45, 0.14], [-0.8, 0.42, 0.16], 0.04, chromeM, inner, 8);
  tube([-0.8, 0.42, 0.16], [-0.95, 0.47, 0.16], 0.05, chromeM, inner, 8, 0.04);
  tube([-0.3, 0.8, 0], [-0.68, 0.36, 0], 0.03, black, inner, 6);
  tube([0.46, 0.98, 0], [0.68, 0.36, 0], 0.03, chromeM, inner, 6);
  tube([0.46, 0.98, 0], [0.42, 0.62, 0], 0.03, chromeM, inner, 6);
  tube([0.42, 1.08, -0.3], [0.42, 1.08, 0.3], 0.018, chromeM, inner, 6);
  tube([0.42, 1.08, 0], [0.46, 0.98, 0], 0.03, chromeM, inner, 6);
  const hlM = noOL(basic(0x908a70));
  const hlamp = sphere(0.09, 0.56, 0.98, 0, hlM, inner, 12, 10);
  hlamp.scale.set(0.6, 1, 1);
  C(0.1, 0.1, 0.07, 0.52, 0.98, 0, chromeM, inner, 12).rotation.z = PI / 2;
  // 挂在车把上的头盔
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, PI * 2, 0, PI * 0.6), M(0xf1e4c6));
  helm.position.set(0.4, 1.02, 0.34); helm.rotation.set(0.5, 0, -0.4); inner.add(helm);
  const helmStripe = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 5, 16), red);
  helmStripe.position.copy(helm.position); helmStripe.rotation.copy(helm.rotation); helmStripe.rotateX(PI / 2); inner.add(helmStripe);
  const glow = sprite(0xfff3c8, 1.5, 0); glow.position.set(0.68, 0.98, 0); inner.add(glow);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), glowMat(radialTex, 0xfff0c8, 0));
  beam.rotation.x = -PI / 2; beam.position.set(2.4, 0.02, 0); g.add(beam);
  anim(inner);
  vehicles.moto = { g, glow, beam, hlM, rev: 0, inner };
  return g;
}

// ================================================================ 直升机 + 探照灯
const beamVS = `
varying vec3 vN; varying vec3 vV; varying float vAlong;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vAlong = uv.y;
  gl_Position = projectionMatrix * mv;
}`;
const beamFS = `
uniform vec3 color; uniform float opacity; uniform float time;
varying vec3 vN; varying vec3 vV; varying float vAlong;
void main(){
  float f = abs(dot(normalize(vN), normalize(vV)));
  f = pow(f, 1.8);
  float along = pow(vAlong, 1.3);
  float flick = 0.92 + 0.08 * sin(time * 30.0 + vAlong * 40.0);
  float a = f * along * opacity * flick;
  gl_FragColor = vec4(color * a, a);
}`;
export function makeBeam(color, opacity) {
  const geo = new THREE.CylinderGeometry(0.06, 1, 1, 28, 1, true);
  geo.translate(0, -0.5, 0); // 顶点在原点，沿 -y 展开
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity }, time: { value: 0 } },
    vertexShader: beamVS, fragmentShader: beamFS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  mat.userData.outlineParameters = { visible: false };
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

function helicopter(scene) {
  const root = new THREE.Group(); scene.add(root);
  const g = new THREE.Group(); root.add(g);
  const blue = M(0x1d2f6a), white = M(0xeef1f6);
  const body = sphere(0.9, 0, 0, 0, blue, g, 20, 14); body.scale.set(1.5, 0.85, 0.85);
  const belly = sphere(0.9, 0, -0.08, 0, white, g, 20, 14); belly.scale.set(1.46, 0.72, 0.87);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 12, -PI * 0.5, PI, 0, PI * 0.6), M(0x1a2238));
  canopy.position.set(0.55, 0.05, 0); canopy.rotation.z = -0.5; canopy.scale.set(1, 0.9, 1.05); g.add(canopy);
  tube([-0.9, 0.15, 0], [-3.6, 0.4, 0], 0.2, blue, g, 10, 0.08);
  BX(-3.75, -3.35, 0.25, 1.15, -0.04, 0.04, blue, g);
  BX(-3.7, -3.2, 0.3, 0.36, -0.5, 0.5, blue, g);
  const tailRotor = new THREE.Group(); tailRotor.position.set(-3.55, 0.8, 0.1); g.add(tailRotor);
  BX(-0.05, 0.05, -0.45, 0.45, -0.01, 0.01, M(0x2a2a30), tailRotor);
  // 主旋翼
  C(0.12, 0.16, 0.3, 0, 0.7, 0, M(0x2a2a30), g, 10);
  const rotor = new THREE.Group(); rotor.position.set(0, 1.02, 0); g.add(rotor);
  for (let i = 0; i < 4; i++) {
    const b = BX(0, 3.4, -0.02, 0.02, -0.1, 0.1, M(0x2a2a30), rotor);
    b.rotation.y = (i * PI) / 2;
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), noOL(new THREE.MeshBasicMaterial({ color: 0x9aa2b8, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })));
  disc.rotation.x = -PI / 2; disc.position.y = 1.03; g.add(disc);
  // 起落架
  [-0.55, 0.55].forEach((zz) => {
    tube([-0.9, -0.95, zz], [1.1, -0.95, zz], 0.035, M(0x2a2a30), g, 6);
    tube([0.5, -0.95, zz], [0.4, -0.55, zz * 0.7], 0.03, M(0x2a2a30), g, 6);
    tube([-0.5, -0.95, zz], [-0.4, -0.55, zz * 0.7], 0.03, M(0x2a2a30), g, 6);
  });
  // POLICE 字样
  const tagT = ct(256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `900 44px ${FONT_SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POLICE', w / 2, h / 2 + 2); });
  [1, -1].forEach((s) => {
    const p = plane(1.1, 0.28, noOL(basic(0xffffff, { map: tagT, transparent: true, depthWrite: false })), g);
    p.position.set(-0.35, 0.18, s * 0.78); if (s < 0) p.rotation.y = PI;
  });
  // 航行灯
  const navR = sprite(0xff2020, 0.7, 1); navR.position.set(0, -0.2, -0.8); g.add(navR);
  const navG = sprite(0x20ff60, 0.7, 1); navG.position.set(0, -0.2, 0.8); g.add(navG);
  const strobe = sprite(0xffffff, 1.4, 0); strobe.position.set(-3.6, 1.2, 0); g.add(strobe);
  // 探照灯
  const lampHead = C(0.12, 0.16, 0.2, 1.05, -0.6, 0, M(0x2a2a30), g, 10);
  void lampHead;
  const beam = makeBeam(0xdfe8ff, 0.7);
  scene.add(beam);
  const spot = new THREE.SpotLight(0xdfe8ff, 70, 50, 0.12, 0.5, 1.2);
  spot.castShadow = false;
  scene.add(spot); scene.add(spot.target);
  const srcSprite = sprite(0xffffff, 2.2, 0.9); scene.add(srcSprite);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), glowMat(radialTex, 0xeaf2ff, 0.35));
  pool.rotation.x = -PI / 2; scene.add(pool);
  anim(root, g, rotor, tailRotor);
  vehicles.heli = { root, g, rotor, tailRotor, navR, navG, strobe, beam, spot, srcSprite, pool, angle: 1.2, target: new THREE.Vector3(...FUJIKO_POS), lock: 0 };
}

export function buildVehicles(scene) {
  const c1 = policeCar(7.4, 4.3, 2.55, true);
  // 车门打开
  const door = BX(0, 0.9, 0.3, 1.2, -0.03, 0.03, M(0xf4f6fa), c1.g);
  door.position.set(0.55, 0.45, 0.78 + 0.35); door.rotation.y = -0.9;
  policeCar(-4.4, 5.35, 0.28, false);
  fiat500(8.95, -5.2, -PI / 2);
  motorcycle(3.25, -10.3, -PI / 2);
  helicopter(scene);
}

// ================================================================ 动画
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _UP = new THREE.Vector3(0, -1, 0);
export function animateVehicles(dt, t, camera) {
  const alarm = state.alarm;
  vehicles.police.forEach((c, i) => {
    const sp = alarm ? 11 : c.speed;
    const a = t * sp + c.phase;
    c.blue.fan.rotation.y = a;
    c.red.fan.rotation.y = -a + 1.3;
    // 朝向镜头时最亮
    c.g.getWorldPosition(_v);
    const toCam = Math.atan2(camera.position.x - _v.x, camera.position.z - _v.z) - c.g.rotation.y - PI / 2;
    const fb = Math.pow(Math.max(0, Math.cos(a - toCam)), 6);
    const fr = Math.pow(Math.max(0, Math.cos(-a + 1.3 - toCam)), 6);
    const pb = 0.45 + 0.55 * Math.max(0, Math.cos(a * 2));
    const pr = 0.45 + 0.55 * Math.max(0, Math.cos(a * 2 + PI));
    c.blue.mat.color.copy(c.blue.col).multiplyScalar(0.55 + 0.45 * pb);
    c.red.mat.color.copy(c.red.col).multiplyScalar(0.55 + 0.45 * pr);
    c.blue.glow.material.opacity = 0.25 + 0.75 * Math.max(fb, pb * 0.4);
    c.red.glow.material.opacity = 0.25 + 0.75 * Math.max(fr, pr * 0.4);
    c.blue.fm.opacity = 0.22 + 0.1 * pb;
    c.red.fm.opacity = 0.22 + 0.1 * pr;
    c.levels = [pb, pr];
    void i;
  });
  // 直升机绕圈
  const H = vehicles.heli;
  if (H) {
    H.angle += dt * (alarm ? 0.16 : 0.09);
    const R = 10.5, cx = -1.5, cz = -3.2, y = 17.2 + Math.sin(t * 0.4) * 0.4;
    H.root.position.set(cx + Math.cos(H.angle) * R, y, cz + Math.sin(H.angle) * R);
    H.root.rotation.y = -H.angle - PI; // 沿切线
    H.g.rotation.x = -0.12; H.g.rotation.z = -0.06;
    H.rotor.rotation.y = t * 22;
    H.tailRotor.rotation.z = t * 40;
    H.strobe.material.opacity = (t % 1.2) < 0.06 ? 1 : 0;
    H.navR.material.opacity = H.navG.material.opacity = 0.5 + 0.5 * Math.sin(t * 3);
    // 探照灯目标：平时在屋顶上扫，报警时锁定不二子
    const fx = FUJIKO_POS[0], fy = FUJIKO_POS[1], fz = FUJIKO_POS[2];
    const lockT = alarm ? 1 : 0;
    H.lock = lerp(H.lock, lockT, 1 - Math.exp(-dt * 2.5));
    const sx = fx - 1.5 + Math.sin(t * 0.37) * 3.8 + Math.sin(t * 1.1) * 0.6;
    const sz = fz - 2 + Math.cos(t * 0.29) * 3.0;
    const street = Math.sin(t * 0.21) < -0.55; // 偶尔扫到街上
    const sy = street ? 0.1 : fy;
    _v.set(lerp(sx, fx, H.lock), lerp(sy, fy + 1.0, H.lock), lerp(sz, fz, H.lock));
    H.target.lerp(_v, 1 - Math.exp(-dt * 3));
    const src = H.g.localToWorld(_d.set(1.05, -0.75, 0));
    H.spot.position.copy(src);
    H.spot.target.position.copy(H.target);
    H.srcSprite.position.copy(src);
    const dir = _v.copy(H.target).sub(src);
    const len = dir.length();
    dir.normalize();
    H.beam.position.copy(src);
    H.beam.quaternion.setFromUnitVectors(_UP, dir);
    const rad = Math.tan(H.spot.angle) * len * 1.05;
    H.beam.scale.set(rad, len, rad);
    H.beam.material.uniforms.time.value = t;
    H.beam.material.uniforms.opacity.value = 0.45 + 0.2 * H.lock;
    H.pool.position.copy(H.target);
    H.pool.position.y = groundAt(H.target.x, H.target.z) + 0.05;
    H.pool.scale.setScalar(rad * 1.2);
    H.pool.visible = true;
  }
  // 菲亚特闪灯
  const F = vehicles.fiat;
  if (F) {
    let on = 0;
    if (F.flash > 0) { F.flash -= dt; on = Math.sin(F.flash * 18) > 0 ? 1 : 0; }
    F.lamps.forEach((s) => { s.material.opacity = on; });
    F.beam.material.opacity = on * 0.45;
    F.hlM.color.setHex(on ? 0xfff6d0 : 0x8a8570);
  }
  const Lp = vehicles.lupin;
  if (Lp) {
    Lp.wave = Math.max(0, Lp.wave - dt);
    const w = Lp.wave > 0 ? 1 : 0.25;
    Lp.arm.rotation.x = Math.sin(t * (Lp.wave > 0 ? 14 : 3)) * 0.35 * w - 0.1;
    Lp.head.rotation.z = 0.5 + Math.sin(t * 1.3) * 0.05; // 仰头看屋顶
    Lp.head.rotation.y = 0.35 + Math.sin(t * 0.7) * 0.1;
    Lp.g.position.y = 1.12 + (Lp.wave > 0 ? Math.abs(Math.sin(t * 10)) * 0.05 : 0);
  }
  const Mo = vehicles.moto;
  if (Mo) {
    let on = 0;
    if (Mo.rev > 0) { Mo.rev -= dt; on = 1; Mo.inner.position.y = Math.sin(t * 60) * 0.006; } else Mo.inner.position.y = 0;
    Mo.glow.material.opacity = on;
    Mo.beam.material.opacity = on * 0.4;
    Mo.hlM.color.setHex(on ? 0xfff6d0 : 0x908a70);
  }
}
