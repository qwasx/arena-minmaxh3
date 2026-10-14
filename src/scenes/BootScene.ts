import Phaser from 'phaser';
import { registerFx } from './texreg';
import { initUI } from '../ui/ui';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    registerFx(this);
    initUI();
    document.getElementById('loading')?.remove();
  }
}
