// UI 主控：HUD、提示、事件分发、战斗 HUD、摇杆
import { S, hasState, dateStr, saveGame, NPC } from '../core/state';
import { computeStats, canBreak, chooseTalent, countItem, lifespanLeft } from '../core/player';
import { realmName, expNeeded, REALMS } from '../data/realms';
import { TALENTS, SPELLS } from '../data/techniques';
import { item } from '../data/items';
import { bus, toast } from '../core/bus';
import { input, isTouchDevice } from '../core/input';
import { iconURL } from '../core/textures';
import { getOverview } from '../core/worldgen';
import { WORLD_W, WORLD_H, LOCATIONS, LocationDef } from '../data/world';
import { world } from '../scenes/WorldScene';
import { el, esc, ui, openPanel, closePanel, modal, panelOpen, modalOpen, refreshPanel, fmt, currentPanel, closeAllModals } from './dom';
import { openInventory, openCharacter, openAlchemy, openMap, openNews, openCompanions, openSystem, doRetreat } from './panels';
import { openNPC } from './npcPanel';
import { openLocation } from './locPanel';
import { runRandomEvent } from './eventPanel';
import { chibiCanvasFor } from '../scenes/texreg';
import { initAudio } from '../core/audio';
import { showTitle } from './title';

const portraitCache = new Map<string, string>();
export function portraitURL(n: NPC | 'hanli'): string {
  if (n === 'hanli') return '/assets/portraits/hanli.webp';
  if (n.portrait) return `/assets/portraits/${n.portrait}.webp`;
  const k = n.id;
  if (!portraitCache.has(k)) portraitCache.set(k, chibiCanvasFor(n).toDataURL());
  return portraitCache.get(k)!;
}

let hudEl: HTMLElement, topRight: HTMLElement, actionbar: HTMLElement, promptEl: HTMLElement, toasts: HTMLElement, banner: HTMLElement, joy: HTMLElement;
let minimap: HTMLCanvasElement; let mmT = 0;
let inBattle = false; let bhud: HTMLElement | null = null;
let stalkEl: HTMLElement | null = null;

export function initUI() {
  input.touch = isTouchDevice();
  const root = ui();
  toasts = el(`<div id="toasts"></div>`); root.appendChild(toasts);
  banner = el(`<div id="regionBanner"><h1></h1><p></p></div>`); root.appendChild(banner);
  bus.on('toast', (text: string, kind: string) => {
    const t = el(`<div class="toast ${kind}">${esc(text)}</div>`);
    toasts.appendChild(t);
    while (toasts.children.length > 5) toasts.firstElementChild!.remove();
    setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, kind === 'gold' ? 4200 : 3000);
  });
  document.addEventListener('pointerdown', () => initAudio(), { once: false });
  window.addEventListener('keydown', onKey);
  bus.on('worldReady', buildHUD);
  bus.on('hud', updateHUD);
  bus.on('refresh', () => { updateHUD(); refreshPanel(); });
  bus.on('talents', showTalents);
  bus.on('lifeEnd', onLifeEnd);
  bus.on('stalkWarn', (n: NPC) => {
    bus.emit('sfx', 'warn');
    stalkEl?.remove();
    stalkEl = el(`<div id="stalkWarn">⚠ 神识感应：${esc(n.name)}（${realmName(n.realm, n.stage)}）似乎在暗中尾随你……速往城镇！</div>`);
    ui().appendChild(stalkEl);
    const e = stalkEl; setTimeout(() => e.remove(), 7000);
  });
  bus.on('eventSpawn', () => { /* 传闻已写入 */ });
  bus.on('npcInteract', (n: NPC) => { if (!inBattle && !panelOpen()) openNPC(n); });
  bus.on('locInteract', (l: LocationDef) => { if (!inBattle && !panelOpen()) openLocation(l); });
  bus.on('randomEvent', (ev: any, x: number, y: number) => runRandomEvent(ev, x, y));
  bus.on('lootShow', (o: { title: string; items: string[] }) => {
    if (!o.items.length) return;
    modal(o.title, `<div class="list">${o.items.map((t) => `<div class="li" style="cursor:default">✦ ${esc(t)}</div>`).join('')}</div>`, [{ label: '收下', cls: 'jade' }]);
  });
  bus.on('death', (o: { killer?: string; msgs: string[]; place: string }) => {
    modal('身 死 道 消', `<p style="text-align:center">${o.killer ? `你被<b>${esc(o.killer)}</b>斩杀……` : '你在斗法中力竭身亡……'}</p><p style="text-align:center">所幸一缕元神未灭，你在<b>${esc(o.place)}</b>附近醒来。</p><div class="list">${o.msgs.map((m) => `<div class="li bad" style="cursor:default">${esc(m)}</div>`).join('')}</div>`, [{ label: '重整旗鼓', cls: 'red' }]);
  });
  bus.on('region', (rg: any) => {
    banner.querySelector('h1')!.textContent = rg.name;
    banner.querySelector('p')!.textContent = rg.desc + `（危险：${rg.danger[0]}~${rg.danger[1]}级）`;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 3200);
    if (topRight) topRight.querySelector('#regionTag')!.textContent = rg.name;
  });
  bus.on('nearChange', (l: LocationDef | null, n: NPC | null) => {
    if (!promptEl) return;
    const key = input.touch ? '点击' : 'E';
    if (n) { promptEl.innerHTML = `<b>${key}</b> 与 ${esc(n.name)} 交谈`; promptEl.classList.remove('hidden'); }
    else if (l) { promptEl.innerHTML = `<b>${key}</b> ${l.type === 'danger' ? '探索' : l.type === 'secret' ? '查看' : l.type === 'portal' ? '使用' : '进入'}「${esc(l.name)}」`; promptEl.classList.remove('hidden'); }
    else promptEl.classList.add('hidden');
  });
  bus.on('battleStart', onBattleStart);
  bus.on('battleHud', onBattleHud);
  bus.on('battleEnd', onBattleEnd);
  showTitle();
}

