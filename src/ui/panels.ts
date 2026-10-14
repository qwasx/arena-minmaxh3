// 常用面板：储物袋、人物、掌天瓶/炼丹、舆图、传闻、同伴、系统、闭关
import { S, dateStr, saveGame, loadGame, slotMeta, deleteSlot, exportSave, importSave, setState, InvEntry, YEAR } from '../core/state';
import { computeStats, itemLabel, itemValue, equipToggle, usePill, learnManual, useBottleOnHerb, canBreak, breakChance, tryBreakthrough, invFind, addItem, removeEntry, removeItem, playerDayTick, countItem, lifespanLeft, artSense, locAura, talentMods } from '../core/player';
import { item, RARITY_COLORS, RARITY_NAMES, TIER_NAMES, HERB_AGES } from '../data/items';
import { realmName, expNeeded, REALMS, BREAK_INFO } from '../data/realms';
import { TECHS, TALENTS, dayanLayer } from '../data/techniques';
import { RECIPES, ALCH_TITLES, alchExpNeed } from '../data/recipes';
import { SECTS } from '../data/characters';
import { LOCATIONS, WORLD_W, WORLD_H, locById } from '../data/world';
import { getOverview } from '../core/worldgen';
import { iconURL } from '../core/textures';
import { fastSim, inSafeZone, npcSenseVal } from '../core/npc';
import { bus, toast } from '../core/bus';
import { rng, dist } from '../core/rng';
import { world } from '../scenes/WorldScene';
import { audioSettings, saveAudio } from '../core/audio';
import { el, esc, openPanel, closePanel, modal, confirmBox, fmt } from './dom';
import { portraitURL } from './ui';
import { openNPC } from './npcPanel';

const KIND_NAMES: Record<string, string> = { sword: '飞剑', swarm: '成套飞剑', ring: '灵环', needle: '飞针', shield: '护盾', armor: '宝甲', mirror: '宝镜', banner: '幡旗', cauldron: '鼎钵', wings: '遁翅', boat: '飞行法器', bell: '钟/篮', brick: '砖印', arrow: '神箭', fan: '宝扇', mountain: '神山', puppet: '傀儡', beast: '灵兽', pearl: '宝珠', flag: '阵带' };
const TYPE_NAMES: Record<string, string> = { herb: '灵草', material: '材料', pill: '丹药', talisman: '符箓', artifact: '法宝', manual: '功法', misc: '杂物', bag: '储物袋' };

export function slotHTML(e: InvEntry, sel = false, extra = '') {
  const d = item(e.id); const p = S().player;
  const eq = p.equipped.includes(e.uid);
  return `<div class="slot ${sel ? 'sel' : ''}" data-uid="${e.uid}" title="${esc(itemLabel(e))}" style="border-color:${RARITY_COLORS[d?.rarity ?? 0]};background-image:url(${iconURL(e.id)})">${e.n > 1 ? `<span class="n">${e.n}</span>` : ''}${d?.herbBase && e.q ? `<span class="q">${HERB_AGES[e.q]}</span>` : ''}${eq ? '<span class="eq">装</span>' : ''}${e.jilian ? '<span class="q" style="background:#888;color:#fff">祭</span>' : ''}${extra}</div>`;
}

