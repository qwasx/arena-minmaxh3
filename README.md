# arena-minmaxh3 · MiniMax H3 提示词工具包

给 **MiniMax H3**（2026 年 8 月开源的全模态视频生成模型，视频 + 立体声音频一次生成，4–15 秒，最高 2K）写提示词的一整套中文资料：
官方规范的中文解读、五种模式的模板、可直接粘贴的案例、给任意 LLM 用的"提示词改写器"系统提示词、一个格式校验脚本，以及可安装的 Agent Skill。

> H3 的提示词不是一段自由描述，而是有**固定字段结构**的英文文本——本地部署 / ComfyUI 直接吃这个格式，官方 App / API 也是先把你的话改写成这个格式再生成。
> 所有格式规则以官方 `MiniMax-AI/MiniMax-H3` 仓库的 `h3-prompt-writing` 规范为准（已原样收录在 `skills/h3-prompt-writing-zh/references/`），本仓库的中文内容是解读 + 经验补充。

## 30 秒看懂 H3 提示词长什么样

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, a macro close-up frames a faceted amber glass perfume bottle standing on black polished marble, lit by a single warm key light from the upper left. The camera arcs right with small amplitude at slow speed around the bottle while fine golden dust drifts through the beam of light. [Shot 2] At 00:03.500, the shot cuts to an overhead medium shot as a single drop of amber liquid falls into a shallow black basin beside the bottle and sends out slow concentric ripples. [Shot 3] At 00:06.000, the shot cuts to a static, centered wide shot of the bottle against pure black, and the white serif text "NOIR AMBRE" fades in beneath the bottle and holds until the end.

overall_soundscape: A near-silent studio room tone sits under the whole video. The falling drop lands with a single soft, rounded plink, followed by the faint ripple of liquid settling.

