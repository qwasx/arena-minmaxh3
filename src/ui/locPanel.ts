// 地点：坊市、客栈、宗门、传送阵、险地、秘境
import { S, addNews, YEAR, dateStr, InvEntry } from '../core/state';
import { computeStats, itemLabel, itemValue, addItem, removeEntry, sellItem, playerDayTick, countItem } from '../core/player';
import { item, allItems, herbPrice, ItemDef, HERB_AGES, RARITY_COLORS } from '../data/items';
import { realmName, REALMS } from '../data/realms';
import { SECTS } from '../data/characters';
import { TECHS } from '../data/techniques';
import { LOCATIONS, LocationDef, locById, regionAt } from '../data/world';
import { secretIsOpen, secretRunId, daysUntilOpen, treasureLoot, createRandomNPC } from '../core/npc';
import { beastSpec, pickMonster, npcSpec, BOSSES, describeRealmGap } from '../core/encounter';
import { biomeAt } from '../core/worldgen';
import { iconURL } from '../core/textures';
import { bus, toast } from '../core/bus';
import { RNG, rng, hash2 } from '../core/rng';
import { world } from '../scenes/WorldScene';
import { el, esc, openPanel, closePanel, modal, confirmBox, fmt } from './dom';
import { itemInfoHTML, slotHTML } from './panels';
import { openNPC } from './npcPanel';
import { portraitURL } from './ui';

const TYPE_NAME: Record<string, string> = { city: '城池', town: '城镇', village: '村落', sect: '宗门', danger: '险地', secret: '秘境', portal: '传送阵' };
const UNIQUE = new Set(['zhangtianping', 'xutianding', 'yuanhoukuilei', 'wuzimo', 'bag', 'leipenggu', 'balingchi', 'yuancishan', 'qingzhujian', 'tihunshou', 'shijinchong']);

function shopStock(l: LocationDef): { id: string; q?: number; n: number; price: number }[] {
  const s = S(); const tier = l.shop ?? 0; const period = Math.floor(s.day / 30);
  const r = new RNG(hash2(l.x, l.y, 99) * 1e9 + period * 7919);
  const band: [number, number][] = [[1, 120], [8, 1800], [120, 30000], [1500, 400000]];
  const [lo, hi] = band[tier];
  const pool = allItems().filter((d) => !d.noSell && !UNIQUE.has(d.id) && d.price >= lo && d.price <= hi && d.type !== 'bag' && d.type !== 'misc'
    && (d.type !== 'artifact' || (d.art!.tier <= Math.min(3, tier + 1) && d.rarity <= 3 + (tier >= 3 ? 1 : 0)))
    && (d.type !== 'manual' || d.rarity <= 2 + (tier >= 2 ? 1 : 0)));
  const out: { id: string; q?: number; n: number; price: number }[] = [];
  const basics = ['huichundan', 'huilingdan', 'juqidan', 'huodanfu', 'jingangfu'].filter((id) => item(id) && item(id).price <= hi * 2);
  for (const id of basics) out.push({ id, n: r.int(3, 10), price: item(id).price });
  const cnt = 10 + tier * 4;
  for (let i = 0; i < cnt && pool.length; i++) {
    const d = r.pick(pool);
    if (out.some((o) => o.id === d.id)) continue;
    const q = d.herbBase ? (r.chance(0.25) ? 1 : 0) : undefined;
    out.push({ id: d.id, q, n: d.type === 'artifact' || d.type === 'manual' ? 1 : r.int(1, 6), price: d.herbBase ? herbPrice(d.id, q!) : d.price });
  }
  if (tier >= 1 && item('danlu')) out.push({ id: 'danlu', n: 1, price: item('danlu').price });
  if (tier >= 3 && item('juhunbo')) out.push({ id: 'juhunbo', n: 1, price: item('juhunbo').price });
  if (tier >= 1 && item('tishenfu') && r.chance(0.5)) out.push({ id: 'tishenfu', n: 1, price: item('tishenfu').price });
  // 已购扣除
  const key = `shop_${l.id}_${period}`; const bought = s.flags[key] || {};
  for (const o of out) o.n -= bought[o.id + (o.q ?? '')] || 0;
  return out.filter((o) => o.n > 0);
}

