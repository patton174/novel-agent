"""Shared old_string matching for EditChapter / EditMemory (Read* line-number tolerant)."""

from __future__ import annotations

import re

from app.agent.harness.tool_display import strip_line_numbers
from app.runtime.text_sanitize import strip_line_leading_fullwidth_indent

_LINE_PREFIX_RE = re.compile(r"^\s*\d+\t")


def strip_read_line_prefixes(text: str) -> str:
    """Normalize ReadChapter/ReadMemory snippets (drop `     1\\t` prefixes)."""
    return strip_line_numbers(text or "")


def _normalize_newlines(text: str) -> str:
    return (text or "").replace("\r\n", "\n").replace("\r", "\n")


def build_old_string_candidates(old_string: str) -> list[str]:
    """Ordered unique candidates — exact first, then Read*-friendly normalizations."""
    seen: set[str] = set()
    out: list[str] = []

    def add(raw: str) -> None:
        piece = raw if raw is not None else ""
        if not piece or piece in seen:
            return
        seen.add(piece)
        out.append(piece)

    base = _normalize_newlines(old_string)
    add(old_string)
    add(base)
    stripped = strip_read_line_prefixes(base)
    add(stripped)
    add(strip_line_leading_fullwidth_indent(stripped))
    add(strip_line_leading_fullwidth_indent(base))
    # Per-line trim (model often copies trailing spaces from UI)
    line_trimmed = "\n".join(line.rstrip() for line in stripped.split("\n"))
    add(line_trimmed)
    return out


def resolve_old_string_match(text: str, old_string: str) -> str | None:
    """Return the substring in `text` to replace, or None if no match."""
    if not old_string:
        return None
    haystack = _normalize_newlines(text)
    for candidate in build_old_string_candidates(old_string):
        if candidate in haystack:
            return candidate
    # ReadChapter numbered body vs raw stored body: match on de-numbered haystack if unique.
    denumbered = strip_read_line_prefixes(haystack)
    if denumbered != haystack:
        for candidate in build_old_string_candidates(old_string):
            if candidate in denumbered:
                idx = denumbered.index(candidate)
                end = idx + len(candidate)
                if denumbered[:idx] == haystack[:idx] and denumbered[end:] == haystack[end:]:
                    return haystack[idx:end]
                if haystack.count(candidate) == 1:
                    return candidate
    return None


def apply_string_replace(
    text: str,
    old_string: str,
    new_string: str,
    *,
    replace_all: bool = False,
) -> tuple[str | None, str | None]:
    """
    Apply edit replace with tolerant old_string resolution.
    Returns (new_text, error). Empty old_string with non-empty new_string replaces entire body.
    """
    body = _normalize_newlines(text)
    if not old_string.strip():
        if not new_string:
            return None, "old_string and new_string cannot both be empty"
        return new_string, None
    matched = resolve_old_string_match(body, old_string)
    if not matched:
        return None, "old_string not found"
    if replace_all:
        return body.replace(matched, new_string), None
    return body.replace(matched, new_string, 1), None
