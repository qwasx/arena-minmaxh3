# 案例索引

所有案例都是可直接粘贴使用的完整提示词，文件名末尾的 `-Ns` 是设计时长（校验脚本会自动读取）。
每条都通过了 `python tools/validate_prompt.py examples --strict`。

| 文件 | 模式 | 时长 / 比例 | 演示了什么 |
| --- | --- | --- | --- |
| `t2va/01-perfume-ad-8s.txt` | T2VA | 8 s · 16:9 | 产品广告三镜头；环绕 + 推进运镜；屏幕文字双引号；无对白 |
| `t2va/02-late-night-goodbye-zh-10s.txt` | T2VA | 10 s · 16:9 | 双人中文对白；正反打 + 180° 轴线钉站位；`(S1)(S2)` 稳定 ID；无配乐 |
| `t2va/03-steak-asmr-vertical-6s.txt` | T2VA | 6 s · 9:16 | 竖屏美食 ASMR；`overall_soundscape` 当主角；`N/A` 配乐 |
| `t2va/04-anime-rooftop-chase-jp-8s.txt` | T2VA | 8 s · 16:9 | 2D 动画风格；日语台词**跨镜** `<scenetrans>`；大幅度快速横移；配乐动态变化 |
| `t2va/05-voiceover-morning-shift-en-10s.txt` | T2VA | 10 s · 16:9 | 画外音固定短语 + 嘴唇闭合声明；屏幕文字 `"CLOSED"→"OPEN"`；片尾字幕 |
| `i2va/01-old-fisherman-portrait-zh-6s.txt` | I2VA | 6 s · 自适应 | 首帧对齐语句；从图中姿势起始；中文单句对白 |
| `fl2va/01-paper-crane-fold-8s.txt` | FL2VA | 8 s · 自适应 | 首尾帧对齐语句（`Shot 1` / `8.00`）；单镜头写"路径"而非两张图 |
| `l2va/01-pianist-sits-down-6s.txt` | L2VA | 6 s · 自适应 | 尾帧对齐语句；倒推开场；收敛到 `<Picture 1>` |
| `ref2va/01-character-night-market-zh-10s.txt` | Ref2VA | 10 s | 3 张人物图合并为一个 `<Subject 1>`；区分性细节写法；场景图 `<Subject 2>`；非 Subject 的配角说话人 `(S2)` |
| `ref2va/02-lipsync-song-audio-8s.txt` | Ref2VA | 8 s | 参考音频**对口型**：`<Audio 1>` 标 `fully_copy`；`[reference generation + audio reuse]` |
| `ref2va/03-video-edit-background-swap-6s.txt` | Ref2VA | 6 s | 视频编辑换背景保留原声：summary 固定开头；`<Video 1>` `partially_preserved`；`<Audio 1>` `fully_copy` |

## 怎么改成自己的

1. 选一个最接近的案例复制出来。
2. 只改内容，别改结构：字段名、对齐语句、`[Shot N] At MM:SS.mmm,`、`<d>[语言] ...</d>` 这些骨架保持原样。
3. 改完跑 `python tools/validate_prompt.py 你的文件.txt --duration N`。
4. 先 5 秒试跑，确认提示词方向对了再拉长。

## 关于案例中的素材

Ref2VA 和关键帧案例里的 `<Picture N>` / `<Video N>` / `<Audio N>` 只是编号占位，指代你实际上传（或在 ComfyUI 中连接）的第 N 个同类素材；案例正文对素材内容的描述是示意，用时替换成你自己素材的真实特征。歌词、台词均为虚构。
