"""Shared old_string matching for EditChapter (Read* line-number tolerant)."""

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


def _normalize_match_text(text: str) -> str:
    """Loosen whitespace / full-width space for fuzzy old_string matching."""
    normalized = _normalize_newlines(text)
    normalized = normalized.replace("\u3000", " ")
    normalized = re.sub(r"[ \t]+\n", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


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
    loose = _normalize_match_text(stripped)
    add(loose)
    return out


def resolve_old_string_match(text: str, old_string: str) -> str | None:
    """Return the substring in `text` to replace, or None if no match."""
    if not old_string:
        return None
    haystack = _normalize_newlines(text)
    loose_haystack = _normalize_match_text(haystack)
    for candidate in build_old_string_candidates(old_string):
        if candidate in haystack:
            return candidate
        loose_candidate = _normalize_match_text(candidate)
        if loose_candidate and loose_candidate in loose_haystack:
            idx = loose_haystack.index(loose_candidate)
            end = idx + len(loose_candidate)
            if loose_haystack[:idx] == _normalize_match_text(haystack[:idx]) and loose_haystack[end:] == _normalize_match_text(haystack[end:]):
                return haystack[idx : idx + len(loose_candidate)]
            if haystack.count(loose_candidate) == 1:
                return loose_candidate
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


def should_fallback_full_body_replace(body: str, old_string: str, new_string: str) -> bool:
    """When old_string cannot match, allow full-body replace for streamed / long rewrites."""
    snippet = (old_string or "").strip()
    replacement = (new_string or "").strip()
    if not snippet or not replacement:
        return False
    stored = (body or "").strip()
    if not stored:
        return True
    return len(replacement) >= max(200, int(len(stored) * 0.55))


def apply_line_range_replace(
    body: str,
    line_start: int,
    line_end: int | None,
    new_text: str,
) -> tuple[str | None, str | None]:
    """Replace lines [line_start, line_end] (1-based, inclusive) with new_text."""
    raw_lines = (body or "").split("\n")
    if not raw_lines or (len(raw_lines) == 1 and raw_lines[0] == "" and not (body or "")):
        raw_lines = [""]
    end = line_end if line_end is not None else line_start
    n = len(raw_lines)
    if line_start < 1 or line_start > n:
        return None, f"line_start out of range (1-{n})"
    if end < line_start:
        return None, "line_end must be >= line_start"
    if end > n:
        return None, f"line_end out of range ({line_start}-{n})"
    replacement = (new_text or "").split("\n")
    merged = raw_lines[: line_start - 1] + replacement + raw_lines[end:]
    return "\n".join(merged), None
