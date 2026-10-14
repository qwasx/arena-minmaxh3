// 程序化音效 + 五声音阶古筝式背景乐
import { bus } from './bus';

let ctx: AudioContext | null = null;
let master: GainNode, sfxGain: GainNode, musicGain: GainNode;
let noiseBuf: AudioBuffer;
const settings = { sfx: 0.6, music: 0.35, muted: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('fanren_audio') || '{}')); } catch { /* */ }

export function audioSettings() { return settings; }
export function saveAudio() {
  localStorage.setItem('fanren_audio', JSON.stringify(settings));
  if (ctx) { sfxGain.gain.value = settings.sfx; musicGain.gain.value = settings.music; master.gain.value = settings.muted ? 0 : 1; }
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx!.createGain(); master.gain.value = settings.muted ? 0 : 1; master.connect(ctx!.destination);
  sfxGain = ctx!.createGain(); sfxGain.gain.value = settings.sfx; sfxGain.connect(master);
  musicGain = ctx!.createGain(); musicGain.gain.value = settings.music; musicGain.connect(master);
  noiseBuf = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slide = 0, delay = 0, out?: AudioNode) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out || sfxGain); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur: number, vol = 0.3, freq = 1000, q = 1, type: BiquadFilterType = 'bandpass', delay = 0, slide = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const lastPlay: Record<string, number> = {};
export function sfx(name: string) {
  if (!ctx || settings.muted) return;
  const now = performance.now();
  if (now - (lastPlay[name] || 0) < 45) return;
  lastPlay[name] = now;
  switch (name) {
    case 'click': tone(880, 0.06, 'triangle', 0.12); break;
    case 'coin': tone(1320, 0.08, 'square', 0.06); tone(1760, 0.12, 'square', 0.06, 0, 0.06); break;
    case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, 0, i * 0.08)); break;
    case 'breakthrough': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, 'triangle', 0.2, 0, i * 0.11)); noise(1.5, 0.15, 300, 0.5, 'lowpass', 0, 6); break;
    case 'fail': tone(300, 0.5, 'sawtooth', 0.12, 0.5); tone(200, 0.7, 'sawtooth', 0.1, 0.5, 0.2); break;
    case 'bottle': [1047, 1319, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.15, 1.01, i * 0.1)); break;
    case 'battle': noise(0.6, 0.25, 200, 1, 'lowpass'); tone(110, 0.6, 'sawtooth', 0.15, 0.6); break;
    case 'slash': noise(0.12, 0.25, 3000, 2, 'bandpass', 0, 0.4); break;
    case 'bolt': tone(900, 0.08, 'sine', 0.06, 0.6); break;
    case 'dash': noise(0.18, 0.18, 1200, 1, 'bandpass', 0, 3); break;
    case 'fire': noise(0.35, 0.22, 800, 0.8, 'lowpass', 0, 0.3); break;
    case 'ice': tone(2000, 0.2, 'sine', 0.1, 1.5); noise(0.2, 0.12, 5000, 3, 'highpass'); break;
    case 'thunder': noise(0.7, 0.4, 2500, 0.5, 'lowpass', 0, 0.08); tone(60, 0.5, 'sawtooth', 0.15, 0.5); break;
    case 'sword': noise(0.15, 0.15, 4000, 4, 'bandpass', 0, 0.5); tone(1400, 0.12, 'sine', 0.05, 0.7); break;
    case 'needle': tone(2600, 0.06, 'sine', 0.06, 0.5); break;
    case 'beam': tone(600, 0.3, 'sawtooth', 0.08, 2); break;
    case 'bell': [440, 660, 880].forEach((f) => tone(f, 1.2, 'sine', 0.12, 1)); break;
    case 'boom': noise(0.4, 0.35, 400, 0.7, 'lowpass', 0, 0.2); break;
    case 'hit': noise(0.08, 0.2, 1500, 1.5); break;
    case 'hurt': tone(180, 0.15, 'square', 0.1, 0.6); break;
    case 'kill': tone(300, 0.3, 'triangle', 0.15, 0.4); noise(0.3, 0.15, 600, 0.6, 'lowpass'); break;
    case 'win': [523, 659, 784].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, 0, i * 0.1)); break;
    case 'capture': tone(200, 0.8, 'sine', 0.2, 6); break;
    case 'sense': tone(500, 0.4, 'sine', 0.12, 3); tone(750, 0.4, 'sine', 0.08, 3, 0.05); break;
    case 'warn': tone(660, 0.15, 'square', 0.1); tone(660, 0.15, 'square', 0.1, 0, 0.22); break;
    case 'herb': tone(1200, 0.1, 'triangle', 0.1); tone(1600, 0.15, 'triangle', 0.08, 0, 0.07); break;
    case 'open': tone(400, 0.3, 'triangle', 0.12, 1.5); break;
    case 'pulse': tone(220, 0.6, 'sine', 0.05, 1.5); break;
  }
}

// ---------- 背景音乐：五声音阶随机古筝 ----------
const PENTA = [0, 2, 4, 7, 9];
let musicTimer: any = null;
let mood: 'calm' | 'battle' = 'calm';
function pluck(freq: number, vol: number, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); const o2 = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 2.003;
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 1.2);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(musicGain);
  o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
}
function startMusic() {
  let step = 0; let phrase: number[] = [];
  const base = 196; // G3
  const tick = () => {
    if (!ctx) return;
    const tempo = mood === 'battle' ? 220 : 520;
    if (step % 16 === 0) { phrase = []; let n = Math.floor(Math.random() * 5) + 5; for (let i = 0; i < 8; i++) { n += Math.floor(Math.random() * 5) - 2; n = Math.max(0, Math.min(12, n)); phrase.push(n); } }
    const idx = phrase[step % 8];
    const play = mood === 'battle' ? Math.random() < 0.8 : Math.random() < 0.55;
    if (play) {
      const oct = Math.floor(idx / 5), deg = PENTA[idx % 5];
      const f = base * Math.pow(2, oct + deg / 12);
      pluck(f, mood === 'battle' ? 0.09 : 0.07);
      if (Math.random() < 0.2) pluck(f * 1.5, 0.03, 0.12);
    }
    if (step % 8 === 0) pluck(base / 2 * (mood === 'battle' ? 1 : [1, 1.335, 1.5, 1.122][Math.floor(step / 8) % 4]), 0.06);
    step++;
    musicTimer = setTimeout(tick, tempo * (0.9 + Math.random() * 0.2));
  };
  tick();
}
export function setMood(m: 'calm' | 'battle') { mood = m; }

bus.on('sfx', (n: string) => sfx(n));
bus.on('battleStart', () => setMood('battle'));
bus.on('battleEnd', () => setMood('calm'));
void musicTimer;
