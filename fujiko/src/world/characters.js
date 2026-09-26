// 角色：峰不二子（屋顶，手举钻石）、钱形警部（街上，拿喇叭指着屋顶）、猫头鹰（烟囱上）、黑猫（广告柱顶）
import * as THREE from 'three';
import {
  ct, M, B, BX, C, plane, noOL, basic, glowMat, PI, rr, sphere, lathe, tube, group, thinOL,
  radialTex, sparkleTex, softDotTex, FONT_SERIF, FONT_SANS, keep, anim, clamp, lerp, smooth,
} from '../core/helpers.js';
import { rand } from '../core/rng.js';
import { state } from '../core/registry.js';
import { FUJIKO_POS, ROAD_Y, SW_H, groundAt } from './layout.js';
import { makeCardTexture } from './maison.js';

export const chars = { deformers: [] };

// ---------------------------------------------------------------- 可变形网格（头发 / 风衣下摆随风飘）
/**
 * 锥形管（头发一缕）：points 是 CatmullRom 控制点；返回带 rest 位置的网格
 */
function taperTube(points, r0, r1, mat, parent, segs = 22, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position;
  const rest = new Float32Array(pos.count * 3);
  const along = new Float32Array(pos.count);
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = lerp(r0, r1, Math.pow(t, 0.8)) * (t > 0.92 ? 1 - (t - 0.92) * 8 : 1);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      const x = c.x + (pos.getX(k) - c.x) * r;
      const y = c.y + (pos.getY(k) - c.y) * r;
      const z = c.z + (pos.getZ(k) - c.z) * r;
      pos.setXYZ(k, x, y, z);
      rest[k * 3] = x; rest[k * 3 + 1] = y; rest[k * 3 + 2] = z;
      along[k] = t;
    }
  }
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.userData.keep = true;
  parent.add(m);
  return { mesh: m, rest, along };
}

// ================================================================ 峰不二子
function faceTexture(wink) {
  return ct(1024, 512, (g, w, h) => {
    // 底色：皮肤 + 后脑/头顶的发色
    g.fillStyle = '#f8dccb'; g.fillRect(0, 0, w, h);
    const hair = '#5a2216';
    g.fillStyle = hair;
    g.fillRect(0, 0, w * 0.3, h); g.fillRect(w * 0.7, 0, w * 0.3, h);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.2);
    g.bezierCurveTo(w * 0.62, h * 0.24, w * 0.56, h * 0.16, w * 0.5, h * 0.22);
    g.bezierCurveTo(w * 0.42, h * 0.3, w * 0.36, h * 0.24, 0, h * 0.26); g.closePath(); g.fill();
    // 腮红
    [[w * 0.5 - 92, 330], [w * 0.5 + 92, 330]].forEach(([x, y]) => {
      const gr = g.createRadialGradient(x, y, 2, x, y, 44);
      gr.addColorStop(0, 'rgba(255,120,130,0.32)'); gr.addColorStop(1, 'rgba(255,120,130,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 44, 0, 2 * PI); g.fill();
    });
    const eye = (cx, cy, dir, closed) => {
      // dir：1 = 画面右边那只眼
      g.save(); g.translate(cx, cy); g.scale(dir * 1.22, 1.22);
      if (closed) {
        g.strokeStyle = '#1c1012'; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-30, -2); g.quadraticCurveTo(0, 16, 32, -4); g.stroke();
        g.lineWidth = 4;
        [[-12, 8, -16, 18], [4, 10, 4, 21], [20, 5, 26, 14]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
      } else {
        g.fillStyle = '#fffaf4';
        g.beginPath(); g.moveTo(-32, 2); g.bezierCurveTo(-20, -20, 18, -24, 34, -6); g.bezierCurveTo(22, 14, -12, 18, -32, 2); g.fill();
        g.save(); g.clip();
        const ig = g.createLinearGradient(0, -20, 0, 18);
        ig.addColorStop(0, '#3a1a0c'); ig.addColorStop(1, '#a8652c');
        g.fillStyle = ig; g.beginPath(); g.arc(2, -1, 15, 0, 2 * PI); g.fill();
        g.fillStyle = '#140806'; g.beginPath(); g.arc(2, -1, 7, 0, 2 * PI); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -7, 4.5, 0, 2 * PI); g.fill();
        g.beginPath(); g.arc(8, 5, 2, 0, 2 * PI); g.fill();
        g.restore();
        // 上眼线 + 眼尾上挑
        g.strokeStyle = '#1c1012'; g.lineCap = 'round'; g.lineJoin = 'round';
        g.lineWidth = 8;
        g.beginPath(); g.moveTo(-33, 3); g.bezierCurveTo(-20, -21, 18, -26, 35, -7); g.lineTo(44, -16); g.stroke();
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(8, 12); g.quadraticCurveTo(24, 10, 34, -3); g.stroke();
        // 睫毛
        g.lineWidth = 3.5;
        [[26, -14, 34, -24], [34, -8, 44, -12], [16, -18, 20, -28]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
        // 双眼皮
        g.lineWidth = 2.2; g.strokeStyle = 'rgba(80,30,25,0.6)';
        g.beginPath(); g.moveTo(-22, -20); g.bezierCurveTo(-8, -32, 18, -32, 32, -18); g.stroke();
      }
      // 眉毛
      g.strokeStyle = '#3a1a12'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-30, -44); g.bezierCurveTo(-10, -58, 18, -58, 38, -44); g.stroke();
      g.restore();
    };
    const ex = 70, ey = 276;
    eye(w / 2 - ex, ey, -1, false);
    eye(w / 2 + ex, ey, 1, wink);
    // 鼻子
    g.strokeStyle = 'rgba(200,120,100,0.7)'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w / 2 + 4, 318); g.lineTo(w / 2 - 3, 346); g.lineTo(w / 2 + 6, 350); g.stroke();
    // 红唇
    const lx = w / 2, ly = 402;
    g.fillStyle = '#d10f3a';
    g.beginPath(); g.moveTo(lx - 30, ly); g.bezierCurveTo(lx - 20, ly - 12, lx - 8, ly - 13, lx, ly - 7); g.bezierCurveTo(lx + 8, ly - 13, lx + 20, ly - 12, lx + 30, ly);
    g.bezierCurveTo(lx + 16, ly + 4, lx - 16, ly + 4, lx - 30, ly); g.fill();
    g.beginPath(); g.moveTo(lx - 29, ly + 1); g.bezierCurveTo(lx - 20, ly + 20, lx + 20, ly + 20, lx + 29, ly + 1); g.bezierCurveTo(lx + 14, ly + 5, lx - 14, ly + 5, lx - 29, ly + 1); g.fill();
    g.strokeStyle = '#7a0620'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx - 28, ly + 1); g.quadraticCurveTo(lx, ly + 5, lx + 28, ly + 1); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(lx + 8, ly + 10, 7, 3, -0.1, 0, 2 * PI); g.fill();
  });
}

