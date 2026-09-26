// 峰不二子 · 巴黎雨夜 —— 入口
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import './style.css';

import { ctx, PI } from './core/helpers.js';
import { mergeAll } from './core/merge.js';
import { state, updaters, refs, hotspots } from './core/registry.js';
import { SHOT, HIGH, MAX_DPR } from './core/env.js';
import { srand } from './core/rng.js';

import { buildBase } from './world/base.js';
import { buildGround } from './world/ground.js';
import { buildMaison, animateMaison } from './world/maison.js';
import { buildCafe, animateCafe } from './world/cafe.js';
import { buildStreet, animateStreet } from './world/street.js';
import { buildVehicles, animateVehicles, vehicles } from './world/vehicles.js';
import { buildCharacters, animateCharacters } from './world/characters.js';
import { buildSky, animateSky } from './world/sky.js';
import { buildLights, animateLights } from './world/lights.js';
import { initStreaks, updateStreaks } from './fx/streaks.js';
import { buildRain, animateRain, setRainPixelScale } from './fx/rain.js';
import { createHatch } from './fx/hatch.js';
import { setHeliLevel } from './audio.js';
import { initUI, updateUI, VIEWS, fovFor } from './ui.js';

srand(19671);

// ---------------------------------------------------------------- renderer / scene / camera
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.3, 600);
const V0 = VIEWS[0];
camera.position.set(...V0.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...V0.target);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 6;
controls.maxDistance = 90;
controls.minPolarAngle = 0.06 * PI;
controls.maxPolarAngle = 0.495 * PI;
controls.autoRotateSpeed = 0.55;
controls.update();

const effect = new OutlineEffect(renderer, { defaultThickness: 0.0032, defaultColor: [0.07, 0.06, 0.13] });
const effect2012 = new OutlineEffect(renderer, { defaultThickness: 0.0046, defaultColor: [0.03, 0.02, 0.03] });
const hatch = createHatch(renderer);

Object.assign(refs, { renderer, scene, camera, controls, effect });

// ---------------------------------------------------------------- 背景
{
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0.0, '#05060f');
  gr.addColorStop(0.4, '#12153a');
  gr.addColorStop(0.62, '#2a2350');
  gr.addColorStop(0.72, '#3a2a52');
  gr.addColorStop(1.0, '#0a0a14');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}

// ---------------------------------------------------------------- 灯光（环境 + 月光）
const hemi = new THREE.HemisphereLight(0x7080c0, 0x2a2440, 1.9);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb0ee, 1.0);
moon.position.set(-12, 30, 18);
moon.castShadow = true;
moon.shadow.mapSize.set(HIGH ? 2048 : 1024, HIGH ? 2048 : 1024);
Object.assign(moon.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 90 });
moon.shadow.bias = -0.0006;
moon.shadow.normalBias = 0.02;
scene.add(moon);

// ---------------------------------------------------------------- 场景
const STATIC = new THREE.Group();
STATIC.name = 'static';
scene.add(STATIC);
ctx.parent = STATIC;

initStreaks(scene);
buildBase(scene);
buildGround();
buildMaison(scene);
buildCafe(scene);
buildStreet(scene);
buildVehicles(scene);
buildCharacters(scene);
buildSky(scene);
buildLights(scene);
buildRain(scene);

updaters.push(
  animateMaison, animateCafe, animateStreet, animateCharacters, animateSky, animateLights, animateRain,
  (dt, t) => animateVehicles(dt, t, camera),
);

// 阴影：不透明的卡通材质都投射/接收阴影
scene.traverse((o) => {
  if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.isMeshToonMaterial && !o.material.transparent) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
});
const mergeInfo = mergeAll(scene, STATIC);
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

initUI(scene);

// ---------------------------------------------------------------- 循环
const clock = new THREE.Clock();
const _bs = new THREE.Vector2();
function onResize() {
  camera.fov = fovFor();
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  hatch.resize();
  renderer.getDrawingBufferSize(_bs);
  setRainPixelScale(_bs.y);
}
addEventListener('resize', onResize);
onResize();

let frames = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  state.time += dt;
  const t = state.time;
  for (const fn of updaters) fn(dt, t);
  updateUI(dt);
  controls.update(dt);
  updateStreaks(camera, t);
  if (vehicles.heli && state.sound) {
    const d = camera.position.distanceTo(vehicles.heli.root.position);
    setHeliLevel(Math.max(0, 1 - d / 70) * 0.3);
  }
  hatch.amount += ((state.style2012 ? 1 : 0) - hatch.amount) * Math.min(1, dt * 4);
  if (hatch.amount > 0.01) hatch.render(state.style2012 ? effect2012 : effect, scene, camera, t);
  else effect.render(scene, camera);
  frames++;
  if (frames === 3) {
    document.getElementById('loading').classList.add('hide');
    document.body.classList.add('ready');
    window.__ready = true;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 调试 / 截图用
window.__fujiko = {
  THREE, scene, camera, controls, renderer, state, refs, mergeInfo,
  setView(p, tg) { camera.position.set(...p); controls.target.set(...tg); controls.update(); },
  hot(name) { const h = hotspots.find((k) => k.name === name); if (h) h.onClick(); return !!h; },
  info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }; },
};
