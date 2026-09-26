// 湿地面上的灯光倒影：平铺在地上、永远朝向镜头拉长的光带（每个光源一条）
import * as THREE from 'three';
import { streakTex, noOL, PI } from '../core/helpers.js';

const list = [];
let group = null;

export function initStreaks(scene) {
  group = new THREE.Group();
  group.name = 'streaks';
  scene.add(group);
}

/**
 * @param {object} o { x, y, z, color, len, width, op, level?: () => number, colorFn?: () => number }
 */
export function addStreak(o) {
  const len = o.len ?? 3, width = o.width ?? 0.6;
  const geo = new THREE.PlaneGeometry(width, len);
  geo.translate(0, len / 2, 0);
  geo.rotateX(-PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const mat = noOL(new THREE.MeshBasicMaterial({
    map: streakTex, color: o.color ?? 0xffd9a0, transparent: true, opacity: o.op ?? 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(o.x, o.y, o.z);
  m.renderOrder = 2;
  m.userData.keep = true;
  group.add(m);
  const s = { m, base: o.op ?? 0.5, level: o.level, colorFn: o.colorFn, ph: Math.random() * 10, len };
  list.push(s);
  return s;
}

const _c = new THREE.Color();
export function updateStreaks(camera, t) {
  for (const s of list) {
    const dx = camera.position.x - s.m.position.x, dz = camera.position.z - s.m.position.z;
    s.m.rotation.y = Math.atan2(dx, dz) + PI;
    // 镜头越低，倒影越长
    const el = Math.max(0.15, Math.min(1, (camera.position.y - s.m.position.y) / Math.hypot(dx, dz)));
    s.m.scale.set(1, 1, 1.35 - el * 0.55);
    const rip = 0.82 + 0.18 * Math.sin(t * 2.3 + s.ph) * Math.sin(t * 3.7 + s.ph * 1.7);
    const lv = s.level ? s.level() : 1;
    s.m.material.opacity = s.base * rip * lv;
    s.m.visible = s.m.material.opacity > 0.01;
    if (s.colorFn) s.m.material.color.copy(_c.setHex(s.colorFn()));
  }
}
