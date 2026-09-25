#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_prompt.py — MiniMax H3 提示词格式校验器（零依赖，Python 3.8+）

用法:
    python tools/validate_prompt.py prompt.txt --duration 8
    python tools/validate_prompt.py examples            # 递归校验目录下所有 .txt
    python tools/validate_prompt.py a.txt b.txt --strict # 警告也算失败
    python tools/validate_prompt.py a.txt --json         # 机器可读输出

时长来源优先级: --duration > 文件名里的 "-8s" / "-5.17s" 后缀 > 未知(跳过与时长相关的检查)。
模式自动识别: 第一行是对齐语句 → I2VA / FL2VA / L2VA；含 subject_definitions: → Ref2VA；否则 T2VA。

退出码: 0 = 无错误; 1 = 有错误(或 --strict 下有警告); 2 = 用法/文件错误。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple

# ----------------------------------------------------------------------------
# 常量：全部来自官方 base-en.txt / ref-en.txt
# ----------------------------------------------------------------------------

BASE_FIELDS = ["integrated_multimodal_description", "overall_soundscape", "non_diegetic_music"]
REF_FIELDS = [
    "subject_definitions",
    "summary",
    "retention_analysis",
    "detailed_description",
    "overall_soundscape",
    "non_diegetic_music",
]
ALL_KNOWN_FIELDS = set(BASE_FIELDS) | set(REF_FIELDS)

I2VA_LINE = (
    "For the target video, at 0.00 seconds into the target video, "
    "<Picture 1> (from [Shot 1]) is fully referenced."
)
FL2VA_RE = re.compile(
    r"^How the reference pictures align with the target video — "
    r"Picture 1 \(from Shot 1\) aligns with the 0\.00-second mark of the target video; "
    r"Picture 2 \(from Shot (\d+)\) aligns with the (\d+\.\d{2})-second mark of the target video\.$"
)
L2VA_RE = re.compile(
    r"^How the reference pictures align with the target video — "
    r"<Picture 1> \(from \[Shot (\d+)\]\) aligns with the (\d+\.\d{2})-second mark of the target video\.$"
)
ALIGN_PREFIX_FL_L = "How the reference pictures align with the target video"
ALIGN_PREFIX_I = "For the target video, at 0.00 seconds"

SHOT_RE = re.compile(r"\[Shot (\d+)\]")
SHOT_TS_RE = re.compile(r"\[Shot (\d+)\]\s*At (\d{2}):(\d{2})\.(\d{3}),")
SHOT_TS_LOOSE_RE = re.compile(r"\[Shot (\d+)\]\s*At\b", re.IGNORECASE)

CUT_PHRASES = [
    "the camera cuts to",
    "the shot cuts to",
    "the shot transitions to",
    "the shot changes to",
    "the shot switches to",
    "cross-dissolve",
    "cross dissolve",
    "dissolves to",
    "fades to",
    "fade to",
    "fades in on",
    "wipes to",
    "wipe to",
]

STYLE_WORDS = [
    "cinematic", "live-action", "live action", "2d-animated", "2d animated", "3d cg", "3d-cg",
    "claymation", "watercolor", "vintage film", "anime", "stop-motion", "stop motion",
    "documentary", "pixel", "cel-shaded", "cel shading", "hand-drawn", "cg", "photorealistic",
    "film noir", "commercial style", "vlog style", "sitcom", "music-video", "music video",
]

TASK_TYPES = {
    "keyframe completion",
    "reference generation",
    "video editing",
    "video continuation",
    "audio reuse",
    "audio reference",
}
VISUAL_MARKERS = {"fully_preserved", "partially_preserved", "attribute_transfer", "weak_reference"}
AUDIO_MARKERS = {"fully_copy", "partially_copy", "reference", "weak_reference"}

LANGS = {
    "English", "Chinese", "Japanese", "Korean", "French", "German", "Italian",
    "Portuguese", "Russian", "Spanish", "Arabic",
    # 非稳定支持但可能出现
    "Cantonese", "Mandarin", "Thai", "Vietnamese", "Hindi", "Indonesian", "Turkish", "Dutch",
    "Polish", "Swedish", "Hebrew", "Greek", "Malay", "Filipino",
}

MOOD_WORDS = [
    "sad", "happy", "emotional", "tense", "tension", "melancholic", "melancholy", "uplifting",
    "epic", "dramatic", "romantic", "mysterious", "eerie", "haunting", "joyful", "hopeful",
    "nostalgic", "heroic", "ominous", "suspenseful", "cheerful", "somber", "sombre",
    "triumphant", "inspiring", "inspirational", "moody", "dreamy", "sentimental", "bittersweet",
]

NEGATIVE_RE = re.compile(
    r"\b(no|without|avoid|never|don't|do not)\s+(watermark|watermarks|blur|blurry|distortion|"
    r"deformed|deformity|extra (fingers|limbs|hands|arms)|artifacts?|text overlay|subtitles?|logo)s?\b",
    re.IGNORECASE,
)

LABEL_RE = re.compile(r"<(Subject|Picture|Video|Audio) (\d+)>")
LABEL_DEF_RE = re.compile(r"^<(Subject|Picture|Video|Audio) (\d+)>\s+(?:is|are)\b")
RETENTION_LINE_RE = re.compile(
    r"^<(Subject|Picture|Video|Audio) (\d+)>(?:\s*\(([^)]*)\))?\s*:\s*([a-z_]+)\s+-\s+\S"
)
SPEAKER_RE = re.compile(r"\(S\d+(?:,S\d+)*\)")
SPEAKER_ID_RE = re.compile(r"S(\d+)")
D_BLOCK_RE = re.compile(r"<d>(.*?)</d>", re.DOTALL)
D_OPEN_RE = re.compile(r"<d>")
D_CLOSE_RE = re.compile(r"</d>")
LANG_TAG_RE = re.compile(r"^\s*\[([A-Za-z][A-Za-z\- ]*)\]")
QUOTED_RE = re.compile(r'"[^"\n]*"')
NON_LATIN_RE = re.compile(
    r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\uff01-\uff5e\u3000-\u303f]"
)
CURLY_QUOTE_RE = re.compile(r"[\u201c\u201d]")
FIELD_HEADER_RE = re.compile(r"^([a-z][a-z_]{3,}):", re.MULTILINE)
FILENAME_DURATION_RE = re.compile(r"[-_](\d+(?:\.\d+)?)s(?:[-_.]|$)")

