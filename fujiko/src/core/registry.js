// 全局状态 + 每帧更新回调 + 可点击物体登记
export const state = {
  rain: true,
  alarm: false,
  alarmT: 0,
  style2012: false,
  sound: false,
  autoRotate: false,
  time: 0,
};

/** 每帧回调：fn(dt, t) */
export const updaters = [];
export function onUpdate(fn) { updaters.push(fn); return fn; }

/**
 * 可点击物体
 * { name, objects: Object3D[], onClick(hit), anchor: Vector3 | () => Vector3, cursor }
 */
export const hotspots = [];
export function addHotspot(h) { hotspots.push(h); return h; }

/** 简单事件总线（警报开关、声音开关等） */
const listeners = {};
export function on(evt, fn) { (listeners[evt] ||= []).push(fn); }
export function emit(evt, ...args) { (listeners[evt] || []).forEach((fn) => fn(...args)); }

/** 共享引用（相机、控制器、场景等），由 main.js 填充 */
export const refs = {};

/** 玻璃面（雨水在上面流）：{ mesh, w, h } */
export const glassPanes = [];
