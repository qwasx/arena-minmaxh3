import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { BattleScene } from './scenes/BattleScene';

const loading = document.createElement('div');
loading.id = 'loading'; loading.textContent = '凡人修仙传 · 载入中……';
document.getElementById('ui')!.appendChild(loading);

async function boot() {
  try { await Promise.race([(document as any).fonts?.load('20px "LXGW WenKai"'), new Promise((r) => setTimeout(r, 2500))]); } catch { /* ignore */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1d1a16',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 3 },
    disableContextMenu: true,
    scene: [BootScene, WorldScene, BattleScene],
  });
  (window as any).__game = game;
}
boot();
// 调试钩子（开发模式）
if (import.meta.env.DEV) {
  Promise.all([import('./core/mapRender'), import('./core/state'), import('./scenes/WorldScene'), import('./core/worldgen'), import('./core/encounter'), import('./core/player')]).then(([mr, st, ws, wg, enc, pl]) => {
    (window as any).__dbg = { mr, st, ws, wg, enc, pl };
  });
}