function buildFujiko(scene) {
  const [fx, fy, fz] = FUJIKO_POS;
  const root = new THREE.Group(); root.position.set(fx, fy, fz); root.rotation.y = 0.5; root.scale.setScalar(1.2); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const skin = M(0xf8dccb), red = M(0xc8102e), redDark = M(0xa00c26);
  const hairM = M(0x5a2216), coatM = M(0xeadfc6, { side: THREE.DoubleSide }), gold = M(0xe8c060);

  // ---- 腿 + 红色高跟鞋 ----
  const leg = (hip, knee, ankle, footRy) => {
    tube(hip, knee, 0.068, skin, body, 10, 0.05);
    sphere(0.05, ...knee, skin, body, 10, 8);
    tube(knee, ankle, 0.05, skin, body, 10, 0.03);
    const shoe = new THREE.Group(); shoe.position.set(ankle[0], 0, ankle[2]); shoe.rotation.y = footRy; body.add(shoe);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), red); toe.scale.set(0.75, 0.5, 1.6); toe.position.set(0, 0.03, 0.08); shoe.add(toe);
    tube([0, 0.13, -0.01], [0, 0.03, 0.1], 0.036, red, shoe, 8, 0.03);
    tube([0, 0.1, -0.04], [0, 0.0, -0.05], 0.012, red, shoe, 6, 0.008);
  };
  leg([0.075, 1.0, 0], [0.068, 0.54, 0.0], [0.06, 0.12, -0.02], 0.25);
  leg([-0.075, 1.0, 0], [-0.03, 0.56, 0.1], [0.0, 0.13, 0.06], -0.1);

  // ---- 红色裙子（修身、及膝、侧开衩）----
  const dress = lathe([[0.15, 0.6], [0.158, 0.66], [0.163, 0.8], [0.172, 0.95], [0.155, 1.06], [0.112, 1.18], [0.118, 1.25], [0.148, 1.35], [0.145, 1.42], [0.125, 1.465], [0.04, 1.47]], red, body, 28);
  dress.scale.set(1, 1, 0.72);
  // 腰带
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.114, 0.012, 6, 24), redDark); belt.rotation.x = PI / 2; belt.scale.set(1, 0.72, 1); belt.position.y = 1.19; body.add(belt);
  sphere(0.018, 0, 1.19, 0.085, gold, body, 8, 6);
  // 挂脖带
  tube([0.07, 1.44, 0.085], [0.02, 1.62, -0.02], 0.014, red, body, 6);
  tube([-0.07, 1.44, 0.085], [-0.02, 1.62, -0.02], 0.014, red, body, 6);
  // ---- 肩 / 胸 / 脖子 ----
  const chest = sphere(1, 0, 1.52, -0.005, skin, body, 18, 12); chest.scale.set(0.178, 0.085, 0.1);
  C(0.04, 0.045, 0.16, 0, 1.56, -0.005, skin, body, 10);
  // 珍珠项链
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2;
    sphere(0.0105, Math.sin(a) * 0.052, 1.605 - Math.max(0, Math.cos(a)) * 0.02, Math.cos(a) * 0.046 - 0.005, noOL(M(0xfbf5ea)), body, 6, 5);
  }
  // ---- 胳膊 ----
  const armL = new THREE.Group(); body.add(armL);
  tube([-0.17, 1.53, 0], [-0.33, 1.31, -0.05], 0.037, skin, armL, 8, 0.031);
  sphere(0.031, -0.33, 1.31, -0.05, skin, armL, 8, 6);
  tube([-0.33, 1.31, -0.05], [-0.18, 1.06, 0.02], 0.03, skin, armL, 8, 0.022);
  const handL = sphere(1, -0.17, 1.05, 0.03, skin, armL, 8, 6); handL.scale.set(0.025, 0.045, 0.03);
  // 右臂：举起钻石
  const armR = new THREE.Group(); armR.position.set(0.17, 1.53, 0); body.add(armR);
  const elbow = [0.11, -0.19, 0.12], hand = [0.075, 0.2, 0.2];
  tube([0, 0, 0], elbow, 0.037, skin, armR, 8, 0.031);
  sphere(0.031, ...elbow, skin, armR, 8, 6);
  tube(elbow, hand, 0.03, skin, armR, 8, 0.022);
  const handR = sphere(1, hand[0], hand[1] + 0.02, hand[2], skin, armR, 8, 6); handR.scale.set(0.024, 0.045, 0.028);
  const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 5, 14), gold);
  bracelet.position.set(hand[0] + 0.004, hand[1] - 0.04, hand[2] - 0.006); bracelet.rotation.x = PI / 2 - 0.3; armR.add(bracelet);
  // 钻石「L'Étoile de Paris」
  const gem = new THREE.Group(); gem.position.set(hand[0] - 0.005, hand[1] + 0.11, hand[2] + 0.01); armR.add(gem);
  const gemM = thinOL(M(0xdff2ff, { emissive: 0x6fa8d8, emissiveIntensity: 0.6 }), 0.0014);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.035, 8), gemM); crown.position.y = 0.018; gem.add(crown);
  const pav = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.08, 8), gemM); pav.rotation.x = PI; pav.position.y = -0.04; gem.add(pav);
  const gemGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xbfe2ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  gemGlow.scale.set(0.7, 0.7, 1); gem.add(gemGlow);
  const sparks = [0, 1, 2].map((i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTex, color: i === 1 ? 0xfff2cc : 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set((i - 1) * 0.03, 0.02 * i, 0.02); gem.add(s); return s;
  });

  // ---- 头 ----
  const head = new THREE.Group(); head.position.set(0, 1.8, 0.005); body.add(head);
  const texN = faceTexture(false), texW = faceTexture(true);
  const headM = M(0xffffff, { map: texN });
  const prof = [];
  const hp = [[0.0, -0.125], [0.035, -0.121], [0.062, -0.106], [0.082, -0.08], [0.095, -0.05], [0.102, -0.018], [0.105, 0.015], [0.103, 0.045], [0.096, 0.075], [0.08, 0.1], [0.056, 0.119], [0.028, 0.13], [0.0, 0.134]];
  hp.forEach(([r, y]) => prof.push(new THREE.Vector2(r, y)));
  const headMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 36, PI, PI * 2), headM);
  headMesh.scale.set(1, 1, 0.95);
  head.add(headMesh);
  // 头发：发顶 + 侧分刘海 + 大波浪长发
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 14, 0, PI * 2, 0, PI * 0.5), hairM);
  cap.position.set(0, 0.022, -0.012); cap.rotation.x = -0.42; cap.scale.set(1.04, 1, 1.05); head.add(cap);
  const back = sphere(1, 0, -0.2, -0.07, hairM, head, 16, 12); back.scale.set(0.125, 0.26, 0.085);
  const wind = new THREE.Vector3(1, 0, 0.25).applyAxisAngle(new THREE.Vector3(0, 1, 0), -root.rotation.y);
  const locks = [];
  const addLock = (pts, r0, r1, amp) => {
    const L = taperTube(pts, r0, r1, hairM, head);
    L.amp = amp; L.phase = rand(0, 6); L.wind = wind;
    locks.push(L);
  };
  // 侧分的大刘海（从发旋扫向左侧）
  addLock([[0.035, 0.128, 0.03], [-0.02, 0.118, 0.085], [-0.07, 0.085, 0.095], [-0.1, 0.03, 0.08], [-0.112, -0.04, 0.06], [-0.12, -0.12, 0.07]], 0.036, 0.016, 0.02);
  addLock([[0.04, 0.125, 0.04], [0.075, 0.1, 0.08], [0.1, 0.04, 0.07], [0.11, -0.04, 0.06], [0.125, -0.12, 0.07], [0.12, -0.2, 0.08]], 0.03, 0.014, 0.03);
  // 脸两侧垂到胸前的发束
  addLock([[-0.09, 0.02, 0.04], [-0.12, -0.08, 0.05], [-0.135, -0.18, 0.06], [-0.12, -0.28, 0.08], [-0.14, -0.38, 0.07], [-0.13, -0.46, 0.08]], 0.034, 0.012, 0.05);
  addLock([[0.095, 0.0, 0.03], [0.125, -0.1, 0.04], [0.14, -0.2, 0.05], [0.13, -0.3, 0.07], [0.15, -0.4, 0.06]], 0.032, 0.012, 0.05);
  // 背后的大波浪
  for (let i = 0; i < 11; i++) {
    const a = PI * 0.62 + (i / 10) * PI * 0.76; // 从左后到右后
    const sx = Math.cos(a) * 0.1, sz = -Math.abs(Math.sin(a)) * 0.08 - 0.01;
    const out = 1.25 + (i % 3) * 0.08;
    const len = 0.5 + ((i * 7) % 5) * 0.035;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const wave = Math.sin(t * PI * 2.2 + i) * 0.028 * t;
      pts.push([sx * (1 + t * (out - 1)) + wave, 0.05 - t * len, sz * (1 + t * 0.9) - t * 0.03 + wave * 0.5]);
    }
    addLock(pts, 0.045, 0.014, 0.07 + (i % 3) * 0.015);
  }
  chars.deformers.push({ type: 'hair', locks });
  // 耳环
  [-1, 1].forEach((s) => {
    sphere(0.01, s * 0.1, -0.035, 0.0, gold, head, 6, 5);
    const d = sphere(0.015, s * 0.101, -0.06, 0.0, gold, head, 8, 6); d.scale.y = 1.4;
  });

  // ---- 奶油色风衣（披在肩上，下摆随风飘）----
  const coatProf = [[0.07, 1.64], [0.13, 1.61], [0.195, 1.575], [0.215, 1.5], [0.225, 1.35], [0.24, 1.15], [0.265, 0.95], [0.29, 0.75], [0.305, 0.6]];
  const coatGeo = new THREE.LatheGeometry(coatProf.map(([r, y]) => new THREE.Vector2(r, y)), 30, 0.62, PI * 2 - 1.24);
  coatGeo.scale(1, 1, 0.78);
  coatGeo.translate(0, 0, -0.02);
  const coat = new THREE.Mesh(coatGeo, coatM); coat.frustumCulled = false; coat.userData.keep = true; body.add(coat);
  const cpos = coatGeo.attributes.position;
  chars.deformers.push({ type: 'coat', mesh: coat, rest: Float32Array.from(cpos.array), wind, yTop: 1.64, yBot: 0.6 });
  // 翻领
  const collar = new THREE.Mesh(new THREE.LatheGeometry([[0.085, 1.6], [0.12, 1.66], [0.15, 1.7]].map(([r, y]) => new THREE.Vector2(r, y)), 24, 0.9, PI * 2 - 1.8), coatM);
  collar.scale.set(1, 1, 0.8); body.add(collar);
  // 腰带垂下的两根带子
  const beltTails = [];
  [-1, 1].forEach((s) => {
    const bt = new THREE.Group(); bt.position.set(s * 0.22, 1.18, -0.02); body.add(bt); anim(bt);
    BX(-0.012, 0.012, -0.36, 0, -0.03, 0.03, M(0xd8c9a8), bt);
    beltTails.push(bt);
  });

  // 点击区
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 1.1, 0); root.add(hit); hit.userData.keep = true;
  anim(root, body, armR, head, gem);

  chars.fujiko = {
    root, body, head, headM, texN, texW, armR, gem, gemGlow, sparks, hit, beltTails,
    wink: 0, kiss: 0, look: 0,
    anchor: () => root.localToWorld(new THREE.Vector3(0, 2.25, 0)),
  };
}