function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
  if (!hasState() || !hudEl || inBattle) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (modalOpen()) return; if (panelOpen()) closePanel(); else openSystem(); return; }
  if (modalOpen()) return;
  const map: Record<string, () => void> = { b: openInventory, i: openInventory, c: openCharacter, l: openAlchemy, m: openMap, p: openCompanions, n: openNews, t: toggleMeditate, k: doRetreat };
  if (map[k]) {
    const ids: Record<string, string> = { b: 'inv', i: 'inv', c: 'char', l: 'alch', m: 'map', p: 'comp', n: 'news' };
    if (panelOpen() && currentPanel === ids[k]) { closePanel(); return; }
    map[k]();
  }
}

export function toggleMeditate() {
  const p = S().player; p.meditating = !p.meditating;
  toast(p.meditating ? '盘膝打坐，吐纳灵气（修炼速度 ×3，移动即中断）' : '结束打坐', 'info');
  updateHUD();
}

function buildHUD() {
  document.getElementById('hud')?.remove(); document.getElementById('topright')?.remove(); document.getElementById('actionbar')?.remove(); document.getElementById('prompt')?.remove(); document.getElementById('joy')?.remove();
  const root = ui();
  hudEl = el(`<div id="hud"><div class="face" style="background-image:url(${portraitURL('hanli')})"></div><div class="info paper"><div class="nm">韩立 <span class="realm"></span><span class="sp"></span><span class="seal age"></span></div>
    <div class="bar hp"><i></i><span></span></div><div class="bar mp"><i></i><span></span></div><div class="bar exp"><i></i><span></span></div><div class="meta"></div></div></div>`);
  hudEl.querySelector('.face')!.addEventListener('click', openCharacter);
  root.appendChild(hudEl);
  topRight = el(`<div id="topright"><div class="row"><div id="regionTag" class="paper"></div><div id="clock" class="paper"></div></div><canvas id="minimap" width="440" height="294"></canvas></div>`);
  root.appendChild(topRight);
  minimap = topRight.querySelector('#minimap') as HTMLCanvasElement;
  minimap.addEventListener('click', openMap);
  const btns: [string, string, string, () => void][] = [
    ['包', '储物袋', 'B', openInventory], ['人', '人物', 'C', openCharacter], ['丹', '掌天瓶', 'L', openAlchemy], ['图', '舆图', 'M', openMap],
    ['伴', '同伴', 'P', openCompanions], ['闻', '传闻', 'N', openNews], ['坐', '打坐', 'T', toggleMeditate], ['关', '闭关', 'K', doRetreat], ['突', '突破', '', () => openCharacter()], ['系', '系统', 'Esc', openSystem],
  ];
  actionbar = el(`<div id="actionbar" class="paper"></div>`);
  for (const [ch, nm, key, fn] of btns) {
    const b = el(`<button class="abtn" data-k="${ch}">${ch}<small>${nm}</small>${key && !input.touch ? `<kbd>${key}</kbd>` : ''}</button>`);
    b.addEventListener('click', () => { bus.emit('sfx', 'click'); fn(); });
    actionbar.appendChild(b);
  }
  root.appendChild(actionbar);
  promptEl = el(`<div id="prompt" class="paper hidden"></div>`);
  promptEl.addEventListener('click', () => { input.interact = true; });
  root.appendChild(promptEl);
  if (input.touch) buildJoystick();
  updateHUD();
}

