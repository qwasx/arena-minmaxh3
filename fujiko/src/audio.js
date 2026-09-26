// 声音：全部用 WebAudio 现场合成（没有任何音频文件）
// 雨声、法国警笛 pin-pon、菲亚特喇叭、猫头鹰、猫叫、飞吻、摩托、直升机、铁塔闪灯叮叮声
let ac = null, master = null, rainGain = null, heliGain = null, sirenNodes = null;
let noiseBuf = null;
export const audio = { on: false };

function noise(sec = 2) {
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.6 + last * 2.5; }
  return b;
}
function env(g, t0, a, peak, dcy, end = 0.0001) {
  g.gain.cancelScheduledValues(t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(end, t0 + a + dcy);
}

function init() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp).connect(ac.destination);
  noiseBuf = noise(3);
  // 雨声
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.35;
  const hs = ac.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 4000; hs.gain.value = -8;
  rainGain = ac.createGain(); rainGain.gain.value = 0.34;
  src.connect(bp).connect(hs).connect(rainGain).connect(master);
  src.start();
  // 滴答声
  setInterval(() => { if (audio.on && audio.rain) drip(); }, 140);
  // 直升机：低频噪声 + 11Hz 调制
  const hsrc = ac.createBufferSource(); hsrc.buffer = noiseBuf; hsrc.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const am = ac.createGain(); am.gain.value = 0.5;
  const lfo = ac.createOscillator(); lfo.frequency.value = 11.5; lfo.type = 'sawtooth';
  const lfoG = ac.createGain(); lfoG.gain.value = 0.5;
  lfo.connect(lfoG).connect(am.gain);
  heliGain = ac.createGain(); heliGain.gain.value = 0.0;
  hsrc.connect(lp).connect(am).connect(heliGain).connect(master);
  hsrc.start(); lfo.start();
}

export function setSound(on) {
  if (on && !ac) init();
  if (!ac) return;
  audio.on = on;
  if (on) ac.resume();
  master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, on ? 0.4 : 0.15);
}
export function setRainLevel(level) {
  audio.rain = level > 0.5;
  if (rainGain) rainGain.gain.setTargetAtTime(0.34 * level, ac.currentTime, 0.6);
}
export function setHeliLevel(v) {
  if (heliGain) heliGain.gain.setTargetAtTime(v, ac.currentTime, 0.3);
}

function drip() {
  if (Math.random() > 0.55) return;
  const t = ac.currentTime + Math.random() * 0.1;
  const o = ac.createOscillator(); o.type = 'sine';
  const f = 1400 + Math.random() * 2600;
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
  const g = ac.createGain(); env(g, t, 0.003, 0.03 + Math.random() * 0.03, 0.07);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.1);
}

/** 法国警笛：435 / 580 Hz 两音交替（pin-pon） */
export function siren(sec = 6) {
  if (!audio.on) return;
  stopSiren();
  const t = ac.currentTime;
  const o = ac.createOscillator(); o.type = 'square';
  const o2 = ac.createOscillator(); o2.type = 'triangle';
  for (let k = 0; k < sec / 0.5; k++) {
    const f = k % 2 ? 580 : 435;
    o.frequency.setValueAtTime(f, t + k * 0.5); o2.frequency.setValueAtTime(f * 2, t + k * 0.5);
  }
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
  g.gain.setValueAtTime(0.09, t + sec - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
  const g2 = ac.createGain(); g2.gain.value = 0.25;
  o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(master);
  o.start(t); o2.start(t); o.stop(t + sec); o2.stop(t + sec);
  sirenNodes = { o, o2, g };
}
export function stopSiren() {
  if (!sirenNodes) return;
  try { const t = ac.currentTime; sirenNodes.g.gain.cancelScheduledValues(t); sirenNodes.g.gain.setTargetAtTime(0.0001, t, 0.1); sirenNodes.o.stop(t + 0.5); sirenNodes.o2.stop(t + 0.5); } catch (e) { /* 已停止 */ }
  sirenNodes = null;
}

/** 菲亚特 500 的「哔哔」 */
export function honk() {
  if (!audio.on) return;
  const t0 = ac.currentTime;
  [0, 0.22].forEach((d) => {
    const t = t0 + d;
    [410, 520].forEach((f) => {
      const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.015);
      g.gain.setValueAtTime(0.06, t + 0.14); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 0.2);
    });
  });
}
/** 猫头鹰「呼——呼」 */
export function hoot() {
  if (!audio.on) return;
  const t0 = ac.currentTime;
  [[0, 0.35], [0.5, 0.6]].forEach(([d, len]) => {
    const t = t0 + d;
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(380, t + len);
    const vib = ac.createOscillator(); vib.frequency.value = 6; const vg = ac.createGain(); vg.gain.value = 6; vib.connect(vg).connect(o.frequency);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(master); o.start(t); vib.start(t); o.stop(t + len + 0.05); vib.stop(t + len + 0.05);
  });
}
/** 猫叫「喵～」 */
export function meow() {
  if (!audio.on) return;
  const t = ac.currentTime, len = 0.75;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.22); o.frequency.linearRampToValueAtTime(480, t + len);
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
  bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(2200, t + 0.25); bp.frequency.linearRampToValueAtTime(1000, t + len);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.08); g.gain.setValueAtTime(0.2, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(bp).connect(g).connect(master); o.start(t); o.stop(t + len + 0.05);
}
/** 飞吻「啾～♡」 */
export function kiss() {
  if (!audio.on) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2500; hp.Q.value = 1;
  const g = ac.createGain(); env(g, t, 0.004, 0.25, 0.05);
  src.connect(hp).connect(g).connect(master); src.start(t, Math.random()); src.stop(t + 0.08);
  const o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(900, t + 0.03); o.frequency.exponentialRampToValueAtTime(2400, t + 0.16);
  const g2 = ac.createGain(); env(g2, t + 0.03, 0.01, 0.08, 0.14);
  o.connect(g2).connect(master); o.start(t + 0.03); o.stop(t + 0.22);
  sparkleSound(3, 0.25);
}
/** 摩托轰油门 */
export function vroom() {
  if (!audio.on) return;
  const t = ac.currentTime, len = 1.6;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(48, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.35); o.frequency.exponentialRampToValueAtTime(70, t + len);
  const ws = ac.createWaveShaper();
  const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
  ws.curve = curve;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(ws).connect(lp).connect(g).connect(master); o.start(t); o.stop(t + len + 0.05);
}
/** 叮叮（铁塔闪灯 / 钻石） */
export function sparkleSound(n = 10, spread = 1.5) {
  if (!audio.on) return;
  const t0 = ac.currentTime;
  for (let i = 0; i < n; i++) {
    const t = t0 + Math.random() * spread;
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 1800 + Math.random() * 2600;
    const g = ac.createGain(); env(g, t, 0.004, 0.035, 0.35);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.4);
  }
}
/** 钱形的「ルパ〜ン！」——用锯齿波模拟一声怒吼 */
export function shout() {
  if (!audio.on) return;
  const t = ac.currentTime, len = 0.9;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(260, t + 0.3); o.frequency.linearRampToValueAtTime(150, t + len);
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2.5;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.05); g.gain.setValueAtTime(0.16, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(bp).connect(g).connect(master); o.start(t); o.stop(t + len + 0.05);
}