export function itemInfoHTML(e: InvEntry, priceLine = '') {
  const d = item(e.id); if (!d) return '';
  const st = computeStats();
  let info = '';
  if (d.art) {
    const a = d.art;
    info += `<div class="kv"><b>品阶</b><span>${TIER_NAMES[a.tier]}·${KIND_NAMES[a.kind] || a.kind}</span><b>驾驭</b><span>${REALMS[a.minRealm].name}期</span><b>神识占用</b><span>${artSense(e, st.mods)}</span>`;
    if (a.power) info += `<b>威力</b><span>${(a.power * (1 + 0.1 * (e.refine || 0))).toFixed(2)}×攻击${a.count ? ` · ${e.count ?? a.count}件` : ''}</span>`;
    if (a.def) info += `<b>防御</b><span>+${Math.round(a.def * 100)}%</span>`;
    if (a.hp) info += `<b>气血</b><span>+${Math.round(a.hp * 100)}%</span>`;
    if (a.worldSpeed) info += `<b>遁速</b><span>+${Math.round(a.worldSpeed * 100)}%</span>`;
    if (a.senseBonus) info += `<b>神识</b><span>+${Math.round(a.senseBonus * 100)}%</span>`;
    if (a.skill) info += `<b>神通</b><span>${a.skill === 'leidun' ? '雷遁（替代身法）' : a.skill === 'xutian' ? '虚天鼎·收' : a.skill === 'qianlan' ? '乾蓝冰焰' : a.skill}</span>`;
    if (e.jilian) info += `<b>祭炼</b><span class="bad">尚需 ${Math.ceil(e.jilian)} 日（威力减半）</span>`;
    if (e.from) info += `<b>来历</b><span>夺自${esc(e.from)}</span>`;
    info += `</div>`;
  }
  if (d.pill) {
    const pl = d.pill; const parts: string[] = [];
    if (pl.exp) parts.push(`修为 +${pl.exp}`); if (pl.hp) parts.push(`恢复${Math.round(pl.hp * 100)}%气血`); if (pl.mp) parts.push(`恢复${Math.round(pl.mp * 100)}%法力`);
    if (pl.heal) parts.push('治愈伤势'); if (pl.life) parts.push(`寿元 +${pl.life}年`); if (pl.sense) parts.push(`神识永久 +${pl.sense * 100}%`); if (pl.breakFor) parts.push(`冲击${REALMS[pl.breakFor].name}成功率 +${Math.round(BREAK_INFO[pl.breakFor].pillBonus * 100)}%`);
    if (pl.maxRealm !== undefined) parts.push(`适用：${REALMS[pl.minRealm ?? 0].name}~${REALMS[pl.maxRealm].name}`);
    info += `<p class="goldc">${parts.join('；')}</p>`;
  }
  if (d.tal) info += `<p class="goldc">${{ fire: '火弹齐射', thunder: '引雷轰击', shield: '护体金光', escape: '土遁脱离战斗', revive: '身死时自动替死', ice: '冰锥散射', sword: '剑气斩击' }[d.tal.kind]}</p>`;
  if (d.manual) { const t = TECHS[d.manual]; info += `<p class="goldc">${t.desc}（需${REALMS[t.minRealm].name}期）${S().player.techs.includes(t.id) ? ' · 已习得' : ''}</p>`; }
  if (d.type === 'bag' && e.bag) { const b = e.bag; info += `<div class="kv"><b>原主</b><span>${esc(b.owner)}（${REALMS[b.realm].name}期）</span><b>印记强度</b><span>${b.need}（你的神识 ${st.sense}）</span><b>抹除用时</b><span>${b.started ? (b.days > 0 ? `剩余 ${Math.ceil(b.days)} 日` : '已可打开') : `约 ${b.days} 日`}</span></div>`; }
  return `<div class="icon" style="background-image:url(${iconURL(e.id)});border-color:${RARITY_COLORS[d.rarity]}"></div><h3 style="color:${d.rarity >= 4 ? '#9a5a10' : 'inherit'}">${esc(itemLabel(e))}</h3><div class="muted">${RARITY_NAMES[d.rarity]} · ${TYPE_NAMES[d.type]}${e.n > 1 ? ` · ×${e.n}` : ''}</div><div style="clear:both"></div><p>${esc(d.desc)}</p>${info}${priceLine}`;
}

// ---------------- 储物袋 ----------------
export function openInventory() {
  let tab = 'all'; let sel = '';
  const tabs: [string, string][] = [['all', '全部'], ['artifact', '法宝'], ['pill', '丹药'], ['herb', '灵草'], ['talisman', '符箓'], ['manual', '功法'], ['material', '材料'], ['bag', '储物袋']];
  openPanel('inv', '储 物 袋', (body) => {
    const render = () => {
      const p = S().player; const st = computeStats(p);
      const list = p.inv.filter((e) => tab === 'all' || item(e.id)?.type === tab || (tab === 'material' && item(e.id)?.type === 'misc'))
        .sort((a, b) => (p.equipped.includes(b.uid) ? 1 : 0) - (p.equipped.includes(a.uid) ? 1 : 0) || item(b.id).rarity - item(a.id).rarity);
      if (!sel || !p.inv.find((e) => e.uid === sel)) sel = list[0]?.uid || '';
      const e = invFind(p, sel);
      body.innerHTML = `<div class="inv"><div class="col" style="min-height:0"><div class="row"><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><span class="sp"></span><span class="muted">神识 ${st.senseUsed}/${st.senseCap} · 💎${fmt(p.lingshi)}</span></div>
        <div class="grid">${list.map((x) => slotHTML(x, x.uid === sel)).join('') || '<div class="muted">空空如也</div>'}</div>
        <div class="muted">快捷栏：${p.quick.map((q, i) => `${i + 1}.${q ? item(q).name : '空'}`).join('　')}</div></div>
        <div class="detail">${e ? itemInfoHTML(e) + `<div class="row acts" style="margin-top:10px"></div>` : '<p class="muted">选择一件物品</p>'}</div></div>`;
      body.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { tab = (t as HTMLElement).dataset.t!; sel = ''; render(); }));
      body.querySelectorAll('.slot').forEach((s) => s.addEventListener('click', () => { sel = (s as HTMLElement).dataset.uid!; render(); }));
      if (!e) return;
      const acts = body.querySelector('.acts') as HTMLElement;
      const d = item(e.id);
      const btn = (label: string, cls: string, fn: () => void, dis = false) => { const b = el<HTMLButtonElement>(`<button class="btn ${cls}">${label}</button>`); b.disabled = dis; b.addEventListener('click', () => { bus.emit('sfx', 'click'); fn(); }); acts.appendChild(b); };
      if (d.art) btn(p.equipped.includes(e.uid) ? '卸下' : '装备', 'jade', () => { const r = equipToggle(e); if (r) toast(r, 'bad'); render(); });
      if (d.pill && !d.pill.breakFor && !d.pill.favor) btn('服用', 'jade', () => { const r = usePill(e); if (r) toast(r, 'good'); render(); });
      if (d.manual) btn('参悟', 'jade', () => { toast(learnManual(e), 'gold'); render(); });
      if (d.herbBase) btn(`滴绿液（${p.bottle.drops}）`, 'gold', () => { const r = useBottleOnHerb(e); toast(r || '', r && r.includes('→') ? 'gold' : 'bad'); sel = ''; render(); }, p.bottle.drops <= 0 || (e.q ?? 0) >= 5);
      if (d.type === 'bag' && e.bag) {
        const b = e.bag;
        if (!b.started) btn('以神识抹除印记', 'jade', () => { if (st.sense < b.need * 0.5) { toast(`神识太弱（需至少 ${Math.ceil(b.need * 0.5)}），强行抹除会遭反噬`, 'bad'); return; } b.started = true; toast(`开始抹除印记，约需 ${b.days} 日（闭关可加快时间）`, 'info'); render(); });
        else if (b.days <= 0) btn('打开', 'gold', () => {
          const got: string[] = [];
          for (const it of b.items) { const ex = it.q !== undefined || item(it.id).type === 'artifact' ? { q: it.q, jilian: it.jilian, count: it.count, from: it.from } : {}; addItem(p, it.id, it.n, ex); got.push(`${item(it.id)?.name}×${it.n}`); }
          p.lingshi += b.lingshi; got.push(`灵石 ${b.lingshi}`);
          removeEntry(p, e, 1); bus.emit('sfx', 'open');
          modal(`${b.owner}的储物袋`, `<div class="list">${got.map((g) => `<div class="li" style="cursor:default">✦ ${esc(g)}</div>`).join('')}</div>`, [{ label: '收下', cls: 'jade' }]);
          sel = ''; render();
        });
      }
      if (d.pill || d.tal) for (let i = 0; i < 4; i++) btn(`快捷${i + 1}`, 'sm', () => { p.quick[i] = e.id; render(); });
      if (d.type !== 'misc' && !d.noSell && !p.equipped.includes(e.uid)) btn('丢弃', 'sm', async () => { if (await confirmBox(`丢弃 ${itemLabel(e)}？`)) { removeEntry(p, e, e.n); sel = ''; render(); } });
    };
    render();
    return render;
  });
}

