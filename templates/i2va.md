# 模板 · I2VA（首帧生视频）

适用：一张图作为视频的**第 0.00 秒**，从它往后发展。图片决定风格、构图、光线，文字负责"接下来发生什么"。

> 如果你要的是"图里的人物出现在新场景 / 新机位"，那不是 I2VA，去用 Ref2VA（`templates/ref2va.md`）。

## 骨架

第一行**逐字照抄**，然后空一行。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] {{从图推导的风格词}}, the {{主体}} shown in <Picture 1> remains {{图中位置/姿势}}, preserving {{外貌、服装、关键物体、空间布局}}. {{动作起始：从图中姿势自然开始的第一个动作}}. The camera {{运镜}} with {{small|large}} amplitude at {{slow|fast}} speed {{目的}}. {{连续发展}}. {{声音画像}} (S1) says: <d>[{{Language}}] {{台词}}</d> {{结果或反应}}. [Shot 2] At 00:{{SS.mmm}}, the shot cuts to {{可选的第二镜，带新信息}}.

overall_soundscape: {{与图中环境一致的底噪}}. {{动作音}}.

non_diegetic_music: {{乐器 + 速度 + 动态}} 或 N/A
```

## 写法结构

**首帧锚点 → 动作起始 → 连续发展 → 结果或反应**

1. 先用一句话锚定图里已有的东西（`the young woman shown in <Picture 1> remains beside the rain-covered window, preserving her appearance, clothing, seat position, and the carriage layout`）。
2. 动作从图中姿势自然起始，别让第一秒就发生大跳变。
3. 风格、光线、色调**从图里推**，文字别和图打架。
4. 单镜头最稳；需要切镜时确保 Shot 2 仍是同一空间、同一光线。

完整案例见 `examples/i2va/`。
