---
name: h3-prompt-writing-zh
description: 为 MiniMax H3 视频生成模型编写结构化提示词（T2VA / I2VA / FL2VA / L2VA / Ref2VA）。当用户要"写 H3 提示词"、"给海螺 / MiniMax Hub / ComfyUI 的 H3 写 prompt"、"把这个需求改成 H3 能用的格式"、或需要 integrated_multimodal_description / overall_soundscape / non_diegetic_music 三字段、Ref2VA 六段式、关键帧对齐语句、<Subject N>/<Picture N>/<Video N>/<Audio N> 标签时使用。中文交互，英文输出。
compatibility: 纯 Markdown + 本地参考文件，不调用外部 API。可用于 Claude Code、Cursor、Windsurf、Codex、以及任何能读取 SKILL.md 和本地文件的智能体。
---

# MiniMax H3 提示词编写（中文版）

## 工作流

1. **判定模式**：无素材 → T2VA；一张图当起始帧 → I2VA；首尾两张图 → FL2VA；一张图当结尾帧 → L2VA；素材作为参考（锁角色 / 借动作或运镜 / 用音色或对口型 / 编辑或续接视频）→ Ref2VA。用户给了一张人物图但没说用途时，先问"从这张图开始，还是让图里的人出现在新画面"。
2. **确认时长与比例**：4–15 秒整数（API）；ComfyUI 按 17k+5 帧网格（124 帧 = 5.17 s）。按真实耗时给动作预算。
3. **读规范**：
   - 基础模式读 `references/official-base-en.txt`（官方原文），按其"Final Prompt Structure"输出。
   - Ref2VA 读 `references/official-ref-en.txt`（官方原文），按六段式输出。
   - 快速回忆格式看 `references/cheatsheet-zh.md`。
4. **先导演后写作**：高概念 → 情绪弧线 → 镜头表（每镜一件事，切镜带新信息）→ 光源与站位在 Shot 1 钉死 → 声音先环境再动作再配乐。
5. **写作并自检**：字段名、对齐语句、`[Shot N] At MM:SS.mmm,`、`<d>[Language] ...</d>`、`(Sx)`、`<scenetrans>`、`<cutoff>`、屏幕文字引号、Ref2VA 标签 / 任务类型 / 保留标记逐字遵守官方写法。
6. **可选校验**：仓库内 `python tools/validate_prompt.py 文件 --duration N`。

## 输出规则

- 一个代码块输出**完整**提示词（从第一行到最后一个字段），之后 ≤ 5 行中文备注（模式 / 时长 / 比例 / 素材编号对应 / 关键假设）。
- 描述全英文；只有 `<d>` 内台词歌词与 `"..."` 内屏幕文字保留原语言，逐字不翻译。
- 没有负面提示：正着写想要的。
- 不用抽象词（beautiful / cinematic masterpiece），写可见可听的具体细节。
- 时间线总长必须等于请求的时长；Ref2VA 标签在所有段落保持一致；关键帧模式明确写出首 / 尾帧如何接入时间线。

## 格式骨架速记

基础模式：
```
<对齐语句，T2VA 无>

integrated_multimodal_description: [Shot 1] <风格>, ... [Shot 2] At 00:03.500, the shot cuts to ...

overall_soundscape: ...

non_diegetic_music: ... | N/A
```

Ref2VA：`subject_definitions:` → `summary:`（`[任务类型 + ...]` 前缀）→ `retention_analysis:`（固定标记）→ `detailed_description:`（风格句 + `[Shot N]`）→ `overall_soundscape:` → `non_diegetic_music:`

对齐语句（逐字）：
- I2VA：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
- FL2VA：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`
- L2VA：`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`

## 高频错误

`<d>` 里混入说话人 / 动作 · 画外音缺嘴唇闭合声明 · Shot 1 带时间戳 · 时间戳超出时长 · FL2VA 对齐语句多加了尖括号 · 配乐写情绪词 · soundscape 重复对白 · Ref2VA 用了未定义标签 · 身份放在独立 `<Picture N>` 而不是 `<Subject N>` · 对口型音频没标 `fully_copy` · `retention_analysis` 写了 `(Sx)`。
