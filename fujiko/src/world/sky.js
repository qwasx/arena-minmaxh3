// 远景：金色的埃菲尔铁塔（会闪灯 + 旋转探照灯）、慢慢飘的云
import * as THREE from 'three';
import { ct, PI, noOL, radialTex, keep, anim } from '../core/helpers.js';
import { rand } from '../core/rng.js';
import { makeBeam } from './vehicles.js';

export const sky = { sparkle: 0, clouds: [] };

// 铁塔轮廓：高度 h(0..1) → 半宽（归一化）
function halfWidth(h) {
  if (h < 0.19) return 0.5 - (h / 0.19) * 0.23 - Math.sin((h / 0.19) * PI * 0.5) * 0.02;
  if (h < 0.38) return 0.25 - ((h - 0.19) / 0.19) * 0.11;
  if (h < 0.9) return 0.14 - Math.pow((h - 0.38) / 0.52, 0.8) * 0.115;
  return 0.02;
}

export function buildSky(scene) {
  const W = 512, Hh = 1024;
  const tex = ct(W, Hh, (g) => {
    g.clearRect(0, 0, W, Hh);
    const X = (u) => W / 2 + u * W * 0.92, Y = (h) => Hh - h * Hh * 0.97 - 10;
    // 轮廓路径
    const outline = () => {
      g.beginPath();
      const steps = 80;
      for (let i = 0; i <= steps; i++) { const h = (i / steps) * 0.94; g.lineTo(X(-halfWidth(h)), Y(h)); }
      g.lineTo(X(0), Y(1.0));
      for (let i = steps; i >= 0; i--) { const h = (i / steps) * 0.94; g.lineTo(X(halfWidth(h)), Y(h)); }
      g.closePath();
    };
    g.save();
    outline(); g.clip();
    // 底部大拱门挖空
    g.globalCompositeOperation = 'source-over';
    const gr = g.createLinearGradient(0, Y(1), 0, Y(0));
    gr.addColorStop(0, '#ffe0a0'); gr.addColorStop(0.5, '#ffb24a'); gr.addColorStop(1, '#e8862a');
    g.strokeStyle = gr; g.lineWidth = 2.2;
    // 格构：交叉斜线
    for (let k = -Hh; k < Hh * 2; k += 13) { g.beginPath(); g.moveTo(0, k); g.lineTo(W, k + W * 0.9); g.stroke(); g.beginPath(); g.moveTo(W, k); g.lineTo(0, k + W * 0.9); g.stroke(); }
    g.restore();
    // 边框（亮）
    g.strokeStyle = '#ffd88a'; g.lineWidth = 5; g.shadowColor = '#ffb040'; g.shadowBlur = 14;
    outline(); g.stroke();
    // 平台
    g.fillStyle = '#ffe2a8';
    [[0.19, 0.3], [0.38, 0.17], [0.9, 0.035]].forEach(([h, hw]) => { g.fillRect(X(-hw), Y(h) - 6, X(hw) - X(-hw), 10); });
    // 拱门
    g.shadowBlur = 0;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(X(-0.36), Y(0)); g.quadraticCurveTo(X(0), Y(0.2), X(0.36), Y(0)); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#ffcf7a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(X(-0.36), Y(0)); g.quadraticCurveTo(X(0), Y(0.2), X(0.36), Y(0)); g.stroke();
    // 底部淡出（从雾里升起来）
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(0, 0, 0, Hh);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.55, 'rgba(0,0,0,1)'); fade.addColorStop(0.9, 'rgba(0,0,0,0.15)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, W, Hh);
  });
  const TH = 34, TW = TH * 0.5;
  const root = new THREE.Group();
  root.position.set(-46, -23, -150);
  scene.add(root);
  const mat = noOL(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, opacity: 0.9, fog: false }));
  [0, PI / 2].forEach((ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), mat);
    p.position.y = TH / 2; p.rotation.y = ry; root.add(p);
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xff9a3a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(30, 38, 1); halo.position.y = TH * 0.45; root.add(halo);
  // 顶上的旋转探照灯
  const beacon = new THREE.Group(); beacon.position.y = TH * 0.975; root.add(beacon);
  [0, PI].forEach((a) => {
    const b = makeBeam(0xfff2c8, 0.5);
    b.scale.set(2.2, 60, 2.2);
    b.rotation.set(0, 0, PI / 2 - 0.04); // 光束沿 -y 建模，转成水平略向下
    const holder = new THREE.Group(); holder.rotation.y = a; holder.add(b); beacon.add(holder);
  });
  const top = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  top.scale.set(4, 4, 1); top.position.y = TH * 0.975; root.add(top);
  // 闪灯（整点那种）
  const NP = 420;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(NP * 3), ph = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    let h, u;
    do { h = Math.random() * 0.94; u = (Math.random() * 2 - 1) * halfWidth(h); } while (h < 0.12 && Math.abs(u) < 0.36 - h * 2);
    const plane = i % 2;
    const x = u * TW * 0.92 * 2 * 0.5;
    pos[i * 3] = plane ? 0 : x; pos[i * 3 + 1] = h * TH * 0.97; pos[i * 3 + 2] = plane ? x : 0;
    ph[i] = Math.random() * 100;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const pm = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, amount: { value: 0 }, map: { value: radialTex } },
    vertexShader: `attribute float phase; uniform float time; uniform float amount; varying float vA;
      void main(){ float k = fract(sin(floor(time * 9.0 + phase) * 12.9898 + phase) * 43758.5); vA = step(0.72, k) * amount;
      vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1700.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * t.a * vA, t.a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  pm.userData.outlineParameters = { visible: false };
  const pts = new THREE.Points(g, pm); pts.frustumCulled = false; root.add(pts);
  // 点击区
  const hit = new THREE.Mesh(new THREE.BoxGeometry(TW * 0.8, TH, TW * 0.8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = TH / 2; root.add(hit);
  keep(root); anim(beacon);
  Object.assign(sky, { root, beacon, pts, pm, hit, halo, TH });

  // 云
  const cloudTex = ct(256, 128, (c) => {
    for (let i = 0; i < 26; i++) {
      const x = rand(40, 216), y = rand(40, 90), r = rand(18, 44);
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 2 * PI); c.fill();
    }
  });
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0x5a5a8a, transparent: true, opacity: rand(0.18, 0.32), depthWrite: false, fog: false }));
    const a = rand(0, PI * 2), r = rand(150, 190);
    s.position.set(Math.cos(a) * r, rand(20, 60), Math.sin(a) * r);
    s.scale.set(rand(70, 120), rand(24, 40), 1);
    s.renderOrder = -1;
    scene.add(s);
    sky.clouds.push({ s, a, r, sp: rand(0.004, 0.01) });
  }
}

export function sparkleShow(sec = 10) { sky.sparkle = Math.max(sky.sparkle, sec); }

export function animateSky(dt, t) {
  if (!sky.root) return;
  sky.beacon.rotation.y = t * 0.45;
  sky.sparkle = Math.max(0, sky.sparkle - dt);
  // 平时每 60 秒自动闪 8 秒（模拟整点闪灯）
  const auto = (t % 60) > 50 ? 1 : 0;
  const target = Math.max(auto, sky.sparkle > 0 ? 1 : 0);
  sky.pm.uniforms.amount.value += (target - sky.pm.uniforms.amount.value) * Math.min(1, dt * 3);
  sky.pm.uniforms.time.value = t;
  sky.clouds.forEach((c) => {
    c.a += c.sp * dt;
    c.s.position.x = Math.cos(c.a) * c.r;
    c.s.position.z = Math.sin(c.a) * c.r;
  });
}
