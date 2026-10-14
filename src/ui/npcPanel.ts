// NPC 交互：交谈、赠礼、交易、切磋、同行、双修、道侣、查探、动手
import { S, NPC, addNews, InvEntry, dateStr } from '../core/state';
import { computeStats, itemLabel, itemValue, removeEntry, addItem, addExp, talentMods, playerDayTick } from '../core/player';
import { npcStats, npcSenseVal, inSafeZone, perceivedRealm } from '../core/npc';
import { item } from '../data/items';
import { realmName, expNeeded, REALMS } from '../data/realms';
import { SECTS } from '../data/characters';
import { locById } from '../data/world';
import { npcSaySync, npcSay, Topic } from '../core/dialogue';
import { bus, toast } from '../core/bus';
import { rng, uid } from '../core/rng';
import { world } from '../scenes/WorldScene';
import { el, esc, openPanel, closePanel, modal, confirmBox, fmt } from './dom';
import { portraitURL } from './ui';
import { slotHTML, itemInfoHTML } from './panels';
import { iconURL } from '../core/textures';
import { describeRealmGap } from '../core/encounter';

const chatLogs = new Map<string, { who: 'me' | 'npc' | 'sys'; text: string }[]>();

export function openNPC(n: NPC) {
  const s = S(); const p = s.player;
  if (!n.met) { n.met = true; if (n.famous) addNews(`韩立结识了${n.name}。`, 'info'); }
  const log = chatLogs.get(n.id) || []; chatLogs.set(n.id, log);
  const say = (topic: Topic, text?: string) => {
    log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic, text, history: log as any }) });
  };
  if (!log.length || log[log.length - 1].who !== 'npc') say('greet');
  if (s.day - n.lastTalk >= 1) { n.lastTalk = s.day; if (n.favor < 30) n.favor += 1; }

  openPanel('npc', n.name, (body) => {
    const render = () => {
      const st = computeStats(p);
      const canSee = st.sense >= npcSenseVal(n) * 0.75 || n.favor > 50;
      const opp = n.gender !== 'm';
      const sect = n.sect ? SECTS[n.sect]?.name : '散修';
      const nst = npcStats(n);
      const [pr] = perceivedRealm();
      body.innerHTML = `<div class="npcp"><div class="col"><div class="portrait" style="background-image:url(${portraitURL(n)})"></div>
        <div class="card"><div style="font-size:20px;font-weight:bold">${esc(n.name)} ${n.partner ? '<span class="seal">道侣</span>' : ''}${n.companion ? ' <span class="seal" style="background:var(--jade)">同行</span>' : ''}</div>
        <div class="muted">${esc(n.title || sect)}</div>
        <div class="kv" style="margin-top:6px"><b>修为</b><span>${canSee ? realmName(n.realm, n.stage) : '神识探查不透'}</span><b>实力</b><span>${canSee ? describeRealmGap(n.realm, p.realm) : '???'}</span><b>年岁</b><span>${n.age > 900 ? '不可考' : Math.floor(n.age) + '岁'}</span><b>出身</b><span>${esc(sect)} · ${esc(locById(n.home)?.name || '')}</span><b>好感</b><span>${Math.round(n.favor)}${n.grudge > 30 ? ` <span class="bad">（仇恨 ${Math.round(n.grudge)}）</span>` : ''}</span></div>
        <div class="favor" style="margin-top:4px"><i style="width:${Math.max(0, (n.favor + 100) / 2)}%"></i></div>
        ${n.desc ? `<p style="font-size:13px;margin:6px 0 0">${esc(n.desc)}</p>` : ''}
        ${n.favor > 30 && n.likes?.length ? `<p class="muted" style="margin:4px 0 0">似乎喜欢：${n.likes.map((l) => ({ herb: '灵草', pill: '丹药', artifact: '法宝', material: '材料', misc: '奇物', talisman: '符箓', manual: '功法' } as any)[l] || item(l)?.name || l).join('、')}</p>` : ''}
        </div></div>
        <div class="col"><div class="chat">${log.slice(-30).map((l) => `<div class="${l.who}">${l.who === 'me' ? '韩立：' : l.who === 'npc' ? esc(n.name) + '：' : ''}${esc(l.text)}</div>`).join('')}</div>
        <div class="row"><input class="txt say" placeholder="说点什么……（回车发送）"><button class="btn sm send">说</button></div>
        <div class="row talk">
          <button class="btn sm" data-a="chat">闲聊</button><button class="btn sm" data-a="news">打听消息</button><button class="btn sm" data-a="self">询问来历</button>${opp ? '<button class="btn sm" data-a="flirt">调笑</button>' : ''}
        </div><hr class="ink">
        <div class="row acts">
          <button class="btn jade" data-b="gift">赠礼</button><button class="btn" data-b="trade">交易</button><button class="btn" data-b="spar">切磋</button><button class="btn" data-b="probe">神识查探</button>
          ${n.companion ? '<button class="btn" data-b="dismiss">分道扬镳</button>' : '<button class="btn jade" data-b="follow">邀请同行</button>'}
          ${opp ? '<button class="btn" data-b="dual" style="border-color:#c06080">双修</button>' : ''}
          ${opp && !n.partner ? '<button class="btn gold" data-b="partner">结为道侣</button>' : ''}
          <span class="sp"></span><button class="btn red" data-b="attack">动手</button>
        </div>
        <p class="muted" style="font-size:12px">${n.realm > pr + 1 ? '对方修为远超于你，小心说话。' : ''}${nst ? '' : ''}</p></div></div>`;
      const chatEl = body.querySelector('.chat') as HTMLElement; chatEl.scrollTop = chatEl.scrollHeight;
      const inp = body.querySelector('.say') as HTMLInputElement;
      const send = async () => {
        const t = inp.value.trim(); if (!t) return;
        log.push({ who: 'me', text: t }); inp.value = '';
        const reply = await npcSay({ npc: n, player: p, topic: 'free', text: t, history: log as any });
        log.push({ who: 'npc', text: reply }); render();
      };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
      body.querySelector('.send')!.addEventListener('click', send);
      body.querySelectorAll('.talk .btn').forEach((b) => b.addEventListener('click', () => {
        const a = (b as HTMLElement).dataset.a as Topic;
        log.push({ who: 'me', text: { chat: '（与对方闲聊几句）', news: '最近修仙界可有什么消息？', self: '敢问道友来历？', flirt: '（目光灼灼地看着对方）道友真是风华绝代。' }[a as string] || '' });
        if (a === 'flirt') { const m = talentMods(p.talents); if (n.favor >= 30 || n.traits.lust > 0.6) n.favor = Math.min(100, n.favor + 2 * (1 + (m.charm || 0))); else n.favor -= n.traits.pride > 0.6 ? 6 : 2; }
        say(a); render();
      }));
      body.querySelectorAll('.acts .btn').forEach((b) => b.addEventListener('click', () => { bus.emit('sfx', 'click'); act((b as HTMLElement).dataset.b!); }));
    };
    const act = async (a: string) => {
      const st = computeStats(p);
      const opp = n.gender !== 'm';
      switch (a) {
        case 'gift': return giftMenu(n, () => { render(); });
        case 'trade': return tradeMenu(n, render);
        case 'spar':
          if (n.favor < -10) { log.push({ who: 'npc', text: '我没兴趣和你切磋。' }); return render(); }
          log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'spar' }) });
          closePanel(); world?.fightNPC(n, true); return;
        case 'probe': {
          const ratio = st.sense / npcSenseVal(n);
          if (ratio < 0.6) { log.push({ who: 'sys', text: `你的神识刚一接触，便被对方察觉！${n.name}脸色一沉。` }); n.favor -= 8; return render(); }
          const arts = n.arts.map((id) => item(id)?.name).filter(Boolean).join('、') || '无';
          const val = n.inv.reduce((t, e) => t + itemValue(e), 0) + n.lingshi;
          if (npcSenseVal(n) > st.sense * 0.8 && rng.chance(0.4)) { n.favor -= 4; log.push({ who: 'sys', text: '对方隐约察觉到了你的窥探，有些不悦。' }); }
          modal(`查探 · ${n.name}`, `<div class="kv"><b>真实修为</b><span>${realmName(n.realm, n.stage)}</span><b>法宝</b><span>${esc(arts)}</span><b>身家</b><span>约 ${fmt(val)} 灵石</span><b>性情</b><span>${n.traits.greed > 0.65 ? '贪婪 ' : ''}${n.traits.caution > 0.65 ? '谨慎 ' : ''}${n.traits.kind > 0.65 ? '善良 ' : ''}${n.traits.pride > 0.65 ? '高傲 ' : ''}${n.align < -0.3 ? '魔道' : n.align > 0.3 ? '正道' : '亦正亦邪'}</span></div>`);
          return render();
        }
        case 'follow': {
          const comps = S().npcs.filter((x) => x.companion && x.alive).length;
          const need = n.realm > p.realm + 1 ? 70 : n.realm > p.realm ? 50 : 35;
          if (comps >= 3) { log.push({ who: 'sys', text: '同行之人最多三位。' }); return render(); }
          if (n.favor < need && !n.partner) { log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'followNo' }) }); log.push({ who: 'sys', text: `（好感需达到 ${need}）` }); return render(); }
          n.companion = true; n.goal = 'follow'; log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'follow' }) });
          toast(`${n.name}与你同行，会在战斗中助你一臂之力`, 'good'); return render();
        }
        case 'dismiss': n.companion = false; n.goal = 'idle'; n.goalT = 0; log.push({ who: 'npc', text: '后会有期。' }); return render();
        case 'dual': {
          if (!opp) return;
          if (S().day - n.lastDual < 30) { log.push({ who: 'npc', text: '刚刚才……让人家歇一歇嘛。' }); return render(); }
          const willing = n.partner || (n.favor >= 70 && n.traits.lust > 0.35) || n.favor >= 90;
          if (!willing) { n.favor -= 5; log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'dualNo' }) }); return render(); }
          n.lastDual = S().day;
          const mul = (p.techs.includes('dianfeng') ? 2 : 1) * (n.partner ? 1.3 : 1) * (n.realm >= p.realm ? 1.4 : 0.8);
          const gain = expNeeded(p.realm, p.stage) * 0.14 * mul;
          S().day += 3; playerDayTick(3, true);
          addExp(gain);
          n.exp += expNeeded(n.realm, n.stage) * 0.1; n.favor = Math.min(100, n.favor + 4);
          log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'dual' }) });
          log.push({ who: 'sys', text: `三日双修，阴阳交融。修为 +${Math.round(gain)}` });
          bus.emit('sfx', 'levelup'); return render();
        }
        case 'partner': {
          if (n.favor < 85) { log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'partnerNo' }) }); log.push({ who: 'sys', text: '（好感需达到 85）' }); return render(); }
          if (!(await confirmBox(`与${n.name}结为道侣？`, '结为道侣'))) return;
          n.partner = true; n.favor = 100;
          log.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: 'partner' }) });
          addNews(`韩立与${n.name}结为道侣。`, 'good'); toast(`你与${n.name}结为道侣！`, 'gold'); bus.emit('sfx', 'breakthrough');
          return render();
        }
        case 'attack': {
          const safe = inSafeZone(p.x, p.y);
          if (safe && safe.type !== 'village') { toast(`${safe.name}内禁止私斗！把人引到城外再说。`, 'bad'); return; }
          const warn = n.partner ? `${n.name}是你的道侣！真的要下手吗？` : n.realm > p.realm + 1 ? `对方修为远在你之上（${realmName(n.realm, n.stage)}），此去九死一生，确定动手？` : `确定对${n.name}出手？杀人夺宝会影响名声，同门也会记恨你。`;
          if (!(await confirmBox(warn, '动手'))) return;
          closePanel(); world?.fightNPC(n, false); return;
        }
      }
    };
    render();
    return render;
  }, { onClose: () => { if (chatLogs.get(n.id)!.length > 40) chatLogs.set(n.id, chatLogs.get(n.id)!.slice(-30)); } });
}

