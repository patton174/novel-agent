"""Append-only memory operation log for planner context (dev: expose history, no autofill)."""

from __future__ import annotations

from typing import Any

_MAX_OPS = 24


def append_memory_op_log(
    context_patch: dict[str, Any] | None,
    *,
    tool: str,
    ok: bool,
    summary: str,
    **fields: Any,
) -> dict[str, Any]:
    patch = dict(context_patch or {})
    log = patch.get("memory_ops_log")
    if not isinstance(log, list):
        log = []
    entry: dict[str, Any] = {
        "tool": tool,
        "ok": ok,
        "summary": str(summary or "")[:240],
    }
    for key, value in fields.items():
        if value is None or value == "":
            continue
        entry[key] = value
    patch["memory_ops_log"] = (list(log) + [entry])[-_MAX_OPS:]
    return patch


def update_character_roster(
    context_patch: dict[str, Any] | None,
    *,
    item_ids: list[str] | None = None,
    removed: str | None = None,
) -> dict[str, Any]:
    patch = dict(context_patch or {})
    roster = patch.get("character_roster")
    if not isinstance(roster, list):
        roster = []
    if item_ids is not None:
        patch["character_roster"] = [str(x) for x in item_ids]
        return patch
    if removed:
        name = str(removed).strip()
        patch["character_roster"] = [x for x in roster if str(x) != name]
    return patch


def memory_ops_for_plan_json(log: Any, *, max_items: int = 12) -> list[dict[str, Any]]:
    """Compact op log entries for planner JSON context."""
    if not isinstance(log, list) or not log:
        return []
    entries: list[dict[str, Any]] = []
    for item in log[-max_items:]:
        if not isinstance(item, dict):
            continue
        row: dict[str, Any] = {
            "tool": str(item.get("tool") or ""),
            "ok": bool(item.get("ok")),
        }
        for key in ("scope", "item_id", "key"):
            val = item.get(key)
            if val:
                row[key] = val
        note = str(item.get("reason") or item.get("summary") or "").strip()
        if note:
            row["note"] = note[:120]
        entries.append(row)
    return entries


def format_memory_ops_for_plan(log: Any, *, max_items: int = 12) -> str:
    lines: list[str] = []
    for row in memory_ops_for_plan_json(log, max_items=max_items):
        status = "OK" if row.get("ok") else "FAIL"
        parts = [status, str(row.get("tool") or "")]
        for key in ("scope", "item_id", "key"):
            val = row.get(key)
            if val:
                parts.append(f"{key}={val}")
        note = str(row.get("note") or "").strip()
        if note:
            parts.append(note)
        lines.append(" · ".join(parts))
    return "\n".join(lines)


def format_character_roster_for_plan(
    roster: Any,
    last_read: Any = None,
) -> str:
    if isinstance(roster, list) and roster:
        return "character_roster：" + ", ".join(str(x) for x in roster)
    if isinstance(last_read, dict) and last_read.get("ok") and last_read.get("scope") == "character":
        names = last_read.get("item_ids") or []
        if names:
            return "character_roster：" + ", ".join(str(n) for n in names)
    return ""