export function updateHUD() {
  if (!hudEl || !hasState()) return;
  const s = S(); const p = s.player; const st = computeStats(p);
  const need = expNeeded(p.realm, p.stage);
  hudEl.querySelector('.realm')!.textContent = realmName(p.realm, p.stage);
  hudEl.querySelector('.age')!.textContent = `${Math.floor(p.age)}岁`;
  const set = (sel: string, v: number, m: number, txt: string) => { const b = hudEl.querySelector(sel) as HTMLElement; (b.firstElementChild as HTMLElement).style.width = Math.min(100, (v / m) * 100) + '%'; b.querySelector('span')!.textContent = txt; };
  set('.hp', p.hp, st.maxHp, `气血 ${fmt(p.hp)}/${fmt(st.maxHp)}`);
  set('.mp', p.mp, st.maxMp, `法力 ${fmt(p.mp)}/${fmt(st.maxMp)}`);
  set('.exp', p.exp, need, `修为 ${fmt(p.exp)}/${fmt(need)}${p.meditating ? ' · 打坐中' : ''}`);
  hudEl.querySelector('.exp')!.classList.toggle('full', canBreak(p));
  const left = lifespanLeft(p);
  hudEl.querySelector('.meta')!.innerHTML = `<span>💎 ${fmt(p.lingshi)}</span><span>神识 ${st.sense}（${Math.round(st.senseRadius)}丈）</span><span title="掌天瓶">🟢 ${p.bottle.drops}/${p.bottle.max}</span>${left < 20 ? `<span class="bad">寿元余${Math.max(0, Math.floor(left))}年</span>` : ''}${p.injury > 0.05 ? '<span class="bad">有伤</span>' : ''}${p.heat > 40 ? '<span class="bad">怀璧其罪</span>' : ''}`;
  if (topRight) topRight.querySelector('#clock')!.textContent = dateStr(s.day);
  if (actionbar) {
    actionbar.querySelector('[data-k="坐"]')!.classList.toggle('on', p.meditating);
    const tb = actionbar.querySelector('[data-k="突"]') as HTMLElement;
    tb.classList.toggle('hidden', !canBreak(p));
  }
  const now = performance.now();
  if (now - mmT > 1200) { mmT = now; drawMinimap(); }
}

function drawMinimap() {
  if (!minimap || !world) return;
  const c = minimap.getContext('2d')!; const W = minimap.width, H = minimap.height;
  const s = S(); const p = s.player;
  c.drawImage(getOverview(), 0, 0, W, H);
  const fog = world.fogTex?.getSourceImage() as HTMLCanvasElement;
  if (fog) c.drawImage(fog, 0, 0, W, H);
  const sx = W / WORLD_W, sy = H / WORLD_H;
  for (const l of LOCATIONS) { if (!s.known[l.id]) continue; c.fillStyle = l.type === 'danger' ? '#a02020' : l.type === 'secret' ? '#7030a0' : l.type === 'city' ? '#2a221c' : '#5a4a3c'; c.fillRect(l.x * sx - 2, l.y * sy - 2, l.type === 'city' ? 5 : 3, l.type === 'city' ? 5 : 3); }
  for (const e of s.events) if (!e.taken && e.until > s.day) { c.fillStyle = '#f0b020'; c.beginPath(); c.arc(e.x * sx, e.y * sy, 3, 0, 7); c.fill(); }
  const st = computeStats(p);
  c.strokeStyle = 'rgba(47,93,87,0.9)'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x * sx, p.y * sy, Math.max(3, st.senseRadius * sx), 0, 7); c.stroke();
  c.fillStyle = '#d02020'; c.beginPath(); c.arc(p.x * sx, p.y * sy, 4, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
}

