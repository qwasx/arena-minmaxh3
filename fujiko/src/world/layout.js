// 场景布局常量（单位 ≈ 米，1:64 微缩；x 向右，z 朝向镜头，y 向上）
//
//            z = -12  ┌────────────── 后巷 ──────────────┬──────┬────┐
//                     │  咖啡馆楼  │   ÉTOILE 珠宝楼     │ 侧人行│侧街 │远侧
//            z = -1   ├────────────┴──────────────┐ 切角 │  道   │    │人行
//                     │        近侧人行道（露天座）  └──────┘      │    │ 道
//            z = 1.4  ├───────────────────── 前街（石板路）───────┼────┤
//            z = 8    ├─────────── 远侧人行道（地铁口 / 莫里斯柱 / 报亭）──┤
//            z = 12   └──────────────────── 铜牌 ────────────────────────┘
//                   x=-12        x=-6              x=2   x=4.2   x=10  x=12

export const HALF = 12;
export const SW_H = 0.12;   // 人行道高度
export const ROAD_Y = 0.02; // 路面高度

export const MAISON = { x1: -6, x2: 2, z1: -9, z2: -1, cham: 1.4 };
export const CAFE = { x1: -12, x2: -6, z1: -9, z2: -1 };

export const FRONT_SW = { z1: -1, z2: 1.4 };
export const SIDE_SW = { x1: 2, x2: 4.2 };
export const FRONT_ROAD = { z1: 1.4, z2: 8 };
export const SIDE_ROAD = { x1: 4.2, x2: 10 };
export const FAR_FRONT_SW = { z1: 8, z2: HALF };
export const FAR_SIDE_SW = { x1: 10, x2: HALF };
export const ALLEY = { z1: -HALF, z2: -9 };

/** 珠宝楼（奥斯曼风格）各层高度 */
export const H = {
  g1: 3.9,        // 底商顶
  f1: 4.1,        // 二层楼板（通长阳台）
  f1top: 6.9,
  f2: 7.05,
  f2top: 9.6,
  cornice: 10.0,  // 主檐口（第二条通长阳台）
  top: 12.4,      // 孟莎屋顶平台
  inset: 1.0,     // 孟莎屋顶收进
};
/** 咖啡馆楼 */
export const HC = { g1: 3.9, f1: 4.1, f1top: 6.9, cornice: 7.3, top: 9.3, inset: 0.8 };

/** 地铁口开洞（楼梯朝 -z 往下走） */
export const METRO = { x1: 1.3, x2: 2.9, z1: 9.3, z2: 11.4, depth: 1.25 };

/** 屋顶天窗 */
export const SKY = { x1: -3.1, x2: -0.5, z1: -5.9, z2: -3.6, h: 0.9 };

/** 不二子站的位置（屋顶前沿，靠切角） */
export const FUJIKO_POS = [0.05, H.top, -2.55];

/** 雨滴 / 滴水用：某点的地面高度 */
export function groundAt(x, z) {
  // 珠宝楼
  if (x > MAISON.x1 && x < MAISON.x2 && z > MAISON.z1 && z < MAISON.z2) {
    if (x + z > MAISON.x2 + MAISON.z2 - MAISON.cham) return SW_H; // 切角外
    if (x > SKY.x1 && x < SKY.x2 && z > SKY.z1 && z < SKY.z2) return H.top + SKY.h;
    const inTop = x < MAISON.x2 - H.inset && z > MAISON.z1 + H.inset && z < MAISON.z2 - H.inset;
    return inTop ? H.top : H.cornice + 1.0;
  }
  // 咖啡馆楼
  if (x > CAFE.x1 && x < CAFE.x2 && z > CAFE.z1 && z < CAFE.z2) {
    const inTop = z > CAFE.z1 + HC.inset && z < CAFE.z2 - HC.inset;
    return inTop ? HC.top : HC.cornice + 0.9;
  }
  // 咖啡馆遮阳篷
  if (x > CAFE.x1 + 0.3 && x < CAFE.x2 - 0.2 && z >= -1 && z < 0.55) return 2.95;
  // 珠宝店门头雨棚（切角）
  if (x > 0.3 && x < 2.9 && z > -2.9 && z < -0.3 && x + z > -0.4 && x + z < 0.75) return 3.35;
  // 地铁口
  if (x > METRO.x1 && x < METRO.x2 && z > METRO.z1 && z < METRO.z2) return -METRO.depth;
  // 人行道
  if (z > FRONT_SW.z1 && z < FRONT_SW.z2 && x < SIDE_SW.x2) return SW_H;
  if (x > SIDE_SW.x1 && x < SIDE_SW.x2 && z < FRONT_SW.z2) return SW_H;
  if (z > FAR_FRONT_SW.z1) return SW_H;
  if (x > FAR_SIDE_SW.x1) return SW_H;
  return ROAD_Y;
}