// ---------------- 人物 ----------------
export function openCharacter() {
  openPanel('char', '人 物', (body) => {
    const render = () => {
      const s = S(); const p = s.player; const st = computeStats(p);
      const aura = locAura(p.x, p.y);
      const need = expNeeded(p.realm, p.stage);
      const info = BREAK_INFO[p.realm + 1];
      const hasPill = info?.pill && countItem(p, info.pill) > 0;
      const techs = p.techs.map((t) => TECHS[t]).filter(Boolean);
      body.innerHTML = `<div class="char"><div class="col"><div class="portrait" style="background-image:url(${portraitURL('hanli')})"></div>
        <div class="card"><div class="kv"><b>姓名</b><span>韩立</span><b>年龄</b><span>${Math.floor(p.age)} / ${Math.floor(st.lifespan)} 岁</span><b>宗门</b><span>${p.sect ? SECTS[p.sect]?.name ?? p.sect : '散修'}</span><b>声望</b><span><span class="good">善 ${p.rep.good}</span> · <span class="bad">恶 ${p.rep.evil}</span></span><b>斩杀</b><span>${p.kills} 名修士</span><b>丹道</b><span>${ALCH_TITLES[p.alchLv]}</span><b>道侣</b><span>${s.npcs.filter((n) => n.partner && n.alive).map((n) => n.name).join('、') || '无'}</span></div></div></div>
        <div class="col">
          <div class="card"><div class="row"><b style="font-size:20px;color:var(--jade)">${realmName(p.realm, p.stage)}</b><span class="sp"></span><span class="muted">修为 ${fmt(p.exp)} / ${fmt(need)}</span></div>
          <div class="bar exp ${canBreak(p) ? 'full' : ''}" style="height:12px"><i style="width:${Math.min(100, p.exp / need * 100)}%"></i></div>
          ${canBreak(p) && info ? `<div style="margin-top:8px" class="row"><span>瓶颈已至！${info.name}成功率 <b class="${breakChance(p, true) > 0.5 ? 'good' : 'bad'}">${Math.round(breakChance(p, !!hasPill) * 100)}%</b>${info.pill ? `（${item(info.pill).name}：${hasPill ? '<span class="good">已有</span>' : '<span class="bad">无</span>'}）` : ''}</span><span class="sp"></span><button class="btn red brk">尝试${info.name}</button></div>` : p.realm >= 5 && canBreak(p) ? '<p class="goldc">已至人界巅峰。飞升灵界之路……留待日后。</p>' : ''}
          </div>
          <div class="card"><div class="kv" style="grid-template-columns:auto 1fr auto 1fr">
            <b>气血</b><span>${fmt(p.hp)}/${fmt(st.maxHp)}</span><b>法力</b><span>${fmt(p.mp)}/${fmt(st.maxMp)}</span>
            <b>攻击</b><span>${fmt(st.atk)}</span><b>防御</b><span>${fmt(st.def)}</span>
            <b>神识</b><span>${st.sense}${st.dayan ? `（大衍诀${st.dayan}层）` : ''}</span><b>探查范围</b><span>${Math.round(st.senseRadius)} 丈</span>
            <b>遁速</b><span>${Math.round(st.speed)}</span><b>暴击</b><span>${Math.round(st.crit * 100)}% / ×${st.critDmg.toFixed(1)}</span>
            <b>修炼速度</b><span>${st.rate.toFixed(1)}/日 × 灵气${aura.toFixed(1)}</span><b>伤势</b><span class="${p.injury > 0 ? 'bad' : ''}">${p.injury > 0 ? Math.round(p.injury * 100) + '%' : '无'}</span>
          </div></div>
          <div class="card"><b>功法</b><div class="list" style="margin-top:6px">${techs.map((t) => `<div class="li" style="cursor:default"><div style="flex:1"><b>${t.name}</b> <span class="muted">${t.desc}</span></div>${t.kind === 'main' ? (p.mainTech === t.id ? '<span class="seal">主修</span>' : `<button class="btn sm main" data-t="${t.id}">设为主修</button>`) : ''}${t.id === 'lianqi' ? `<button class="btn sm tog" data-k="conceal">${p.conceal ? '敛气中' : '敛气'}</button>` : ''}${t.id === 'tianyan' ? `<button class="btn sm tog" data-k="tianyan">${p.tianyan ? '已开启' : '开启'}</button>` : ''}</div>`).join('')}</div></div>
          <div class="card"><b>命格</b><div class="cards" style="margin-top:6px">${p.talents.map((id) => { const t = TALENTS.find((x) => x.id === id)!; return `<div class="card talent r${t.rarity}"><b>${t.name}</b><div class="muted">${t.desc}</div></div>`; }).join('') || '<span class="muted">尚无（大境界突破或炼气七层时可选）</span>'}</div></div>
        </div></div>`;
      body.querySelector('.brk')?.addEventListener('click', async () => {
        if (!(await confirmBox(`确定尝试${info.name}？失败会受伤并损失修为。`, '突破'))) return;
        const ok = tryBreakthrough(true);
        if (ok) world?.cameras.main.flash(600, 255, 240, 200);
        render();
      });
      body.querySelectorAll('.main').forEach((b) => b.addEventListener('click', () => { p.mainTech = (b as HTMLElement).dataset.t!; render(); bus.emit('refresh'); }));
      body.querySelectorAll('.tog').forEach((b) => b.addEventListener('click', () => { const k = (b as HTMLElement).dataset.k as 'conceal' | 'tianyan'; (p as any)[k] = !(p as any)[k]; render(); bus.emit('refresh'); }));
    };
    render();
    return render;
  });
}

