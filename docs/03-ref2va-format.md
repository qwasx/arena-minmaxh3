# 03 · 全参考模式格式详解（Ref2VA 六段式）

> 对应官方 `references/official-ref-en.txt`。镜头、运镜、说话人、对白、普通声音的写法与基础模式共用（见 `02-base-format.md`），
> 本文只讲 Ref2VA 特有的：**标签体系、六个段落、任务类型、保留关系标记**。

## 0. 六段式骨架

```text
subject_definitions:
<Subject 1> is ...
<Picture 2> is ...
<Audio 1> is ...

summary:
[reference generation + audio reference] The target video shows ...

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - ...
<Audio 1>: reference - ...

detailed_description:
The target video is in a ... style with ... lighting.
[Shot 1] ...
[Shot 2] At 00:03.000, the shot cuts to ...

overall_soundscape:
...

non_diegetic_music:
N/A
```

六个段落名各占一行、后接英文冒号，**顺序固定**：`subject_definitions` → `summary` → `retention_analysis` → `detailed_description` → `overall_soundscape` → `non_diegetic_music`。
全部用英文写；只有 `<d>` 里的对白/歌词和画面里可见的文字保留原语言。

## 1. 四类标签

| 标签 | 代表什么 | 典型用法 |
| --- | --- | --- |
| `<Subject N>` | 从参考素材中**抽象出来、会在目标视频里复用**的可见内容：人、动物、物体、场景、服装、道具、界面、特效、风格、动作、姿势 | `<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace.` |
| `<Picture N>` | 参考图**本身**作为具体帧（首帧 / 关键帧 / 尾帧）或分镜规划锚点 | `<Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window.` |
| `<Video N>` | **整段视频级别**的关系：被编辑的源视频、续接起点、借用的运镜 / 剪辑 / 节奏结构 | `<Video 1> is the source video for the target video edit.` |
| `<Audio N>` | 被复制或被参考的音频信号：独立音频文件，或参考视频里被启用的同步音轨 | `<Audio 1> is the voice-timbre reference for <Subject 1> (S1).` |

几条最容易踩坑的规则：

1. **身份住在 `<Subject N>` 里，不住在独立的 `<Picture N>` 里。** 一张图如果只是用来定义角色 / 场景 / 服装 / 风格，就在 Subject 定义里引用它（`the woman in <Picture 1>`），**不要**再给它单独开一行 `<Picture 1> is ...`。只有当图片真的要当某个镜头的首帧 / 关键帧 / 尾帧 / 构图锚点时，才单独定义。
2. **一个 Subject 可以来自多个素材，一个素材也可以贡献多个 Subject。** "脸来自照片、动作来自视频"的官方写法：
   `<Subject 1> is the woman whose appearance comes from <Picture 1> and whose walking motion comes from <Video 1>.`
3. **视频里被复用的人 / 物 / 动作，仍然是 `<Subject N>`。** `<Video N>` 只标识素材或结构来源，不替代 Subject 标签。
4. `<Video N>` 和 `<Audio N>` **独立编号**。同一个参考视频可能同时是 `<Video 1>` 和 `<Audio 2>`；一个普通参考视频不会仅因为文件里有声音就自动产生 `<Audio N>`。
5. 标签编号对应**素材上传 / 连线顺序**（ComfyUI 里第一个连的图就是 `<Picture 1>`）。换顺序就是换请求。
6. 标签一旦分配，在六个段落里**含义保持一致**，不重新定义、不换号。
7. **每个标签都要真正被引用。** 定义了却没在 `detailed_description` / `retention_analysis` 里出现的标签是浪费；在后面段落里冒出一个 `subject_definitions` 没定义过的标签是错误。

## 2. `subject_definitions`

每个后面需要单独追踪的参考内容占一行：说明这个标签指什么、参考角色是什么、要跟随的主要特征是什么；来源需要明确时写出对应素材。

社区实测的重要补充：**把区分性细节按位置、尺寸正着写出来**——痣、雀斑、疤、纹身、耳环、瞳色、刘海形状、指甲颜色。参考图进模型是 vision token，这些小而低对比的特征最先被"平均掉"；没写出来的东西模型没有义务注意到，这就是"看着像但总觉得不是她"的常见来源。

```text
<Subject 1> is the woman whose appearance comes from <Picture 1> and <Picture 2>: a small dark mole just below the outer corner of her left eye, straight black hair cut bluntly at the collarbone with a fringe trimmed to the eyebrows, thin gold hoop earrings, and short unpainted nails.
```

- 位置要锚在身体地标上并说清左右（"左眼外眼角下方"，而不是"眼睛下面"）。
- 用可核对的量词（"到锁骨"），别用相对词（"长发"）。
- 3–8 条具体特征胜过一段形容词。
- 同一个 Subject 的措辞在 `retention_analysis` 里**原样复述**，在多次生成之间也保持原样——改写描述是身份漂移的常见原因。

