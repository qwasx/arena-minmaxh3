// 统一输入状态（键鼠 + 触屏）
export const input = {
  touch: false,
  paused: false,
  sprint: false,
  jx: 0, jy: 0, // 摇杆
  attack: false,
  dash: false,
  skill: [false, false, false, false],
  item: [false, false, false, false],
  interact: false,
  flee: false,
};

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
}

export function consume(key: 'dash' | 'interact' | 'flee') { const v = input[key]; input[key] = false; return v; }
export function consumeArr(arr: boolean[], i: number) { const v = arr[i]; arr[i] = false; return v; }