export function openLocation(l: LocationDef) {
  const s = S(); s.known[l.id] = true;
  let tab = l.type === 'danger' || l.type === 'secret' ? 'explore' : l.type === 'portal' ? 'portal' : 'info';
  openPanel('loc', l.name, (body) => {
    const render = () => {
      const p = s.player;
      const tabs: [string, string][] = [['info', '概况']];
      if (l.shop !== undefined && l.type !== 'sect') tabs.push(['shop', '坊市']);
      if (l.type === 'city' || l.type === 'town' || l.type === 'village') tabs.push(['inn', l.type === 'village' ? '借宿' : '客栈']);
      if (l.type === 'sect') tabs.push(['sect', '宗门']);
      if (l.portal?.length) tabs.push(['portal', '传送阵']);
      if (l.type === 'danger' || l.type === 'secret') tabs.push(['explore', l.type === 'secret' ? '秘境' : '探险']);
      tabs.push(['people', '此地修士']);
      if (!tabs.some((t) => t[0] === tab)) tab = tabs[0][0];
      body.innerHTML = `<div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><hr class="ink"><div class="tb"></div>`;
      body.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { tab = (t as HTMLElement).dataset.t!; render(); }));
      const tb = body.querySelector('.tb') as HTMLElement;
      ({ info, shop, inn, sect, portal, explore, people } as Record<string, (tb: HTMLElement, l: LocationDef, rr: () => void) => void>)[tab](tb, l, render);
    };
    render();
    return render;
  });
}

function info(tb: HTMLElement, l: LocationDef) {
  const s = S(); const rg = regionAt(l.x, l.y);
  const here = s.npcs.filter((n) => n.alive && Math.hypot(n.x - l.x, n.y - l.y) < 700).length;
  tb.innerHTML = `<p style="font-size:18px">${esc(l.desc)}</p><div class="kv"><b>类型</b><span>${TYPE_NAME[l.type]}</span><b>地域</b><span>${esc(rg.name)}</span>${l.sect ? `<b>宗门</b><span>${SECTS[l.sect]?.name}</span>` : ''}${l.danger ? `<b>凶险</b><span class="bad">${'★'.repeat(Math.min(10, l.danger))}</span>` : ''}<b>灵气</b><span>${(l.aura ?? 1).toFixed(1)}</span><b>附近修士</b><span>${here} 人</span></div><p class="muted">${esc(rg.desc)}</p>`;
}