// ---------------- 掌天瓶 & 炼丹 ----------------
export function openAlchemy() {
  let tab = 'bottle';
  openPanel('alch', '掌 天 瓶', (body) => {
    const render = () => {
      const s = S(); const p = s.player; const mods = talentMods(p.talents);
      const herbs = p.inv.filter((e) => item(e.id)?.herbBase).sort((a, b) => item(b.id).rarity - item(a.id).rarity || (b.q ?? 0) - (a.q ?? 0));
      let html = `<div class="tabs"><button class="tab ${tab === 'bottle' ? 'on' : ''}" data-t="bottle">催熟灵药</button><button class="tab ${tab === 'alch' ? 'on' : ''}" data-t="alch">开炉炼丹</button></div><hr class="ink">`;
      if (tab === 'bottle') {
        html += `<div class="row"><div class="slot" style="width:80px;background-image:url(${iconURL('zhangtianping')});border-color:#ff5b4a"></div><div class="col" style="flex:1"><b style="font-size:18px">掌天瓶 · 绿液 ${p.bottle.drops} / ${p.bottle.max}</b><div class="bar exp" style="height:10px"><i style="width:${p.bottle.progress / 30 * 100}%"></i></div><div class="muted">每三十日凝聚一滴（下一滴约 ${Math.ceil(30 - p.bottle.progress)} 日后）。滴在灵草上可使其年份提升一阶：十年→百年→三百年→千年→三千年→万年。高阶丹药的主药必须是高年份灵草。</div><div class="bad" style="font-size:13px">怀璧其罪：大量出售高年份灵药会引来觊觎（当前热度 ${Math.round(p.heat)}）。</div></div></div>
        <div class="list" style="margin-top:10px">${herbs.map((e) => `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(e.id)})"></div><div style="flex:1"><b>${esc(itemLabel(e))}</b> ×${e.n}<div class="muted">价值约 ${fmt(itemValue(e))} 灵石/株</div></div><button class="btn gold sm drop" data-u="${e.uid}" ${p.bottle.drops <= 0 || (e.q ?? 0) >= 5 ? 'disabled' : ''}>滴一滴</button></div>`).join('') || '<p class="muted">背包中没有灵草。在野外神识范围内会显示灵草，走近即可采摘。</p>'}</div>`;
      } else {
        const hasLu = countItem(p, 'danlu') > 0;
        html += `<div class="row"><b>${ALCH_TITLES[p.alchLv]}</b><span class="muted">丹道经验 ${p.alchExp}/${alchExpNeed(p.alchLv)}</span><span class="sp"></span>${hasLu ? '<span class="good">丹炉已备</span>' : '<span class="bad">需要丹炉（坊市有售）</span>'}</div><div class="list" style="margin-top:8px">`;
        for (const r of RECIPES) {
          const out = item(r.out);
          const reqs = r.herbs.map(([id, n], i) => { const minq = i === 0 ? r.minQ : 0; const have = p.inv.filter((e) => e.id === id && (e.q ?? 0) >= minq).reduce((a, e) => a + e.n, 0); return { id, n, minq, have }; });
          const ok = reqs.every((x) => x.have >= x.n) && hasLu && p.alchLv >= r.alchLv - 1;
          const avgQ = reqs.length ? reqs.reduce((a, x) => { const best = p.inv.filter((e) => e.id === x.id && (e.q ?? 0) >= x.minq).sort((a1, b1) => (a1.q ?? 0) - (b1.q ?? 0))[0]; return a + (best?.q ?? 0); }, 0) / reqs.length : 0;
          const chance = Math.min(0.98, r.base + p.alchLv * 0.06 + (mods.alch || 0) + avgQ * 0.04);
          html += `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(r.out)})"></div><div style="flex:1"><b>${out.name}</b> <span class="muted">×${r.n[0]}~${r.n[1]} · 成功率 ${Math.round(chance * 100)}% · 需${ALCH_TITLES[Math.max(0, r.alchLv - 1)]}</span><div style="font-size:13px">${reqs.map((x) => `<span class="${x.have >= x.n ? 'good' : 'bad'}">${x.minq ? HERB_AGES[x.minq] + '+' : ''}${item(x.id).name} ${x.have}/${x.n}</span>`).join('　')}</div>${r.desc ? `<div class="muted">${r.desc}</div>` : ''}</div><button class="btn jade sm brew" data-r="${r.id}" data-c="${chance}" ${ok ? '' : 'disabled'}>炼制</button></div>`;
        }
        html += '</div>';
      }
      body.innerHTML = html;
      body.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { tab = (t as HTMLElement).dataset.t!; render(); }));
      body.querySelectorAll('.drop').forEach((b) => b.addEventListener('click', () => { const e = invFind(p, (b as HTMLElement).dataset.u!); if (!e) return; const r = useBottleOnHerb(e); toast(r || '', r?.includes('→') ? 'gold' : 'bad'); render(); }));
      body.querySelectorAll('.brew').forEach((b) => b.addEventListener('click', () => {
        const r = RECIPES.find((x) => x.id === (b as HTMLElement).dataset.r)!; const chance = +(b as HTMLElement).dataset.c!;
        let qSum = 0;
        r.herbs.forEach(([id, n], i) => {
          const minq = i === 0 ? r.minQ : 0; let left = n;
          const cands = p.inv.filter((e) => e.id === id && (e.q ?? 0) >= minq).sort((a1, b1) => (a1.q ?? 0) - (b1.q ?? 0));
          for (const c of cands) { const t = Math.min(left, c.n); qSum += (c.q ?? 0) * t; left -= t; removeEntry(p, c, t); if (left <= 0) break; }
        });
        s.day += 3; playerDayTick(3, false);
        if (rng.chance(chance)) {
          const n = rng.int(r.n[0], r.n[1]) + (mods.alchN || 0) + (qSum >= 4 ? 1 : 0);
          addItem(p, r.out, n);
          p.alchExp += 2 + r.alchLv * 3;
          toast(`丹成！获得 ${item(r.out).name} ×${n}`, 'gold'); bus.emit('sfx', 'levelup');
        } else { p.alchExp += 1; toast('炸炉了……药材化为飞灰。', 'bad'); bus.emit('sfx', 'fail'); }
        while (p.alchLv < 5 && p.alchExp >= alchExpNeed(p.alchLv)) { p.alchExp -= alchExpNeed(p.alchLv); p.alchLv++; toast(`丹道精进，晋为${ALCH_TITLES[p.alchLv]}！`, 'gold'); }
        render(); bus.emit('refresh');
      }));
    };
    render();
    return render;
  });
}

