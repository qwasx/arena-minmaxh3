# 模板 · L2VA（尾帧生视频）

适用：一张图作为视频的**最后一帧**，文字倒推一个合理的开场，并描述如何逐渐收敛到这张图。

## 骨架

第一行把 `{{N}}` 换成最后一镜编号（单镜头就是 `1`），`{{S.SS}}` 换成总时长两位小数（6 秒 → `6.00`）。

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot {{N}}]) aligns with the {{S.SS}}-second mark of the target video.

integrated_multimodal_description: [Shot 1] {{从图推导的风格词}}, {{景别}} begins with {{合理的先前状态：与尾帧同一空间、同一光线，但动作尚未发生}}, while {{尾帧里已有的元素}} visible in <Picture 1> {{处于起始位置}}. The camera {{运镜}} with small amplitude at slow speed as {{明确的动作与过渡路径}}. {{中间过程}}. Toward the end, {{运动逐渐停止}} and everything settles into the exact {{物体排列 / 姿势 / 手位 / 机位 / 光线 / 构图}} established by <Picture 1>.

overall_soundscape: {{底噪}}. {{与动作路径对应的声音，按顺序，最后归于安静}}.

non_diegetic_music: {{乐器 + 速度 + 动态，可在落定时收}} 或 N/A
```

## 写法结构

**合理前态 → 明确的动作与过渡路径 → 末镜逐渐收敛 → 尾帧落定**

- `<Picture 1>` 属于**最后一镜**，不属于 Shot 1。
- 倒推的开场要和尾帧同一空间、同一光线、同一机位方向，否则模型要"变魔术"。
- 描述的重点是"如何变成尾帧"，不是尾帧本身长什么样（那是图的事）。
- 适合：物体落定（杯子碎、花开、门关上）、人物走到位、字幕最终定格。

完整案例见 `examples/l2va/`。
