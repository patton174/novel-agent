"""Chapter prose normalization (no orchestration imports)."""

from __future__ import annotations

import re

from app.runtime.text_sanitize import extract_visible_text

_MD_HEADER = re.compile(r"^#{1,6}\s+")
_MD_BOLD = re.compile(r"\*\*([^*]+)\*\*")
_MD_LIST = re.compile(r"^[\s]*[-*+]\s+")
_FULLWIDTH_INDENT = "\u3000\u3000"


def strip_markdown_artifacts(text: str) -> str:
    lines: list[str] = []
    for line in (text or "").split("\n"):
        s = _MD_HEADER.sub("", line)
        s = _MD_BOLD.sub(r"\1", s)
        s = _MD_LIST.sub("", s)
        s = re.sub(r"`([^`]+)`", r"\1", s)
        lines.append(s)
    return "\n".join(lines)


def ensure_paragraph_fullwidth_indent(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""
    blocks = re.split(r"\n\s*\n", raw)
    out: list[str] = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines: list[str] = []
        for line in block.split("\n"):
            line = line.strip()
            if not line:
                continue
            if not line.startswith(_FULLWIDTH_INDENT):
                line = _FULLWIDTH_INDENT + line
            lines.append(line)
        if lines:
            out.append("\n".join(lines))
    return "\n\n".join(out)


def normalize_chapter_body_for_persist(text: str) -> str:
    body = extract_visible_text(text or "")
    body = strip_markdown_artifacts(body)
    return ensure_paragraph_fullwidth_indent(body)
