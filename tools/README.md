# tools/validate_prompt.py · H3 提示词格式校验器

零依赖，Python 3.8+。把官方规范里能机械检查的部分全部写成规则，写完提示词先过一遍再去烧算力。

## 用法

```bash
# 单个文件，指定时长
python tools/validate_prompt.py my_prompt.txt --duration 8

# 文件名带 -8s / -5.17s 后缀时自动读取时长
python tools/validate_prompt.py examples/t2va/01-perfume-ad-8s.txt

# 递归校验目录；--strict 让警告也算失败（适合 CI）
python tools/validate_prompt.py examples --strict

# 显示 INFO 和镜头表
python tools/validate_prompt.py my_prompt.txt -d 10 -v

# 机器可读
python tools/validate_prompt.py my_prompt.txt -d 10 --json

# 强制模式（默认自动识别）
python tools/validate_prompt.py my_prompt.txt --mode L2VA -d 6
```

退出码：`0` 无错误；`1` 有错误（或 `--strict` 下有警告）；`2` 用法 / 文件错误。

## 模式识别

- 含行首 `subject_definitions:` → Ref2VA
- 第一行以 `For the target video, at 0.00 seconds` 开头 → I2VA
- 第一行以 `How the reference pictures align` 开头，含 `Picture 2` → FL2VA，否则 → L2VA
- 其他 → T2VA

## 检查项

### 错误（ERROR，必须修）

| 代码 | 含义 |
| --- | --- |
| `E_FIELD_MISSING` / `E_FIELD_ORDER` / `E_FIELD_DUP` / `E_FIELD_EXTRA` | 字段缺失、顺序错、重复、不该出现 |
| `E_T2VA_START` / `E_REF_START` | T2VA 没以主体字段开头；Ref2VA 没以 `subject_definitions:` 开头 |
| `E_ALIGN_FORMAT` | 对齐语句与官方三句不逐字一致（会提示是不是括号 / 破折号问题） |
| `E_ALIGN_SHOT_N` / `E_ALIGN_DURATION` | 对齐语句里的 Shot N 不是最后一镜；S.SS 与 `--duration` 不符 |
| `E_BODY_START` / `E_NO_SHOT` | 主体没以 `[Shot 1]` 开头 / 没有镜头 |
| `E_SHOT1_TIMESTAMP` | Shot 1 带了时间戳 |
| `E_SHOT_TIMESTAMP` | 后续镜头的 `At MM:SS.mmm,` 格式不对 |
| `E_SHOT_ORDER` / `E_SHOT_BEYOND_DURATION` / `E_SHOT_NUMBERING` | 时间戳不递增 / 超出时长 / 编号不连续 |
| `E_D_UNBALANCED` / `E_D_NESTED` / `E_D_NO_LANG` / `E_D_EMPTY` / `E_D_SPEAKER_INSIDE` | `<d>` 不配对 / 嵌套 / 无语言标签 / 空 / 里面有 `(Sx)` |
| `E_SOUND_HAS_D` / `E_MUSIC_HAS_D` / `E_SUMMARY_D` | 声音字段或 summary 里出现 `<d>` |
| `E_EMPTY_FIELD` | 声音字段为空 |
| `E_TOO_LONG` | 超过 7000 字符 |
| `E_LABEL_UNDEFINED` / `E_LABEL_REDEFINED` / `E_NO_SUBJECTS` | Ref2VA 标签未定义 / 重复定义 / 没有定义 |
| `E_SUMMARY_PREFIX` / `E_SUMMARY_TASK` / `E_SUMMARY_TASK_DUP` / `E_SUMMARY_EMPTY` | summary 前缀缺失 / 任务类型非法 / 重复 / 无内容 |
| `E_RETENTION_LINE` / `E_RETENTION_MARKER` / `E_RETENTION_SPEAKER` | retention 行格式错 / 标记集合错 / 出现 `(Sx)` |

### 警告（WARN，强烈建议修）

`W_NO_CUT_PHRASE` 切镜短语不是官方五种 · `W_SHOT_TOO_SHORT` 镜头 < 0.75 s · `W_NO_STYLE` Shot 1 没有风格词 · `W_D_NO_SPEAKER` `<d>` 前没有说话人 · `W_D_TAG_INSIDE` `<scenetrans>` 放进了 `<d>` · `W_D_ACTION_INSIDE` `<d>` 里疑似混入 says 等引导词 · `W_SPEAKER_ORDER` 说话人编号不按首次出现 · `W_VO_PHRASE` / `W_VO_LIPS` 画外音短语或嘴唇闭合缺失 · `W_CUTOFF_POS` `<cutoff>` 不在最后一镜 · `W_SCENETRANS_ODD` / `W_SCENETRANS_PHRASE` 跨镜标签不成对或缺连续性短语 · `W_NON_ENGLISH` 描述里有非英文字符 · `W_CURLY_QUOTES` 弯引号 · `W_NEGATIVE_PROMPT` 否定句 · `W_SOUND_SENTENCES` / `W_SOUND_MUSIC` / `W_SOUND_PARAGRAPHS` 声音字段句数 / 提到配乐 / 多段 · `W_MUSIC_SENTENCES` / `W_MUSIC_MOOD` / `W_MUSIC_VAGUE` 配乐句数 / 情绪词 / 无具体乐器 · `W_BODY_SHORT` / `W_BODY_LONG` 主体字数与时长不匹配 · `W_ALIGN_BLANK` / `W_ALIGN_NEXT` / `W_FIELD_BLANK` 空行问题 · `W_I2VA_NO_REF` / `W_L2VA_NO_REF` / `W_FL2VA_NO_REF` 关键帧模式没引用图片 · `W_UNKNOWN_FIELD` 疑似拼错的字段名 · `W_TRAILING_TEXT` 末尾夹带备注 · `W_DURATION_RANGE` 时长不在 4–15 · Ref2VA：`W_SD_LINE` 定义行格式 · `W_LABEL_NUMBERING` 编号不连续 · `W_PICTURE_STANDALONE` 图片单独定义却不是帧锚点 · `W_AUDIO_ALONE` 只有音频参考 · `W_LABEL_UNUSED` / `W_LABEL_NO_RETENTION` 标签定义了没用 / 没有 retention 行 · `W_RETENTION_APPEARS` Subject 行没标出现镜头 · `W_RETENTION_SOURCE_ONLY` 仅作为来源的图片单独写了 retention 行 · `W_SUMMARY_EDIT_OPEN` 视频编辑 summary 没用固定开头 · `W_TASK_NO_VIDEO` / `W_TASK_NO_AUDIO` / `W_AUDIO_NO_TASK` 任务类型与素材不一致 · `W_REF_NO_STYLE_OPENING` Shot 1 前没有风格句 · `W_REF_WORDS` 字数不在 350–500 · `W_LIPSYNC_MARKER` 描述了对口型但音频没标 `fully_copy`。

### 信息（INFO，`-v` 才显示）

未提供时长、非整数时长、FL2VA 多镜头、对齐语句声明的时长、Picture 锚点写法建议等。

## 局限

- 只检查**格式**与官方明文规则，不判断内容好不好（那是 `docs/04-director-playbook.md` 的事）。
- 非英文检测基于字符区间（中日韩 / 西里尔 / 阿拉伯 / 泰文），其他语种不报。
- `<scenetrans>` 的确切用法官方没给完整示例，本工具只检查成对与连续性短语，不强制位置。

## 自测

```bash
python -m unittest discover -s tests -v
```

测试覆盖：官方四个基础案例 + 官方 Ref2VA 完整案例零错误、本仓库全部案例 `--strict` 通过、典型错误对应到正确的错误码。