function shop(tb: HTMLElement, l: LocationDef, rr: () => void) {
  const s = S(); const p = s.player;
  const stock = shopStock(l);
  let mode = (tb as any)._mode || 'buy';
  const draw = () => {
    if (mode === 'buy') {
      tb.innerHTML = `<div class="row"><button class="btn sm ${mode === 'buy' ? 'jade' : ''} mb">购买</button><button class="btn sm ms">出售</button><span class="sp"></span><span>💎 ${fmt(p.lingshi)}</span></div><p class="muted" style="margin:4px 0">货物每月更新一次。</p>
        <div class="list">${stock.map((o, i) => `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(o.id)});border:2px solid ${RARITY_COLORS[item(o.id).rarity]}"></div><div style="flex:1"><b>${o.q !== undefined && item(o.id).herbBase ? HERB_AGES[o.q] : ''}${item(o.id).name}</b> <span class="muted">×${o.n}</span><div class="muted" style="font-size:12px">${esc(item(o.id).desc).slice(0, 48)}</div></div><span class="goldc">${fmt(o.price)}💎</span><button class="btn sm jade buy" data-i="${i}" ${p.lingshi < o.price ? 'disabled' : ''}>买</button><button class="btn sm see" data-i="${i}">详</button></div>`).join('')}</div>`;
      tb.querySelectorAll('.buy').forEach((b) => b.addEventListener('click', () => {
        const o = stock[+(b as HTMLElement).dataset.i!]; if (p.lingshi < o.price) return;
        p.lingshi -= o.price; addItem(p, o.id, 1, o.q !== undefined ? { q: o.q } : {});
        const key = `shop_${l.id}_${Math.floor(s.day / 30)}`; const bo = s.flags[key] || (s.flags[key] = {}); const k = o.id + (o.q ?? ''); bo[k] = (bo[k] || 0) + 1;
        bus.emit('sfx', 'coin'); toast(`购得 ${item(o.id).name}`, 'good'); bus.emit('refresh'); rr();
      }));
      tb.querySelectorAll('.see').forEach((b) => b.addEventListener('click', () => { const o = stock[+(b as HTMLElement).dataset.i!]; modal(item(o.id).name, `<div class="detail" style="border:0">${itemInfoHTML({ uid: '', id: o.id, n: 1, q: o.q })}</div>`); }));
    } else {
      const mine = p.inv.filter((e) => !item(e.id)?.noSell && !p.equipped.includes(e.uid) && e.id !== 'bag');
      tb.innerHTML = `<div class="row"><button class="btn sm mb">购买</button><button class="btn sm jade ms">出售</button><span class="sp"></span><span>💎 ${fmt(p.lingshi)}</span></div><p class="muted" style="margin:4px 0">坊市按六成收购。<span class="bad">大量出售高年份灵药或极品宝物会引起觊觎（热度 ${Math.round(p.heat)}）。</span></p>
        <div class="list">${mine.map((e) => `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(e.id)})"></div><div style="flex:1">${esc(itemLabel(e))} ×${e.n}</div><span class="goldc">${fmt(Math.max(1, Math.floor(itemValue(e) * 0.6)))}💎</span><button class="btn sm sell" data-u="${e.uid}">卖1</button>${e.n > 1 ? `<button class="btn sm sellall" data-u="${e.uid}">全卖</button>` : ''}</div>`).join('') || '<p class="muted">没有可出售的物品</p>'}</div>`;
      const doSell = (u: string, all: boolean) => { const e = p.inv.find((x) => x.uid === u); if (!e) return; const v = sellItem(e, all ? e.n : 1); bus.emit('sfx', 'coin'); toast(`获得 ${v} 灵石`, 'good'); draw(); };
      tb.querySelectorAll('.sell').forEach((b) => b.addEventListener('click', () => doSell((b as HTMLElement).dataset.u!, false)));
      tb.querySelectorAll('.sellall').forEach((b) => b.addEventListener('click', () => doSell((b as HTMLElement).dataset.u!, true)));
    }
    tb.querySelector('.mb')!.addEventListener('click', () => { mode = 'buy'; (tb as any)._mode = mode; draw(); });
    tb.querySelector('.ms')!.addEventListener('click', () => { mode = 'sell'; (tb as any)._mode = mode; draw(); });
  };
  draw();
}

