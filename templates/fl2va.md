# 模板 · FL2VA（首尾帧生视频）

适用：两张图，Picture 1 是开头，Picture 2 是结尾，文字描述**从一张到另一张的连续路径**。

## 骨架

第一行把 `{{N}}` 换成最后一镜编号（单镜头就是 `1`），`{{S.SS}}` 换成总时长两位小数（8 秒 → `8.00`）。
注意这句里 `Picture 1 (from Shot 1)` **没有**尖括号和方括号，官方原文如此。

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot {{N}}) aligns with the {{S.SS}}-second mark of the target video.

integrated_multimodal_description: [Shot 1] {{从图推导的风格词}}, {{主体}} begins in the position and framing established by Picture 1, {{首帧状态：姿势/手里的东西/构图}}. The camera {{运镜}} with small amplitude at slow speed as {{可观察的中间变化 1}}, {{中间变化 2}}, and {{中间变化 3}}. {{差异逐渐收窄的描述}} until {{主体}} settles into the pose, spacing, lighting, and composition established by Picture 2 at the end of the shot.

overall_soundscape: {{底噪}}. {{与每个中间变化对应的动作音}}.

non_diegetic_music: {{乐器 + 速度 + 动态}} 或 N/A
```

## 写法结构

**首帧状态 → 可观察的中间变化 → 差异逐渐收窄 → 尾帧状态**

- **不要**把两张图各自静态描述一遍；要写的是"怎么从 A 变成 B"：主体怎么动、姿势怎么变、物体怎么被操作、构图怎么演变、光线怎么过渡。
- 一般**单镜头**，让模型连续插值。多镜头只在用户明确要求时使用，且尾帧必须在最后一镜末尾到达。
- 两张图的差异要"可插值"：同一场景、同一主体、时长内合理完成。差异太大（换场景、换人）就不是 FL2VA 的活。
- 结尾固定落到 `settles into the ... established by Picture 2 at the end of the shot`，明确告诉模型终点。

完整案例见 `examples/fl2va/`。