// ---------------- 舆图 ----------------
export function openMap() {
  openPanel('map', '人 界 舆 图', (body) => {
    body.style.padding = '6px';
    const s = S(); const p = s.player;
    const wrap = el(`<div class="mapview"></div>`); body.appendChild(wrap);
    const info = el(`<div class="paper" style="position:absolute;left:14px;bottom:14px;max-width:340px;padding:8px 12px;display:none;z-index:2"></div>`); body.style.position = 'relative'; body.appendChild(info);
    const ov = getOverview();
    const SC = 2; // 画布分辨率倍数
    const c = document.createElement('canvas'); c.width = ov.width * SC; c.height = ov.height * SC;
    wrap.appendChild(c);
    const x = c.getContext('2d')!;
    const px = (wx: number) => wx / WORLD_W * c.width, py = (wy: number) => wy / WORLD_H * c.height;
    const draw = () => {
      x.imageSmoothingEnabled = true;
      x.drawImage(ov, 0, 0, c.width, c.height);
      const fog = world?.fogTex?.getSourceImage() as HTMLCanvasElement; if (fog) { x.globalAlpha = 0.62; x.drawImage(fog, 0, 0, c.width, c.height); x.globalAlpha = 1; }
      x.textAlign = 'center';
      for (const l of LOCATIONS) {
        if (!s.known[l.id]) continue;
        const X = px(l.x), Y = py(l.y);
        x.fillStyle = l.type === 'danger' ? '#a02020' : l.type === 'secret' ? '#7030a0' : l.type === 'portal' ? '#2070b0' : l.type === 'sect' ? '#2f5d57' : '#2a221c';
        x.beginPath(); x.arc(X, Y, l.type === 'city' ? 6 : 4, 0, 7); x.fill();
        x.font = `${l.type === 'city' ? 'bold 15' : '12'}px LXGW WenKai, KaiTi`; x.lineWidth = 3; x.strokeStyle = 'rgba(243,234,214,0.9)';
        x.strokeText(l.name, X, Y - 8); x.fillText(l.name, X, Y - 8);
      }
      for (const e of s.events) if (!e.taken && e.until > s.day) { x.fillStyle = '#e0a010'; x.beginPath(); x.arc(px(e.x), py(e.y), 5, 0, 7); x.fill(); x.font = '11px LXGW WenKai'; x.fillText('宝', px(e.x), py(e.y) - 7); }
      for (const n of s.npcs) if (n.alive && (n.partner || n.companion)) { x.fillStyle = '#e05a8a'; x.beginPath(); x.arc(px(n.x), py(n.y), 3.5, 0, 7); x.fill(); }
      const st = computeStats(p);
      x.strokeStyle = 'rgba(47,93,87,0.9)'; x.lineWidth = 2; x.beginPath(); x.arc(px(p.x), py(p.y), Math.max(4, st.senseRadius / WORLD_W * c.width), 0, 7); x.stroke();
      x.fillStyle = '#d02020'; x.beginPath(); x.arc(px(p.x), py(p.y), 6, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.stroke();
    };
    draw();
    // 平移缩放
    let z = Math.max(wrap.clientWidth / c.width, wrap.clientHeight / c.height, 0.3); let ox = 0, oy = 0;
    const clampView = () => { ox = Math.min(0, Math.max(wrap.clientWidth - c.width * z, ox)); oy = Math.min(0, Math.max(wrap.clientHeight - c.height * z, oy)); };
    const center = (wx: number, wy: number) => { ox = wrap.clientWidth / 2 - px(wx) * z; oy = wrap.clientHeight / 2 - py(wy) * z; clampView(); apply(); };
    const apply = () => { c.style.transform = `translate(${ox}px,${oy}px) scale(${z})`; };
    z = Math.max(z, 1); center(p.x, p.y);
    const pts = new Map<number, { x: number; y: number }>(); let moved = 0; let pinch = 0;
    wrap.addEventListener('pointerdown', (e) => { wrap.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; });
    wrap.addEventListener('pointermove', (e) => {
      const o = pts.get(e.pointerId); if (!o) return;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        o.x = e.clientX; o.y = e.clientY; const [a2, b2] = [...pts.values()]; const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y);
        if (pinch) zoomAt((a2.x + b2.x) / 2, (a2.y + b2.y) / 2, d1 / d0); pinch = 1; moved = 99; return;
      }
      ox += e.clientX - o.x; oy += e.clientY - o.y; moved += Math.abs(e.clientX - o.x) + Math.abs(e.clientY - o.y); o.x = e.clientX; o.y = e.clientY; clampView(); apply();
    });
    const zoomAt = (cx: number, cy: number, k: number) => { const r = wrap.getBoundingClientRect(); const mx = cx - r.left, my = cy - r.top; const nz = Math.min(4, Math.max(Math.max(wrap.clientWidth / c.width, wrap.clientHeight / c.height), z * k)); ox = mx - (mx - ox) * (nz / z); oy = my - (my - oy) * (nz / z); z = nz; clampView(); apply(); };
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.87 : 1.15); }, { passive: false });
    wrap.addEventListener('pointerup', (e) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      if (moved > 8) return;
      const r = wrap.getBoundingClientRect(); const cx = (e.clientX - r.left - ox) / z, cy = (e.clientY - r.top - oy) / z;
      const wx = cx / c.width * WORLD_W, wy = cy / c.height * WORLD_H;
      let best: any = null, bd = 1e9;
      for (const l of LOCATIONS) { if (!s.known[l.id]) continue; const d = dist(l.x, l.y, wx, wy); if (d < bd) { bd = d; best = l; } }
      const thr = 25 / z / c.width * WORLD_W;
      if (best && bd < thr) {
        const d = dist(best.x, best.y, p.x, p.y);
        info.style.display = 'block';
        info.innerHTML = `<b style="font-size:18px">${esc(best.name)}</b> <span class="muted">${{ city: '城池', town: '城镇', village: '村落', sect: '宗门', danger: '险地', secret: '秘境', portal: '传送阵' }[best.type as string]}</span><p style="margin:4px 0;font-size:13px">${esc(best.desc)}</p><div class="row"><span class="muted">距离约 ${Math.round(d / 10)} 里</span><span class="sp"></span><button class="btn sm jade go">前往</button></div>`;
        info.querySelector('.go')!.addEventListener('click', () => { if (world) world.moveTarget = { x: best.x, y: best.y + 60 }; closePanel(); toast(`动身前往${best.name}`, 'info'); });
      } else info.style.display = 'none';
    });
  });
}

