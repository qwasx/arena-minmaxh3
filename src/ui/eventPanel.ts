// 奇遇事件执行器
import { S, NPC, addNews } from '../core/state';
import { addItem, addExp, computeStats, playerDayTick } from '../core/player';
import { EvAPI, EvDef } from '../data/events';
import { item, allItems, HERB_AGES } from '../data/items';
import { expNeeded } from '../data/realms';
import { beastSpec, pickMonster, npcSpec } from '../core/encounter';
import { createRandomNPC, treasureLoot, npcSenseVal } from '../core/npc';
import { biomeAt, isLand, regionAtLand } from '../core/worldgen';
import { LOCATIONS } from '../data/world';
import { rng } from '../core/rng';
import { bus, toast } from '../core/bus';
import { world } from '../scenes/WorldScene';
import type { EnemySpec } from '../scenes/BattleScene';
import { modal, esc } from './dom';

export function runRandomEvent(ev: EvDef, x: number, y: number) {
  const s = S(); const p = s.player;
  const biome = isLand(x, y) ? biomeAt(x, y) : 'sea';
  const rg = regionAtLand(x, y);
  const level = Math.max(0, Math.min(10, Math.round((world?.playerLevel() ?? 1) * 0.6 + (rg.danger[0] + rg.danger[1]) / 2 * 0.4)));
  let battled = false;
  const api: EvAPI = {
    p, r: rng, level, biome, region: rg.name,
    give(id, n = 1, q) {
      const d = item(id); if (!d) return '';
      const qq = q ?? (d.herbBase ? rng.int(0, Math.min(3, Math.floor(level / 2))) : undefined);
      addItem(p, id, n, qq !== undefined ? { q: qq } : {});
      return `${qq !== undefined && d.herbBase ? HERB_AGES[qq] : ''}${d.name}${n > 1 ? '×' + n : ''}`;
    },
    lingshi(n) { n = Math.max(1, Math.round(n)); p.lingshi += n; return `灵石${n}`; },
    exp(frac) { const g = expNeeded(p.realm, p.stage) * frac; addExp(g); return `修为+${Math.round(g)}`; },
    hurt(frac) { const st = computeStats(p); p.hp = Math.max(1, p.hp - st.maxHp * frac); if (frac > 0.25) p.injury = Math.min(0.9, p.injury + frac * 0.4); return `气血-${Math.round(frac * 100)}%`; },
    days(n) { s.day += n; playerDayTick(n, false); },
    battle(enemies: EnemySpec[], title: string, onWin?: () => string | void) {
      battled = true;
      world.startBattle({ kind: enemies.some((e) => e.npcId) ? 'npc' : 'event', enemies, biome, title, canFlee: true }, (r) => {
        if (r.win && onWin) { const t = onWin(); if (t) setTimeout(() => modal(ev.title, `<p>${esc(t)}</p>`, [{ label: '好', cls: 'jade' }]), 350); }
        bus.emit('refresh');
      });
    },
    beast(lv, boss = false) { const l = Math.max(0, Math.min(10, lv)); return beastSpec(pickMonster(biome as any, l), l, boss); },
    spawnNPC(opt) {
      const near = LOCATIONS.reduce((a, b) => (Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) && b.type !== 'danger' && b.type !== 'secret' ? b : a));
      const n = createRandomNPC(rng, near, opt.realm !== undefined ? Math.max(0, Math.min(5, opt.realm)) : undefined);
      if (opt.female !== undefined) { n.gender = opt.female ? 'f' : 'm'; }
      if (opt.beauty) { n.gender = 'f'; n.beauty = true; }
      if (opt.align !== undefined) n.align = opt.align;
      n.x = x + rng.range(-60, 60); n.y = y + rng.range(-60, 60); n.met = true; n.goal = 'idle'; n.goalT = 20;
      if (n.gender === 'f' && /老怪|真人|上人|居士|道人|老魔|散人/.test(n.name)) n.name = n.name.slice(0, -2) + rng.pick(['仙子', '夫人']);
      s.npcs.push(n);
      return n;
    },
    npcSpec(n: NPC) { return npcSpec(n); },
    favor(n, v) { n.favor = Math.max(-100, Math.min(100, n.favor + v)); },
    randomHerb(maxRarity) { const pool = allItems().filter((d) => d.herbBase && d.rarity <= Math.max(1, maxRarity)); return rng.pick(pool).id; },
    randomTreasure(lv) { return treasureLoot(Math.max(0, Math.min(10, lv))); },
    sense() { return computeStats(p).sense; },
  };
  const text = ev.text(api);
  const btns = ev.choices.map((c) => {
    const why = c.req ? c.req(api) : null;
    return {
      label: c.label + (why ? `（${why}）` : ''), disabled: !!why, cls: 'jade',
      fn: () => {
        const res = c.run(api);
        bus.emit('refresh');
        if (typeof res === 'string' && !battled) { setTimeout(() => modal(ev.title, `<p>${esc(res)}</p>`, [{ label: '好', cls: 'jade' }]), 50); }
        return false;
      },
    };
  });
  modal(`奇遇 · ${ev.title}`, `<p style="font-size:17px;line-height:1.7">${esc(text)}</p><p class="muted">${esc(rg.name)}</p>`, btns);
  void npcSenseVal; void addNews; void toast;
}