function showTalents() {
  const p = S().player; const ids = p.pendingTalents; if (!ids?.length) return;
  const cards = ids.map((id) => { const t = TALENTS.find((x) => x.id === id)!; return `<div class="card r${t.rarity}" data-id="${id}"><div style="font-size:20px;font-weight:bold">${t.name}</div><div class="muted" style="margin:4px 0">${['', '凡', '灵', '玄', '天'][t.rarity]}品命格</div><div>${t.desc}</div></div>`; }).join('');
  const m = modal('逆 天 改 命', `<p style="text-align:center">大道感应，择一命格，永久生效：</p><div class="talpick">${cards}</div>`, [], { wide: true });
  m.body.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => { chooseTalent((c as HTMLElement).dataset.id!); bus.emit('sfx', 'levelup'); toast(`获得命格「${TALENTS.find((t) => t.id === (c as HTMLElement).dataset.id)!.name}」`, 'gold'); m.close(); }));
}

function onLifeEnd() {
  const s = S(); const p = s.player;
  if (s.flags.lifeEnded) return; s.flags.lifeEnded = true;
  input.paused = true;
  modal('寿 元 耗 尽', `<p style="text-align:center">${dateStr(s.day)}，韩立以${realmName(p.realm, p.stage)}修为，寿元耗尽，坐化于洞府之中，享年${Math.floor(p.age)}岁。</p><p style="text-align:center" class="muted">一生斩杀修士 ${p.kills} 人，道侣 ${s.npcs.filter((n) => n.partner).length} 位。仙路漫漫，终究未能更进一步。</p>`, [
    { label: '读取存档', cls: 'jade', fn: () => { s.flags.lifeEnded = false; location.reload(); } },
    { label: '服下延寿灵物，再搏一次（寿元 +10 年，修为大损）', fn: () => { p.lifeBonus += 10 + (p.age - computeStats(p).lifespan); p.exp = 0; s.flags.lifeEnded = false; input.paused = false; toast('你燃烧精血，强行续命十年……', 'bad'); } },
  ], { noClose: true });
}

// ---------------- 战斗 HUD ----------------
function onBattleStart(o: { title: string; spells: string[]; canFlee: boolean; boss?: string }) {
  inBattle = true;
  closePanel(); closeAllModals();
  for (const id of ['hud', 'topright', 'actionbar', 'prompt']) document.getElementById(id)?.classList.add('hidden');
  bhud?.remove();
  const p = S().player;
  const keys = ['Q', 'E', 'R', 'F'];
  const skills = o.spells.map((id, i) => `<button class="sk" data-s="${i}"><kbd>${input.touch ? '' : keys[i]}</kbd>${SPELLS[id]?.name.slice(0, 4)}<div class="cd" style="transform:scaleY(0)"></div></button>`).join('');
  const items = p.quick.map((id, i) => id ? `<button class="sk item" data-i="${i}" style="background-image:url(${iconURL(id)})"><kbd>${input.touch ? '' : i + 1}</kbd><span class="cnt"></span></button>` : '').join('');
  bhud = el(`<div id="bhud"><div class="btitle">⚔ ${esc(o.title)}</div><div class="boss hidden"><div class="bn"></div><div class="bar hp"><i></i></div></div><div class="fleebar hidden"></div>
    <div class="pstat paper"><div class="bar hp"><i></i><span></span></div><div class="bar mp"><i></i><span></span></div><div class="muted" style="margin-top:3px;font-size:11px">${input.touch ? '摇杆移动 · 自动攻击 · 贴边可遁逃' : 'WASD移动 · 左键/按住Shift攻击 · 空格/右键身法 · 贴近边缘可遁逃'}</div></div>
    <button class="btn sm fleeBtn">遁符(G)</button>
    <div class="skills"><div class="col" style="gap:6px">${items ? `<div class="row" style="gap:6px;justify-content:flex-end">${items}</div>` : ''}<div class="row" style="gap:8px;justify-content:flex-end">${skills}${input.touch ? '<button class="sk dash">身法</button><button class="sk big atk">攻击</button>' : ''}</div></div></div></div>`);
  ui().appendChild(bhud);
  bhud.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); input.skill[+(b as HTMLElement).dataset.s!] = true; }));
  bhud.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); input.item[+(b as HTMLElement).dataset.i!] = true; }));
  bhud.querySelector('.fleeBtn')!.addEventListener('click', () => { input.flee = true; });
  const dash = bhud.querySelector('.dash'); dash?.addEventListener('pointerdown', (e) => { e.preventDefault(); input.dash = true; });
  const atk = bhud.querySelector('.atk');
  if (atk) { atk.addEventListener('pointerdown', (e) => { e.preventDefault(); input.attack = true; }); const up = () => { input.attack = false; }; atk.addEventListener('pointerup', up); atk.addEventListener('pointerleave', up); atk.addEventListener('pointercancel', up); }
}

