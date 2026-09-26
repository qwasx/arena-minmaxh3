// 交互：底部按钮、点击场景里的东西、对话气泡、镜头预设 / 飞行、开场运镜、键盘快捷键
import * as THREE from 'three';
import { state, hotspots, addHotspot, refs } from './core/registry.js';
import { SHOT } from './core/env.js';
import * as sfx from './audio.js';
import { chars, blowKiss, throwCard } from './world/characters.js';
import { vehicles } from './world/vehicles.js';
import { sky, sparkleShow } from './world/sky.js';
import { FUJIKO_POS, SKY, H, METRO, SW_H } from './world/layout.js';
import { fpick } from './core/rng.js';

const $ = (s) => document.querySelector(s);

export const VIEWS = [
  { name: '全景', pos: [28.5, 19, 32], target: [-0.9, 3.9, -0.9] },
  { name: '不二子', pos: [FUJIKO_POS[0] + 3.2, FUJIKO_POS[1] + 2.3, FUJIKO_POS[2] + 4.1], target: [FUJIKO_POS[0] + 0.05, FUJIKO_POS[1] + 1.55, FUJIKO_POS[2]] },
  { name: '街角', pos: [14.5, 2.8, 8.0], target: [0.8, 3.2, -1.5] },
  { name: '屋顶', pos: [-8.5, 19.5, 5.5], target: [-1.6, 11.6, -4.2] },
  { name: '鲁邦', pos: [6.4, 3.1, 2.6], target: [9.0, 1.3, -5.2] },
  { name: '铁塔', pos: [14, 13, 16], target: [-30, 6, -24] },
];
let viewIdx = 0;
let tween = null;

/** 竖屏手机：拉远一点，让整个底座放得下 */
export function distMult() {
  const a = innerWidth / innerHeight;
  return a >= 1.15 ? 1 : Math.pow(Math.min(2.4, 1.15 / a), 0.5);
}
export function fovFor() {
  const a = innerWidth / innerHeight;
  return a >= 1.15 ? 32 : Math.min(46, 32 + (1.15 - a) * 24);
}
export function viewPos(v, i = 0) {
  const k = i === 1 ? Math.sqrt(distMult()) : distMult();
  return v.pos.map((p, j) => v.target[j] + (p - v.target[j]) * k);
}

// ---------------------------------------------------------------- 气泡
const bubbles = new Map();
export function say(key, anchor, html, ms = 2600, cls = '') {
  let b = bubbles.get(key);
  if (!b) {
    const el = document.createElement('div');
    el.className = 'bubble';
    $('#bubbles').appendChild(el);
    b = { el, anchor };
    bubbles.set(key, b);
  }
  b.anchor = anchor;
  b.el.className = 'bubble ' + cls;
  b.el.innerHTML = html;
  b.until = performance.now() + ms * (SHOT ? 10 : 1);
  placeBubble(b);
  void b.el.offsetWidth; // 立刻触发淡入
  b.el.classList.add('show');
}
const _bv = new THREE.Vector3();
function placeBubble(b) {
  const { camera, renderer } = refs;
  _bv.copy(typeof b.anchor === 'function' ? b.anchor() : b.anchor).project(camera);
  if (_bv.z > 1) return false;
  const r = renderer.domElement.getBoundingClientRect();
  const hw = (b.el.offsetWidth || 120) / 2;
  const x = Math.min(r.width - hw - 8, Math.max(hw + 8, (_bv.x * 0.5 + 0.5) * r.width));
  const y = Math.min(r.height - 110, Math.max((b.el.offsetHeight || 50) + 8, (-_bv.y * 0.5 + 0.5) * r.height));
  b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  return true;
}
let toastTimer = 0;
export function toast(html, ms = 3200) {
  const el = $('#toast');
  hideHint();
  el.innerHTML = html;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms * (SHOT ? 10 : 1));
}