function inn(tb: HTMLElement, l: LocationDef, rr: () => void) {
  const s = S(); const p = s.player; const st = computeStats(p);
  const cost = l.type === 'village' ? 0 : Math.round(5 * Math.pow(3, p.realm));
  const askCost = Math.round(10 * Math.pow(2.5, p.realm));
  tb.innerHTML = `<p>${l.type === 'village' ? '村民热情地为你腾出一间屋子。' : '客栈里人声嘈杂，往来修士谈论着各地见闻。'}</p>
    <div class="list"><div class="li" style="cursor:default"><div style="flex:1"><b>休憩三日</b><div class="muted">恢复全部气血法力，伤势好转</div></div><span>${cost ? cost + '💎' : '免费'}</span><button class="btn sm jade rest" ${p.lingshi < cost ? 'disabled' : ''}>休息</button></div>
    <div class="li" style="cursor:default"><div style="flex:1"><b>打听消息</b><div class="muted">花些灵石请人喝酒，可能得知附近地点与秘闻</div></div><span>${askCost}💎</span><button class="btn sm ask" ${p.lingshi < askCost ? 'disabled' : ''}>打听</button></div></div>`;
  tb.querySelector('.rest')!.addEventListener('click', () => {
    p.lingshi -= cost; s.day += 3; playerDayTick(3, false);
    p.hp = st.maxHp; p.mp = st.maxMp; p.injury = Math.max(0, p.injury - 0.35);
    toast('休息了三日，精神焕发。', 'good'); bus.emit('refresh'); rr();
  });
  tb.querySelector('.ask')!.addEventListener('click', () => {
    p.lingshi -= askCost;
    const unknown = LOCATIONS.filter((x) => !s.known[x.id] && !x.hidden).sort((a, b) => Math.hypot(a.x - l.x, a.y - l.y) - Math.hypot(b.x - l.x, b.y - l.y)).slice(0, 4);
    const lines: string[] = [];
    if (unknown.length) { const k = rng.pick(unknown); s.known[k.id] = true; lines.push(`听说${dirOf(l, k)}有一处所在，名为「${k.name}」：${k.desc}`); }
    const hid = LOCATIONS.filter((x) => x.hidden && !s.known[x.id] && Math.hypot(x.x - l.x, x.y - l.y) < 6000);
    if (hid.length && rng.chance(0.3)) { const k = hid[0]; s.known[k.id] = true; lines.push(`一个醉醺醺的老修士神秘兮兮地说：${dirOf(l, k)}藏着「${k.name}」……${k.desc}`); }
    const sec = LOCATIONS.filter((x) => x.openEvery);
    const nx = sec.map((x) => [x, secretIsOpen(x) ? 0 : daysUntilOpen(x)] as [LocationDef, number]).sort((a, b) => a[1] - b[1])[0];
    if (nx) lines.push(nx[1] === 0 ? `${nx[0].name}此刻正开启着！` : `据说${nx[0].name}约莫${Math.ceil(nx[1] / 30)}个月后开启。`);
    const ev = s.events.filter((e) => !e.taken && e.until > s.day)[0];
    if (ev) lines.push(`有人说「${ev.name}」，不少人已经赶过去了。（已标记在舆图上）`);
    const f = s.npcs.filter((n) => n.alive && n.famous && n.realm >= 3);
    if (f.length) { const n = rng.pick(f); const loc = LOCATIONS.reduce((a, b) => Math.hypot(b.x - n.x, b.y - n.y) < Math.hypot(a.x - n.x, a.y - n.y) ? b : a); lines.push(`${n.title ? n.title + '' : ''}${n.name}（${realmName(n.realm, n.stage)}）最近似乎在${loc.name}一带出没。`); }
    modal('打听消息', lines.map((x) => `<p>· ${esc(x)}</p>`).join(''), [{ label: '多谢', cls: 'jade' }]);
    bus.emit('refresh'); rr();
  });
}
function dirOf(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx) * 180 / Math.PI;
  const dirs = ['东', '东南', '南', '西南', '西', '西北', '北', '东北'];
  const dn = dirs[(Math.round(ang / 45) + 8) % 8];
  return `${dn}方约${Math.round(d / 10)}里处`;
}