// ---------------- 传闻 ----------------
export function openNews() {
  let f = 'all';
  openPanel('news', '修 仙 界 传 闻', (body) => {
    const render = () => {
      const s = S();
      const list = s.news.filter((n) => f === 'all' || n.kind === f);
      body.innerHTML = `<div class="tabs">${[['all', '全部'], ['world', '天下大事'], ['kill', '杀伐'], ['event', '异象'], ['good', '自身'], ['info', '见闻']].map(([k, n]) => `<button class="tab ${f === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div><hr class="ink"><div class="news">${list.map((n) => `<div class="${n.kind}"><span class="d">${dateStr(n.day)}</span>${esc(n.text)}</div>`).join('') || '<p class="muted">暂无传闻</p>'}</div>`;
      body.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { f = (t as HTMLElement).dataset.f!; render(); }));
    };
    render();
    return render;
  });
}

// ---------------- 同伴 ----------------
export function openCompanions() {
  openPanel('comp', '道 侣 · 同 伴 · 故 人', (body) => {
    const render = () => {
      const s = S(); const p = s.player;
      const met = s.npcs.filter((n) => n.met && n.alive).sort((a, b) => (b.partner ? 1000 : 0) + (b.companion ? 500 : 0) + b.favor - ((a.partner ? 1000 : 0) + (a.companion ? 500 : 0) + a.favor));
      const dead = s.npcs.filter((n) => !n.alive && (n.partner || n.companion || (n.met && n.favor > 50)));
      const hasBo = countItem(p, 'juhunbo') > 0;
      body.innerHTML = `<p class="muted">结识过的修士都会记在这里。好感达到一定程度可邀请同行、双修，或结为道侣（道侣不限人数）。</p><div class="list">${met.map((n) => `<div class="li" data-id="${n.id}"><div class="av" style="background-image:url(${portraitURL(n)})"></div><div style="flex:1"><b>${esc(n.name)}</b> ${n.partner ? '<span class="seal">道侣</span>' : ''}${n.companion ? ' <span class="seal" style="background:var(--jade)">同行</span>' : ''} <span class="muted">${realmName(n.realm, n.stage)} · ${esc(n.title || (n.sect ? SECTS[n.sect]?.name : '散修'))} · ${esc(locById(n.home)?.name || '')}</span><div class="favor" style="margin-top:4px"><i style="width:${Math.max(0, (n.favor + 100) / 2)}%"></i></div></div><span class="muted">好感 ${Math.round(n.favor)}</span></div>`).join('') || '<p class="muted">尚未结识任何人。靠近修士按 E 或点击即可交谈。</p>'}</div>
        ${dead.length ? `<hr class="ink"><b>已故之人</b><div class="list" style="margin-top:6px">${dead.map((n) => `<div class="li" style="cursor:default;opacity:.75"><div class="av" style="background-image:url(${portraitURL(n)});filter:grayscale(1)"></div><div style="flex:1"><b>${esc(n.name)}</b> <span class="muted">${n.killedBy ? `死于${esc(n.killedBy)}之手` : '已坐化'} · ${n.deathDay !== undefined ? dateStr(n.deathDay) : ''}</span></div>${hasBo && n.deathDay !== undefined && s.day - n.deathDay < YEAR * 3 ? `<button class="btn gold sm revive" data-id="${n.id}">聚魂钵复生</button>` : ''}</div>`).join('')}</div>` : ''}`;
      body.querySelectorAll('.li[data-id]').forEach((li) => li.addEventListener('click', () => { const n = s.npcs.find((x) => x.id === (li as HTMLElement).dataset.id); if (n) { closePanel(); openNPC(n); } }));
      body.querySelectorAll('.revive').forEach((b) => b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const n = s.npcs.find((x) => x.id === (b as HTMLElement).dataset.id); if (!n) return;
        removeItem(p, 'juhunbo', 1);
        n.alive = true; n.hpFrac = 0.5; n.killedBy = undefined; n.deathDay = undefined; n.age = Math.min(n.age, n.lifespan - 20); n.x = p.x + 40; n.y = p.y + 40; n.goal = 'idle'; n.goalT = 10; n.favor = Math.min(100, n.favor + 30);
        toast(`聚魂钵光华大放，${n.name}的残魂重塑肉身，死而复生！`, 'gold'); bus.emit('sfx', 'breakthrough');
        render();
      }));
    };
    render();
    return render;
  });
}

