# 01 · 先搞懂 H3：它是什么、提示词为什么长这样

> 本文整理自 MiniMax 官方 GitHub / Hugging Face / 开放平台文档、ComfyUI 官方教程，以及社区实测经验。
> 凡是"社区经验"都会明确标注，官方没写的东西不当官方结论。

## 1. MiniMax H3 是什么

MiniMax H3 是 MiniMax 于 2026 年 8 月开源的**全模态视频生成系统**：统一理解文本、图片、视频、音频组成的多模态上下文，
一次生成**带原生立体声音频的视频**——对白、音效、配乐和画面在同一次前向里联合生成，不是后期贴上去的。

| 项目 | 规格 |
| --- | --- |
| 输出时长 | 4–15 秒（开放平台 API 只接受整数秒） |
| 输出宽高比 | 21:9、16:9、4:3、1:1、3:4、9:16 等 |
| 输出分辨率 | 默认短边 768 px；通过 H3-Regenerate-2K 可得 2K |
| 帧率 | 24 FPS |
| 音频 | 32 kHz 立体声 |
| 稳定支持的对白语言 | 中、英、日、韩、法、德、意、葡、俄、西、阿拉伯语（11 种），其他语言有一定支持 |
| 提示词长度上限 | 7000 字符（开放平台 API 限制） |

## 2. 三个模块，决定了提示词的"长相"

完整 H3 系统由三部分组成：

```
用户的自由输入（中文一句话 / 图 / 视频 / 音频）
        │
        ▼
  H3-Context-IR   ← 托管的"理解 + 改写"系统：把多模态意图翻译成结构化中间表示（未开源，有 API）
        │
        ▼  结构化提示词（就是本仓库教你写的这种格式）
  H3-Base         ← 开源权重，真正吃提示词生成 768p 音视频
        │
        ▼
  H3-Regenerate-2K ← 把 768p 结果 + 原始上下文送回去重生成 2K（未开源，有 API）
```

关键结论：

1. **H3-Base 真正消费的是 Context-IR 输出的结构化格式**，即 `integrated_multimodal_description / overall_soundscape / non_diegetic_music` 三字段（或 Ref2VA 的六段式）。官方脚本 `scripts/readme/full-2k-*-h3-base.sh` 就是把 `h3_context_ir` 接口返回的 `content.prompt` 原样塞进本地 H3-Base 的 `prompt` 字段。
2. 所以：**本地部署 / ComfyUI 跑 H3，没有 Context-IR 帮你改写，你写的提示词就直接进模型**，必须自己写成结构化格式，否则效果打折。
3. 走海螺 App / MiniMax Hub / 开放平台 API 时，Context-IR 会自动介入，中文一句话也能出片。但如果你想精确控制分镜、对白、时间点，直接按结构化格式写，改写环节的"自由发挥"就最少（这条是经验判断，不是官方保证）。开放平台还提供 `POST /v2/h3_context_ir` 接口，只返回增强后的提示词不生成视频——可以先拿它的输出当草稿，再手改。

## 3. 五种模式

| 模式 | 输入 | 一句话 | 用哪个权重 |
| --- | --- | --- | --- |
| **T2VA** | 纯文本 | 从零构建完整视听时间线 | FL2VA 权重 |
| **I2VA** | 首帧图 + 文本 | 这张图就是第 0.00 秒，从它往后发展 | FL2VA 权重 |
| **FL2VA** | 首帧 + 尾帧 + 文本 | 描述从首帧到尾帧的连续路径 | FL2VA 权重 |
| **L2VA** | 尾帧图 + 文本 | 倒推一个合理开场，最后收敛到这张图 | FL2VA 权重 |
| **Ref2VA** | ≤9 图 / ≤3 视频 / ≤3 音频 + 文本 | 参考角色、场景、动作、运镜、音色、剪辑节奏；也覆盖视频编辑与续接 | Ref2VA 权重 |

选模式的心法（社区总结，很好用）：

- 价值在**这张图本身**（构图、光线、质感）→ 首/尾帧模式，它是"让这帧动起来"。
- 价值在**图里的人/物**（要它出现在新场景、新机位）→ Ref2VA，它是"选角后重新拍"。
- 想从正面照片要一个背影镜头，硬走 I2VA 会让模型在转身过程中"编"身体，身份最容易崩；这类需求应该走 Ref2VA。

### Ref2VA 输入限制（开放平台）