API_CHAR_LIMIT = 7000
MIN_SHOT_SECONDS = 0.75


# ----------------------------------------------------------------------------
# 数据结构
# ----------------------------------------------------------------------------

@dataclass
class Issue:
    level: str  # ERROR / WARN / INFO
    code: str
    line: Optional[int]
    msg: str


@dataclass
class Section:
    name: str
    header_line: int  # 1-based
    body: str  # 冒号之后的全部内容（可能跨行）
    body_start_offset: int  # body 在全文中的偏移


@dataclass
class Report:
    path: str
    mode: str = "UNKNOWN"
    duration: Optional[float] = None
    shots: List[Tuple[int, float]] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)
    chars: int = 0
    body_words: int = 0

    def add(self, level: str, code: str, line: Optional[int], msg: str) -> None:
        self.issues.append(Issue(level, code, line, msg))

    def error(self, code: str, line: Optional[int], msg: str) -> None:
        self.add("ERROR", code, line, msg)

    def warn(self, code: str, line: Optional[int], msg: str) -> None:
        self.add("WARN", code, line, msg)

    def info(self, code: str, line: Optional[int], msg: str) -> None:
        self.add("INFO", code, line, msg)

    @property
    def errors(self) -> int:
        return sum(1 for i in self.issues if i.level == "ERROR")

    @property
    def warnings(self) -> int:
        return sum(1 for i in self.issues if i.level == "WARN")


# ----------------------------------------------------------------------------
# 工具函数
# ----------------------------------------------------------------------------

def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, max(0, offset)) + 1


def count_sentences(text: str) -> int:
    t = text.strip()
    if not t:
        return 0
    # 句号/问号/叹号后跟空白或结尾算一句；小数点(如 0.00)不算
    parts = re.split(r"(?<!\d)[.!?](?:\s+|$)", t)
    return len([p for p in parts if p.strip()])


def count_words(text: str) -> int:
    return len([w for w in re.split(r"\s+", text) if re.search(r"[A-Za-z]", w)])


def strip_d_and_quotes(text: str) -> str:
    text = D_BLOCK_RE.sub("<d></d>", text)
    text = QUOTED_RE.sub('""', text)
    return text


def detect_duration(path: str, cli_duration: Optional[float]) -> Optional[float]:
    if cli_duration is not None:
        return cli_duration
    base = os.path.basename(path)
    m = FILENAME_DURATION_RE.search(base)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def split_sections(text: str, expected: List[str], rep: Report) -> Dict[str, Section]:
    """按行首 `name:` 切分字段。返回 name -> Section。"""
    headers = []
    for m in FIELD_HEADER_RE.finditer(text):
        name = m.group(1)
        if name in ALL_KNOWN_FIELDS:
            headers.append((m.start(), m.end(), name))
        else:
            # 行首出现未知的 xxx_yyy: 形式，可能是拼错的字段名
            close = [f for f in expected if f.startswith(name[:6]) or name.startswith(f[:6])]
            hint = f"（你是不是想写 `{close[0]}:`？）" if close else ""
            rep.warn("W_UNKNOWN_FIELD", line_of(text, m.start()), f"行首出现未知字段名 `{name}:`{hint}")
    sections: Dict[str, Section] = {}
    seen_order: List[str] = []
    for i, (s, e, name) in enumerate(headers):
        end = headers[i + 1][0] if i + 1 < len(headers) else len(text)
        body = text[e:end]
        if name in sections:
            rep.error("E_FIELD_DUP", line_of(text, s), f"字段 `{name}:` 出现了多次")
            continue
        sections[name] = Section(name, line_of(text, s), body, e)
        seen_order.append(name)

    # 缺失 / 顺序
    missing = [f for f in expected if f not in sections]
    for f in missing:
        rep.error("E_FIELD_MISSING", None, f"缺少字段 `{f}:`（必须位于行首，全小写下划线，后接英文冒号）")
    present_in_expected_order = [f for f in expected if f in sections]
    actual_order = [f for f in seen_order if f in expected]
    if actual_order != present_in_expected_order:
        rep.error(
            "E_FIELD_ORDER",
            None,
            "字段顺序错误：应为 " + " → ".join(expected) + "；实际为 " + " → ".join(actual_order),
        )
    extra = [f for f in seen_order if f not in expected]
    for f in extra:
        rep.error("E_FIELD_EXTRA", sections[f].header_line, f"该模式不应出现字段 `{f}:`")
    return sections


# ----------------------------------------------------------------------------
# 镜头分析
# ----------------------------------------------------------------------------

