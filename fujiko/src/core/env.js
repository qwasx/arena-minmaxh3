// 运行环境 / 画质档位 / URL 参数
export const params = new URLSearchParams(location.search);

/** ?shot —— 截图/调试模式：跳过开场运镜，固定随机种子 */
export const SHOT = params.has('shot');

export const isMobile =
  (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) ||
  Math.min(innerWidth, innerHeight) < 560;

/** high | low —— 可用 ?q=low 强制低画质 */
export const QUALITY = params.get('q') || (isMobile ? 'low' : 'high');
export const HIGH = QUALITY !== 'low';

export const RAIN_COUNT = HIGH ? 3400 : 1600;
export const MAX_DPR = HIGH ? 2 : 1.5;
