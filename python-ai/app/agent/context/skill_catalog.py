"""CC-aligned skill catalog formatting — discovery only; full body via Skill tool."""

from __future__ import annotations

from typing import Any

SKILL_BUDGET_CONTEXT_PERCENT = 0.01
CHARS_PER_TOKEN = 4
DEFAULT_CHAR_BUDGET = 8000
MAX_LISTING_DESC_CHARS = 250
MIN_DESC_LENGTH = 20


def get_char_budget(context_window_tokens: int | None = None) -> int:
    if context_window_tokens and context_window_tokens > 0:
        return int(context_window_tokens * CHARS_PER_TOKEN * SKILL_BUDGET_CONTEXT_PERCENT)
    return DEFAULT_CHAR_BUDGET


def _skill_description(row: dict[str, Any]) -> str:
    desc = str(row.get("description") or "").strip()
    if len(desc) > MAX_LISTING_DESC_CHARS:
        return desc[: MAX_LISTING_DESC_CHARS - 1] + "…"
    return desc


def _format_entry(row: dict[str, Any]) -> str:
    name = str(row.get("name") or "").strip()
    if not name:
        return ""
    desc = _skill_description(row)
    return f"- {name}: {desc}" if desc else f"- {name}"


def format_skills_within_budget(
    skills: list[dict[str, Any]],
    *,
    context_window_tokens: int | None = None,
) -> str:
    """Format skill metadata for RUN_CONTEXT (CC-style ~1% context budget)."""
    entries = [_format_entry(row) for row in skills if isinstance(row, dict)]
    entries = [line for line in entries if line]
    if not entries:
        return ""

    budget = get_char_budget(context_window_tokens)
    full = "\n".join(entries)
    if len(full) <= budget:
        return full

    names_only = "\n".join(
        f"- {str(row.get('name') or '').strip()}"
        for row in skills
        if isinstance(row, dict) and str(row.get("name") or "").strip()
    )
    if len(names_only) <= budget:
        return names_only

    name_overhead = sum(len(str(row.get("name") or "")) + 4 for row in skills if row.get("name"))
    name_overhead += max(0, len(entries) - 1)
    available = budget - name_overhead
    max_desc = max(MIN_DESC_LENGTH, available // max(1, len(entries)))

    trimmed: list[str] = []
    for row in skills:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        desc = _skill_description(row)
        if len(desc) > max_desc:
            desc = desc[: max_desc - 1] + "…"
        trimmed.append(f"- {name}: {desc}" if desc else f"- {name}")
    return "\n".join(trimmed)