def analyze_shots(body: str, base_offset: int, text: str, rep: Report, duration: Optional[float]) -> List[Tuple[int, float]]:
    """检查 [Shot N] 编号、时间戳格式、递增、落在时长内。返回 [(n, start_sec)]。"""
    shots: List[Tuple[int, float]] = []
    matches = list(SHOT_RE.finditer(body))
    if not matches:
        rep.error("E_NO_SHOT", line_of(text, base_offset), "主体描述里没有 `[Shot 1]`")
        return shots

    numbers = [int(m.group(1)) for m in matches]
    expected = list(range(1, len(numbers) + 1))
    if numbers != expected:
        rep.error(
            "E_SHOT_NUMBERING",
            line_of(text, base_offset + matches[0].start()),
            f"镜头编号应为连续的 1..{len(numbers)}，实际为 {numbers}",
        )

    last_t = -1.0
    for idx, m in enumerate(matches):
        n = int(m.group(1))
        abs_off = base_offset + m.start()
        ln = line_of(text, abs_off)
        after = body[m.end(): m.end() + 160]
        if idx == 0:
            if SHOT_TS_LOOSE_RE.match(body[m.start(): m.start() + 40]):
                rep.error("E_SHOT1_TIMESTAMP", ln, "`[Shot 1]` 不能带时间戳（官方规定第一镜不写 At ...）")
            shots.append((n, 0.0))
            continue
        ts = SHOT_TS_RE.match(body[m.start(): m.start() + 40])
        if not ts:
            rep.error(
                "E_SHOT_TIMESTAMP",
                ln,
                f"`[Shot {n}]` 后必须紧跟 `At MM:SS.mmm,`（例如 `[Shot {n}] At 00:03.500, the shot cuts to ...`）",
            )
            shots.append((n, float("nan")))
            continue
        mm, ss, mmm = int(ts.group(2)), int(ts.group(3)), int(ts.group(4))
        t = mm * 60 + ss + mmm / 1000.0
        if ss >= 60:
            rep.error("E_SHOT_TIMESTAMP", ln, f"`[Shot {n}]` 时间戳秒数 {ss} 不合法")
        if t <= last_t:
            rep.error("E_SHOT_ORDER", ln, f"`[Shot {n}]` 的切入时刻 {t:.3f}s 没有严格递增（上一镜 {last_t:.3f}s）")
        if duration is not None and t >= duration:
            rep.error(
                "E_SHOT_BEYOND_DURATION",
                ln,
                f"`[Shot {n}]` 在 {t:.3f}s 切入，已达到或超过总时长 {duration:g}s",
            )
        if idx >= 1 and last_t >= 0 and 0 < (t - last_t) < MIN_SHOT_SECONDS:
            rep.warn("W_SHOT_TOO_SHORT", ln, f"`[Shot {n-1}]` 只有 {t - last_t:.2f}s，短于 {MIN_SHOT_SECONDS}s，除非是快切蒙太奇")
        # 切镜短语
        seg = after.lower()
        if not any(p in seg for p in CUT_PHRASES):
            rep.warn(
                "W_NO_CUT_PHRASE",
                ln,
                f"`[Shot {n}]` 时间戳后建议使用官方切镜短语之一：the camera cuts to / the shot cuts to / "
                "the shot transitions to / the shot changes to / the shot switches to",
            )
        last_t = t
        shots.append((n, t))

    # 最后一镜时长
    if duration is not None and shots and shots[-1][1] == shots[-1][1]:  # not nan
        tail = duration - shots[-1][1]
        if len(shots) > 1 and 0 <= tail < MIN_SHOT_SECONDS:
            rep.warn("W_SHOT_TOO_SHORT", None, f"最后一镜只有 {tail:.2f}s")
    return shots


# ----------------------------------------------------------------------------
# 对白 / 说话人 / 画外音
# ----------------------------------------------------------------------------

def analyze_dialogue(body: str, base_offset: int, text: str, rep: Report, is_ref: bool) -> None:
    opens = len(D_OPEN_RE.findall(body))
    closes = len(D_CLOSE_RE.findall(body))
    if opens != closes:
        rep.error("E_D_UNBALANCED", line_of(text, base_offset), f"`<d>` 与 `</d>` 数量不一致（{opens} vs {closes}）")

    shot_positions = [m.start() for m in SHOT_RE.finditer(body)]

    def shot_start_before(pos: int) -> int:
        starts = [s for s in shot_positions if s <= pos]
        return starts[-1] if starts else 0

    for m in D_BLOCK_RE.finditer(body):
        content = m.group(1)
        ln = line_of(text, base_offset + m.start())
        if "<d>" in content:
            rep.error("E_D_NESTED", ln, "`<d>` 嵌套或上一处 `</d>` 缺失")
            continue
        lt = LANG_TAG_RE.match(content)
        if not lt:
            rep.error("E_D_NO_LANG", ln, "`<d>` 内必须以语言标签开头，如 `<d>[Chinese] ...</d>`")
        else:
            lang = lt.group(1).strip()
            if lang not in LANGS:
                rep.warn("W_D_LANG", ln, f"语言标签 `[{lang}]` 不在常见列表中（English/Chinese/Japanese/...），请确认拼写")
            spoken = content[lt.end():].strip()
            if not spoken:
                rep.error("E_D_EMPTY", ln, "`<d>` 里除了语言标签没有台词")
        if SPEAKER_RE.search(content):
            rep.error("E_D_SPEAKER_INSIDE", ln, "`<d>` 里不能出现说话人 ID `(Sx)`，ID 和身份描述都要放在 `<d>` 外")
        if "<scenetrans>" in content or "<cutoff>" in content:
            rep.warn("W_D_TAG_INSIDE", ln, "`<scenetrans>` / `<cutoff>` 建议放在 `<d>` 外面（`<d>` 内只放语言标签和台词）")
        if lt and re.match(r"\s*(?:\(S\d[^)]*\)\s*)?(?:he|she|they|the \w+)?\s*(says|said|shouts|whispers|sings|asks|replies|answers)\b\s*[:,]", content[lt.end():], re.IGNORECASE):
            rep.warn("W_D_ACTION_INSIDE", ln, "`<d>` 里疑似混入了动作/引导词（says: / shouts: ...），这些应在 `<d>` 外")
        # 说话人来源
        seg_start = shot_start_before(m.start())
        window = body[seg_start: m.start()]
        has_speaker = bool(SPEAKER_RE.search(window))
        has_audio_src = is_ref and bool(re.search(r"<Audio \d+>", window))
        if not has_speaker and not has_audio_src:
            rep.warn("W_D_NO_SPEAKER", ln, "这段 `<d>` 之前（同一镜头内）没有找到说话人 ID `(Sx)`" + ("或 `<Audio N>` 声源" if is_ref else ""))

    # 说话人编号按首次出现顺序
    first_seen: List[int] = []
    for m in SPEAKER_RE.finditer(body):
        for sid in SPEAKER_ID_RE.findall(m.group(0)):
            v = int(sid)
            if v not in first_seen:
                first_seen.append(v)
    if first_seen and first_seen != list(range(1, len(first_seen) + 1)):
        rep.warn("W_SPEAKER_ORDER", None, f"说话人 ID 应按首次出声顺序从 S1 连续编号，实际首次出现顺序为 {['S%d' % v for v in first_seen]}")

    # 画外音
    for m in re.finditer(r"voice-?over", body, re.IGNORECASE):
        ln = line_of(text, base_offset + m.start())
        before = body[max(0, m.start() - 40): m.end()]
        if "says in an off-screen voiceover" not in before:
            rep.warn("W_VO_PHRASE", ln, "画外音必须使用固定短语 `says in an off-screen voiceover`")
        # 找其后的 </d>，再看 160 字符内是否有 lips ... closed
        close = body.find("</d>", m.end())
        if close != -1:
            tail = body[close: close + 200].lower()
            if not ("lips" in tail and ("closed" in tail or "remain" in tail or "shut" in tail)):
                rep.warn("W_VO_LIPS", ln, "画外音 `<d>` 块之后必须紧跟嘴唇闭合声明，如 `while his lips remain completely closed.`")

    # <cutoff> 只应出现在最后一镜
    for m in re.finditer(r"<cutoff>", body):
        if shot_positions and m.start() < shot_positions[-1]:
            rep.warn("W_CUTOFF_POS", line_of(text, base_offset + m.start()), "`<cutoff>` 表示被片尾截断，应出现在最后一镜")

    # <scenetrans> 成对
    st = len(re.findall(r"<scenetrans>", body))
    if st % 2 == 1:
        rep.warn("W_SCENETRANS_ODD", None, f"`<scenetrans>` 出现 {st} 次，应在切镜两端成对出现并说明音频连续")
    if st >= 2:
        low = body.lower()
        if not any(p in low for p in ["continues seamlessly across the cut", "continues uninterrupted", "carries over from the previous shot", "remains audible across the transition", "across the cut", "uninterrupted"]):
            rep.warn("W_SCENETRANS_PHRASE", None, "使用 `<scenetrans>` 时应明确写出音频连续，如 `continues seamlessly across the cut`")


