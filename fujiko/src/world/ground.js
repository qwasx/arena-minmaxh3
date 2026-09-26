// 地面：石板路、人行道、路缘石、斑马线、水洼、井盖、排水沟
import * as THREE from 'three';
import { ct, M, BX, noOL, basic, PI, rr, FONT_SANS, FONT_SERIF, ctx } from '../core/helpers.js';
import { rand } from '../core/rng.js';
import {
  HALF, SW_H, ROAD_Y, MAISON, CAFE, FRONT_SW, SIDE_SW, FRONT_ROAD, SIDE_ROAD,
  FAR_FRONT_SW, FAR_SIDE_SW, ALLEY, METRO,
} from './layout.js';

export const puddles = [];
/** 行道树位置（远侧人行道） */
export const TREE_SPOTS = [[-7.5, 10.9], [11.0, -9.3], [11.0, -3.4]];

/** 按世界坐标铺 UV 的地面片（同材质可以合并成一个网格） */
function groundQuad(x1, x2, z1, z2, y, mat, tile, parent) {
  const geo = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
  geo.rotateX(-PI / 2);
  geo.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, -pos.getZ(i) / tile);
  const m = new THREE.Mesh(geo, mat);
  (parent || ctx.parent).add(m);
  return m;
}

export function buildGround() {
  // ---------- 贴图 ----------
  const cobbleTex = ct(512, 512, (g, w, h) => {
    g.fillStyle = '#171a26'; g.fillRect(0, 0, w, h);
    const rows = 12, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand(0, 30);
      while (x < w) {
        const sw = rand(34, 50);
        const v = rand(52, 84) | 0;
        const draw = (ox) => {
          g.fillStyle = `rgb(${v - 6},${v},${v + 18})`;
          rr(g, ox + 2.5, r * rh + 2.5, sw - 5, rh - 5, 8); g.fill();
          g.fillStyle = `rgba(185,200,255,${rand(0.06, 0.2).toFixed(3)})`;
          rr(g, ox + 7, r * rh + 5, sw * 0.45, 4, 2); g.fill();
          g.fillStyle = 'rgba(0,0,10,0.18)';
          rr(g, ox + 4, r * rh + rh - 9, sw - 8, 4, 2); g.fill();
        };
        draw(x); if (x + sw > w) draw(x - w); if (x < 0) draw(x + w);
        x += sw;
      }
    }
  }, { repeat: [1, 1] });
  const asphaltTex = ct(256, 256, (g, w, h) => {
    g.fillStyle = '#434756'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = rand(40, 88) | 0;
      g.fillStyle = `rgba(${v},${v + 3},${v + 14},0.4)`;
      g.fillRect(rand(0, w), rand(0, h), 1.6, 1.6);
    }
  }, { repeat: [1, 1] });

  const cobble = M(0xffffff, { map: cobbleTex });
  const walk = M(0xffffff, { map: asphaltTex });
  const slab = M(0x3b3f4c);
  const curb = M(0xa3a8b5);

  // ---------- 路面（石板） ----------
  groundQuad(-HALF, HALF, FRONT_ROAD.z1, FRONT_ROAD.z2, ROAD_Y, cobble, 2.6);
  groundQuad(SIDE_ROAD.x1, SIDE_ROAD.x2, -HALF, FRONT_ROAD.z1, ROAD_Y, cobble, 2.6);
  groundQuad(-HALF, SIDE_SW.x1, ALLEY.z1, ALLEY.z2, ROAD_Y, cobble, 2.6);

  // ---------- 人行道 ----------
  const sw = (x1, x2, z1, z2) => {
    BX(x1, x2, 0, SW_H, z1, z2, slab);
    groundQuad(x1, x2, z1, z2, SW_H + 0.002, walk, 3);
  };
  sw(-HALF, SIDE_SW.x2, FRONT_SW.z1, FRONT_SW.z2);            // 近侧（沿前街）
  sw(SIDE_SW.x1, SIDE_SW.x2, -HALF, FRONT_SW.z1);             // 近侧（沿侧街）
  sw(FAR_SIDE_SW.x1, HALF, -HALF, FAR_FRONT_SW.z1);           // 远侧（右）
  // 远侧（前）—— 绕开地铁口
  sw(-HALF, METRO.x1, FAR_FRONT_SW.z1, HALF);
  sw(METRO.x2, HALF, FAR_FRONT_SW.z1, HALF);
  sw(METRO.x1, METRO.x2, FAR_FRONT_SW.z1, METRO.z1);
  sw(METRO.x1, METRO.x2, METRO.z2, HALF);
  // 楼下（被楼盖住的部分也铺上，防止缝隙）
  BX(MAISON.x1, MAISON.x2, 0, 0.05, MAISON.z1, MAISON.z2, slab);
  BX(CAFE.x1, CAFE.x2, 0, 0.05, CAFE.z1, CAFE.z2, slab);

  // ---------- 路缘石 ----------
  const c = 0.16, ch = SW_H + 0.03;
  BX(-HALF, SIDE_SW.x2 + c / 2, 0, ch, FRONT_SW.z2 - c / 2, FRONT_SW.z2 + c / 2, curb);
  BX(SIDE_SW.x2 - c / 2, SIDE_SW.x2 + c / 2, 0, ch, -HALF, FRONT_SW.z2, curb);
  BX(-HALF, HALF, 0, ch, FAR_FRONT_SW.z1 - c / 2, FAR_FRONT_SW.z1 + c / 2, curb);
  BX(FAR_SIDE_SW.x1 - c / 2, FAR_SIDE_SW.x1 + c / 2, 0, ch, -HALF, FAR_FRONT_SW.z1, curb);
  // 后巷口的小路缘
  BX(-HALF, SIDE_SW.x1, 0, 0.06, ALLEY.z2 - 0.08, ALLEY.z2 + 0.08, curb);

  // ---------- 排水沟（巴黎街边的 caniveau，带一点水光） ----------
  const gutterM = noOL(new THREE.MeshBasicMaterial({ color: 0x5a6a9a, transparent: true, opacity: 0.22, depthWrite: false }));
  const gut = (x1, x2, z1, z2) => {
    const m = groundQuad(x1, x2, z1, z2, ROAD_Y + 0.004, gutterM, 1);
    m.userData.keep = true;
  };
  gut(-HALF, SIDE_SW.x2, FRONT_SW.z2 + 0.08, FRONT_SW.z2 + 0.34);
  gut(SIDE_SW.x2 + 0.08, SIDE_SW.x2 + 0.34, -HALF, FRONT_SW.z2);
  gut(-HALF, HALF, FAR_FRONT_SW.z1 - 0.34, FAR_FRONT_SW.z1 - 0.08);
  gut(FAR_SIDE_SW.x1 - 0.34, FAR_SIDE_SW.x1 - 0.08, -HALF, FAR_FRONT_SW.z1);

  // ---------- 斑马线 ----------
  const zebra = M(0xe9ecf3);
  for (let i = 0; i < 8; i++) {
    const z = FRONT_ROAD.z1 + 0.35 + i * 0.8;
    BX(0.7, 3.5, ROAD_Y, ROAD_Y + 0.012, z, z + 0.45, zebra);
  }
  for (let i = 0; i < 7; i++) {
    const x = SIDE_ROAD.x1 + 0.35 + i * 0.8;
    BX(x, x + 0.45, ROAD_Y, ROAD_Y + 0.012, -1.3, 1.0, zebra);
  }
  // 停止线
  BX(SIDE_ROAD.x1 + 0.2, (SIDE_ROAD.x1 + SIDE_ROAD.x2) / 2, ROAD_Y, ROAD_Y + 0.012, -1.95, -1.75, zebra);
  // 车道分隔虚线（前街）
  for (let x = -11.4; x < -0.6; x += 2.2) BX(x, x + 1.1, ROAD_Y, ROAD_Y + 0.01, 4.62, 4.78, zebra);
  for (let x = 10.6; x < 11.9; x += 2.2) BX(x, x + 1.1, ROAD_Y, ROAD_Y + 0.01, 4.62, 4.78, zebra);
  // 侧街中线
  for (let z = -11.4; z < -2.4; z += 2.2) BX(7.02, 7.18, ROAD_Y, ROAD_Y + 0.01, z, z + 1.1, zebra);

  // ---------- 井盖 ----------
  const manholeTex = ct(256, 256, (g) => {
    g.fillStyle = '#3b3f4d'; g.beginPath(); g.arc(128, 128, 126, 0, 2 * PI); g.fill();
    g.strokeStyle = '#262934'; g.lineWidth = 5;
    for (let r = 26; r < 120; r += 22) { g.beginPath(); g.arc(128, 128, r, 0, 2 * PI); g.stroke(); }
    g.fillStyle = '#5c6070'; g.font = `bold 22px ${FONT_SANS}`; g.textAlign = 'center';
    g.fillText('VILLE DE PARIS', 128, 70); g.fillText('ÉGOUT', 128, 200);
  });
  const mh = M(0xffffff, { map: manholeTex });
  [[-4.2, 4.1], [7.6, -6.4], [-9.6, -10.6]].forEach(([x, z]) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), mh);
    m.rotation.x = -PI / 2; m.position.set(x, ROAD_Y + 0.006, z);
    ctx.parent.add(m);
  });

  // ---------- 行道树铁箅子 ----------
  const grateTex = ct(128, 128, (g) => {
    g.fillStyle = '#23252c'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#4a4e5a'; g.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 2 * PI;
      g.beginPath(); g.moveTo(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18); g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); g.stroke();
    }
    for (let r = 26; r < 64; r += 12) { g.beginPath(); g.arc(64, 64, r, 0, 2 * PI); g.stroke(); }
    g.fillStyle = '#15161b'; g.beginPath(); g.arc(64, 64, 16, 0, 2 * PI); g.fill();
  });
  const grateM = M(0xffffff, { map: grateTex });
  TREE_SPOTS.forEach(([x, z]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), grateM);
    m.rotation.x = -PI / 2; m.position.set(x, SW_H + 0.006, z);
    ctx.parent.add(m);
  });

  // ---------- 水洼 ----------
  const puddleMat = noOL(new THREE.MeshBasicMaterial({ color: 0x10152a, transparent: true, opacity: 0.66, depthWrite: false }));
  const rimMat = noOL(new THREE.MeshBasicMaterial({ color: 0x6f7fb8, transparent: true, opacity: 0.16, depthWrite: false }));
  const circle = new THREE.CircleGeometry(1, 40);
  function puddle(x, z, sx, sz, rot, y) {
    const g = new THREE.Group();
    const m1 = new THREE.Mesh(circle, rimMat); m1.scale.set(1.08, 1.08, 1);
    const m = new THREE.Mesh(circle, puddleMat);
    m1.rotation.x = m.rotation.x = -PI / 2; m.position.y = 0.002;
    g.add(m1, m); g.scale.set(sx, 1, sz); g.rotation.y = rot; g.position.set(x, y, z);
    g.userData.keep = true; m.userData.keep = true; m1.userData.keep = true;
    ctx.parent.add(g);
    puddles.push({ x, z, sx: sx * 0.85, sz: sz * 0.85, rot, y: y + 0.006 });
  }
  const R = ROAD_Y + 0.004, S = SW_H + 0.006;
  puddle(-6.8, 3.2, 1.7, 0.8, 0.2, R);
  puddle(-1.2, 6.4, 1.2, 0.7, -0.3, R);
  puddle(5.6, 5.9, 1.5, 0.9, 0.4, R);
  puddle(8.6, -2.6, 0.9, 1.6, 0.1, R);
  puddle(6.2, -9.4, 0.8, 1.3, -0.2, R);
  puddle(-3.4, -10.4, 1.3, 0.6, 0.1, R);
  puddle(9.2, 6.8, 0.8, 0.5, 0.3, R);
  puddle(-10.0, 5.6, 1.0, 0.6, 0.0, R);
  puddle(-4.4, 0.8, 0.9, 0.35, 0.05, S);
  puddle(3.2, -6.4, 0.35, 0.9, 0.0, S);
  puddle(-2.6, 9.0, 1.0, 0.4, 0.1, S);
  puddle(8.6, 11.0, 0.8, 0.4, 0.2, S);
  puddle(11.0, 1.4, 0.4, 0.9, 0.0, S);
}