function giftMenu(n: NPC, after: () => void) {
  const s = S(); const p = s.player;
  if (s.day - n.lastGift < 1) { toast('今天已经送过礼了。', 'bad'); return; }
  const cands = p.inv.filter((e) => { const d = item(e.id); return d && !d.noSell && !p.equipped.includes(e.uid) && d.type !== 'bag'; });
  const m = modal(`赠礼 · ${n.name}`, `<div class="grid" style="max-height:50vh">${cands.map((e) => slotHTML(e)).join('') || '<p class="muted">没有可赠之物</p>'}</div><div class="gdet" style="margin-top:8px"></div>`, [{ label: '取消' }], { wide: true });
  let sel: InvEntry | null = null;
  m.body.querySelectorAll('.slot').forEach((sl) => sl.addEventListener('click', () => {
    sel = p.inv.find((e) => e.uid === (sl as HTMLElement).dataset.uid) || null; if (!sel) return;
    m.body.querySelectorAll('.slot').forEach((x) => x.classList.remove('sel')); sl.classList.add('sel');
    const det = m.body.querySelector('.gdet') as HTMLElement;
    det.innerHTML = `<div class="row"><b>${esc(itemLabel(sel))}</b><span class="muted">价值约 ${fmt(itemValue(sel))}</span><span class="sp"></span><button class="btn jade give">赠予一件</button></div>`;
    det.querySelector('.give')!.addEventListener('click', () => {
      if (!sel) return;
      const d = item(sel.id);
      const v = itemValue(sel);
      let gain = Math.max(1, Math.min(25, (v / (40 * Math.pow(3.5, n.realm))) * 10));
      if (d.pill?.favor) gain = d.pill.favor * (n.gender === 'f' ? 1 : 0.3);
      const likes = n.likes || [];
      if (likes.includes(d.type) || likes.includes(sel.id)) gain *= 1.8;
      const mods = talentMods(p.talents); if (n.gender === 'f' && mods.charm) gain *= 1 + mods.charm;
      if (n.grudge > 0) { n.grudge = Math.max(0, n.grudge - gain * 2); }
      n.favor = Math.min(100, n.favor + gain);
      n.lastGift = s.day;
      const one = { ...sel, n: 1, uid: uid() }; n.inv.push(one);
      if (d.art && d.art.minRealm <= n.realm && !n.arts.includes(sel.id) && n.arts.length < 4) n.arts.push(sel.id);
      removeEntry(p, sel, 1);
      toast(`${n.name}好感 +${Math.round(gain)}`, 'good');
      chatLogs.get(n.id)?.push({ who: 'npc', text: npcSaySync({ npc: n, player: p, topic: gain >= 4 ? 'gift' : 'giftBad' }) });
      m.close(); after();
    });
  }));
}