# ----------------------------------------------------------------------------
# 通用文本检查
# ----------------------------------------------------------------------------

def analyze_language(body: str, base_offset: int, text: str, rep: Report, field_name: str) -> None:
    cleaned = strip_d_and_quotes(body)
    for m in NON_LATIN_RE.finditer(cleaned):
        ln = line_of(text, base_offset + m.start())
        snippet = cleaned[max(0, m.start() - 12): m.start() + 12].replace("\n", " ")
        rep.warn("W_NON_ENGLISH", ln, f"`{field_name}` 中 `<d>` 和引号之外出现非英文字符：…{snippet}…（描述应为英文，只有台词和屏幕文字保留原语言）")
        break  # 每个字段只报一次
    for m in CURLY_QUOTE_RE.finditer(D_BLOCK_RE.sub("<d></d>", body)):
        rep.warn("W_CURLY_QUOTES", line_of(text, base_offset + m.start()), "屏幕文字请用英文直引号 \"...\"，检测到弯引号 “ ”")
        break
    m = NEGATIVE_RE.search(body)
    if m:
        rep.warn("W_NEGATIVE_PROMPT", line_of(text, base_offset + m.start()), f"检测到否定式描述 `{m.group(0)}`：H3 是 CFG 蒸馏模型，负面提示基本无效，请正着写想要的效果")


def analyze_soundscape(sec: Section, text: str, rep: Report) -> None:
    body = sec.body.strip()
    if not body:
        rep.error("E_EMPTY_FIELD", sec.header_line, "`overall_soundscape` 为空（全片静音才写 N/A）")
        return
    if "<d>" in body:
        rep.error("E_SOUND_HAS_D", sec.header_line, "`overall_soundscape` 不能包含对白 `<d>`")
    if body.upper() == "N/A":
        rep.info("I_SOUND_NA", sec.header_line, "`overall_soundscape` 为 N/A：只有用户明确要求全片静音时才这样写")
        return
    n = count_sentences(body)
    if n > 4:
        rep.warn("W_SOUND_SENTENCES", sec.header_line, f"`overall_soundscape` 建议 1–4 句，当前约 {n} 句")
    if "\n\n" in body.strip():
        rep.warn("W_SOUND_PARAGRAPHS", sec.header_line, "`overall_soundscape` 应为一个连续段落")
    low = body.lower()
    if re.search(r"\b(music|soundtrack|score|bgm)\b", low) and "<audio" not in low:
        rep.warn("W_SOUND_MUSIC", sec.header_line, "`overall_soundscape` 提到 music/soundtrack/score：配乐写在 `non_diegetic_music`，角色能听到的音乐写在主体描述")


def analyze_music(sec: Section, text: str, rep: Report) -> None:
    body = sec.body.strip()
    if not body:
        rep.error("E_EMPTY_FIELD", sec.header_line, "`non_diegetic_music` 为空（没有配乐写 N/A）")
        return
    if "<d>" in body:
        rep.error("E_MUSIC_HAS_D", sec.header_line, "`non_diegetic_music` 不能包含歌词/对白 `<d>`")
    if body.upper() == "N/A":
        return
    n = count_sentences(body)
    if n > 3:
        rep.warn("W_MUSIC_SENTENCES", sec.header_line, f"`non_diegetic_music` 建议 1–3 句，当前约 {n} 句")
    low = body.lower()
    hits = [w for w in MOOD_WORDS if re.search(r"\b" + re.escape(w) + r"\b", low)]
    if hits:
        rep.warn("W_MUSIC_MOOD", sec.header_line, f"`non_diegetic_music` 出现情绪词 {hits}：官方要求只写乐器、速度、节奏、动态变化，不写情绪")
    if "<audio" in low:
        return
    if not re.search(r"\b(tempo|bpm|slow|fast|moderate|piano|guitar|strings?|cello|violin|drums?|synth|pad|bass|brass|flute|choir|orchestra|percussion|beat|pulse|arpeggio|melody|note|chord|pizzicato|music-box|music box|ukulele|harp|organ|saxophone|trumpet|bell)\b", low):
        rep.warn("W_MUSIC_VAGUE", sec.header_line, "`non_diegetic_music` 里没看到乐器/速度等具体描述")


# ----------------------------------------------------------------------------
# 模式识别
# ----------------------------------------------------------------------------

def detect_mode(text: str) -> str:
    if re.search(r"^subject_definitions:", text, re.MULTILINE):
        return "REF2VA"
    first = text.lstrip().split("\n", 1)[0].strip()
    if first.startswith(ALIGN_PREFIX_I):
        return "I2VA"
    if first.startswith(ALIGN_PREFIX_FL_L):
        return "FL2VA" if "Picture 2" in first else "L2VA"
    return "T2VA"