| 输入 | 限制 |
| --- | --- |
| 图片 | ≤ 9 张，宽高 [256, 5760]，JPG/PNG/WEBP/HEIC/HEIF |
| 视频 | ≤ 3 段，单段 2–15 秒，总时长 ≤ 15 秒，H.264/H.265 |
| 音频 | ≤ 3 段，单段 2–15 秒，总时长 ≤ 15 秒，WAV/MP3；**音频不能单独作为参考，必须搭配图片或视频** |
| 混合 | 所有文件总数 ≤ 12 |

## 4. 不同渠道怎么喂提示词

### 海螺 App / MiniMax Hub
直接粘贴。中文自然语言可以，结构化英文提示词也可以。参考素材按上传顺序对应 `<Picture 1>`、`<Video 1>`、`<Audio 1>`。

### 开放平台 API（`POST /v2/video_generation`）
`content[]` 数组里 `type=text` 放提示词，图片用 `role=first_frame / last_frame / reference_image`，视频 `role=reference_video`，音频 `role=reference_audio`。
文生视频必须指定 `ratio` 且不能是 `adaptive`；图生视频比例由图片决定。`duration` 是 4–15 的整数。

### ComfyUI 本地（官方原生节点）
- T2V / I2V 用 `MiniMaxH3ImageToVideo` 节点（fl2va 权重），R2V 用 `MiniMaxH3ReferenceToVideo` 节点（ref2va 权重）。
- 参考素材**按连接顺序**编号：第 1 张图就是 `<Picture 1>`，第 1 段视频就是 `<Video 1>`。提示词里的标签必须和连线顺序一致。
- 原生画幅：短边 768，16:9 就是 1344×768，分辨率取 32 的倍数。
- **时长按 17k+5 帧网格取整**（24 fps）：

| 帧数 | 秒 | 帧数 | 秒 | 帧数 | 秒 |
| --- | --- | --- | --- | --- | --- |
| 90 | 3.75 | 192 | 8.00 | 294 | 12.25 |
| 107 | 4.46 | 209 | 8.71 | 311 | 12.96 |
| 124 | 5.17 | 226 | 9.42 | 328 | 13.67 |
| 141 | 5.88 | 243 | 10.13 | 345 | 14.38 |
| 158 | 6.58 | 260 | 10.83 | 362 | 15.08 |
| 175 | 7.29 | 277 | 11.54 | | |

  写提示词时的分镜时间点要对得上你实际设置的帧数（例如设 124 帧就是 5.17 秒，别把最后一镜写到 6 秒）。
- 默认 20 步；官方提示 25 步运动质量更好。Turbo LoRA 更快但音频/运动质量略降。
- 支持 `embedding:xxx` 语法加载社区风格 embedding（非官方）。

## 5. 一些会影响你写法的模型事实

- **H3 是 CFG 蒸馏的模型**（官方 README 明确说明发布的是 CFG-distilled 权重）。社区实测的推论：**没有负面提示词这回事**，"no watermark / no extra fingers" 这类否定句基本无效，想要什么就正着写清楚。
- **参考视频比目标时长长时会被截断到目标时长**（社区实测）：对着 15 秒的参考视频要 5 秒的片，模型只看得到前 5 秒。
- **时长会被字面理解成事件速度**（社区实测）：一个 3 秒的动作硬塞进 10 秒的片，得到的不是"留白"而是慢动作。先按真实世界时间给每个动作预算，再定总时长。
- `<d>` / `</d>` 在 tokenizer 里是特殊 token；`<scenetrans>`、`<cutoff>` 按官方文档原样书写即可。
- 屏幕上要出现的文字（招牌、字幕、Logo）**逐条用英文双引号写出**，没有被明确写出的文字容易糊成乱码（ComfyUI 官方文档引用的社区实测）。

## 6. 参考资料

- 官方 GitHub：<https://github.com/MiniMax-AI/MiniMax-H3>（`skills/h3-prompt-writing/references/` 下是两份提示词规范，本仓库已原样收录）
- Hugging Face：<https://huggingface.co/MiniMaxAI/MiniMax-H3>（`docs/VIDEO_PROMPT_WRITING_GUIDE_*.md` 与上面同源）
- 开放平台文档（视频生成）：<https://platform.minimaxi.com/docs/guides/video-generation>
- 开放平台文档（Context-IR 接口）：<https://platform.minimaxi.com/docs/api-reference/video-generation-v2-h3-context-ir>
- ComfyUI 官方教程：<https://docs.comfy.org/tutorials/video/minimax/minimax-h3>（含 prompt guide 页）
- 社区 skill（导演思维融合版，中文）：<https://github.com/r600a-code/minimax-h3-prompt-skill>
- 社区 skill（本地 ComfyUI 实测经验，英文）：<https://github.com/teskor-hub/minimax-h3-skill>