## 3. `summary`

一段简短英文，开头是方括号里的**任务类型前缀**，然后用已定义的标签概括目标视频、主要镜头流程和各参考素材的角色。**不能在这里引入新标签。**

| 任务类型 | 什么时候用 |
| --- | --- |
| `keyframe completion` | 有图片作为目标视频的首帧 / 关键帧 / 尾帧 / 编辑后关键帧等具体帧锚点 |
| `reference generation` | 图 / 视频 / 音频只提供生成指导（角色、场景、风格、动作、运镜、分镜），不当具体帧，也不是被编辑或续接的源视频 |
| `video editing` | 直接修改一段已有源视频（编辑图片、在静态关键帧之间生成都**不算**） |
| `video continuation` | 从已有源视频的末尾继续 / 延长 / 过渡 |
| `audio reuse` | 同一段音频信号被全部或部分**复用** |
| `audio reference` | 不直接复制信号，只参考音乐风格 / 音色 / 对白歌词内容 / 音效质感 / 节拍 / 连续性 |

- 多种关系用 ` + ` 组合，不重复：`[video continuation + keyframe completion]`、`[video editing + audio reuse]`。
- 视频、音频**存在**不等于自动产生对应任务类型：参考视频只提供运镜 / 剪辑 / 节奏 → 属于 `reference generation`。
- 编辑源视频且保留原声 → 加 `audio reuse`；续接源视频但只延续其声音特征 → 加 `audio reference`。
- 视频编辑任务的 summary 前缀之后固定以这句开头：`The target video is an edited version of <Video 1>.`

```text
summary:
[reference generation + audio reference] The target video shows <Subject 3> eating a cookie in <Subject 1>. <Subject 4> enters with <Subject 2>, which lunges toward the cookie. The three-shot exchange uses <Audio 1> as the voice-timbre reference for <Subject 3> and ends with a canned audience laugh.
```

## 4. `retention_analysis`

每个标签一行，说明它在目标视频里被如何保留 / 转移 / 复制 / 参考。标记是**固定英文值**。

### 4.1 可见内容（Subject / Picture / Video）

| 标记 | 含义 |
| --- | --- |
| `fully_preserved` | 定义的参考角色被完整保留 |
| `partially_preserved` | 仍在使用，但部分已定义特征被修改或只保留一部分 |
| `attribute_transfer` | 参考特征被转移到另一个可识别的目标主体上 |
| `weak_reference` | 只保留风格 / 类别 / 构图 / 氛围上的大致相似 |

```text
<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - the mole below the left eye, blunt collarbone-length black hair, the eyebrow-length fringe, and the thin gold hoops are retained.
<Picture 2> ([Shot 1] first frame): fully_preserved - the shot begins exactly from this composition, lighting, and pose.
<Video 1> (cut and pacing structure): weak_reference - only the four-cut rhythm and the handheld push-in are followed; none of its people, wardrobe, or location appear.
```

### 4.2 音频（Audio）

| 标记 | 含义 |
| --- | --- |
| `fully_copy` | 完整源音频作为目标视频的完整最终音轨 |
| `partially_copy` | 只复制部分时间段或部分音轨层，或复制后另有增删替换 |
| `reference` | 不直接复制信号，只参考音色 / 节奏 / 音乐风格 / 对白内容 / 声音质感 |
| `weak_reference` | 只保留类别或氛围上的大致相似 |

```text
<Audio 1>: fully_copy - <Audio 1> is reused 1:1 as the target video's complete final audio track.
<Audio 2>: reference - the target speaker follows <Audio 2>'s voice timbre and measured delivery without copying the original signal.
```

**社区实测（ComfyUI 官方文档引用）：想让角色对口型唱参考音频里的歌，必须标 `fully_copy`；不写或写成 `reference`，模型只当音色参考，口型会和歌词对不上。**

其他规则：
- 只在 `subject_definitions` 已经定义的参考角色范围内选标记；目标视频里新增的动作、背景、剧情**不算**参考保真度的损失。
- **`retention_analysis` 里不写 `(Sx)`。**
- 一个标签只在有独立角色时才有一行；仅在 Subject 定义里被引用的来源图片不单独列。

## 5. `detailed_description`

Ref2VA 的主体，写法与 `integrated_multimodal_description` 相同，差异如下：