# ----------------------------------------------------------------------------
# 基础模式校验
# ----------------------------------------------------------------------------

def validate_base(text: str, rep: Report, duration: Optional[float]) -> None:
    lines = text.split("\n")
    # 找第一行非空
    first_idx = next((i for i, l in enumerate(lines) if l.strip()), 0)
    first = lines[first_idx].strip()
    if first_idx != 0:
        rep.warn("W_LEADING_BLANK", 1, "文件开头有空行，提示词应从第一行开始")

    mode = rep.mode
    align_n: Optional[int] = None
    align_t: Optional[float] = None

    if mode == "T2VA":
        if not first.startswith("integrated_multimodal_description:"):
            if first.startswith("How the reference") or first.startswith("For the target video"):
                rep.error("E_ALIGN_FORMAT", first_idx + 1, "第一行像是关键帧对齐语句但格式不对，无法识别模式。请逐字对照官方三句（见 docs/02-base-format.md §1）")
            else:
                rep.error("E_T2VA_START", first_idx + 1, "T2VA 必须直接以 `integrated_multimodal_description:` 开头（无对齐语句）")
    else:
        if mode == "I2VA":
            if first != I2VA_LINE:
                rep.error("E_ALIGN_FORMAT", first_idx + 1, "I2VA 对齐语句必须逐字为：\n      " + I2VA_LINE)
        elif mode == "FL2VA":
            m = FL2VA_RE.match(first)
            if not m:
                hint = ""
                if "<Picture" in first:
                    hint = "（注意：FL2VA 这句里 `Picture 1 (from Shot 1)` 没有尖括号和方括号）"
                elif " - " in first or " -- " in first:
                    hint = "（注意：破折号必须是全角 `—`，前后各一个空格）"
                rep.error("E_ALIGN_FORMAT", first_idx + 1, "FL2VA 对齐语句格式不符" + hint + "。标准：\n      How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.")
            else:
                align_n, align_t = int(m.group(1)), float(m.group(2))
        elif mode == "L2VA":
            m = L2VA_RE.match(first)
            if not m:
                hint = ""
                if "Picture 1 (from Shot" in first:
                    hint = "（注意：L2VA 这句里必须是 `<Picture 1> (from [Shot N])`，带尖括号和方括号）"
                elif " - " in first or " -- " in first:
                    hint = "（注意：破折号必须是全角 `—`，前后各一个空格）"
                rep.error("E_ALIGN_FORMAT", first_idx + 1, "L2VA 对齐语句格式不符" + hint + "。标准：\n      How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.")
            else:
                align_n, align_t = int(m.group(1)), float(m.group(2))
        # 对齐语句后必须空一行
        if first_idx + 1 < len(lines) and lines[first_idx + 1].strip() != "":
            rep.warn("W_ALIGN_BLANK", first_idx + 2, "对齐语句之后应空一行，再接 `integrated_multimodal_description:`")
        elif first_idx + 2 < len(lines) and not lines[first_idx + 2].startswith("integrated_multimodal_description:"):
            rep.warn("W_ALIGN_NEXT", first_idx + 3, "对齐语句 + 空行之后应紧接 `integrated_multimodal_description:`")

    sections = split_sections(text, BASE_FIELDS, rep)

    main = sections.get("integrated_multimodal_description")
    shots: List[Tuple[int, float]] = []
    if main:
        body = main.body
        if not body.lstrip().startswith("[Shot 1]"):
            rep.error("E_BODY_START", main.header_line, "`integrated_multimodal_description:` 之后必须紧接 `[Shot 1]`")
        shots = analyze_shots(body, main.body_start_offset, text, rep, duration)
        rep.shots = shots
        head = body[:260].lower()
        if not any(w in head for w in STYLE_WORDS):
            rep.warn("W_NO_STYLE", main.header_line, "`[Shot 1]` 开头应先写整体风格（Cinematic / live-action / 2D-animated / 3D CG / claymation / watercolor / vintage film ...）")
        analyze_dialogue(body, main.body_start_offset, text, rep, is_ref=False)
        analyze_language(body, main.body_start_offset, text, rep, "integrated_multimodal_description")
        rep.body_words = count_words(body)
        if duration is not None:
            wps = rep.body_words / duration if duration else 0
            if wps < 6:
                rep.warn("W_BODY_SHORT", main.header_line, f"主体约 {rep.body_words} 词，对 {duration:g}s 的视频偏少（经验值每秒 12–20 词），细节不够模型会自由发挥")
            elif wps > 40:
                rep.warn("W_BODY_LONG", main.header_line, f"主体约 {rep.body_words} 词，对 {duration:g}s 的视频偏多，考虑精简或拉长时长")
        # 模式相关
        if mode == "I2VA" and "<Picture 1>" not in body:
            rep.warn("W_I2VA_NO_REF", main.header_line, "I2VA 的 Shot 1 应引用 `<Picture 1>` 并锚定图中的主体/构图/场景")
        if mode == "L2VA" and "<Picture 1>" not in body:
            rep.warn("W_L2VA_NO_REF", main.header_line, "L2VA 主体应描述如何收敛到 `<Picture 1>`")
        if mode == "FL2VA":
            if "Picture 1" not in body or "Picture 2" not in body:
                rep.warn("W_FL2VA_NO_REF", main.header_line, "FL2VA 主体应同时提及 Picture 1（起点）和 Picture 2（终点）")
            if len(shots) > 1:
                rep.info("I_FL2VA_MULTI", main.header_line, f"FL2VA 有 {len(shots)} 个镜头：官方建议一般用单镜头便于插值，多镜头仅在明确需要时使用")
        # 对齐语句里的 N / S.SS
        if align_n is not None and shots:
            last_n = shots[-1][0]
            if align_n != last_n:
                rep.error("E_ALIGN_SHOT_N", first_idx + 1, f"对齐语句里的 Shot {align_n} 应等于实际最后一镜 Shot {last_n}")
        if align_t is not None:
            if duration is not None and abs(align_t - duration) > 0.011:
                rep.error("E_ALIGN_DURATION", first_idx + 1, f"对齐语句里的 {align_t:.2f} 秒与总时长 {duration:g}s 不一致")
            elif duration is None:
                rep.info("I_ALIGN_DURATION", first_idx + 1, f"对齐语句声明总时长 {align_t:.2f}s（未提供 --duration，未校验）")

    if "overall_soundscape" in sections:
        analyze_soundscape(sections["overall_soundscape"], text, rep)
        analyze_language(sections["overall_soundscape"].body, sections["overall_soundscape"].body_start_offset, text, rep, "overall_soundscape")
    if "non_diegetic_music" in sections:
        analyze_music(sections["non_diegetic_music"], text, rep)
        analyze_language(sections["non_diegetic_music"].body, sections["non_diegetic_music"].body_start_offset, text, rep, "non_diegetic_music")

    # 字段之间空行
    for a, b in zip(BASE_FIELDS, BASE_FIELDS[1:]):
        if a in sections and b in sections:
            if not sections[a].body.rstrip(" \t").endswith("\n\n"):
                rep.warn("W_FIELD_BLANK", sections[b].header_line, f"`{a}` 与 `{b}` 之间建议空一行")


