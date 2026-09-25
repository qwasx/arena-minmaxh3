# 02 · 基础模式格式详解（T2VA / I2VA / FL2VA / L2VA）

> 对应官方 `references/official-base-en.txt`。本文是中文解读 + 补充说明，**所有英文格式字符串请逐字照抄**，
> 别自己发挥（比如把 `[Shot 2]` 写成 `Shot 2:`，把 `00:03.500` 写成 `3.5s`）。

## 0. 先看一眼成品长什么样

一个 8 秒、三镜头的 T2VA 提示词：

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, a macro close-up frames a faceted amber glass perfume bottle standing on black polished marble, lit by a single warm key light from the upper left. The camera arcs right with small amplitude at slow speed around the bottle while fine golden dust drifts through the beam of light. [Shot 2] At 00:03.500, the shot cuts to an overhead medium shot as a single drop of amber liquid falls into a shallow black basin beside the bottle and sends out slow concentric ripples; the camera pushes in with small amplitude at slow speed toward the point of impact. [Shot 3] At 00:06.000, the shot cuts to a static, centered wide shot of the bottle against pure black, and the white serif text "NOIR AMBRE" fades in beneath the bottle and holds until the end.

overall_soundscape: A near-silent studio room tone sits under the whole video. The falling drop lands with a single soft, rounded plink, followed by the faint ripple of liquid settling.

non_diegetic_music: A single sustained low cello note at a very slow tempo, joined by a sparse three-note piano motif that repeats twice and decays into silence before the final frame.
```

结构就是：**（对齐语句）+ 空行 + 三个字段**，字段之间空一行。

## 1. 第一部分：关键帧对齐语句（T2VA 没有）

对齐语句必须是提示词的**第一行**，后面**空一行**再接三字段。三种模式各有一句固定话术：

**I2VA（首帧）**——固定不变：

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.
```

**FL2VA（首尾帧）**——`N` 换成实际最后一个镜头的编号，`S.SS` 换成视频总时长（两位小数）：

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.
```

**L2VA（尾帧）**——同上替换 `N` 和 `S.SS`：

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.
```

注意几个细节：
- 破折号是全角 `—`（U+2014），前后各一个空格。
- FL2VA 那句里 `Picture 1 (from Shot 1)` **没有**尖括号和方括号，I2VA / L2VA 里 `<Picture 1> (from [Shot 1])` **有**。官方就是这么写的，照抄。
- `S.SS` 是"有效视频时长"，8 秒就写 `8.00`，ComfyUI 设 124 帧就写 `5.17`。
- FL2VA 一般只用一个镜头（方便模型从首帧插值到尾帧），此时 `N = 1`。

## 2. 第二部分：三个核心字段

```text
integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...
```

| 字段 | 写什么 | 不写什么 |
| --- | --- | --- |
| `integrated_multimodal_description` | 主体。沿时间线写画面、动作、镜头、说话人、对白、歌唱、**画内音**（角色能听到的声音事件） | 不写"配乐" |
| `overall_soundscape` | 全片的环境音、物理动作音、非语言人声（风雨车流、脚步布料撞击、呼吸笑喘） | 不重复对白/歌唱/画内音乐 |
| `non_diegetic_music` | 角色听不到、只有观众听到的背景音乐：乐器、速度、节奏、动态变化 | 不写情绪词，不解释配乐功能 |

三个字段名全小写、下划线、后面紧跟英文冒号，**顺序不能变，一个都不能少**。

## 3. `integrated_multimodal_description` 怎么写

### 3.1 [Shot 1]：先定风格和初始构图

第一镜开头就交代整体风格 + 景别 + 初始构图，例如：

```text
[Shot 1] Live-action, cinematic, a medium-wide shot frames ...
[Shot 1] 2D-animated, Japanese TV-anime style with flat cel shading, a wide shot follows ...
[Shot 1] 3D CG, Pixar-like stylized render, a low-angle close-up on ...
```

官方列的常用风格词：`Cinematic`、`live-action`、`2D-animated`、`3D CG`、`claymation`、`watercolor`、`vintage film`。
关键帧模式的风格要**从参考图推导**（图是水彩就写水彩），T2VA 从用户需求里选。

每个镜头都应该有"画面三件套"：
- **主体**：身份 / 服装 / 位置（在画面左还是右）
- **环境**：场景 / 关键道具 / 光线方向与色温
- **动作**：做什么、反应是什么

### 3.2 切镜：`[Shot N] At MM:SS.mmm, ...`

