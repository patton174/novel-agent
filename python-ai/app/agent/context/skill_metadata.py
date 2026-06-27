"""Shared skill metadata helpers for run context and tools."""

from __future__ import annotations

from typing import Any


def skill_metadata_from_api(data: dict[str, Any], *, fallback_id: str = "") -> dict[str, Any]:
    """Build RUN_CONTEXT skill_ids row from internal API payload."""
    skill_id = str(data.get("id") or fallback_id).strip()
    name = str(data.get("name") or data.get("slug") or fallback_id).strip() or fallback_id
    return {
        "id": skill_id,
        "name": name,
        "description": str(data.get("description") or "").strip(),
        "version": data.get("version", 1),
        "is_system": bool(data.get("is_system")),
        "enabled": data.get("enabled") is not False,
    }


def merge_skill_metadata(
    existing: list[dict[str, Any]],
    new_row: dict[str, Any],
) -> list[dict[str, Any]] | None:
    """Append metadata if id/name not already present; return None when unchanged."""
    skill_id = str(new_row.get("id") or "").strip()
    name = str(new_row.get("name") or "").strip()
    if any(
        str(row.get("id") or "").strip() == skill_id or str(row.get("name") or "").strip() == name
        for row in existing
        if isinstance(row, dict)
    ):
        return None
    return [*existing, new_row]