# ----------------------------------------------------------------------------
# Ref2VA 校验
# ----------------------------------------------------------------------------

def validate_ref(text: str, rep: Report, duration: Optional[float]) -> None:
    lines = text.split("\n")
    first_idx = next((i for i, l in enumerate(lines) if l.strip()), 0)
    if not lines[first_idx].startswith("subject_definitions:"):
        rep.error("E_REF_START", first_idx + 1, "Ref2VA 必须以 `subject_definitions:` 开头，没有对齐语句")

    sections = split_sections(text, REF_FIELDS, rep)

    # ---- subject_definitions
    defined: Dict[str, int] = {}      # label -> line (行首正式定义)
    declared: Dict[str, int] = {}     # label -> line (在 subject_definitions 中出现过)
    sd = sections.get("subject_definitions")
    if sd:
        body = sd.body
        for m in LABEL_RE.finditer(body):
            lab = f"<{m.group(1)} {m.group(2)}>"
            declared.setdefault(lab, line_of(text, sd.body_start_offset + m.start()))
        offset = sd.body_start_offset
        for raw in body.split("\n"):
            s = raw.strip()
            ln = line_of(text, offset)
            offset += len(raw) + 1
            if not s:
                continue
            m = LABEL_DEF_RE.match(s)
            if m:
                lab = f"<{m.group(1)} {m.group(2)}>"
                if lab in defined:
                    rep.error("E_LABEL_REDEFINED", ln, f"{lab} 被重复定义")
                defined[lab] = ln
            else:
                rep.warn("W_SD_LINE", ln, f"`subject_definitions` 每行应以 `<Subject N> is ...` / `<Picture N> is ...` 等开头：{s[:60]}…")
        if not defined:
            rep.error("E_NO_SUBJECTS", sd.header_line, "`subject_definitions` 里没有任何标签定义")
        # 编号连续
        for typ in ("Subject", "Picture", "Video", "Audio"):
            nums = sorted({int(m.group(2)) for m in LABEL_RE.finditer(body) if m.group(1) == typ})
            if nums and nums != list(range(1, len(nums) + 1)):
                rep.warn("W_LABEL_NUMBERING", sd.header_line, f"<{typ} N> 编号应从 1 连续（对应上传/连线顺序），实际出现 {nums}")
        # 身份放在 Subject 里而不是独立 Picture
        for lab, ln in defined.items():
            if lab.startswith("<Picture"):
                defline = next((l for l in body.split("\n") if l.strip().startswith(lab)), "")
                low = defline.lower()
                if not re.search(r"\b(frame|keyframe|storyboard|composition|anchor|shot-planning)\b", low):
                    rep.warn("W_PICTURE_STANDALONE", ln, f"{lab} 被单独定义但没说明它是首帧/关键帧/尾帧/构图锚点。若只是用来定义角色/场景/风格，应在对应 <Subject N> 里引用而不是单独一行")
        if "<Audio" in body and not re.search(r"<(Picture|Video) \d+>", body):
            rep.warn("W_AUDIO_ALONE", sd.header_line, "音频不能作为唯一参考，必须搭配图片或视频")

    # 其余段落中出现的标签必须已声明
    used_labels: Dict[str, List[str]] = {}
    for name in ("summary", "retention_analysis", "detailed_description", "overall_soundscape", "non_diegetic_music"):
        sec = sections.get(name)
        if not sec:
            continue
        for m in LABEL_RE.finditer(sec.body):
            lab = f"<{m.group(1)} {m.group(2)}>"
            used_labels.setdefault(lab, []).append(name)
            if lab not in declared:
                rep.error("E_LABEL_UNDEFINED", line_of(text, sec.body_start_offset + m.start()), f"{lab} 在 `{name}` 中使用但未在 `subject_definitions` 中定义/声明")
    for lab, ln in defined.items():
        secs = used_labels.get(lab, [])
        if "detailed_description" not in secs and not (lab.startswith("<Audio") and ({"overall_soundscape", "non_diegetic_music"} & set(secs))):
            rep.warn("W_LABEL_UNUSED", ln, f"{lab} 已定义，但没有在 `detailed_description`（音频可在声音字段）中被引用")
        if "retention_analysis" not in secs:
            rep.warn("W_LABEL_NO_RETENTION", ln, f"{lab} 已定义，但 `retention_analysis` 里没有对应的一行")

    # ---- summary
    task_types: List[str] = []
    sm = sections.get("summary")
    if sm:
        body = sm.body.strip()
        m = re.match(r"^\[([^\]]+)\]\s*(.*)$", body, re.DOTALL)
        if not m:
            rep.error("E_SUMMARY_PREFIX", sm.header_line, "`summary` 必须以方括号任务类型前缀开头，如 `[reference generation + audio reference] ...`")
        else:
            raw_types = [t.strip() for t in m.group(1).split("+")]
            for t in raw_types:
                if t not in TASK_TYPES:
                    rep.error("E_SUMMARY_TASK", sm.header_line, f"任务类型 `{t}` 不合法，只能是：{', '.join(sorted(TASK_TYPES))}")
            if len(raw_types) != len(set(raw_types)):
                rep.error("E_SUMMARY_TASK_DUP", sm.header_line, "任务类型重复")
            if " + " not in m.group(1) and len(raw_types) > 1:
                rep.warn("W_SUMMARY_PLUS", sm.header_line, "多个任务类型应用 ` + `（两侧空格）连接")
            task_types = raw_types
            rest = m.group(2).strip()
            if "video editing" in task_types and not re.match(r"^The target video is an edited version of <Video \d+>\.", rest):
                rep.warn("W_SUMMARY_EDIT_OPEN", sm.header_line, "视频编辑任务的 summary 应以 `The target video is an edited version of <Video 1>.` 开头")
            if not rest:
                rep.error("E_SUMMARY_EMPTY", sm.header_line, "`summary` 只有前缀没有内容")
        if "<d>" in body:
            rep.error("E_SUMMARY_D", sm.header_line, "`summary` 不应包含对白 `<d>`")
        # 任务类型与素材一致性
        if declared:
            has_video = any(l.startswith("<Video") for l in declared)
            has_audio = any(l.startswith("<Audio") for l in declared)
            if ("video editing" in task_types or "video continuation" in task_types) and not has_video:
                rep.warn("W_TASK_NO_VIDEO", sm.header_line, "声明了 video editing/continuation，但没有定义任何 <Video N>")
            if ("audio reuse" in task_types or "audio reference" in task_types) and not has_audio:
                rep.warn("W_TASK_NO_AUDIO", sm.header_line, "声明了 audio reuse/reference，但没有定义任何 <Audio N>")
            if has_audio and not ({"audio reuse", "audio reference"} & set(task_types)):
                rep.warn("W_AUDIO_NO_TASK", sm.header_line, "定义了 <Audio N>，但 summary 前缀里没有 audio reuse / audio reference")
        analyze_language(sm.body, sm.body_start_offset, text, rep, "summary")

    # ---- retention_analysis
    audio_markers: Dict[str, str] = {}
    ra = sections.get("retention_analysis")
    if ra:
        offset = ra.body_start_offset
        for raw in ra.body.split("\n"):
            s = raw.strip()
            ln = line_of(text, offset)
            offset += len(raw) + 1
            if not s:
                continue
            m = RETENTION_LINE_RE.match(s)
            if not m:
                rep.error("E_RETENTION_LINE", ln, f"`retention_analysis` 每行格式应为 `<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - 说明`：{s[:70]}…")
                continue
            typ, num, paren, marker = m.group(1), m.group(2), m.group(3) or "", m.group(4)
            lab = f"<{typ} {num}>"
            if typ == "Audio":
                if marker not in AUDIO_MARKERS:
                    rep.error("E_RETENTION_MARKER", ln, f"{lab} 的标记 `{marker}` 不合法，音频只能用：{', '.join(sorted(AUDIO_MARKERS))}")
                audio_markers[lab] = marker
            else:
                if marker not in VISUAL_MARKERS:
                    rep.error("E_RETENTION_MARKER", ln, f"{lab} 的标记 `{marker}` 不合法，可见内容只能用：{', '.join(sorted(VISUAL_MARKERS))}")
                if typ == "Subject" and "appears in" not in paren:
                    rep.warn("W_RETENTION_APPEARS", ln, f"{lab} 建议标注出现的镜头：`(appears in [Shot 1], [Shot 2])`")
            if lab in declared and lab not in defined:
                rep.warn("W_RETENTION_SOURCE_ONLY", ln, f"{lab} 只在 Subject 定义里作为来源被引用、没有独立定义，通常不需要单独的 retention 行（会造成同一身份两个载体）")
        if SPEAKER_RE.search(ra.body):
            rep.error("E_RETENTION_SPEAKER", ra.header_line, "`retention_analysis` 里不能写说话人 ID `(Sx)`")
        analyze_language(ra.body, ra.body_start_offset, text, rep, "retention_analysis")

    # ---- detailed_description
    dd = sections.get("detailed_description")
    shots: List[Tuple[int, float]] = []
    if dd:
        body = dd.body
        pre = body.split("[Shot 1]", 1)[0].strip() if "[Shot 1]" in body else ""
        if "[Shot 1]" in body and not pre:
            rep.warn("W_REF_NO_STYLE_OPENING", dd.header_line, "Ref2VA 应在 `[Shot 1]` 之前用一两句英文先确立整体风格")
        shots = analyze_shots(body, dd.body_start_offset, text, rep, duration)
        rep.shots = shots
        analyze_dialogue(body, dd.body_start_offset, text, rep, is_ref=True)
        analyze_language(body, dd.body_start_offset, text, rep, "detailed_description")
        rep.body_words = count_words(body)
        is_edit = "video editing" in task_types
        dialogue_dense = len(D_BLOCK_RE.findall(body)) >= 3
        if not is_edit:
            if rep.body_words < (250 if dialogue_dense else 350):
                rep.warn("W_REF_WORDS", dd.header_line, f"`detailed_description` 约 {rep.body_words} 词，官方建议生成类任务 350–500 词（对白密集以写全台词时间线为准）")
            elif rep.body_words > 500:
                rep.warn("W_REF_WORDS", dd.header_line, f"`detailed_description` 约 {rep.body_words} 词，超过官方建议的 350–500 词")
        # 对口型 + 音频标记
        low = body.lower()
        if re.search(r"\b(lip[- ]?sync|lip movements|sings? (along|the lead)|mouth(s|ing)? the (words|lyrics))\b", low):
            if audio_markers and not any(v in ("fully_copy", "partially_copy") for v in audio_markers.values()):
                rep.warn("W_LIPSYNC_MARKER", dd.header_line, "描述了对口型/跟唱，但没有任何 <Audio N> 标记为 fully_copy / partially_copy；只标 reference 时模型只当音色参考，口型会漂")
        if "<Picture" in body and not re.search(r"(begins from|starts from|corresponds to|ends on|first frame|last frame|keyframe)", low):
            rep.info("I_PICTURE_ANCHOR", dd.header_line, "主体里引用了 <Picture N>，如果它是具体帧锚点，建议用 `the shot begins from <Picture 1>` / `the shot ends on <Picture 2>` 这类写法")

    for name, fn in (("overall_soundscape", analyze_soundscape), ("non_diegetic_music", analyze_music)):
        sec = sections.get(name)
        if sec:
            fn(sec, text, rep)
            analyze_language(sec.body, sec.body_start_offset, text, rep, name)


