"""Chapter title normalization — strip 第N章 prefixes (index lives in sort order)."""

from __future__ import annotations

import re

_CHAPTER_NUMBER_PREFIX = re.compile(
    r"^(?:"
    r"第[0-9零一二三四五六七八九十百千万两]+章[：:\s·\-]*"
    r"|chapter\s*\d+[：:\s.\-]*"
    r")",
    re.IGNORECASE,
)


def strip_chapter_number_prefix(title: str) -> str:
    raw = (title or "").strip()
    if not raw:
        return ""
    cleaned = raw
    while True:
        next_val = _CHAPTER_NUMBER_PREFIX.sub("", cleaned, count=1).strip()
        if next_val == cleaned:
            break
        cleaned = next_val
    return cleaned or raw


def title_has_chapter_number_prefix(title: str) -> bool:
    raw = (title or "").strip()
    if not raw:
        return False
    return strip_chapter_number_prefix(raw) != raw
