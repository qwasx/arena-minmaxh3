# 模板 · T2VA（文生视频）

适用：只有文字，没有任何图片 / 视频 / 音频输入。

## 骨架

把 `{{...}}` 全部替换掉，删掉没用到的镜头。**没有对齐语句**，第一行就是字段。

```text
integrated_multimodal_description: [Shot 1] {{风格词，如 Live-action, cinematic}}, {{景别}} frames {{主体：身份/服装/画面位置}} in {{环境：场景/关键道具/光源方向与色温}}. {{初始动作}}. The camera {{运镜：pushes in / trucks right / holds a static shot}} with {{small|large}} amplitude at {{slow|fast}} speed {{运镜对象或目的}}. {{声音画像}} (S1) says: <d>[{{Language}}] {{台词原文}}</d> {{说完后的动作/反应}}. [Shot 2] At 00:{{SS.mmm}}, the shot cuts to {{新景别 + 新信息}}. {{动作/反应/运镜}}. [Shot 3] At 00:{{SS.mmm}}, the shot cuts to {{收尾镜头}}, and the text "{{屏幕文字，可选}}" fades in and holds until the end.

overall_soundscape: {{场景底噪}}. {{物理动作音，按发生顺序}}. {{非语言人声，如呼吸/笑}}.

non_diegetic_music: {{乐器}} at a {{slow|moderate|fast}} tempo, {{节奏/织体}}, {{动态变化：何时进/起/收}}.
```

## 最小可用版（单镜头、无对白、无配乐，适合 4–6 秒）

```text
integrated_multimodal_description: [Shot 1] {{风格}}, {{景别}} frames {{主体}} {{环境}}. {{一个完整动作，按时间顺序写}}. The camera {{运镜}} with small amplitude at slow speed {{目的}}.

overall_soundscape: {{底噪}}. {{动作音}}.

non_diegetic_music: N/A
```

## 填写提示

- 风格词从这里选或组合：`Cinematic` / `live-action` / `2D-animated` / `3D CG` / `claymation` / `watercolor` / `vintage film`，可以加限定（`Japanese TV-anime style with flat cel shading`）。
- 光源只在 Shot 1 定义一次，后面引用。
- 两个人对话时在 Shot 1 钉死左右站位。
- 台词时长：中文 ~4 字/秒，英文 ~2.5 词/秒，每句说完留 0.5 秒反应。
- 屏幕文字逐条双引号；不需要就删掉那句。
- 完成后：`python tools/validate_prompt.py 你的文件.txt --duration {{秒数}}`

完整案例见 `examples/t2va/`。