# ----------------------------------------------------------------------------
# 入口
# ----------------------------------------------------------------------------

def validate_text(text: str, path: str, duration: Optional[float], force_mode: Optional[str]) -> Report:
    rep = Report(path=path)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if text.startswith("\ufeff"):
        text = text[1:]
        rep.warn("W_BOM", 1, "文件带 UTF-8 BOM，建议去掉")
    rep.chars = len(text)
    rep.duration = duration

    mode = detect_mode(text)
    if force_mode:
        if force_mode != mode:
            rep.warn("W_MODE_MISMATCH", 1, f"自动识别为 {mode}，但 --mode 指定为 {force_mode}，按 {force_mode} 校验")
        mode = force_mode
    rep.mode = mode

    if not text.strip():
        rep.error("E_EMPTY", 1, "文件为空")
        return rep

    if rep.chars > API_CHAR_LIMIT:
        rep.error("E_TOO_LONG", None, f"提示词 {rep.chars} 字符，超过开放平台 7000 字符上限")

    if duration is not None:
        if not (4 <= duration <= 15.1):
            rep.warn("W_DURATION_RANGE", None, f"时长 {duration:g}s 不在 H3 支持的 4–15 秒范围内")
        elif abs(duration - round(duration)) > 1e-6:
            rep.info("I_DURATION_FRAC", None, f"时长 {duration:g}s 不是整数：开放平台 API 只接受整数秒，ComfyUI 按 17k+5 帧网格（如 124 帧 = 5.17s）")
    else:
        rep.info("I_NO_DURATION", None, "未提供时长（--duration 或文件名 -8s 后缀），跳过时间戳越界与对齐时长检查")

    # 结尾多余内容
    tail_after_last = None
    m_last = None
    for m in FIELD_HEADER_RE.finditer(text):
        if m.group(1) == "non_diegetic_music":
            m_last = m
    if m_last:
        tail = text[m_last.end():].strip()
        if "\n\n" in tail:
            paras = [p for p in tail.split("\n\n") if p.strip()]
            if len(paras) > 1:
                tail_after_last = paras[1][:60]
    if tail_after_last:
        rep.warn("W_TRAILING_TEXT", None, f"`non_diegetic_music` 之后还有其他段落（`{tail_after_last}…`），提示词里不要夹带备注")

    if mode == "REF2VA":
        validate_ref(text, rep, duration)
    else:
        validate_base(text, rep, duration)

    return rep