- `[Shot 1]` **不加时间戳**。
- 之后每个镜头顺序编号，开头写切入时刻，格式严格为 `At 00:03.500,`（分:秒.毫秒，毫秒三位）。
- 时间戳必须**严格递增**，且落在视频总时长之内。
- 普通切镜用这几个短语之一：`the camera cuts to` / `the shot cuts to` / `the shot transitions to` / `the shot changes to` / `the shot switches to`。叠化、淡入淡出、划像只在用户明确要求时用。
- **一个切镜必须带来新信息**（新主体 / 新空间 / 新状态 / 新视角 / 新时间）。只是想改变距离或微调角度，用运镜，别切镜。

```text
[Shot 2] At 00:03.500, the shot cuts to an over-the-shoulder close-up on him ...
```

### 3.3 运镜：类型 + 幅度 + 速度

写成自然英语动作句，别在句尾堆标签。中等幅度、正常速度时幅度/速度可省略。

| 类型 | 英文 | 含义 |
| --- | --- | --- |
| 变焦 | `Zoom In / Zoom Out` | 机身不动改焦距 |
| 推拉 | `Push In / Pull Out` | 机身前进 / 后退 |
| 摇 | `Pan Left / Pan Right` | 机位不动水平转 |
| 横移 | `Truck Left / Truck Right` | 机身水平平移 |
| 俯仰 | `Tilt Up / Tilt Down` | 机位不动垂直转 |
| 升降 | `Pedestal Up / Pedestal Down` | 整机上升 / 下降 |
| 环绕 | `Arc Shot` | 绕主体弧线运动 |
| 跟拍 | `Tracking Shot` | 跟随运动主体 |
| 固定 | `Static Shot` | 机位和镜头都不动 |
| 抖动 | `Shake Slightly / Shake Strongly` | 轻微 / 强烈晃动 |
| 主观 | `POV` | 主体视角 |
| 滚转 | `Roll Clockwise / Roll Counterclockwise` | 绕光轴顺 / 逆时针滚 |
| 幅度 | `with small amplitude` / `with large amplitude` | 构图变化范围 |
| 速度 | `at slow speed` / `at fast speed` | 变化快慢 |

```text
The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.
The camera pans right with large amplitude at fast speed, revealing the open doorway.
The camera holds a static shot as the runner exits the frame.
```

### 3.4 说话人、对白、歌唱

**说话人 ID**：会出声的角色用稳定 ID `(S1)`、`(S2)`……按**首次出声顺序**编号，跨镜头保持不变；从不出声的角色不给 ID。多人齐声用 `(S1,S2)`。

**首次出场**要给足建立身份的信息：角色类型、年龄、性别、是否在画面内、音高、音色、语速、口音。

**`<d>` 标签**：里面**只放语言标签和实际说的话**，逐字保留原文和标点，不翻译不改写。身份描述、ID、动作、语气全部放在 `<d>` 外面。

```text
The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>
The middle-aged shopkeeper with a hoarse Beijing accent (S2) grumbles: <d>[Chinese] 都说了今天不营业。</d>
The two children (S1,S2) shout together, <d>[English] Wait for us!</d>
```

语言标签用英文语言名：`[English]` `[Chinese]` `[Japanese]` `[Korean]` `[French]` `[German]` `[Italian]` `[Portuguese]` `[Russian]` `[Spanish]` `[Arabic]`。

**画外音**：必须用固定短语 `says in an off-screen voiceover`，且在 `<d>` 块后**立刻**声明对应角色嘴唇闭合：

```text
The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.
```

**一句话跨越切镜**：在两段的连接点都放 `<scenetrans>`，并明确写出音频连续。`<scenetrans>` 放在 `<d>` 外面（`<d>` 里只能有台词）：

```text
... the boy (S1) shouts: <d>[Japanese] 待って、まだ話は</d> <scenetrans> and the line continues seamlessly across the cut. [Shot 2] At 00:03.000, the shot cuts to ... while the boy (S1), now off-screen, finishes the same sentence <scenetrans> uninterrupted: <d>[Japanese] 終わってないだろ！</d>
```

连续性可用短语：`continues seamlessly across the cut` / `continues uninterrupted into the next shot` / `carries over from the previous shot` / `remains audible across the transition`。

**话被片尾截断**：用 `<cutoff>`。

**歌唱**同理：歌词放 `<d>[Language] ...</d>`，歌手带 `(Sx)`。角色能听到的音乐（收音机、现场演奏、手机外放）属于画内音，写在这里，不写在 `non_diegetic_music`。