function sect(tb: HTMLElement, l: LocationDef, rr: () => void) {
  const s = S(); const p = s.player; const sd = SECTS[l.sect!];
  if (!sd) { tb.innerHTML = '<p class="muted">此宗门已散。</p>'; return; }
  const member = p.sect === sd.id;
  const RANKS = ['记名弟子', '外门弟子', '内门弟子', '核心弟子', '长老', '太上长老'];
  const rank = Math.min(5, Math.max(p.realm - sd.minRealm + (p.realm >= 3 ? 1 : 0), 0));
  if (!member) {
    const okRealm = p.realm >= sd.minRealm && (sd.maxRealm === undefined || p.realm <= sd.maxRealm);
    const enemies = s.npcs.filter((n) => n.alive && n.sect === sd.id && n.grudge > 50).length;
    tb.innerHTML = `<p>${esc(sd.desc)}</p><div class="kv"><b>立场</b><span>${sd.align > 0.3 ? '正道' : sd.align < -0.3 ? '魔道' : '中立'}</span><b>入门要求</b><span>${REALMS[sd.minRealm].name}${sd.maxRealm !== undefined ? ' ~ ' + REALMS[sd.maxRealm].name : ''}</span><b>传承</b><span>${sd.techs.map((t) => item(t)?.name).filter(Boolean).join('、')}</span></div>
      ${p.sect ? `<p class="muted">你已是${SECTS[p.sect]?.name}弟子。若要改投此门，需先叛出原宗门。</p><button class="btn red quit">叛出${SECTS[p.sect]?.name}</button>` : okRealm && enemies < 3 ? `<button class="btn jade join">拜入${sd.name}</button>` : `<p class="bad">${!okRealm ? '你的修为不符合入门要求。' : '此宗门弟子对你恨之入骨，不会收你。'}</p>`}`;
    tb.querySelector('.join')?.addEventListener('click', () => { p.sect = sd.id; p.contribution = 30; p.sectRank = rank; addNews(`韩立拜入${sd.name}。`, 'good'); toast(`你拜入了${sd.name}！`, 'gold'); for (const n of s.npcs) if (n.sect === sd.id && n.alive) n.favor = Math.max(n.favor, 10); rr(); bus.emit('refresh'); });
    tb.querySelector('.quit')?.addEventListener('click', async () => { if (!(await confirmBox(`叛出${SECTS[p.sect!]?.name}？同门会视你为叛徒。`))) return; for (const n of s.npcs) if (n.sect === p.sect && n.alive) { n.favor -= 40; n.grudge = Math.min(100, n.grudge + 30); } addNews(`韩立叛出${SECTS[p.sect!]?.name}。`, 'kill'); p.sect = undefined; p.contribution = 0; rr(); bus.emit('refresh'); });
    return;
  }
  const lastPay = s.flags['sectPay'] ?? -999;
  const pay = Math.round(8 * Math.pow(3.2, p.realm) * (1 + rank * 0.3));
  const shopItems = [...sd.shop, ...sd.techs].filter((id) => item(id));
  const herbs = p.inv.filter((e) => item(e.id)?.herbBase || item(e.id)?.id.startsWith('yd'));
  tb.innerHTML = `<div class="row"><b>${RANKS[rank]}</b><span class="muted">宗门贡献 ${p.contribution}</span><span class="sp"></span><button class="btn sm gold pay" ${s.day - lastPay < 30 ? 'disabled' : ''}>领取月例（${pay}💎）</button></div>
    <div class="cards" style="margin-top:8px"><div class="card"><b>宗门任务</b><div class="list" style="margin-top:6px">
      <div class="li" style="cursor:default"><div style="flex:1">清剿山中妖兽<div class="muted">贡献 +${10 + p.realm * 8}</div></div><button class="btn sm jade t1">接取</button></div>
      <div class="li" style="cursor:default"><div style="flex:1">镇守山门一月<div class="muted">贡献 +${6 + p.realm * 4}，期间照常修炼</div></div><button class="btn sm t2">接取</button></div>
      <div class="li" style="cursor:default"><div style="flex:1">上交灵草/妖丹<div class="muted">按价值折算贡献</div></div><button class="btn sm t3" ${herbs.length ? '' : 'disabled'}>上交</button></div>
    </div></div>
    <div class="card"><b>宗门宝库（以贡献兑换）</b><div class="list" style="margin-top:6px">${shopItems.map((id) => { const d = item(id); const c = Math.max(5, Math.ceil(d.price / 6)); const learned = d.manual && p.techs.includes(d.manual); return `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(id)})"></div><div style="flex:1">${d.name}${learned ? ' <span class="muted">（已习得）</span>' : ''}</div><span>${c}贡献</span><button class="btn sm ex" data-id="${id}" data-c="${c}" ${p.contribution < c || learned ? 'disabled' : ''}>兑换</button></div>`; }).join('')}</div></div></div>`;
  tb.querySelector('.pay')!.addEventListener('click', () => { s.flags['sectPay'] = s.day; p.lingshi += pay; toast(`领取月例 ${pay} 灵石`, 'good'); bus.emit('sfx', 'coin'); rr(); });
  tb.querySelector('.t1')!.addEventListener('click', () => {
    const lv = Math.max(1, Math.round(world.playerLevel()));
    const b = biomeAt(l.x, l.y);
    closePanel();
    world.startBattle({ kind: 'monster', enemies: [beastSpec(pickMonster(b, lv), lv), beastSpec(pickMonster(b, Math.max(0, lv - 1)), Math.max(0, lv - 1))], biome: b, title: '宗门任务·清剿妖兽', canFlee: true }, (r) => {
      if (r.win) { const g = 10 + p.realm * 8; p.contribution += g; toast(`任务完成，贡献 +${g}`, 'gold'); }
    });
  });
  tb.querySelector('.t2')!.addEventListener('click', () => { s.day += 30; playerDayTick(30, true); const g = 6 + p.realm * 4; p.contribution += g; toast(`镇守一月，贡献 +${g}`, 'gold'); bus.emit('refresh'); rr(); });
  tb.querySelector('.t3')!.addEventListener('click', () => {
    let tot = 0; for (const e of [...herbs]) { tot += Math.ceil(itemValue(e) * e.n / 8); removeEntry(p, e, e.n); }
    p.contribution += tot; toast(`上交物资，贡献 +${tot}`, 'gold'); rr();
  });
  tb.querySelectorAll('.ex').forEach((b) => b.addEventListener('click', () => { const id = (b as HTMLElement).dataset.id!; const c = +(b as HTMLElement).dataset.c!; if (p.contribution < c) return; p.contribution -= c; addItem(p, id, 1); toast(`兑换 ${item(id).name}`, 'good'); rr(); }));
}

