// 静态几何合并：同材质的静态网格合成一个，大幅减少 draw call（描边效果会把 draw call 翻倍，所以很重要）
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const toRemove = [];

  const visit = (o, isRoot, fn) => {
    if (!isRoot && o.userData.anim) return; // 会动的子树单独合并
    fn(o);
    for (const c of o.children) visit(c, false, fn);
  };
  visit(root, true, (o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    if (o.userData.keep) return;
    if (Array.isArray(o.material)) return;
    const m = o.material;
    if (m.transparent) return;
    const g = o.geometry;
    if (!g.attributes.normal || !g.attributes.uv) return;
    const key = m.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    let b = buckets.get(key);
    if (!b) { b = { material: m, geos: [], cast: o.castShadow, recv: o.receiveShadow }; buckets.set(key, b); }
    const geo = g.clone();
    const mat = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    geo.applyMatrix4(mat);
    // 只保留通用属性，保证可以合并
    for (const name of Object.keys(geo.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    }
    b.geos.push(geo);
    toRemove.push(o);
  });

  for (const o of toRemove) o.parent.remove(o);

  let count = 0;
  for (const b of buckets.values()) {
    // 统一成有索引 / 无索引
    const indexed = b.geos.every((g) => g.index);
    const geos = indexed ? b.geos : b.geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    count++;
  }
  // 清理空组
  const empties = [];
  root.traverse((o) => { if (o !== root && o.isGroup && o.children.length === 0 && !o.userData.anim) empties.push(o); });
  empties.forEach((o) => o.parent && o.parent.remove(o));
  return { removed: toRemove.length, merged: count };
}

/** 合并整个场景：先静态组，再逐个合并会动的子树（各自在自己的局部坐标里） */
export function mergeAll(scene, STATIC) {
  const info = mergeStatic(STATIC);
  const anims = [];
  scene.traverse((o) => { if (o.userData.anim) anims.push(o); });
  let removed = info.removed, merged = info.merged;
  anims.forEach((a) => { const r = mergeStatic(a); removed += r.removed; merged += r.merged; });
  return { removed, merged, animGroups: anims.length };
}