// ---------------- 闭关 ----------------
export function doRetreat() {
  const s = S(); const p = s.player;
  const safe = inSafeZone(p.x, p.y);
  if (!safe) { toast('野外闭关太危险了，请在城镇、宗门或村落附近闭关。', 'bad'); return; }
  const opts: [string, number][] = [['一月', 30], ['半年', 180], ['一年', 360], ['五年', 1800], ['十年', 3600]];
  modal('闭 关', `<p>于${esc(safe.name)}寻一静室闭关。闭关期间修炼速度 ×3，世界照常运转（NPC 会修炼、争斗、坐化，秘境会开启）。</p><p class="muted">当前寿元余 ${Math.floor(lifespanLeft(p))} 年。修为已至瓶颈时再闭关只会白白消耗寿元。</p>`, [
    ...opts.map(([n, d]) => ({ label: `闭关${n}`, cls: 'jade', fn: () => { retreat(d); } })),
    { label: '取消' },
  ]);
}
function retreat(days: number) {
  const s = S(); const p = s.player;
  const r0 = p.realm, st0 = p.stage, e0 = p.exp; const news0 = s.news.length;
  let left = days;
  while (left > 0) {
    const step = Math.min(30, left); left -= step;
    s.day += step;
    fastSim(step);
    playerDayTick(step, true);
    if (canBreak(p)) break;
  }
  const spent = days - Math.max(0, left);
  const st = computeStats(p); p.hp = st.maxHp; p.mp = st.maxMp;
  const newNews = s.news.slice(0, Math.max(0, s.news.length - news0)).slice(0, 6);
  modal('出 关', `<p>闭关 ${spent} 日。${p.realm !== r0 || p.stage !== st0 ? `修为由 ${realmName(r0, st0)} 精进至 <b class="goldc">${realmName(p.realm, p.stage)}</b>！` : `修为 +${Math.round(p.exp - e0)}`}${canBreak(p) ? '<br><b class="bad">修为已至瓶颈，需尝试突破。</b>' : ''}</p>${newNews.length ? `<p class="muted">闭关期间的传闻：</p><div class="news">${newNews.map((n) => `<div class="${n.kind}"><span class="d">${dateStr(n.day)}</span>${esc(n.text)}</div>`).join('')}</div>` : ''}`, [{ label: '出关', cls: 'jade' }]);
  saveGame();
  bus.emit('refresh');
}