// ================================================================ 钱形警部
function buildZenigata() {
  const root = group(5.45, ROAD_Y, 2.35, -2.15, null);
  const coat = M(0x8b6a3e), trous = M(0x3a3430), shoe = M(0x2a1c14), skin = M(0xe9b48e), hat = M(0x5a4630);
  // 腿
  tube([0.1, 0.62, 0], [0.12, 0.06, 0.02], 0.06, trous, root, 8, 0.05);
  tube([-0.1, 0.62, 0], [-0.13, 0.06, -0.02], 0.06, trous, root, 8, 0.05);
  [[0.12, 0.02], [-0.13, -0.02]].forEach(([x, z]) => { const s = sphere(0.06, x, 0.04, z + 0.05, shoe, root, 10, 8); s.scale.set(1, 0.6, 1.7); });
  // 风衣
  const tc = lathe([[0.25, 0.5], [0.24, 0.7], [0.23, 0.95], [0.22, 1.15], [0.24, 1.35], [0.25, 1.45], [0.2, 1.53], [0.08, 1.57]], coat, root, 24);
  tc.scale.set(1.05, 1, 0.8);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.02, 6, 24), M(0x6a4e2a)); belt.rotation.x = PI / 2; belt.scale.set(1.05, 0.8, 1); belt.position.y = 1.1; root.add(belt);
  const collar = lathe([[0.1, 1.5], [0.16, 1.6], [0.17, 1.66]], coat, root, 16); collar.scale.set(1, 1, 0.8);
  // 头 + 帽子
  const head = new THREE.Group(); head.position.set(0, 1.72, 0.02); root.add(head);
  const hd = sphere(0.12, 0, 0, 0, skin, head, 16, 12); hd.scale.set(1, 1.08, 1);
  const faceT = ct(256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = '#1b1210';
    g.save(); g.translate(98, 50); g.rotate(0.25); g.fillRect(-26, -5, 40, 11); g.restore();
    g.save(); g.translate(158, 50); g.rotate(-0.25); g.fillRect(-14, -5, 40, 11); g.restore();
    g.beginPath(); g.arc(100, 66, 5, 0, 2 * PI); g.fill(); g.beginPath(); g.arc(156, 66, 5, 0, 2 * PI); g.fill();
    g.fillStyle = 'rgba(60,50,60,0.35)'; g.beginPath(); g.ellipse(128, 104, 46, 18, 0, 0, 2 * PI); g.fill();
    g.fillStyle = '#6a1a14'; g.beginPath(); g.ellipse(128, 100, 16, 10, 0, 0, 2 * PI); g.fill();
  });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1215, 16, 12, PI / 2 - 0.9, 1.8, PI * 0.3, PI * 0.45), noOL(basic(0xffffff, { map: faceT, transparent: true, depthWrite: false })));
  face.scale.set(1, 1.08, 1); head.add(face);
  const brim = C(0.22, 0.22, 0.018, 0, 0.07, 0, hat, head, 24); brim.rotation.x = -0.12;
  C(0.115, 0.13, 0.13, 0, 0.08, -0.01, hat, head, 16).rotation.x = -0.12;
  C(0.132, 0.132, 0.03, 0, 0.085, -0.01, M(0x2a2018), head, 16).rotation.x = -0.12;
  // 胳膊：右手指向屋顶，左手拿喇叭
  const armR = new THREE.Group(); armR.position.set(0.24, 1.44, 0); root.add(armR);
  tube([0, 0, 0], [0.12, 0.32, 0.18], 0.055, coat, armR, 8, 0.045);
  tube([0.12, 0.32, 0.18], [0.17, 0.62, 0.32], 0.045, coat, armR, 8, 0.04);
  sphere(0.045, 0.18, 0.67, 0.34, skin, armR, 8, 6);
  tube([0.18, 0.7, 0.35], [0.2, 0.8, 0.4], 0.013, skin, armR, 5);
  const armL = new THREE.Group(); armL.position.set(-0.24, 1.44, 0); root.add(armL);
  tube([0, 0, 0], [-0.08, -0.12, 0.2], 0.055, coat, armL, 8, 0.045);
  tube([-0.08, -0.12, 0.2], [-0.02, 0.18, 0.26], 0.045, coat, armL, 8, 0.04);
  sphere(0.045, -0.02, 0.2, 0.27, skin, armL, 8, 6);
  const mega = new THREE.Group(); mega.position.set(0.0, 0.28, 0.3); mega.rotation.x = -0.9; armL.add(mega);
  const megaM = M(0xf2f2f2), megaR = M(0xd01d2a);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.04, 0.34, 16, 1, true), M(0xf2f2f2, { side: THREE.DoubleSide }));
  cone.position.y = 0.17; mega.add(cone);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 5, 18), megaR); ring.rotation.x = PI / 2; ring.position.y = 0.34; mega.add(ring);
  void megaM;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 1.1, 0); root.add(hit); hit.userData.keep = true;
  anim(root, head, armR);
  chars.zenigata = { root, head, armR, hit, shout: 0, anchor: () => root.localToWorld(new THREE.Vector3(0, 2.3, 0)) };
}

