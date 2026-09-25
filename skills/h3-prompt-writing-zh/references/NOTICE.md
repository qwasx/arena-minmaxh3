# 参考文件来源说明

| 文件 | 来源 | 说明 |
| --- | --- | --- |
| `official-base-en.txt` | https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/h3-prompt-writing/references/base-en.txt | 官方《Video Prompt Writing Guide (T2VA / I2VA / FL2VA / L2VA)》，原样收录，未做修改 |
| `official-ref-en.txt` | https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/h3-prompt-writing/references/ref-en.txt | 官方《Full-Reference Mode Rewrite Output Format Guide》，原样收录，未做修改 |
| `cheatsheet-zh.md` | 本仓库 `docs/cheatsheet.md` 的副本 | 中文速查表，便于技能独立安装时自包含 |

两份官方文件版权归 MiniMax 所有。官方 README 明确推荐通过 `npx skills add https://github.com/MiniMax-AI/MiniMax-H3 --skill h3-prompt-writing` 将其安装到本地供智能体读取，本仓库以同样目的收录。
收录版本对应官方仓库 commit `d21241f0a4b3acbb34c97dae47fa417b7065e438`（2026-08-15）；Hugging Face 上的 `docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md` / `..._ref_en.md` 与之同源。
若官方更新了规范，请以官方最新版本为准，并同步更新本仓库的中文解读。