// ---------------- 系统 ----------------
export function openSystem() {
  openPanel('sys', '系 统', (body) => {
    const render = () => {
      const s = S(); const a = audioSettings();
      const slot = (i: number) => { const m = slotMeta(i); return `<div class="slotrow"><b style="width:56px">${i === 0 ? '自动' : '存档' + i}</b><div style="flex:1" class="muted">${m ? `${realmName(m.realm, m.stage)} · ${dateStr(m.day)} · ${new Date(m.time).toLocaleString()}` : '空'}</div>${i ? `<button class="btn sm jade sv" data-i="${i}">存</button>` : ''}${m ? `<button class="btn sm ld" data-i="${i}">读</button>` : ''}</div>`; };
      body.innerHTML = `<div class="cards"><div class="card"><b>存档</b><div class="slots" style="margin-top:6px">${[0, 1, 2, 3].map(slot).join('')}</div><p class="muted">当前存档位：${s.slot === 0 ? '自动' : '存档' + s.slot}（每隔一段时间自动保存到当前存档位）</p><div class="row"><button class="btn sm exp">导出存档</button><button class="btn sm imp">导入存档</button></div></div>
        <div class="card"><b>设置</b><div class="col" style="margin-top:6px"><label>音效 <input type="range" min="0" max="1" step="0.05" value="${a.sfx}" class="vs"></label><label>音乐 <input type="range" min="0" max="1" step="0.05" value="${a.music}" class="vm"></label><label><input type="checkbox" class="mute" ${a.muted ? 'checked' : ''}> 静音</label><label><input type="checkbox" class="aa" ${s.flags.autoAttack !== false ? 'checked' : ''}> 触屏自动攻击</label></div>
        <p class="muted">难度：${{ easy: '逍遥', normal: '寻常', hard: '逆天' }[s.difficulty]}　游戏时长：${Math.floor(s.playSec / 60)} 分钟</p>
        <p class="muted">操作：WASD/点击地面移动 · E 交互 · Shift 疾行 · T 打坐 · K 闭关 · 滚轮缩放 · B/C/L/M/P/N 打开面板</p></div></div>
        <hr class="ink"><div class="row"><button class="btn red title">返回标题</button></div>`;
      body.querySelectorAll('.sv').forEach((b) => b.addEventListener('click', () => { const i = +(b as HTMLElement).dataset.i!; s.slot = i; if (saveGame(i)) toast(`已保存到存档${i}`, 'good'); render(); }));
      body.querySelectorAll('.ld').forEach((b) => b.addEventListener('click', async () => { const i = +(b as HTMLElement).dataset.i!; if (!(await confirmBox('读取该存档？未保存的进度将丢失。'))) return; const g = loadGame(i); if (g) { closePanel(); bus.emit('loadState', g); } }));
      body.querySelector('.exp')!.addEventListener('click', () => { const t = exportSave(); modal('导出存档', `<textarea style="width:100%;height:200px;font-size:11px" readonly>${esc(t)}</textarea><p class="muted">复制保存这段文字即可。</p>`); });
      body.querySelector('.imp')!.addEventListener('click', () => { const m = modal('导入存档', `<textarea class="it" style="width:100%;height:200px;font-size:11px"></textarea>`, [{ label: '导入到存档3', cls: 'jade', fn: () => { try { const g = importSave((m.body.querySelector('.it') as HTMLTextAreaElement).value, 3); closePanel(); bus.emit('loadState', g); } catch { toast('存档格式错误', 'bad'); } } }, { label: '取消' }]); });
      const vs = body.querySelector('.vs') as HTMLInputElement, vm = body.querySelector('.vm') as HTMLInputElement;
      vs.addEventListener('input', () => { a.sfx = +vs.value; saveAudio(); }); vm.addEventListener('input', () => { a.music = +vm.value; saveAudio(); });
      (body.querySelector('.mute') as HTMLInputElement).addEventListener('change', (e) => { a.muted = (e.target as HTMLInputElement).checked; saveAudio(); });
      (body.querySelector('.aa') as HTMLInputElement).addEventListener('change', (e) => { s.flags.autoAttack = (e.target as HTMLInputElement).checked; });
      body.querySelector('.title')!.addEventListener('click', async () => { if (await confirmBox('返回标题画面？（会先自动保存）')) { saveGame(); location.reload(); } });
    };
    render();
  }, { small: false });
}
export { setState, deleteSlot, npcSenseVal, dayanLayer };