### 3.5 屏幕文字

招牌、横幅、字幕、霓虹、Logo——凡是**画面里真实可见**的文字，用英文双引号 `"..."` 包起来，保留原文原标点，不翻译。每一条文字都单独写清楚，没写出来的文字大概率糊掉。

```text
A red neon sign reading "营业中" glows above the doorway.
The white serif text "NOIR AMBRE" fades in beneath the bottle and holds until the end.
```

区分：**引号 = 印在画面上的字，`<d>` = 角色说出来的话**。

## 4. `overall_soundscape` 怎么写

- 1–4 句英文，写成**一个连续段落**。
- 概括全片：环境音（雨、风、车流、室内底噪）、物理动作音（脚步、布料、碰撞、翻页）、非语言人声（呼吸、笑、喘、叹气）。
- 对白、歌唱、画内音乐已经在主体里写过，**不要重复**。
- 只有用户明确要求全片静音时才写 `N/A`。

```text
overall_soundscape: Steady rain taps against the café windows while low room ambience continues underneath. The entrance bell rings once, followed by wet footsteps and the soft scrape of a chair.
```

## 5. `non_diegetic_music` 怎么写

- 1–3 句英文。
- 只描述**乐器、速度、节奏、动态变化**（何时进、何时起、何时收）。
- **不用抽象情绪词**（sad / tense / epic / romantic……），不解释"这段音乐是为了烘托 XX"。
- 没有配乐写 `N/A`。

```text
non_diegetic_music: Sparse piano notes at a slow tempo, joined by sustained low strings that gradually increase in volume before fading out.
non_diegetic_music: N/A
```

## 6. 三种关键帧模式的主体写法

### I2VA：从图出发，向前发展

`<Picture 1>` 就是第 0.00 秒的真实首帧，属于 `[Shot 1]`。先锚定图里的风格、主体、构图、场景，再写接下来的动作。角色身份、服装、颜色、关键物体、空间关系必须保持一致。

推荐结构：**首帧锚点 → 动作起始 → 连续发展 → 结果或反应**

```text
[Shot 1] Live-action, cinematic, the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout. The camera trucks right with small amplitude at slow speed as she lifts her gaze ...
```

### FL2VA：写首帧到尾帧之间的路径

Picture 1 是开头，Picture 2 是结尾。**不要把两张图各自静态描述一遍**，要写连接它们的运动路径：主体怎么动、姿势怎么变、物体怎么被操作、构图怎么演变、光线怎么过渡。

一般用**单镜头**，让模型连续插值；只有用户明确要求时才多镜头。尾帧必须在最后一个 `[Shot N]` 的末尾到达。

推荐结构：**首帧状态 → 可观察的中间变化 → 差异逐渐收窄 → 尾帧状态**

### L2VA：倒推开场，最后落在图上

`<Picture 1>` 是视频的**最后一帧**，属于最后一个 `[Shot N]`，不属于 Shot 1。根据用户意图和尾帧倒推一个合理的先前状态，再写角色、物体、镜头、场景如何逐渐逼近参考图。

推荐结构：**合理前态 → 明确的动作与过渡路径 → 末镜逐渐收敛 → 尾帧落定**

## 7. 长度参考

官方没给基础模式的字数硬指标。官方案例里 5–8 秒的片，主体大约 90–130 个英文词。经验值：**每秒视频 12–20 个英文词**，对白密集时以把台词时间线写完整为准，而不是凑字数。整条提示词（含所有字段）不超过 7000 字符。

## 8. 交付前逐条自检

- [ ] 模式对了吗？对齐语句是第一行、格式逐字一致、`N` 和 `S.SS` 填对了？
- [ ] 三个字段齐全、顺序正确、字段名拼写正确？
- [ ] `[Shot 1]` 无时间戳；后续镜头 `At MM:SS.mmm,` 严格递增且小于总时长？
- [ ] 每个切镜都带来新信息？只是变距离的地方改成运镜了吗？
- [ ] 每个说话人首次出现有身份描述 + 稳定 `(Sx)`；`<d>` 里只有 `[语言]` + 原话？
- [ ] 画外音用了 `says in an off-screen voiceover` + 嘴唇闭合声明？
- [ ] 屏幕文字都用双引号逐条写出？
- [ ] `overall_soundscape` 没重复对白；`non_diegetic_music` 没有情绪词？
- [ ] 主体是英文，只有 `<d>` 内和引号内保留原语言？
- [ ] 跑一遍 `python tools/validate_prompt.py 你的文件.txt --duration 8`？
