"""Shared ID helpers for chapter/memory API tools."""

from __future__ import annotations

import re

CHAPTER_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def novel_root(novel_id: str) -> str:
    return f"/novel/{novel_id}"