// ---------------------------------------------------------------- 镜头
export function flyTo(pos, target, dur = 1.8) {
  const { camera, controls } = refs;
  tween = {
    p0: camera.position.clone(), t0: controls.target.clone(),
    p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target), k: 0, dur,
  };
}
function setView(i) {
  viewIdx = (i + VIEWS.length) % VIEWS.length;
  const v = VIEWS[viewIdx];
  refs.controls.minDistance = viewIdx === 1 ? 2.5 : 6;
  flyTo(viewPos(v, viewIdx), v.target);
  $('#viewLabel').textContent = v.name;
}

// ---------------------------------------------------------------- 开关
function setBtn(act, on) { const b = document.querySelector(`#bar button[data-act="${act}"]`); if (b) b.classList.toggle('on', on); }
let alarmTimer = 0;
export function setAlarm(on) {
  state.alarm = on;
  setBtn('alarm', on);
  clearTimeout(alarmTimer);
  if (on) {
    sfx.siren(12);
    sfx.shout();
    say('zeni', chars.zenigata.anchor, 'ルパ〜ン！ 不二子ぉ〜！<small>逮捕だ〜！！</small>', 3200, 'red');
    toast('<b>ALERTE !</b> 警报响了——直升机探照灯锁定屋顶，警灯全开', 3000);
    alarmTimer = setTimeout(() => setAlarm(false), 12000);
  } else {
    sfx.stopSiren();
  }
}
function toggle(act) {
  if (act === 'rain') {
    state.rain = !state.rain; setBtn('rain', state.rain);
    sfx.setRainLevel(state.rain ? 1 : 0);
    toast(state.rain ? '雨又下起来了……' : '雨停了。地面还湿着。', 1800);
  } else if (act === 'alarm') {
    setAlarm(!state.alarm);
  } else if (act === 'orbit') {
    state.autoRotate = !state.autoRotate; refs.controls.autoRotate = state.autoRotate; setBtn('orbit', state.autoRotate);
  } else if (act === 'view') {
    setView(viewIdx + 1);
  } else if (act === 'style') {
    state.style2012 = !state.style2012; setBtn('style', state.style2012);
    document.body.classList.toggle('style2012', state.style2012);
    if (state.style2012) toast('<b>2012 画风</b>：致敬《峰不二子という女》的粗排线 + 胶片颗粒', 2600);
  } else if (act === 'sound') {
    state.sound = !state.sound; setBtn('sound', state.sound);
    sfx.setSound(state.sound);
    sfx.setRainLevel(state.rain ? 1 : 0);
    if (state.sound) toast('<b>声音已开启</b> · 所有声音都是浏览器实时合成的，没有任何音频文件', 2600);
  }
}