| 维度 | 基础模式 | Ref2VA |
| --- | --- | --- |
| 字段名 | `integrated_multimodal_description` | `detailed_description` |
| 风格开场 | 写在 `[Shot 1]` 之后 | **在 `[Shot 1]` 之前**用一两句英文先立风格 |
| 参考信息 | 无标签 | 在标签**首次出现处**和其作用处插入 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>` |
| 音频关系 | 描述视频自己的声音 | 在对应镜头 / 音频阶段引用 `<Audio N>`，说明是复制还是参考 |
| 长度 | 无硬指标 | 生成类任务通常 **350–500 英文词**；对白密集以写完整台词时间线为准；视频编辑类随源视频复杂度浮动 |

```text
detailed_description:
The target video uses a realistic multi-camera sitcom style with warm indoor lighting.
[Shot 1] A medium shot establishes <Subject 1>, the coffee shop with its exposed brick wall ... <Subject 3> (S1), the young woman with long blonde hair ..., sits on the sofa holding a chocolate-chip cookie. ...
[Shot 2] At 00:03.000, the shot cuts to a close-up of <Subject 4> (S2) ...
```

- 重要 Subject 首次清晰出现时，在该镜头实际可见的范围内描述其参考特征、画面位置和当前动作；之后直接用标签，不重新定义。
- 具体帧锚点的自然写法：`the shot begins from <Picture 1>` / `the shot's keyframe corresponds to <Picture 2>` / `the shot ends on <Picture 3>`。
- 单镜头不等于可以写短；按信息量分配细节。

### 说话人与音频源

- 参考主体说话时，视觉标签和说话人 ID 都保留：`<Subject 2> (S1) turns toward the woman and says, <d>[English] ...</d>`。同一主体画外说话，形式相同并注明 `off-screen`。
- 说话人不对应任何已定义 Subject 时，用稳定的声音描述 + `(Sx)`。
- `(Sx)` 按目标视频里**实际出声事件的顺序**分配一次，之后每次出声都复用。`subject_definitions` 里绑定到说话人的 `<Audio N>` 也复用同一个 ID，**不独立编号**。
- 如果人声只是被直接复用的 BGM / 完整音轨里的一部分，没有任何具体的人 / 角色 / 旁白在"物理上"发出它，就以 `<Audio N>` 为声源，**不要**再造一个 `(Sx)`：
  `When <Audio 1> reaches the phrase <d>[English] I'm lonely lonely lonely</d>, <Subject 1> performs the corresponding hand gesture without becoming a separate speaker source.`
- 直接复用参考音频里的对白 / 旁白 / 歌词，或用户明确要求重新演绎时：`<d>` 里保留原词原语言；听不清的段落写 `[unclear]`，不要猜；标点规范为基本书面标点（`,` `.` `?` `!`），去掉重复波浪号、emoji、装饰性标点；完整句以 `.` `?` `!` 结尾再 `</d>`。
- 只参考音色 / 节奏 / 情绪 / 表达方式时，**不要**把参考音频里的原话搬进目标视频。

## 6. `overall_soundscape` 与 `non_diegetic_music`

定义同基础模式。用到参考音频时，只在**对应的可听层**说明复制 / 参考关系：环境音与音效归 `overall_soundscape`，观众才能听到的配乐归 `non_diegetic_music`；同一段音频两者都提供时，各写各的。

```text
overall_soundscape:
The copied ambience layer from <Audio 1> continues throughout the target video.

non_diegetic_music:
<Audio 2> is directly reused as the complete audience-only score.
```

完整对白和歌词只写在 `detailed_description` 的 `<d>` 里，这两段不重复。

## 7. 常见组合怎么标

| 需求 | summary 前缀 | 标签与标记要点 |
| --- | --- | --- |
| 参考图锁角色，拍新场景 | `[reference generation]` | 角色 → `<Subject 1>`（引用 `<Picture 1..3>`），`fully_preserved` |
| 参考图当首帧 + 参考视频给运镜 | `[keyframe completion + reference generation]` | `<Picture 1>` 单独定义为 `[Shot 1]` 首帧；`<Video 1> (camera movement)`: `weak_reference` |
| 给角色对口型唱参考歌曲 | `[reference generation + audio reuse]` | `<Audio 1>`: `fully_copy`；歌词 `<d>` 写在 detailed_description，歌手 `<Subject 1> (S1)` |
| 用参考音色说新台词 | `[reference generation + audio reference]` | `<Audio 1> is the voice-timbre reference for <Subject 1> (S1).`；`reference` |
| 改源视频背景、保留原声 | `[video editing + audio reuse]` | summary 开头 `The target video is an edited version of <Video 1>.`；`<Audio 1>`: `fully_copy` |
| 续拍源视频后 5 秒 | `[video continuation + audio reference]` | `<Video 1> is the source video that the target video continues from.` |

## 8. 关于本地推理的一个提醒（社区实测）

本地 Ref2VA 推理时，采样总是从空 latent 开始，参考 latent 只作为条件注入，**源视频的帧不会原样"保留"到输出里**——`video editing` / `video continuation` 更像"以源视频为强参考重新生成"，期望值是高度相似而不是逐像素保留。官方 API 走 Context-IR + 完整流水线，行为可能不同。
