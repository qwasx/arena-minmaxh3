// 灯光：室内暖光、路灯（光锥 + 地面光斑 + 倒影）、警灯红蓝光、沙龙警报红光、给不二子的补光
import * as THREE from 'three';
import { noOL, glowMat, radialTex, fadeTex, softDotTex, PI, keep } from '../core/helpers.js';
import { HIGH } from '../core/env.js';
import { state } from '../core/registry.js';
import { SW_H, ROAD_Y, FUJIKO_POS, SKY, H, METRO } from './layout.js';
import { street } from './street.js';
import { vehicles } from './vehicles.js';
import { addStreak } from '../fx/streaks.js';

export const lights = { pools: [], lamps: [] };

function pool(scene, x, y, z, sx, sz, color, op, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(radialTex, color, op));
  m.rotation.set(-PI / 2, 0, ry);
  m.scale.set(sx, sz, 1);
  m.position.set(x, y, z);
  m.renderOrder = 1;
  keep(m);
  scene.add(m);
  return m;
}
function pointLight(scene, color, intensity, dist, decay, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, decay);
  l.position.set(x, y, z);
  scene.add(l);
  return l;
}

export function buildLights(scene) {
  // ---------- 室内 ----------
  lights.shop = pointLight(scene, 0xffd29a, 7, 10, 1.25, -0.6, 2.7, -3.3);
  lights.cafe = pointLight(scene, 0xffb66e, 6.5, 9, 1.25, -9.0, 2.6, -2.2);
  // 橱窗在人行道上的光
  pool(scene, -1.3, SW_H + 0.012, -0.1, 4.6, 2.2, 0xffe2b0, 0.32);
  pool(scene, 2.6, SW_H + 0.012, -4.4, 2.0, 4.8, 0xffe2b0, 0.3);
  pool(scene, 1.7, SW_H + 0.012, -1.5, 2.2, 1.6, 0xffe2b0, 0.3, PI / 4);
  pool(scene, -9.0, SW_H + 0.012, 0.0, 6.4, 2.4, 0xffb872, 0.3);
  // 倒影：橱窗 / 咖啡馆 / 招牌
  [[-2.2, -0.5], [-0.3, -0.5], [1.3, -1.9]].forEach(([x, z]) => addStreak({ x, y: SW_H + 0.014, z, color: 0xffe0b0, len: 2.6, width: 1.0, op: 0.4 }));
  [[2.5, -3.3], [2.5, -5.4]].forEach(([x, z]) => addStreak({ x, y: SW_H + 0.014, z, color: 0xffe0b0, len: 2.4, width: 1.0, op: 0.36 }));
  [[-10.9, -0.6], [-8.9, -0.6], [-6.6, -0.6]].forEach(([x, z]) => addStreak({ x, y: SW_H + 0.014, z, color: 0xffb46a, len: 2.6, width: 0.9, op: 0.38 }));
  addStreak({ x: -6.45, y: SW_H + 0.015, z: 0.2, color: 0xff2a44, len: 2.2, width: 0.5, op: 0.45 });

  // ---------- 路灯 ----------
  const keyLamps = HIGH ? [1, 2, 4] : [1];
  street.lamps.forEach((L, i) => {
    const gy = L.small ? SW_H : SW_H;
    const col = L.color ?? 0xffd79a;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: col, transparent: true, opacity: L.small ? 0 : 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(1.9, 1.9, 1); halo.position.set(L.x, L.y, L.z); keep(halo); scene.add(halo);
    if (!L.small) {
      const h = L.y - gy;
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 1.55, h, 24, 1, true),
        noOL(new THREE.MeshBasicMaterial({ map: fadeTex, color: col, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })),
      );
      cone.position.set(L.x, gy + h / 2 - 0.15, L.z); keep(cone); scene.add(cone);
      pool(scene, L.x, gy + 0.013, L.z, 4.2, 4.2, col, 0.36);
      addStreak({ x: L.x, y: gy + 0.016, z: L.z, color: col, len: 3.4, width: 0.75, op: 0.5 });
      if (keyLamps.includes(i)) pointLight(scene, col, 4.2, 8, 1.4, L.x, L.y - 0.4, L.z);
      lights.lamps.push({ halo, cone, ph: Math.random() * 10 });
    } else {
      addStreak({ x: L.x, y: SW_H + 0.016, z: L.z - 0.1, color: col, len: 1.8, width: 0.4, op: 0.35 });
    }
  });
  // 地铁口里的暖光
  if (HIGH) pointLight(scene, 0xffb060, 3, 4, 1.5, (METRO.x1 + METRO.x2) / 2, -0.5, METRO.z1 + 0.6);

  // ---------- 警灯 ----------
  const c1 = vehicles.police[0];
  if (c1) {
    const p = c1.g.localToWorld(new THREE.Vector3(-0.2, 1.9, 0));
    lights.policeBlue = pointLight(scene, 0x3a6cff, 0, 11, 1.2, p.x, p.y, p.z + 0.2);
    lights.policeRed = pointLight(scene, 0xff2438, 0, 11, 1.2, p.x, p.y, p.z - 0.2);
  }
  vehicles.police.forEach((c) => {
    const p = c.g.localToWorld(new THREE.Vector3(0, 0, 0));
    const pb = pool(scene, p.x, ROAD_Y + 0.012, p.z + 0.2, 6, 6, 0x3a6cff, 0.0);
    const pr = pool(scene, p.x + 0.2, ROAD_Y + 0.013, p.z - 0.2, 6, 6, 0xff2438, 0.0);
    c.pools = [pb, pr];
    addStreak({ x: p.x, y: ROAD_Y + 0.015, z: p.z, color: 0x3a6cff, len: 3.6, width: 0.9, op: 0.6, level: () => (c.levels ? c.levels[0] : 0) });
    addStreak({ x: p.x + 0.3, y: ROAD_Y + 0.016, z: p.z, color: 0xff2438, len: 3.6, width: 0.9, op: 0.6, level: () => (c.levels ? c.levels[1] : 0) });
    // 车头灯倒影
    const hp = c.g.localToWorld(new THREE.Vector3(2.4, 0, 0));
    addStreak({ x: hp.x, y: ROAD_Y + 0.015, z: hp.z, color: 0xfff0d0, len: 2.8, width: 0.9, op: 0.3 });
  });
  // 红绿灯倒影
  if (street.traffic) {
    const p = street.traffic.g.localToWorld(new THREE.Vector3(0, 0, 0.3));
    addStreak({ x: p.x + 0.2, y: ROAD_Y + 0.015, z: p.z + 0.5, color: 0x3aff7a, len: 2.6, width: 0.45, op: 0.5, colorFn: () => street.trafficColor ?? 0x3aff7a });
  }
  // 菲亚特车灯（闪的时候才有）
  if (vehicles.fiat) {
    const f = vehicles.fiat;
    const p = f.g.localToWorld(new THREE.Vector3(1.9, 0, 0));
    addStreak({ x: p.x, y: ROAD_Y + 0.015, z: p.z, color: 0xfff0c8, len: 3.4, width: 1.0, op: 0.7, level: () => f.lamps[0].material.opacity });
  }

  // ---------- 沙龙警报红光（天窗里透出来）----------
  lights.salon = pointLight(scene, 0xff2030, 3, 5, 1.2, (SKY.x1 + SKY.x2) / 2, H.cornice + 1.8, (SKY.z1 + SKY.z2) / 2);
  lights.salonWarm = pointLight(scene, 0xffc890, 2, 4.5, 1.2, (SKY.x1 + SKY.x2) / 2 + 0.6, H.cornice + 2.0, (SKY.z1 + SKY.z2) / 2);
  lights.salonGlow = pool(scene, (SKY.x1 + SKY.x2) / 2, H.top + 0.02, (SKY.z1 + SKY.z2) / 2, 4.5, 3.8, 0xff3040, 0.2);

  // ---------- 给不二子的补光（暖粉色，让她在夜色里跳出来）----------
  const [fx, fy, fz] = FUJIKO_POS;
  lights.fujiko = pointLight(scene, 0xffc0b0, 3.2, 4.2, 1.3, fx + 1.3, fy + 2.2, fz + 1.3);
}

export function animateLights(dt, t) {
  const c1 = vehicles.police[0];
  if (c1 && c1.levels && lights.policeBlue) {
    const k = state.alarm ? 1.3 : 1;
    lights.policeBlue.intensity = 9 * c1.levels[0] * k;
    lights.policeRed.intensity = 8 * c1.levels[1] * k;
  }
  vehicles.police.forEach((c) => {
    if (!c.pools || !c.levels) return;
    c.pools[0].material.opacity = 0.32 * c.levels[0];
    c.pools[1].material.opacity = 0.3 * c.levels[1];
  });
  if (lights.salon) {
    const a = state.alarm;
    const f = a ? (Math.sin(t * 14) > 0 ? 1 : 0.15) : 0.55 + 0.45 * Math.sin(t * 2.2);
    lights.salon.intensity = (a ? 8 : 3) * f;
    lights.salonGlow.material.opacity = (a ? 0.4 : 0.18) * f;
  }
  lights.lamps.forEach((L) => {
    const f = 0.9 + 0.1 * Math.sin(t * 7 + L.ph) * Math.sin(t * 3.1 + L.ph);
    L.halo.material.opacity = 0.8 * f;
  });
}
