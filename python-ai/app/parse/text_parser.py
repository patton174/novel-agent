"""txt/md 解析器。"""

from __future__ import annotations

import re

from app.parse.models import ParseResult, ParsedChapter

_CHAPTER_RE = re.compile(r"^\s*(第[\s\S]{1,12}[章节回卷])\s*(.*)$", re.MULTILINE)
_MD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$", re.MULTILINE)
_MD_EMPHASIS = [
    (re.compile(r"\*\*([^*]+)\*\*"), r"\1"),
    (re.compile(r"\*([^*]+)\*"), r"\1"),
    (re.compile(r"`([^`]+)`"), r"\1"),
]


def _decode(raw: bytes) -> str:
    for enc in ("utf-8", "gbk", "gb18030", "utf-16"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def _strip_md(text: str) -> str:
    out = text
    for pat, repl in _MD_EMPHASIS:
        out = pat.sub(repl, out)
    out = _MD_HEADING_RE.sub(r"\2", out)
    return out


def _split_chapters(text: str) -> list[tuple[str, str]]:
    matches = list(_CHAPTER_RE.finditer(text))
    if not matches:
        return []
    chapters = []
    for i, m in enumerate(matches):
        title = (m.group(1) + " " + m.group(2)).strip() if m.group(2) else m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chapters.append((title, text[start:end].strip()))
    return chapters


def parse_text(raw: bytes, fmt: str, original_name: str) -> ParseResult:
    text = _decode(raw)
    if fmt == "md":
        text = _strip_md(text)
    title = original_name.rsplit(".", 1)[0] if "." in original_name else original_name
    chapters = _split_chapters(text)
    if chapters:
        return ParseResult(
            title=title,
            chapters=[ParsedChapter(title=t, content=c, sort_order=i + 1) for i, (t, c) in enumerate(chapters)],
        )
    return ParseResult(title=title, text=text.strip())
