# 凡人修仙传 2D 游戏 — 开发进度交接文档

> 给下一位接手者：本文档说明当前进度、已定方案、未竟事项和用户要求。
> 分支：`arena/01a0d78f-arena-minmaxh3`（必须在此分支工作）

## 一句话现状

**视觉大翻新"样品"(#sample)已基本完成并打包**（含程序化人物骨骼动画、山水、树、建筑、天气、严格神识视野），等用户验收后再把那些视觉铺开用到主地图。

- 下载体验包: https://github.com/qwasx/arena-minmaxh3/raw/arena/01a0d78f-arena-minmaxh3/download/fanren-sample.zip
- 解压后用浏览器打开 `index.html`，点标题页「新画面样品」按钮（或加 `#sample` 直接进）。必须走 file:// 兼容构建（vite.config.ts 已有 fileProtocolCompat 插件）。

## 已定计划（7 大步）

1. **Step 1 大地图+标题** ✅ 已完成（download/fanren-step1.zip），但用户嫌画风差，正在做视觉翻新（即当前样品）。
2. Step 2 修炼/背包/掌天瓶/炼丹/存档 + 采药（与翻新一起铺开）。
3. Step 3 实时战斗 + 怪物 + 死亡惩罚（死 = -30% 修为，不掉大境界）。
4. Step 4 NPC AI、神识探查、杀人夺宝。
5. Step 5 城镇/宗门/红颜（重点卖点：原创美人角色）。
6. Step 6 随机事件、血色禁地/虚天殿、势力战争。
7. Step 7 打磨：移动端、音频、美术、平衡；预留 LLM 对话接口。

**重要工作方式**：一步一步来，每步完成 → 打包 → 给 GitHub 下载链接+预览 → **停下等用户验收**（用户说"ok我们继续 不好我们改"）。用户不能下载 workspace，zip 必须提交进 repo 的 download/ 目录，给 raw 链接。GitHub release 附件上传不可用。

## 技术分析（关键技术决策）

- **技术栈**：Canvas2D + React + Vite/TS。file:// 兼容构建：iife 单 bundle、script defer、无 crossorigin、base './'、禁止动态 import（inlineDynamicImports）。
- **没有 CJK 系统字体** → 打包 webfont（fontsource noto-serif-sc + ma-shan-zheng）。
- **代码实时绘制**（禁止贴图贴纸）：人物、山、树、建筑全部程序化绘制，有骨骼物理动画：
  - `src/gfx/character.ts` (~900行)：3D 关节骨架投影（sx=X, sy=Y·0.5−Z·0.92），7.5头身，verlet 布料链条（发带/鬓发/带子/披帛），走/跑/御剑/打坐/施法/待机动画，随机 NPC 外貌生成 `randomAppearance`。
  - `src/gfx/mountain.ts` `trees.ts`（多种树：松/枫/竹/柳/梅/柏…）`buildings.ts` `fauna.ts` `weather.ts` `sense.ts`（严格神识遮罩）。
  - `src/sample/`：样品地图 world.ts（8000×6000 双线性高度场）、ground.ts（季节调色）、scene.ts（分块烘培缓存，每帧最多烘2块）、SampleView.tsx（含旋转人物展示台）。
  - 样品内 UI 有三个实验室：`#charlab` `#(mtn|tree|bld)lab` 用于调参。
- **神识严格视野**：境界决定半径（炼气380/筑基620/结丹980/元婴1500/化神2300 px），圈外一律不可见（含已探索区）。M 大地图和小地图只保留地形记忆（要告诉用户，问是否改）。最低缩放被视野半径钳制。主游戏 src/world/render.ts 的 SenseMask 也加严格了，未经实测。

### 常踩的坑（测试/工具链）

- Puppeteer 截图：`cd /home/user/tools && LD_LIBRARY_PATH=/home/user/tools/libs:/tmp timeout 170 node flow.mjs <url> <steps.json> [w] [h]`；steps 支持 waitFor/wait/eval/click/key/hold/mouse/shot。`#sample` 必须加 `WAIT=domcontentloaded`（networkidle2 会超时）。
- 大量 GPU 大画布 + getImageData 在无头 chrome 会卡死 → 烘培用 `makeCanvas(..., true)`（CPU 画布+willReadFrequently）。
- 无头 FPS 不准，别追。
- rAF 时间戳可能早于 performance.now() → dt 注意防负。
- file:// 下 module script 被 CORS 拦 → 已有 IIFE defer 方案解决。
- `dist`、`node_modules` 不在 Arena 快照里，每次新会话要 `npm install && npm run build`。

## 已修复的关键 bug（本次会话末）

- **发带上翘"牛角"**：原以为是 dt 子步问题，真实原因是**首帧预热存活惯性**——进场前链条在拖尾状态，初次转动甩上去。修复：character.ts `update` 首帧用零速度跑 90 步 preprocess 预热。
- **女修发坏遮脸**：紫色女修飞行时鬓发甩过来糊脸。修复：条件 `front < 0.35 || chainDepth < headD-0.012` 判定为身后 + 新加"头发不过头部前平面"约束（hairSide 0.005 余量）。
- 河岸抗锯齿（ground.ts 水边 smoothstep ±2.5px）、金色树暗层改向棕色混（不黑边）、黄昏光偏弱（dusk 降 B 95/G 45）、秋色偏绿。

## 遗留 / 下一步

1. **等用户验收样品**（zip 在 download/fanren-sample.zip）。验收后：把新视觉铺开进整个大地图（人界全域：天南→乱星海→大晋→天澜/慕兰草原→极西之地），同时按 Step 2 做修炼/背包/掌天瓶/炼丹/存档系统。
2. `GfxLab.tsx` 字体未 await（小毛病）。
3. `randomAppearance` 应让 ~70% 女性带披帛（pibo）。
4. 男待机袖子有点方；松树在远山上还是"扁垫"感（暂可接受为黄山松风格化）。
5. 大地图要"多山、不重复"：mountain.ts 支持多峰皴法雪顶瀑布薄雾，按海拔密集摆链。
6. 测试没跑：主游戏 render.ts 神识改动、移动端布局 390×844 TOUCH=1。
7. 音频用户很在意（Step 7）：AI 生成不了音乐，用 CC0 古风曲或用户自备；音效可代码做。
8. 吃鸡前验证：渲染 `Renderer` 类在 src/world/render.ts。

## 世界观资料（project_*.md 也看）摘要

- 地理：天南(越国有七玄门/黄枫谷/血色禁地)、乱星海(星宫/天星城/妙音门，外星海妖兽)、大晋(天魔宗/昆吾山)、天澜/慕兰草原、极西之地(千竹教/大衍神君)。小界：阴冥之地、虚天殿。
- 神识数值锚点：筑基1→结丹30→元婴500→化神8000+（相对值）；半径 ≈ 200+50·√sense。大衍诀 1-7 层 ×2~×8。
- 韩立法宝时间线：掌天瓶/长春功→青竹蜂云剑72柄+大庚剑阵→虚天鼎/乾蓝冰焰→风雷翅；灵宠：曲魂/噬金虫/啼魂兽/六翼霜蚣。
- 其他 NPC 法宝（可杀人夺宝）：南宫婉朱雀环、温天仁八门金光镜仿/天阳鎏金针、蛮胡子托天魔功、极阴祖师玄阴经+天都尸火16尸妖等（详见项目知识库）。
- 女性角色：南宫婉、紫灵、元瑶/妍丽、银月(狐)、慕沛灵、陈巧倩、辛如音、宋玉、凌玉灵… 要"美、原创、不普通"。
- 法宝等阶：法器→符宝→法宝→本命→古宝→仿通天灵宝→通天灵宝。
- 宗门可加入、道侣不限、无固定剧情纯沙盒、任何人可杀可复活（法宝）。

## 会话流程注意

- 用户用中文口语（常语音输入有错别字），回复用**中文**。
- 每大步结束 STOP 等认可；用户说"不要动"就别动。
- 打包 zip → 提交 download/ → 给 raw 链接 + 说明怎么打开（标题按钮或 #sample）。
