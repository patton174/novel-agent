"""TodoWrite helpers — model-facing summaries and reminders."""

from __future__ import annotations

from typing import Any

TODO_REMINDER_TURNS = 8
TODO_REMINDER_INTERVAL = 8


def format_todos_for_model(todos: list[dict[str, Any]]) -> str:
    if not todos:
        return "Todos cleared (empty list)."
    completed = sum(1 for t in todos if str(t.get("status") or "") == "completed")
    in_progress = sum(1 for t in todos if str(t.get("status") or "") == "in_progress")
    pending = len(todos) - completed - in_progress
    lines = [
        f"Todos updated ({len(todos)} items: {completed} completed, "
        f"{in_progress} in_progress, {pending} pending):"
    ]
    order = {"in_progress": 0, "pending": 1, "completed": 2, "cancelled": 3}
    sorted_items = sorted(
        todos,
        key=lambda t: (
            order.get(str(t.get("status") or "pending"), 9),
            str(t.get("id") or ""),
        ),
    )
    for t in sorted_items:
        tid = str(t.get("id") or "").strip()
        content = str(t.get("content") or "").strip()
        status = str(t.get("status") or "pending").strip()
        lines.append(f"- [{status}] {tid}: {content}")
    lines.append(
        "Keep exactly one in_progress when work is active; mark completed immediately after each task."
    )
    return "\n".join(lines)


def working_todos_from_patch(context_patch: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(context_patch, dict):
        return []
    raw = context_patch.get("todos")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict) and item.get("id") and item.get("content"):
            out.append(
                {
                    "id": str(item["id"]),
                    "content": str(item["content"]),
                    "status": str(item.get("status") or "pending"),
                }
            )
    return out