// ---------------------------------------------------------------- 可点击物体
function hitBox(scene, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set(x, y, z); m.rotation.y = ry; m.userData.keep = true;
  scene.add(m);
  return m;
}
const FUJIKO_LINES = [
  ['悪いわね、ルパン♡', 'この子はもらっていくわ'],
  ['Bonsoir, messieurs ♡', '今夜のパリは私のもの'],
  ['女は秘密を着飾って美しくなるのよ', ''],
  ['追いかけてごらんなさい♡', 'Au revoir~'],
  ['ダイヤは女の子の親友なの', 'L\u2019Étoile de Paris ♡'],
];
const ZENI_LINES = [['ルパ〜ン！ 逮捕だ〜！', ''], ['不二子ぉ〜！ 待てぇ〜！', ''], ['全員、屋上を包囲しろ！', 'Encerclez le toit !']];
function setupHotspots(scene) {
  const F = chars.fujiko;
  addHotspot({
    name: 'fujiko', objects: [F.hit],
    onClick() {
      blowKiss(); throwCard(); sfx.kiss();
      const [a, b] = fpick(FUJIKO_LINES);
      say('fujiko', F.anchor, a + (b ? `<small>${b}</small>` : ''), 3000);
      if (viewIdx !== 1) setView(1);
    },
  });
  addHotspot({
    name: 'zenigata', objects: [chars.zenigata.hit],
    onClick() {
      chars.zenigata.shout = 2.5; sfx.shout();
      const [a, b] = fpick(ZENI_LINES);
      say('zeni', chars.zenigata.anchor, a + (b ? `<small>${b}</small>` : ''), 2600, 'red');
    },
  });
  vehicles.police.forEach((c) => {
    addHotspot({
      name: 'police', objects: [c.g],
      onClick() {
        setAlarm(!state.alarm);
      },
    });
  });
  const Fi = vehicles.fiat, Lu = vehicles.lupin;
  addHotspot({
    name: 'fiat', objects: [Fi.g],
    onClick() {
      Fi.flash = 1.2; Lu.wave = 2.2; sfx.honk();
      say('lupin', () => Lu.head.localToWorld(new THREE.Vector3(0, 0.45, 0)), 'ふ〜じこちゃ〜ん♡<small>待ってるよぉ〜</small>', 2800);
    },
  });
  const O = chars.owl;
  addHotspot({
    name: 'owl', objects: [O.hit],
    onClick() { O.spin = 1.6; sfx.hoot(); say('owl', O.anchor, 'ホー……<small>（全部见到了）</small>', 2200); },
  });
  const Ct = chars.cat;
  addHotspot({
    name: 'cat', objects: [Ct.hit],
    onClick() { Ct.meow = 1.2; sfx.meow(); say('cat', Ct.anchor, 'にゃ〜', 1800); },
  });
  const Mo = vehicles.moto;
  addHotspot({
    name: 'moto', objects: [Mo.g],
    onClick() { Mo.rev = 1.6; sfx.vroom(); say('moto', () => Mo.g.localToWorld(new THREE.Vector3(0, 1.5, 0)), 'ブォン！<small>不二子的座驾 · 随时准备跑路</small>', 2400); },
  });
  const He = vehicles.heli;
  addHotspot({
    name: 'heli', objects: [He.root],
    onClick() {
      say('heli', () => He.root.position.clone().add(new THREE.Vector3(0, 2.2, 0)), '« Aigle 1 : cible sur le toit ! »<small>老鹰一号：目标在屋顶！</small>', 2600);
      if (!state.alarm) setAlarm(true);
    },
  });
  addHotspot({
    name: 'eiffel', objects: [sky.hit],
    onClick() { sparkleShow(10); sfx.sparkleSound(40, 8); toast('<b>La Tour Eiffel</b> · 每到整点会闪烁 5 分钟（这里每分钟闪一次）', 3000); },
  });
  addHotspot({
    name: 'salon', objects: [hitBox(scene, SKY.x2 - SKY.x1 + 0.3, 1.2, SKY.z2 - SKY.z1 + 0.3, (SKY.x1 + SKY.x2) / 2, H.top + 0.6, (SKY.z1 + SKY.z2) / 2)],
    onClick() { toast('<b>L\u2019Étoile de Paris</b> · 102 克拉。<br>展台上只剩一张印着唇印的卡片：« Merci pour l\u2019Étoile ♡ — F. »', 4200); },
  });
  addHotspot({
    name: 'shop', objects: [hitBox(scene, 5.4, 3.9, 0.6, -1.2, 1.95, -0.9), hitBox(scene, 0.6, 3.9, 4.4, 2.1, 1.95, -4.4), hitBox(scene, 1.8, 3.9, 0.6, 1.3, 1.95, -1.7, PI4)],
    onClick() { toast('<b>ÉTOILE · Joaillier</b> — 1897 年创立的珠宝老店。今晚，镇店之宝不翼而飞。', 3200); sfx.sparkleSound(6, 0.6); },
  });
  addHotspot({
    name: 'cafe', objects: [hitBox(scene, 6, 3.9, 0.8, -9, 1.95, -0.8)],
    onClick() { toast('<b>Le Chat Noir</b> · 已经打烊。桌上还有一杯没喝完的咖啡……', 2600); },
  });
  addHotspot({
    name: 'morris', objects: [hitBox(scene, 1.4, 3.4, 1.4, -4.9, 1.8, 10.45)],
    onClick() { toast('莫里斯广告柱：<b>WANTED · LUPIN III</b>，旁边是「L\u2019Étoile de Paris」的展览海报', 3000); },
  });
  addHotspot({
    name: 'metro', objects: [hitBox(scene, METRO.x2 - METRO.x1 + 0.6, 2.8, 0.6, (METRO.x1 + METRO.x2) / 2, SW_H + 1.4, METRO.z2 + 0.05)],
    onClick() { toast('<b>Métropolitain</b> · 1900 年吉马德（Hector Guimard）设计的新艺术风格地铁口', 3000); },
  });
}
const PI4 = Math.PI / 4;