non_diegetic_music: A single sustained low cello note at a very slow tempo, joined by a sparse three-note piano motif that repeats twice and decays into silence before the final frame.
```

三个字段：**画面 + 动作 + 镜头 + 对白**沿时间线写 → **环境音 / 动作音** → **配乐**。有首帧 / 尾帧时前面多一行固定的对齐语句；全参考模式（Ref2VA）换成六段式。

## 三种用法

### 1. 自己写

1. 读 `docs/02-base-format.md`（基础模式）或 `docs/03-ref2va-format.md`（全参考模式），十分钟。
2. 从 `templates/` 复制对应模式的骨架，或直接改 `examples/` 里最接近的案例。
3. 写完跑校验：`python tools/validate_prompt.py 你的文件.txt --duration 8`
4. 先 5 秒试跑，方向对了再拉长。

### 2. 让 LLM 帮你写

把 `SYSTEM_PROMPT.md` 分割线之后的内容粘进 Claude / GPT / Gemini / Kimi / DeepSeek 等任意模型的 system prompt，然后用中文说需求：

> 有三张我朋友的照片，想让她出现在夜市摊位前用普通话点一份水饺，10 秒，横屏。

它会先确认模式和素材分工，再输出一个可直接粘贴的完整提示词 + 几行中文备注。

### 3. 装成 Agent Skill（Claude Code / Cursor / Codex 等）

```bash
npx skills add https://github.com/qwasx/arena-minmaxh3 --skill h3-prompt-writing-zh
# 或手动复制 skills/h3-prompt-writing-zh/ 到 .claude/skills/ 、.agents/skills/ 等目录
```

技能自带官方英文规范原文 + 中文速查表，不依赖外部 API。

## 目录

```
.
├── README.md                     ← 你在这
├── SYSTEM_PROMPT.md              ← 给任意 LLM 用的「H3 提示词改写器」，自包含
├── docs/
│   ├── 01-h3-basics.md           ← H3 是什么、三大模块、五种模式、App/API/ComfyUI 差异、帧数网格
│   ├── 02-base-format.md         ← 三字段 + 对齐语句 + 运镜表 + 对白标签 + 屏幕文字（T2VA/I2VA/FL2VA/L2VA）
│   ├── 03-ref2va-format.md       ← 六段式 + 四类标签 + 任务类型 + 保留标记 + 常见组合
│   ├── 04-director-playbook.md   ← 导演层：时长预算、景别、运镜动机、轴线、连续性、声音设计
│   ├── 05-pitfalls-checklist.md  ← 常见坑对照表 + 交付前自检清单
│   └── cheatsheet.md             ← 一页速查
├── templates/                    ← 五种模式的填空骨架（t2va / i2va / fl2va / l2va / ref2va）
├── examples/                     ← 11 条完整案例，文件名带时长，全部通过 --strict 校验
│   ├── t2va/  i2va/  fl2va/  l2va/  ref2va/
│   └── README.md                 ← 案例索引：每条演示了什么
├── skills/h3-prompt-writing-zh/  ← 可安装的 Agent Skill
│   ├── SKILL.md
│   ├── agents/openai.yaml
│   └── references/               ← 官方 base-en.txt / ref-en.txt 原文 + 中文速查 + 来源说明
├── tools/
│   ├── validate_prompt.py        ← 零依赖格式校验器（错误码见 tools/README.md）
│   └── README.md
└── tests/test_validate.py        ← 校验器自测（python -m unittest discover -s tests）
```

## 五种模式一眼看

| 模式 | 输入 | 第一行 | 主体写法 |
| --- | --- | --- | --- |
| T2VA | 纯文本 | 无 | 从零构建时间线 |
| I2VA | 首帧图 | `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.` | 首帧锚点 → 动作起 → 发展 → 结果 |
| FL2VA | 首帧 + 尾帧 | `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark ...; Picture 2 (from Shot N) aligns with the S.SS-second mark ...` | 写 A→B 的路径，单镜头优先 |
| L2VA | 尾帧图 | `How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark ...` | 倒推开场 → 收敛到尾帧 |
| Ref2VA | ≤9 图 / ≤3 视频 / ≤3 音频 | 无，六段式 | `<Subject N>` 锁身份，`retention_analysis` 标保留关系 |

选模式的心法：价值在**图本身**（构图光线）→ 首/尾帧模式；价值在**图里的人 / 物**（换场景换机位）→ Ref2VA。

## 十条铁律

1. 描述全英文，只有 `<d>` 内台词和 `"..."` 内屏幕文字保留原语言
2. 没有负面提示词（CFG 蒸馏模型），正着写
3. 一个切镜一个新信息，只改距离用运镜
4. 光源只在 Shot 1 定义一次
5. 两人同框左右站位钉死
6. 屏幕文字逐条双引号，否则糊
7. 配乐只写乐器 / 速度 / 节奏 / 动态，不写情绪词
8. 环境音不重复对白
9. 锁脸用 Ref2VA + 多角度参考图，别靠文字
10. 先 5 秒试跑，再拉长

## 来源与致谢

- 官方仓库 [MiniMax-AI/MiniMax-H3](https://github.com/MiniMax-AI/MiniMax-H3)（格式规范唯一权威来源）· [Hugging Face](https://huggingface.co/MiniMaxAI/MiniMax-H3) · [开放平台文档](https://platform.minimaxi.com/docs/guides/video-generation)
- [ComfyUI 官方 H3 教程](https://docs.comfy.org/tutorials/video/minimax/minimax-h3)（帧数网格、屏幕文字与 `fully_copy` 的社区实测）
- 社区 skill：[r600a-code/minimax-h3-prompt-skill](https://github.com/r600a-code/minimax-h3-prompt-skill)（导演思维框架）、[teskor-hub/minimax-h3-skill](https://github.com/teskor-hub/minimax-h3-skill)（本地推理经验：无负面提示、时长即速度、区分性细节写法）

标注为"社区经验"的内容均未经官方确认，以实测为准。案例中的品牌、台词、歌词均为虚构。
