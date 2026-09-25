# MiniMax H3 提示词速查表（一页版）

## 模式与第一行

| 模式 | 第一行 |
| --- | --- |
| T2VA | （无）直接 `integrated_multimodal_description:` |
| I2VA | `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.` |
| FL2VA | `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.` |
| L2VA | `How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.` |
| Ref2VA | 六段式，无对齐语句 |

对齐语句后**空一行**再接字段。`N` = 最后一镜编号，`S.SS` = 总时长两位小数。

## 基础模式三字段

```text
integrated_multimodal_description: [Shot 1] <风格>, <景别> frames <主体+环境+动作+运镜+对白>. [Shot 2] At 00:03.500, the shot cuts to ...

overall_soundscape: <环境音 / 动作音 / 非语言人声，1–4 句>

non_diegetic_music: <乐器 + 速度 + 节奏 + 动态，1–3 句> 或 N/A
```

## Ref2VA 六段式

```text
subject_definitions:
<Subject 1> is ... in <Picture 1> ...
<Audio 1> is the voice-timbre reference for <Subject 1> (S1).

summary:
[reference generation + audio reference] ...

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - ...
<Audio 1>: reference - ...

detailed_description:
<一两句风格>
[Shot 1] ...
[Shot 2] At 00:04.000, the shot cuts to ...

overall_soundscape:
...

non_diegetic_music:
N/A
```

- 标签：`<Subject N>` 可复用的可见内容 · `<Picture N>` 具体帧锚点 · `<Video N>` 整段视频关系 · `<Audio N>` 音频信号
- 任务类型：`keyframe completion` `reference generation` `video editing` `video continuation` `audio reuse` `audio reference`，用 ` + ` 组合
- 视觉标记：`fully_preserved` `partially_preserved` `attribute_transfer` `weak_reference`
- 音频标记：`fully_copy` `partially_copy` `reference` `weak_reference`（对口型复用 → `fully_copy`）
- `retention_analysis` 不写 `(Sx)`；`detailed_description` 350–500 词

## 镜头与运镜

- `[Shot 1]` 不带时间戳；`[Shot N] At MM:SS.mmm,` 严格递增
- 切镜短语：`the camera cuts to` / `the shot cuts to` / `the shot transitions to` / `the shot changes to` / `the shot switches to`
- 运镜 = 类型 + `with small/large amplitude` + `at slow/fast speed`，写成自然句
- 类型：Zoom In/Out · Push In/Pull Out · Pan L/R · Truck L/R · Tilt Up/Down · Pedestal Up/Down · Arc Shot · Tracking Shot · Static Shot · Shake Slightly/Strongly · POV · Roll CW/CCW
- 风格词：Cinematic · live-action · 2D-animated · 3D CG · claymation · watercolor · vintage film

## 对白与文字

```text
<声音画像> (S1) says: <d>[Chinese] 原话。</d>
(S1) says in an off-screen voiceover: <d>[English] ...</d> while his lips remain completely closed.
<d>[Japanese] 前半句</d> <scenetrans> ... continues seamlessly across the cut ... <scenetrans> <d>[Japanese] 后半句</d>
被片尾截断 → <cutoff>
屏幕文字 → "营业中"（双引号、原文、逐条）
```

- `(S1)` 按首次出声顺序编号，跨镜不变；不出声不编号；齐声 `(S1,S2)`
- `<d>` 内只有 `[语言]` + 原话；身份 / 动作 / 语气在外面

## 时长

- API：4–15 整数秒。ComfyUI：17k+5 帧 → 124=5.17s · 158=6.58s · 192=8.00s · 243=10.13s · 362=15.08s
- 中文 ~4 字/秒，英文 ~2.5 词/秒；每个镜头 ≥ 1 秒；结尾留 1 秒沉淀
- 主体约 12–20 词 / 秒；总长 ≤ 7000 字符

## 十条铁律

1. 全英文，只有 `<d>` 内和引号内保留原语言
2. 没有负面提示词，正着写
3. 一个切镜一个新信息，改距离用运镜
4. 光源只在 Shot 1 定义一次
5. 站位左右钉死
6. 屏幕文字逐条双引号
7. 配乐不写情绪词
8. 环境音不重复对白
9. 锁脸用 Ref2VA，别靠文字
10. 先 5 秒试跑，再拉长