// ---------------------------------------------------------------- 点击 / 悬停
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let occluders = [];
function pickAt(x, y) {
  const { camera, renderer } = refs;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const objs = [];
  hotspots.forEach((h) => h.objects.forEach((o) => objs.push(o)));
  const hits = ray.intersectObjects(objs.concat(occluders), true);
  for (const hit of hits) {
    let o = hit.object;
    while (o) {
      const h = hotspots.find((k) => k.objects.includes(o));
      if (h) return { h, hit };
      o = o.parent;
    }
    if (occluders.includes(hit.object)) return null;
  }
  return null;
}

export function initUI(scene) {
  setupHotspots(scene);
  const STATIC = scene.getObjectByName('static');
  occluders = STATIC ? STATIC.children.filter((o) => o.isMesh) : [];
  const canvas = refs.renderer.domElement;
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; hideHint(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7;
    if (!moved && performance.now() - down.t < 600) {
      const p = pickAt(e.clientX, e.clientY);
      if (p) p.h.onClick(p.hit);
    }
    down = null;
  });
  let lastMove = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastMove < 70 || e.buttons) return;
    lastMove = now;
    canvas.classList.toggle('hover', !!pickAt(e.clientX, e.clientY));
  });
  refs.controls.addEventListener('start', () => { tween = null; });
  document.querySelectorAll('#bar button').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.act)));
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'r') toggle('rain');
    else if (k === 'a') toggle('alarm');
    else if (k === 'o') toggle('orbit');
    else if (k === 'h' || k === 'p') toggle('style');
    else if (k === 'm') toggle('sound');
    else if (k === 'v') toggle('view');
    else if (k >= '1' && k <= String(VIEWS.length)) setView(+k - 1);
  });
  // 开场：从高处俯冲进来
  const v0 = VIEWS[0], p0 = viewPos(v0);
  if (!SHOT) {
    refs.camera.position.set(p0[0] * 1.9, p0[1] * 2.6, p0[2] * 1.9);
    refs.controls.target.set(0, 2, 0);
    refs.controls.update();
    setTimeout(() => flyTo(p0, v0.target, 3.4), 350);
    setTimeout(showHint, 3200);
  } else {
    refs.camera.position.set(...p0);
    refs.controls.update();
  }
}
function showHint() { $('#hint').classList.add('show'); setTimeout(hideHint, 7000); }
function hideHint() { $('#hint').classList.remove('show'); }

export function updateUI(dt) {
  const { camera, controls } = refs;
  if (tween) {
    tween.k = Math.min(1, tween.k + dt / tween.dur);
    const k = tween.k, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    camera.position.y += Math.sin(e * Math.PI) * 1.5;
    controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (k >= 1) tween = null;
  }
  const now = performance.now();
  bubbles.forEach((b) => {
    if (now >= b.until) { b.el.classList.remove('show'); return; }
    const onScreen = placeBubble(b);
    b.el.classList.toggle('show', onScreen);
  });
}