function portal(tb: HTMLElement, l: LocationDef) {
  const s = S(); const p = s.player;
  const dests = (l.portal || []).map((id) => locById(id)!).filter(Boolean);
  tb.innerHTML = `<p>${l.type === 'portal' ? esc(l.desc) : '城中设有传送大阵，缴纳灵石即可传送。'}</p><div class="list">${dests.map((d) => { const cost = Math.round(Math.hypot(d.x - l.x, d.y - l.y) / 40); return `<div class="li" style="cursor:default"><div style="flex:1"><b>${d.name}</b> <span class="muted">${esc(regionAt(d.x, d.y).name)} · ${dirOf(l, d)}</span></div><span>${cost}💎</span><button class="btn sm jade go" data-id="${d.id}" data-c="${cost}" ${p.lingshi < cost ? 'disabled' : ''}>传送</button></div>`; }).join('')}</div>`;
  tb.querySelectorAll('.go').forEach((b) => b.addEventListener('click', () => {
    const d = locById((b as HTMLElement).dataset.id!)!; const c = +(b as HTMLElement).dataset.c!;
    if (p.lingshi < c) return; p.lingshi -= c; s.known[d.id] = true;
    closePanel(); world.teleport(d.x, d.y + 140); bus.emit('sfx', 'teleport'); toast(`白光一闪，你已身在${d.name}`, 'gold');
  }));
}