def collect_files(paths: List[str]) -> List[str]:
    files: List[str] = []
    for p in paths:
        if os.path.isdir(p):
            for root, _dirs, names in os.walk(p):
                for n in sorted(names):
                    if n.lower().endswith(".txt"):
                        files.append(os.path.join(root, n))
        elif os.path.isfile(p):
            files.append(p)
        else:
            print(f"[用法错误] 找不到文件或目录: {p}", file=sys.stderr)
            sys.exit(2)
    return files


def print_report(rep: Report, verbose: bool, quiet: bool) -> None:
    dur = f"{rep.duration:g}s" if rep.duration is not None else "未知"
    print(f"== {rep.path}  [{rep.mode}]  时长 {dur}  {rep.chars} 字符  主体 {rep.body_words} 词")
    if verbose and rep.shots:
        parts = []
        for i, (n, t) in enumerate(rep.shots):
            end = rep.shots[i + 1][1] if i + 1 < len(rep.shots) else rep.duration
            if end is not None and t == t:
                parts.append(f"Shot {n}: {t:.2f}s→{end:.2f}s ({end - t:.2f}s)")
            else:
                parts.append(f"Shot {n}: {t:.2f}s→?")
        print("   镜头表: " + " | ".join(parts))
    if not quiet:
        order = {"ERROR": 0, "WARN": 1, "INFO": 2}
        for iss in sorted(rep.issues, key=lambda i: (order[i.level], i.line or 0)):
            if iss.level == "INFO" and not verbose:
                continue
            loc = f"L{iss.line}" if iss.line else "  -"
            print(f"   [{iss.level:5}] {loc:>5}  {iss.code}: {iss.msg}")
    print(f"   → {rep.errors} 个错误, {rep.warnings} 个警告")


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="MiniMax H3 提示词格式校验器")
    ap.add_argument("paths", nargs="+", help="提示词 .txt 文件或目录")
    ap.add_argument("--duration", "-d", type=float, default=None, help="视频总时长（秒），如 8 或 5.17")
    ap.add_argument("--mode", choices=["T2VA", "I2VA", "FL2VA", "L2VA", "REF2VA"], default=None, help="强制指定模式（默认自动识别）")
    ap.add_argument("--strict", action="store_true", help="警告也视为失败")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    ap.add_argument("--verbose", "-v", action="store_true", help="显示 INFO 与镜头表")
    ap.add_argument("--quiet", "-q", action="store_true", help="只显示每个文件的汇总行")
    args = ap.parse_args(argv)

    files = collect_files(args.paths)
    if not files:
        print("[用法错误] 没有找到任何 .txt 文件", file=sys.stderr)
        return 2

    reports: List[Report] = []
    for f in files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                text = fh.read()
        except UnicodeDecodeError:
            print(f"[用法错误] {f} 不是 UTF-8 文本", file=sys.stderr)
            return 2
        duration = detect_duration(f, args.duration)
        reports.append(validate_text(text, f, duration, args.mode))

    if args.json:
        out = []
        for r in reports:
            d = asdict(r)
            d["errors"] = r.errors
            d["warnings"] = r.warnings
            out.append(d)
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        for r in reports:
            print_report(r, args.verbose, args.quiet)
        total_e = sum(r.errors for r in reports)
        total_w = sum(r.warnings for r in reports)
        print(f"\n共 {len(reports)} 个文件：{total_e} 个错误，{total_w} 个警告")

    failed = any(r.errors > 0 or (args.strict and r.warnings > 0) for r in reports)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