// ================================================================ 猫头鹰
function buildOwl() {
  const root = group(-5.975, 13.72, -2.46, 0.55, null);
  const brown = M(0x7a5a3a), cream = M(0xdcc6a0), disc = M(0xe8d6b4), dark = M(0x3a2a1c);
  const s = 1.15;
  const b = sphere(1, 0, 0.17 * s, 0, brown, root, 16, 12); b.scale.set(0.15 * s, 0.19 * s, 0.14 * s);
  const belly = sphere(1, 0, 0.15 * s, 0.05 * s, cream, root, 14, 10); belly.scale.set(0.11 * s, 0.14 * s, 0.1 * s);
  [-1, 1].forEach((k) => { const w = sphere(1, k * 0.13 * s, 0.17 * s, -0.01 * s, dark, root, 10, 8); w.scale.set(0.05 * s, 0.15 * s, 0.11 * s); w.rotation.z = k * 0.15; });
  [-1, 1].forEach((k) => { const f = sphere(0.025 * s, k * 0.05 * s, 0.01, 0.06 * s, M(0xe0a040), root, 6, 5); f.scale.set(1, 0.5, 1.4); });
  const head = new THREE.Group(); head.position.set(0, 0.4 * s, 0); root.add(head);
  const h = sphere(1, 0, 0, 0, brown, head, 16, 12); h.scale.set(0.14 * s, 0.12 * s, 0.13 * s);
  const fd = sphere(1, 0, -0.005, 0.06 * s, disc, head, 16, 12); fd.scale.set(0.12 * s, 0.1 * s, 0.07 * s);
  [-1, 1].forEach((k) => {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035 * s, 0.1 * s, 6), brown);
    tuft.position.set(k * 0.09 * s, 0.1 * s, 0); tuft.rotation.z = -k * 0.35; head.add(tuft);
  });
  const eyeM = noOL(basic(0xffb21e));
  const eyes = [-1, 1].map((k) => {
    const g = new THREE.Group(); g.position.set(k * 0.05 * s, 0.01, 0.115 * s); head.add(g);
    const e = new THREE.Mesh(new THREE.CircleGeometry(0.038 * s, 16), eyeM); g.add(e);
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.018 * s, 12), noOL(basic(0x0a0806))); p.position.z = 0.002; g.add(p);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.007 * s, 8), noOL(basic(0xffffff))); hl.position.set(-0.008, 0.009, 0.004); g.add(hl);
    g.rotation.y = k * 0.25;
    return g;
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018 * s, 0.05 * s, 6), M(0xd8a040)); beak.rotation.x = PI / 2 + 0.6; beak.position.set(0, -0.035, 0.14 * s); head.add(beak);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0xffb020, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(0.5, 0.25, 1); glow.position.set(0, 0.01, 0.16); head.add(glow);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.35, 0); root.add(hit); hit.userData.keep = true;
  anim(head, ...eyes);
  chars.owl = { root, head, eyes, hit, blink: 0, nextBlink: 2, look: 0, lookT: 0, nextLook: 3, spin: 0, anchor: () => root.localToWorld(new THREE.Vector3(0, 0.95, 0)) };
}

