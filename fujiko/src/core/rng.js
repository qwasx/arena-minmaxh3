// 可复现的随机数（场景布置用固定种子，每次打开长得一样；雨滴等特效用 Math.random）
let seed = 19671 >>> 0; // 1967：Monkey Punch 原作连载开始的年份

export function srand(s) { seed = s >>> 0; }

export function rnd() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const rand = (a, b) => a + rnd() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// 运行时特效用
export const frand = (a, b) => a + Math.random() * (b - a);
export const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
