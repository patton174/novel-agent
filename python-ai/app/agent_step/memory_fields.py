"""Extract scope/key/value for memory_patch from step inputs."""

from __future__ import annotations

import json
from typing import Any

from app.runtime.story_memory import normalize_memory_scope

_NESTED_KEYS = ("memory", "patch", "memory_patch", "fields", "data", "entry")
_FLAT_SCOPES = frozenset({"novel", "world", "background"})
_CHARACTER_NAME_KEYS = frozenset({"name", "姓名", "角色名", "角色"})


def normalize_memory_value(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, (dict, list)):
        return json.dumps(raw, ensure_ascii=False)
    return str(raw).strip()


def _parse_json_object(value: str) -> dict[str, Any] | None:
    text = (value or "").strip()
    if not text.startswith("{"):
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def expand_memory_writes(
    scope: str,
    key: str,
    value: str,
    item_id: str | None,
) -> list[tuple[str, str, str, str | None]]:
    """Split nested JSON agent output into flat scope/key/value rows before patch."""
    scope_norm = normalize_memory_scope(scope)
    key = (key or "").strip()
    value = (value or "").strip()
    if not scope_norm or not key or not value:
        return []

    parsed = _parse_json_object(value)
    if parsed and scope_norm in _FLAT_SCOPES and len(parsed) > 1:
        rows: list[tuple[str, str, str, str | None]] = []
        for field_key, field_val in parsed.items():
            fk = str(field_key).strip()
            fv = normalize_memory_value(field_val)
            if fk and fv:
                rows.append((scope_norm, fk, fv, item_id))
        if rows:
            return rows

    if scope_norm != "character" or not parsed:
        return [(scope_norm, key, value, item_id)]

    resolved_item = (
        str(item_id).strip()
        if item_id
        else str(
            parsed.get("name")
            or parsed.get("姓名")
            or parsed.get("角色名")
            or (key if key not in ("人物卡",) else "")
            or ""
        ).strip()
        or None
    )

    rows = []
    for field_key, field_val in parsed.items():
        fk = str(field_key).strip()
        if not fk or fk in _CHARACTER_NAME_KEYS:
            continue
        fv = normalize_memory_value(field_val)
        if fv:
            rows.append((scope_norm, fk, fv, resolved_item))

    if rows:
        return rows
    return [(scope_norm, key, value, item_id)]


def memory_fields_from_mapping(mapping: dict[str, Any]) -> tuple[str, str, str, str | None]:
    scope = normalize_memory_scope(
        str(
            mapping.get("scope")
            or mapping.get("memory_scope")
            or mapping.get("memoryScope")
            or ""
        )
    )
    key = str(
        mapping.get("key")
        or mapping.get("memory_key")
        or mapping.get("memoryKey")
        or ""
    ).strip()
    value = normalize_memory_value(
        mapping.get("value")
        if "value" in mapping
        else mapping.get("memory_value") or mapping.get("memoryValue")
    )
    item_id = (
        mapping.get("item_id")
        or mapping.get("itemId")
        or mapping.get("memory_item_id")
    )
    item = str(item_id).strip() if item_id else None
    if scope and key and value:
        return scope, key, value, item

    for nest_key in _NESTED_KEYS:
        nested = mapping.get(nest_key)
        if isinstance(nested, dict):
            nested_scope, nested_key, nested_value, nested_item = memory_fields_from_mapping(
                nested
            )
            if nested_scope and nested_key and nested_value:
                return nested_scope, nested_key, nested_value, nested_item
    return "", "", "", None


def memory_fields_from_step_input(
    tool_input: dict[str, Any],
    *,
    context_patch: dict[str, Any] | None = None,
) -> tuple[str, str, str, str | None]:
    merged: dict[str, Any] = {}
    if context_patch:
        merged.update(context_patch)
    merged.update(tool_input or {})
    return memory_fields_from_mapping(merged)


def suggest_memory_fields_from_context(
    *,
    user_message: str = "",
    selected_choice: dict[str, Any] | None = None,
    context_patch: dict[str, Any] | None = None,
    think_summary: str = "",
) -> dict[str, Any] | None:
    """Build memory_patch next_input when plan chose memory_patch but omitted fields."""
    patch = context_patch if isinstance(context_patch, dict) else {}
    summary = (think_summary or str(patch.get("think_summary") or "")).strip()
    choice = selected_choice if isinstance(selected_choice, dict) else None
    if choice:
        title = str(choice.get("title") or "").strip()
        desc = str(choice.get("description") or "").strip()
        if title:
            payload: dict[str, str] = {"创作方向": title}
            if desc:
                payload["说明"] = desc
            if summary:
                payload["思考摘要"] = summary[:800]
            return {"scope": "novel", "key": "创作规划", "value": payload}
    if summary and user_message.strip():
        combined = f"{user_message} {summary}"
        world_hints = ("世界观", "设定", "掉宝", "势力", "worldbuilding", "world building")
        if any(h in combined for h in world_hints):
            return {
                "scope": "world",
                "key": "世界观框架",
                "value": summary[:8000] if len(summary) > 800 else summary,
            }
        return {
            "scope": "novel",
            "key": "创作规划",
            "value": {
                "用户诉求": user_message.strip()[:300],
                "思考摘要": summary[:800],
            },
        }
    return None