// ================================================================ 黑猫（莫里斯广告柱顶上）
function buildCat(x, y, z) {
  const root = group(x, y, z, 0.7, null);
  const fur = M(0x16151c);
  const b = sphere(1, 0, 0.13, -0.02, fur, root, 14, 10); b.scale.set(0.1, 0.14, 0.13); b.rotation.x = -0.3;
  [-1, 1].forEach((k) => tube([k * 0.04, 0.0, 0.07], [k * 0.035, 0.16, 0.06], 0.02, fur, root, 6));
  const head = new THREE.Group(); head.position.set(0, 0.29, 0.06); root.add(head);
  const h = sphere(1, 0, 0, 0, fur, head, 14, 10); h.scale.set(0.085, 0.075, 0.08);
  const ears = [-1, 1].map((k) => {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), fur);
    e.position.set(k * 0.05, 0.07, -0.005); e.rotation.z = -k * 0.3; head.add(e); return e;
  });
  const eyeM = noOL(basic(0xa6ff5a));
  [-1, 1].forEach((k) => { const e = sphere(0.015, k * 0.033, 0.01, 0.07, eyeM, head, 8, 6); e.scale.set(1, 1.3, 0.5); });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: 0x9dff5a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(0.3, 0.15, 1); glow.position.set(0, 0.01, 0.09); head.add(glow);
  const tailPts = [[0, 0.05, -0.14], [0.04, 0.05, -0.25], [0.12, 0.12, -0.26], [0.16, 0.25, -0.2], [0.13, 0.36, -0.14]];
  const tail = taperTube(tailPts, 0.022, 0.014, fur, root, 16, 6);
  tail.amp = 0.08; tail.phase = 0; tail.wind = new THREE.Vector3(1, 0, 0);
  chars.deformers.push({ type: 'tail', locks: [tail] });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.25, 0); root.add(hit); hit.userData.keep = true;
  anim(head); ears.forEach((e) => { e.userData.keep = true; });
  chars.cat = { root, head, ears, hit, meow: 0, anchor: () => root.localToWorld(new THREE.Vector3(0, 0.62, 0)) };
}

