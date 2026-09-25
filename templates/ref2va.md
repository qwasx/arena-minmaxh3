# 模板 · Ref2VA（全参考生视频）

适用：用参考图 / 视频 / 音频锁定角色、场景、风格、动作、运镜、音色、剪辑节奏；也覆盖视频编辑与续接。
输入上限：≤ 9 图、≤ 3 视频、≤ 3 音频（音频必须搭配图或视频），文件总数 ≤ 12。

## 骨架（六段式，顺序固定）

```text
subject_definitions:
<Subject 1> is the {{人/物/场景}} whose appearance comes from <Picture 1> and <Picture 2>: {{3–8 条可核对的区分性细节，含位置与左右}}.
<Subject 2> is the {{环境/服装/风格/动作}} in <Picture 3>, featuring {{关键特征}}.
<Picture 4> is the first frame of [Shot 1], showing {{构图}}.  ← 只有图片真的当具体帧时才单独定义，否则删掉
<Video 1> is the {{source video for the target video edit | camera-movement and pacing reference}}.  ← 没有视频就删掉
<Audio 1> is the {{voice-timbre reference for <Subject 1> (S1) | complete soundtrack reused in the target video}}.  ← 没有音频就删掉

summary:
[{{任务类型，用 + 组合}}] The target video shows <Subject 1> {{做什么}} in <Subject 2>. {{镜头流程一句话}}. {{每个参考素材的角色一句话}}.

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - {{原样复述 subject_definitions 里的细节}} are retained.
<Subject 2> (appears in [Shot 1]): {{fully_preserved|partially_preserved|attribute_transfer|weak_reference}} - {{说明}}.
<Picture 4> ([Shot 1] first frame): fully_preserved - {{说明}}.
<Video 1> ({{camera movement and pacing}}): weak_reference - {{只跟随什么，不出现什么}}.
<Audio 1>: {{fully_copy|partially_copy|reference|weak_reference}} - {{说明}}.

detailed_description:
The target video is in a {{风格}} style with {{光线}} and {{色调}}.
[Shot 1] {{景别}} establishes <Subject 2>, {{环境细节}}. <Subject 1> (S1), {{首次出现时复述其参考特征 + 画面位置 + 当前动作}}. The camera {{运镜}} with {{small|large}} amplitude at {{slow|fast}} speed {{目的}}. <Subject 1> (S1) says in a {{声音画像，如引用 <Audio 1> 音色}}: <d>[{{Language}}] {{台词}}</d> {{反应}}.
[Shot 2] At 00:{{SS.mmm}}, the shot cuts to {{新景别 + 新信息}}. {{动作/运镜/声音}}.
[Shot 3] At 00:{{SS.mmm}}, the shot cuts to {{收尾}}.

overall_soundscape:
{{底噪}}. {{动作音}}. {{若复用参考音频的环境层：The copied ambience layer from <Audio 1> continues throughout the target video.}}

non_diegetic_music:
{{乐器 + 速度 + 动态}} 或 {{<Audio 2> is directly reused as the complete audience-only score.}} 或 N/A
```

## 任务类型速查

| 需求 | 前缀 |
| --- | --- |
| 参考图锁角色拍新场景 | `[reference generation]` |
| 参考图当首帧 + 参考视频借运镜 | `[keyframe completion + reference generation]` |
| 对口型唱参考音频 | `[reference generation + audio reuse]`，`<Audio 1>`: `fully_copy` |
| 用参考音色说新台词 | `[reference generation + audio reference]`，`<Audio 1>`: `reference` |
| 改源视频、保留原声 | `[video editing + audio reuse]`，summary 开头 `The target video is an edited version of <Video 1>.` |
| 续拍源视频 | `[video continuation + audio reference]` |

## 填写提示

- 标签编号 = 素材上传 / 连线顺序。
- 身份放 `<Subject N>`，只有当具体帧的图才单独 `<Picture N>`。
- 2–4 张不同角度的同一人物照片合并进**一个** `<Subject>`。
- 区分性细节正着写、锚位置、说左右；`retention_analysis` 里原样复述。
- `(Sx)` 只出现在 `detailed_description`。
- `detailed_description` 目标 350–500 词（生成类）。
- 完成后：`python tools/validate_prompt.py 你的文件.txt --duration {{秒数}}`

完整案例见 `examples/ref2va/`。