function explore(tb: HTMLElement, l: LocationDef, rr: () => void) {
  const s = S(); const p = s.player;
  const b = l.boss ? BOSSES[l.boss] : null;
  const lvl = l.danger ?? 3;
  if (l.type === 'secret') {
    const open = secretIsOpen(l);
    const period = secretRunId(l);
    const key = 'sr_' + l.id; const st = s.flags[key] && s.flags[key].period === period ? s.flags[key] : null;
    const allowed = (l.maxRealm === undefined || p.realm <= l.maxRealm) && (l.minRealm === undefined || p.realm >= l.minRealm);
    let html = `<p>${esc(l.desc)}</p>`;
    if (!open) html += `<p class="bad">秘境禁制紧闭，距下次开启还有约 ${Math.ceil(daysUntilOpen(l) / 30)} 个月（${dateStr(s.day + daysUntilOpen(l))}）。</p>`;
    else if (!allowed) html += `<p class="bad">${l.maxRealm !== undefined ? `禁制只容${REALMS[l.maxRealm].name}及以下修士进入。` : `需${REALMS[l.minRealm!].name}以上修为方可进入。`}</p>`;
    else if (st?.done) html += `<p class="muted">此次开启你已探索完毕。</p>`;
    else {
      const round = st?.round ?? 0;
      html += `<p class="goldc">秘境正在开启！已深入 ${round}/3 层${round >= 3 ? '，前方便是核心之地。' : '。'}</p><div class="row">${round < 3 ? '<button class="btn jade deeper">继续深入</button>' : `<button class="btn red bossb">挑战${b?.name ?? '守护者'}</button>`}<button class="btn leave">暂且退出</button></div>`;
    }
    tb.innerHTML = html;
    tb.querySelector('.deeper')?.addEventListener('click', () => {
      const cur = st || { period, round: 0 }; cur.round++; s.flags[key] = cur;
      const roll = rng.next();
      const biome = biomeAt(l.x, l.y);
      const lvE = Math.max(1, Math.min(lvl, Math.round(world.playerLevel()) + 1));
      if (roll < 0.4) {
        const herbPool = allItems().filter((d) => d.herbBase && d.rarity >= 2);
        const got: string[] = [];
        for (let i = 0; i < 2; i++) { const d = rng.pick(herbPool); const q = rng.int(1, 3); addItem(p, d.id, 1, { q }); got.push(HERB_AGES[q] + d.name); }
        if (l.id === 'xuese') { const id = rng.pick(['zihouhua', 'tianlingguo']); if (item(id)) { addItem(p, id, 1, { q: 2 }); got.push('三百年' + item(id).name); } }
        modal('秘境 · 灵药园', `<p>你发现了一片无人采摘的灵药：</p><p class="goldc">${got.join('、')}</p>`, [{ label: '继续', cls: 'jade', fn: () => { rr(); } }]);
      } else if (roll < 0.75) {
        closePanel();
        world.startBattle({ kind: 'monster', enemies: [beastSpec(pickMonster(biome, lvE), lvE), beastSpec(pickMonster(biome, lvE - 1), Math.max(1, lvE - 1))], biome, title: `${l.name}·妖兽拦路`, canFlee: true }, (r) => { if (r.win) setTimeout(() => openLocation(l), 400); });
      } else {
        const loc = LOCATIONS.find((x) => x.type === 'sect' && Math.hypot(x.x - l.x, x.y - l.y) < 9000) || l;
        const n = createRandomNPC(rng, loc, Math.max(1, Math.min(p.realm, l.maxRealm ?? 9)));
        n.x = p.x + 100; n.y = p.y; n.goal = 'idle'; n.grudge = 50; n.align = Math.min(n.align, -0.2);
        s.npcs.push(n);
        closePanel();
        modal('秘境 · 狭路相逢', `<p>一名${realmName(n.realm, n.stage)}的${n.gender === 'f' ? '女' : ''}修士${esc(n.name)}拦住去路，冷笑道：“此地宝物，见者有份？哼，把储物袋留下！”</p>`, [{ label: '迎战', cls: 'red', fn: () => { world.startBattle({ kind: 'npc', enemies: [npcSpec(n)], biome, title: '秘境争锋', canFlee: true }, (r) => { if (r.win) setTimeout(() => openLocation(l), 400); }); } }]);
      }
    });
    tb.querySelector('.bossb')?.addEventListener('click', () => {
      closePanel();
      const cur = s.flags[key];
      world.bossFight(l);
      cur.done = true; s.flags[key] = cur;
      if (rng.chance(0.8)) { const tr = treasureLoot(Math.min(lvl, Math.round(world.playerLevel()) + 1)); addItem(p, tr, 1); setTimeout(() => toast(`你在秘境深处还找到了：${item(tr).name}`, 'gold'), 300); }
    });
    tb.querySelector('.leave')?.addEventListener('click', () => closePanel());
    return;
  }
  // 险地
  const last = s.flags['boss_' + l.id];
  const cool = last !== undefined && s.day - last < 720;
  tb.innerHTML = `<p>${esc(l.desc)}</p><div class="kv"><b>凶险</b><span class="bad">${'★'.repeat(Math.min(10, lvl))}</span><b>估量</b><span>${describeRealmGap(Math.round(lvl / 2), p.realm)}</span>${b ? `<b>盘踞</b><span>${b.name}${cool ? '（已斩杀，暂时平静）' : ''}</span>` : ''}</div>
    <div class="row" style="margin-top:10px"><button class="btn jade scout">在外围猎妖采药</button>${b ? `<button class="btn red bossb" ${cool ? 'disabled' : ''}>深入挑战${b.name}</button>` : ''}</div>`;
  tb.querySelector('.scout')!.addEventListener('click', () => {
    const biome = biomeAt(l.x, l.y);
    const lvE = Math.max(1, Math.min(lvl - 1, Math.round(world.playerLevel()) + 1));
    closePanel();
    world.startBattle({ kind: 'monster', enemies: [beastSpec(pickMonster(biome, lvE), lvE)], biome, title: `${l.name}·外围`, canFlee: true }, (r) => {
      if (r.win && rng.chance(0.6)) { const d = rng.pick(allItems().filter((x) => x.herbBase && x.rarity <= Math.max(2, Math.ceil(lvl / 2)))); const q = rng.int(0, 2); addItem(p, d.id, 1, { q }); toast(`顺手采得 ${HERB_AGES[q]}${d.name}`, 'good'); }
    });
  });
  tb.querySelector('.bossb')?.addEventListener('click', async () => {
    if (b && b.level > world.playerLevel() + 2 && !(await confirmBox(`${b.name}实力远超于你，确定要挑战？`, '挑战'))) return;
    closePanel(); world.bossFight(l);
  });
}

function people(tb: HTMLElement, l: LocationDef) {
  const s = S();
  const list = s.npcs.filter((n) => n.alive && Math.hypot(n.x - l.x, n.y - l.y) < 700 && world.canSeeNPC(n));
  tb.innerHTML = `<p class="muted">神识所及，此地有这些修士（修为高于你太多的人可能隐匿行踪）。</p><div class="list">${list.map((n) => `<div class="li" data-id="${n.id}"><div class="av" style="background-image:url(${portraitURL(n)})"></div><div style="flex:1"><b>${esc(n.name)}</b> ${n.partner ? '<span class="seal">道侣</span>' : ''} <span class="muted">${esc(n.title || (n.sect ? SECTS[n.sect]?.name ?? '' : '散修'))}</span></div><span class="muted">好感 ${Math.round(n.favor)}</span></div>`).join('') || '<p class="muted">此地空无一人。</p>'}</div>`;
  tb.querySelectorAll('.li[data-id]').forEach((li) => li.addEventListener('click', () => { const n = s.npcs.find((x) => x.id === (li as HTMLElement).dataset.id); if (n) { closePanel(); openNPC(n); } }));
}
export type { InvEntry, ItemDef };
export { slotHTML, countItem, TECHS, el };
