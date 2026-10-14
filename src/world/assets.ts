// 图片资源加载
const BASE = './art/';
export const ASSET_LIST: Record<string, string> = {
  mountain_a: 'env/mountain_a.webp',
  mountain_b: 'env/mountain_b.webp',
  trees: 'env/trees.webp',
  town: 'env/town.webp',
  sect: 'env/sect.webp',
  island: 'env/island.webp',
  danger: 'env/danger.webp',
  ruins: 'env/ruins.webp',
  hanli_walk: 'sprite/hanli_walk.webp',
  hanli_sword: 'sprite/hanli_sword.webp',
  portrait_hanli: 'hanli.webp',
};

export class Assets {
  images = new Map<string, HTMLImageElement>();
  img(key: string) { return this.images.get(key); }
  async load(onProgress?: (p: number) => void) {
    const keys = Object.keys(ASSET_LIST);
    let done = 0;
    await Promise.all(keys.map((k) => new Promise<void>((res) => {
      const im = new Image();
      im.onload = () => { this.images.set(k, im); done++; onProgress?.(done / keys.length); res(); };
      im.onerror = () => { console.warn('资源加载失败', k); done++; onProgress?.(done / keys.length); res(); };
      im.src = BASE + ASSET_LIST[k];
    })));
  }
}

export const assets = new Assets();