function tradeMenu(n: NPC, after: () => void) {
  const p = S().player;
  if (n.favor < -20) { toast(`${n.name}不愿与你交易。`, 'bad'); return; }
  const disc = 1.3 - Math.max(0, n.favor) / 400;
  const render = (m: ReturnType<typeof modal>) => {
    const goods = n.inv.filter((e) => item(e.id) && item(e.id).type !== 'bag');
    const mine = p.inv.filter((e) => { const d = item(e.id); return d && !d.noSell && !p.equipped.includes(e.uid) && d.type !== 'bag'; });
    m.body.innerHTML = `<div class="row"><b>${esc(n.name)}的货物</b><span class="muted">（对方灵石 ${fmt(n.lingshi)}，你 ${fmt(p.lingshi)}）</span></div>
      <div class="list" style="max-height:30vh;overflow:auto;margin:6px 0">${goods.map((e) => `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(e.id)})"></div><div style="flex:1">${esc(itemLabel(e))} ×${e.n}</div><span>${fmt(itemValue(e) * disc)}💎</span><button class="btn sm jade buy" data-u="${e.uid}">买</button></div>`).join('') || '<p class="muted">对方没有可卖之物</p>'}</div>
      <b>出售给对方</b><div class="list" style="max-height:28vh;overflow:auto;margin-top:6px">${mine.map((e) => `<div class="li" style="cursor:default"><div class="ic" style="background-image:url(${iconURL(e.id)})"></div><div style="flex:1">${esc(itemLabel(e))} ×${e.n}</div><span>${fmt(itemValue(e) * 0.5)}💎</span><button class="btn sm sell" data-u="${e.uid}">卖</button></div>`).join('')}</div>`;
    m.body.querySelectorAll('.buy').forEach((b) => b.addEventListener('click', () => {
      const e = n.inv.find((x) => x.uid === (b as HTMLElement).dataset.u); if (!e) return;
      const price = Math.round(itemValue(e) * disc);
      if (p.lingshi < price) { toast('灵石不足', 'bad'); return; }
      p.lingshi -= price; n.lingshi += price;
      addItem(p, e.id, 1, e.q !== undefined ? { q: e.q } : {});
      e.n--; if (e.n <= 0) n.inv.splice(n.inv.indexOf(e), 1);
      if (item(e.id).art) n.arts = n.arts.filter((a) => a !== e.id || n.inv.some((x) => x.id === a));
      bus.emit('sfx', 'coin'); render(m); bus.emit('refresh');
    }));
    m.body.querySelectorAll('.sell').forEach((b) => b.addEventListener('click', () => {
      const e = p.inv.find((x) => x.uid === (b as HTMLElement).dataset.u); if (!e) return;
      const price = Math.round(itemValue(e) * 0.5);
      if (n.lingshi < price) { toast('对方灵石不够', 'bad'); return; }
      n.lingshi -= price; p.lingshi += price;
      n.inv.push({ ...e, n: 1, uid: uid() });
      removeEntry(p, e, 1);
      if (item(e.id).herbBase && (e.q ?? 0) >= 3) p.heat = Math.min(100, p.heat + 6);
      bus.emit('sfx', 'coin'); render(m); bus.emit('refresh');
    }));
  };
  const m = modal(`交易 · ${n.name}`, '', [{ label: '结束交易', fn: () => { after(); } }], { wide: true });
  render(m);
}
export { itemInfoHTML, REALMS, dateStr, el };
