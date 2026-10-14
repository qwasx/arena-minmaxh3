import { input } from '../core/input';
import { bus } from '../core/bus';

export const ui = () => document.getElementById('ui')!;
export function el<T extends HTMLElement = HTMLElement>(html: string): T { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as T; }
export function esc(s: any) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]); }
export function fmt(n: number) { n = Math.round(n); if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿'; if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e5 ? 0 : 1) + '万'; return String(n); }

let panelWrap: HTMLElement | null = null;
let panelRefresh: (() => void) | null = null;
let panelClose: (() => void) | null = null;
export let currentPanel = '';

export function openPanel(id: string, title: string, build: (body: HTMLElement, panel: HTMLElement) => (() => void) | void, opts: { small?: boolean; onClose?: () => void; extraHeader?: string } = {}) {
  closePanel();
  currentPanel = id;
  panelWrap = el(`<div id="panelWrap"><div class="panel paper ${opts.small ? 'small' : ''}"><header><h2>${esc(title)}</h2>${opts.extraHeader || ''}<button class="close">✕</button></header><div class="body"></div></div></div>`);
  ui().appendChild(panelWrap);
  const body = panelWrap.querySelector('.body') as HTMLElement;
  const panel = panelWrap.querySelector('.panel') as HTMLElement;
  panelWrap.querySelector('.close')!.addEventListener('click', () => { bus.emit('sfx', 'click'); closePanel(); });
  panelWrap.addEventListener('pointerdown', (e) => { if (e.target === panelWrap) closePanel(); });
  input.paused = true;
  panelClose = opts.onClose || null;
  const r = build(body, panel);
  panelRefresh = r || null;
}
export function closePanel() {
  if (panelWrap) { panelWrap.remove(); panelWrap = null; input.paused = false; const c = panelClose; panelClose = null; panelRefresh = null; currentPanel = ''; c?.(); }
}
export function refreshPanel() { panelRefresh?.(); }
export function panelOpen() { return !!panelWrap; }

export interface MBtn { label: string; cls?: string; fn?: () => void | boolean; disabled?: boolean; }
const modalStack: HTMLElement[] = [];
export function modal(title: string, html: string, buttons: MBtn[] = [{ label: '确定' }], opts: { wide?: boolean; noClose?: boolean } = {}) {
  const w = el(`<div id="modalWrap"><div class="modal paper" ${opts.wide ? 'style="width:min(760px,94vw)"' : ''}>${title ? `<h3>${esc(title)}</h3>` : ''}<div class="mbody">${html}</div><div class="choices"></div></div></div>`);
  const ch = w.querySelector('.choices') as HTMLElement;
  const close = () => { w.remove(); const i = modalStack.indexOf(w); if (i >= 0) modalStack.splice(i, 1); if (!modalStack.length && !panelWrap) input.paused = false; };
  for (const b of buttons) {
    const bt = el<HTMLButtonElement>(`<button class="btn ${b.cls || ''}">${b.label}</button>`);
    if (b.disabled) bt.disabled = true;
    bt.addEventListener('click', () => { bus.emit('sfx', 'click'); const keep = b.fn?.(); if (keep !== true) close(); });
    ch.appendChild(bt);
  }
  if (buttons.length <= 2 && buttons.every((b) => b.label.length < 6)) { ch.style.flexDirection = 'row'; ch.style.justifyContent = 'center'; }
  ui().appendChild(w); modalStack.push(w);
  input.paused = true;
  return { close, root: w, body: w.querySelector('.mbody') as HTMLElement };
}
export function confirmBox(text: string, yes = '确定', no = '取消'): Promise<boolean> {
  return new Promise((res) => modal('', `<p style="text-align:center">${text}</p>`, [{ label: yes, cls: 'red', fn: () => res(true) }, { label: no, fn: () => res(false) }]));
}
export function modalOpen() { return modalStack.length > 0; }
export function closeAllModals() { while (modalStack.length) modalStack.pop()!.remove(); }