function onBattleHud(h: any) {
  if (!bhud) return;
  const set = (sel: string, v: number, m: number, txt?: string) => { const b = bhud!.querySelector(sel) as HTMLElement; if (!b) return; (b.firstElementChild as HTMLElement).style.width = Math.max(0, Math.min(100, (v / m) * 100)) + '%'; if (txt !== undefined) b.querySelector('span')!.textContent = txt; };
  set('.pstat .hp', h.hp, h.maxHp, `气血 ${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}`);
  set('.pstat .mp', h.mp, h.maxMp, `法力 ${fmt(h.mp)}/${fmt(h.maxMp)}`);
  const bossEl = bhud.querySelector('.boss') as HTMLElement;
  if (h.boss) { bossEl.classList.remove('hidden'); bossEl.querySelector('.bn')!.textContent = `${h.boss.name}${h.enemies > 1 ? `（敌 ×${h.enemies}）` : ''}`; set('.boss .bar', h.boss.hp, h.boss.maxHp); } else bossEl.classList.add('hidden');
  bhud.querySelectorAll('[data-s]').forEach((b) => {
    const id = h.spells[+(b as HTMLElement).dataset.s!]; const sp = SPELLS[id]; const cd = h.cds[id] || 0;
    (b.querySelector('.cd') as HTMLElement).style.transform = `scaleY(${Math.max(0, Math.min(1, cd / (sp?.cd || 1)))})`;
    (b as HTMLElement).style.opacity = h.mp < (sp?.mp || 0) ? '0.5' : '1';
  });
  const p = S().player;
  bhud.querySelectorAll('[data-i]').forEach((b) => { const id = p.quick[+(b as HTMLElement).dataset.i!]; b.querySelector('.cnt')!.textContent = String(countItem(p, id)); });
  const fb = bhud.querySelector('.fleebar') as HTMLElement;
  if (h.flee > 0.05) { fb.classList.remove('hidden'); fb.textContent = `遁逃中…… ${Math.round(h.flee / 1.4 * 100)}%`; } else fb.classList.add('hidden');
}

function onBattleEnd() {
  inBattle = false;
  bhud?.remove(); bhud = null;
  input.attack = false; input.skill.fill(false); input.item.fill(false);
  for (const id of ['hud', 'topright', 'actionbar']) document.getElementById(id)?.classList.remove('hidden');
  setTimeout(() => updateHUD(), 50);
}

// ---------------- 摇杆 ----------------
function buildJoystick() {
  joy = el(`<div id="joy"><div class="knob"></div></div>`);
  ui().appendChild(joy);
  const knob = joy.querySelector('.knob') as HTMLElement;
  let id = -1; let cx = 0, cy = 0;
  const R = 50;
  const move = (x: number, y: number) => {
    let dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    input.jx = dx / R; input.jy = dy / R;
  };
  joy.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.setPointerCapture(id); move(e.clientX, e.clientY); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e.clientX, e.clientY); });
  const end = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; knob.style.transform = ''; input.jx = 0; input.jy = 0; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}

export function isInBattle() { return inBattle; }
export { saveGame, REALMS, item };