// ================================================================ 飘落的唇印卡片
function buildCards(scene) {
  const tex = makeCardTexture();
  const mat = noOL(new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }));
  const geo = new THREE.PlaneGeometry(0.5, 0.33);
  chars.cards = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(geo, mat.clone());
    m.visible = false; scene.add(m); keep(m);
    chars.cards.push({ m, t: 0, life: 0, active: false, landed: false, vx: 0, vz: 0 });
  }
  chars.cardTimer = 3;
  chars.hearts = [];
  const heartTex = ct(64, 64, (g) => {
    g.fillStyle = '#ff3a6a'; g.font = `900 56px ${FONT_SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♥', 32, 36);
  });
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.visible = false; scene.add(s);
    chars.hearts.push({ s, t: 0, active: false, v: new THREE.Vector3() });
  }
}

export function throwCard() {
  const c = chars.cards.find((k) => !k.active) || chars.cards[0];
  const F = chars.fujiko;
  const p = F.root.localToWorld(new THREE.Vector3(0.3, 1.9, 0.3));
  c.m.position.copy(p);
  c.m.visible = true; c.m.material.opacity = 1;
  c.active = true; c.landed = false; c.t = 0; c.life = 0;
  c.vx = rand(0.5, 1.3); c.vz = rand(0.7, 1.4);
  c.spin = rand(2, 4); c.phase = rand(0, 6);
}
export function blowKiss() {
  const F = chars.fujiko;
  F.wink = 1.6; F.kiss = 1.6;
  const base = F.root.localToWorld(new THREE.Vector3(0, 1.78, 0.14));
  chars.hearts.forEach((h, i) => {
    if (i > 4) return;
    h.active = true; h.t = -i * 0.12; h.s.visible = false;
    h.s.position.copy(base);
    h.v.set(rand(0.2, 0.7), rand(0.5, 0.9), rand(0.3, 0.8));
  });
}

export function buildCharacters(scene) {
  buildFujiko(scene);
  buildZenigata();
  buildOwl();
  buildCat(-4.9, SW_H + 3.64, 10.45);
  buildCards(scene);
}

// ================================================================ 动画
export function animateCharacters(dt, t) {
  // 头发 / 风衣 / 尾巴
  const gust = 0.65 + 0.35 * Math.sin(t * 0.7) + 0.2 * Math.sin(t * 2.3);
  chars.deformers.forEach((d) => {
    if (d.type === 'hair' || d.type === 'tail') {
      d.locks.forEach((L) => {
        const pos = L.mesh.geometry.attributes.position;
        const arr = pos.array, rest = L.rest, along = L.along, W = L.wind;
        for (let k = 0; k < along.length; k++) {
          const a = along[k];
          const w = Math.pow(a, 1.5) * L.amp * (d.type === 'tail' ? 1 : gust);
          const s = Math.sin(t * (d.type === 'tail' ? 2.2 : 3.1) + L.phase + a * 3.5);
          const s2 = Math.sin(t * 5.3 + L.phase * 2 + a * 6);
          arr[k * 3] = rest[k * 3] + (W.x * (0.6 + 0.4 * s) + s2 * 0.15) * w;
          arr[k * 3 + 1] = rest[k * 3 + 1] + Math.abs(s) * w * 0.25;
          arr[k * 3 + 2] = rest[k * 3 + 2] + (W.z * (0.6 + 0.4 * s) + s * 0.3) * w;
        }
        pos.needsUpdate = true;
      });
    } else if (d.type === 'coat') {
      const pos = d.mesh.geometry.attributes.position;
      const arr = pos.array, rest = d.rest, W = d.wind;
      for (let k = 0; k < pos.count; k++) {
        const x = rest[k * 3], y = rest[k * 3 + 1], z = rest[k * 3 + 2];
        const f = Math.pow(clamp((d.yTop - y) / (d.yTop - d.yBot), 0, 1), 1.8);
        const ang = Math.atan2(x, z);
        const flutter = Math.sin(t * 4.2 + ang * 3 + y * 5) * 0.35 + Math.sin(t * 7.1 + ang * 5) * 0.15;
        const amp = 0.13 * f * gust;
        arr[k * 3] = x + (W.x * (0.7 + 0.3 * flutter)) * amp + x * flutter * 0.25 * f;
        arr[k * 3 + 1] = y + Math.abs(flutter) * amp * 0.3;
        arr[k * 3 + 2] = z + (W.z * (0.7 + 0.3 * flutter)) * amp + z * flutter * 0.25 * f - 0.02 * f;
      }
      pos.needsUpdate = true;
    }
  });

  // 不二子
  const F = chars.fujiko;
  if (F) {
    F.body.scale.y = 1 + Math.sin(t * 1.6) * 0.004;
    F.body.rotation.z = Math.sin(t * 0.5) * 0.012;
    F.gem.rotation.y = t * 1.4;
    F.sparks.forEach((s, i) => {
      const k = Math.pow(Math.max(0, Math.sin(t * (2.1 + i * 0.7) + i * 2)), 4);
      s.material.opacity = 0.3 + 0.7 * k;
      s.scale.setScalar((i === 1 ? 0.9 : 0.55) * (0.4 + 0.8 * k));
      s.material.rotation = t * (i % 2 ? 0.8 : -0.6);
    });
    F.gemGlow.material.opacity = 0.6 + 0.3 * Math.sin(t * 3);
    // 眨眼 / 飞吻
    if (F.wink > 0) { F.wink -= dt; if (F.headM.map !== F.texW) { F.headM.map = F.texW; F.headM.needsUpdate = true; } }
    else if (F.headM.map !== F.texN) { F.headM.map = F.texN; F.headM.needsUpdate = true; }
    // 头：看钻石，偶尔看镜头
    const lookCam = (Math.sin(t * 0.23) > 0.55 || F.kiss > 0) ? 1 : 0;
    F.look = lerp(F.look, lookCam, 1 - Math.exp(-dt * 2));
    F.head.rotation.y = lerp(0.35, -0.05, F.look);
    F.head.rotation.x = lerp(-0.12, 0.05, F.look);
    F.head.rotation.z = lerp(-0.12, 0.08, F.look);
    if (F.kiss > 0) F.kiss -= dt;
    F.armR.rotation.x = Math.sin(t * 0.9) * 0.03 - (F.kiss > 0 ? 0.2 * Math.sin(Math.min(1, (1.6 - F.kiss) * 3) * PI) : 0);
    F.beltTails.forEach((b, i) => { b.rotation.z = Math.sin(t * 3 + i) * 0.25 * gust + 0.15; b.rotation.x = Math.sin(t * 2.3 + i) * 0.2; });
  }
  // 卡片
  chars.cardTimer -= dt;
  if (chars.cardTimer < 0) { throwCard(); chars.cardTimer = rand(7, 12); }
  chars.cards.forEach((c) => {
    if (!c.active) return;
    c.life += dt;
    if (!c.landed) {
      c.t += dt;
      const p = c.m.position;
      p.x += (c.vx + Math.sin(c.t * 3 + c.phase) * 0.9) * dt;
      p.z += (c.vz + Math.cos(c.t * 2.2 + c.phase) * 0.5) * dt;
      p.y -= (1.0 + Math.sin(c.t * 4 + c.phase) * 0.45) * dt;
      c.m.rotation.set(Math.sin(c.t * c.spin) * 1.2, c.t * 1.5, Math.cos(c.t * c.spin * 0.8) * 0.8);
      const gY = groundAt(p.x, p.z) + 0.02;
      if (p.y <= gY) { p.y = gY; c.landed = true; c.m.rotation.set(-PI / 2, 0, rand(0, 6)); c.life = 0; }
      if (c.t > 30) c.active = false;
    } else {
      if (c.life > 5) c.m.material.opacity = Math.max(0, 1 - (c.life - 5) / 1.5);
      if (c.life > 6.5) { c.active = false; c.m.visible = false; }
    }
  });
  chars.hearts.forEach((h) => {
    if (!h.active) return;
    h.t += dt;
    if (h.t < 0) return;
    h.s.visible = true;
    h.s.position.addScaledVector(h.v, dt);
    h.v.y += dt * 0.2;
    const k = h.t / 1.8;
    h.s.scale.setScalar(0.18 + k * 0.25);
    h.s.material.opacity = 1 - k;
    if (k >= 1) { h.active = false; h.s.visible = false; }
  });
  // 钱形
  const Z = chars.zenigata;
  if (Z) {
    const angry = state.alarm || Z.shout > 0 ? 1 : 0;
    Z.shout = Math.max(0, Z.shout - dt);
    Z.armR.rotation.x = Math.sin(t * (angry ? 16 : 2)) * (angry ? 0.12 : 0.04);
    Z.root.position.y = ROAD_Y + (angry ? Math.abs(Math.sin(t * 8)) * 0.05 : 0);
    Z.head.rotation.x = -0.35 + Math.sin(t * 1.3) * 0.03;
  }
  // 猫头鹰
  const O = chars.owl;
  if (O) {
    O.nextBlink -= dt;
    if (O.nextBlink < 0) { O.blink = 0.16; O.nextBlink = rand(2.5, 6); }
    if (O.blink > 0) O.blink -= dt;
    const bl = O.blink > 0 ? 0.1 : 1;
    O.eyes.forEach((e) => { e.scale.y = bl; });
    O.nextLook -= dt;
    if (O.nextLook < 0) { O.lookT = rand(-0.9, 0.9); O.nextLook = rand(2, 5); }
    if (O.spin > 0) {
      O.spin -= dt;
      const k = 1 - O.spin / 1.6;
      O.head.rotation.y = Math.sin(k * PI) * PI * 0.95;
    } else {
      O.look = lerp(O.look, O.lookT, 1 - Math.exp(-dt * 6));
      O.head.rotation.y = O.look;
    }
    O.head.rotation.z = Math.sin(t * 0.8) * 0.08;
  }
  const Ct = chars.cat;
  if (Ct) {
    Ct.meow = Math.max(0, Ct.meow - dt);
    const tw = Ct.meow > 0 ? Math.sin(t * 30) * 0.3 : 0;
    Ct.ears.forEach((e, i) => { e.rotation.z = (i ? -0.3 : 0.3) + tw; });
    Ct.head.rotation.y = Math.sin(t * 0.4) * 0.4;
    Ct.head.rotation.x = Ct.meow > 0 ? -0.3 : 0;
  }
}
