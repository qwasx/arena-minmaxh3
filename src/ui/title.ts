// 标题画面：新游戏 / 读档 / 继续
import { setState, loadGame, slotMeta, GameState, dateStr } from '../core/state';
import { newGame, ensureWorld } from '../core/newgame';
import { realmName } from '../data/realms';
import { bus } from '../core/bus';
import { input } from '../core/input';
import { el, ui, esc, closePanel, closeAllModals } from './dom';

let titleEl: HTMLElement | null = null;
let hooked = false;

function game(): Phaser.Game { return (window as any).__game; }

export function startWithState(s: GameState) {
  setState(s);
  ensureWorld();
  closePanel(); closeAllModals();
  input.paused = false;
  titleEl?.remove(); titleEl = null;
  const g = game();
  if (g.scene.isActive('battle') || g.scene.isPaused('battle')) g.scene.stop('battle');
  if (g.scene.isActive('world') || g.scene.isPaused('world') || g.scene.isSleeping('world')) g.scene.stop('world');
  g.scene.start('world');
}

function latestSlot(): number | null {
  let best: number | null = null; let t = 0;
  for (let i = 0; i <= 3; i++) { const m = slotMeta(i); if (m && m.time > t) { t = m.time; best = i; } }
  return best;
}

function slotLine(i: number) {
  const m = slotMeta(i);
  return `<div class="slotrow" data-i="${i}" style="cursor:${m ? 'pointer' : 'default'}"><b style="width:56px">${i === 0 ? '自动' : '存档' + i}</b><div style="flex:1" class="${m ? '' : 'muted'}">${m ? `${esc(realmName(m.realm, m.stage))} · ${dateStr(m.day)}<div class="muted" style="font-size:12px">${new Date(m.time).toLocaleString()}</div>` : '空'}</div></div>`;
}

export function showTitle() {
  if (!hooked) { hooked = true; bus.on('loadState', (g: GameState) => startWithState(g)); }
  titleEl?.remove();
  titleEl = el(`<div id="title"><div class="box paper"><h1>凡人修仙传<small>人 界 · 开 放 世 界</small></h1><div class="menu"></div><p class="muted" style="margin:14px 0 0;font-size:12px">天南 · 乱星海 · 大晋 · 天澜草原 · 极西之地<br>无主线，一切皆由你书写</p></div></div>`);
  ui().appendChild(titleEl);
  mainMenu();
}

function mainMenu() {
  const menu = titleEl!.querySelector('.menu') as HTMLElement;
  const last = latestSlot();
  menu.innerHTML = `${last !== null ? '<button class="btn red cont">继续修行</button>' : ''}<button class="btn jade newg">踏入仙途（新游戏）</button><button class="btn load">读取存档</button>`;
  menu.querySelector('.cont')?.addEventListener('click', () => { const g = loadGame(last!); if (g) startWithState(g); });
  menu.querySelector('.newg')!.addEventListener('click', newMenu);
  menu.querySelector('.load')!.addEventListener('click', loadMenu);
}

function newMenu() {
  const menu = titleEl!.querySelector('.menu') as HTMLElement;
  let diff: 'easy' | 'normal' | 'hard' = 'easy'; let slot = 1;
  const draw = () => {
    menu.innerHTML = `<b>选择难度</b><div class="diff">
      <div class="card ${diff === 'easy' ? 'on' : ''}" data-d="easy"><b>逍遥</b><div class="muted" style="font-size:12px">受伤大减，突破更易，适合体验剧情世界</div></div>
      <div class="card ${diff === 'normal' ? 'on' : ''}" data-d="normal"><b>寻常</b><div class="muted" style="font-size:12px">修仙界本来的样子</div></div>
      <div class="card ${diff === 'hard' ? 'on' : ''}" data-d="hard"><b>逆天</b><div class="muted" style="font-size:12px">人心险恶，步步杀机</div></div></div>
      <b>存档位</b><div class="row" style="justify-content:center">${[1, 2, 3].map((i) => `<button class="btn sm ${slot === i ? 'jade' : ''} sl" data-i="${i}">存档${i}${slotMeta(i) ? '（覆盖）' : ''}</button>`).join('')}</div>
      <button class="btn red go">开 始</button><button class="btn sm back">返回</button>`;
    menu.querySelectorAll('.diff .card').forEach((c) => c.addEventListener('click', () => { diff = (c as HTMLElement).dataset.d as any; draw(); }));
    menu.querySelectorAll('.sl').forEach((c) => c.addEventListener('click', () => { slot = +(c as HTMLElement).dataset.i!; draw(); }));
    menu.querySelector('.back')!.addEventListener('click', mainMenu);
    menu.querySelector('.go')!.addEventListener('click', () => {
      const b = menu.querySelector('.go') as HTMLButtonElement; b.disabled = true; b.textContent = '天地初开……';
      setTimeout(() => { const s = newGame(diff, slot); startWithState(s); }, 30);
    });
  };
  draw();
}

function loadMenu() {
  const menu = titleEl!.querySelector('.menu') as HTMLElement;
  menu.innerHTML = `<div class="slots" style="display:flex;flex-direction:column;gap:6px">${[0, 1, 2, 3].map(slotLine).join('')}</div><button class="btn sm back">返回</button>`;
  menu.querySelectorAll('.slotrow').forEach((r) => r.addEventListener('click', () => { const i = +(r as HTMLElement).dataset.i!; if (!slotMeta(i)) return; const g = loadGame(i); if (g) startWithState(g); }));
  menu.querySelector('.back')!.addEventListener('click', mainMenu);
}
