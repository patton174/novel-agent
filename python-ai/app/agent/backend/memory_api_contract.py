"""Align Python memory tool payloads with novel-studio story-memory API semantics."""

from __future__ import annotations

from typing import Any

# Mirrors StoryMemoryService.isKnownCharacterFieldKey
CHARACTER_FIELD_KEYS = frozenset(
    {
        "外貌",
        "性格",
        "定位",
        "基本信息",
        "人物卡",
        "背景",
        "能力",
        "能力定位",
        "能力现状",
        "核心动机",
        "立场",
        "剧情价值",
        "隐藏秘密",
        "name",
    }
)

WHOLE_ITEM_KEYS = frozenset({"*", "全部", "__all__"})
CHARACTER_CARD_KEY = "人物卡"


def normalize_memory_scope(scope: str) -> str:
    raw = (scope or "").strip().lower()
    if raw in ("worldbuilding", "world_building"):
        return "world"
    return raw


def is_whole_item_key(key: str) -> bool:
    return (key or "").strip() in WHOLE_ITEM_KEYS


def is_character_field_key(key: str) -> bool:
    return (key or "").strip() in CHARACTER_FIELD_KEYS


def resolve_delete_api_payload(
    *,
    scope: str,
    key: str,
    item_id: str = "",
    characters: dict[str, Any] | None = None,
    chapters: dict[str, Any] | None = None,
) -> tuple[str, str, str] | tuple[None, None, str]:
    """
    Map tool-level (scope, key[, item_id]) to Content API delete body.

    Returns (scope, api_key, api_item_id) or (None, None, error).
    """
    scope_norm = normalize_memory_scope(scope)
    key_norm = (key or "").strip()
    item_norm = (item_id or "").strip()
    delete_whole = is_whole_item_key(key_norm)

    if scope_norm in ("character", "chapter"):
        roster = characters if scope_norm == "character" else chapters
        roster = roster if isinstance(roster, dict) else {}

        resolved_id = item_norm
        if not resolved_id and not delete_whole and not is_character_field_key(key_norm):
            if key_norm in roster:
                resolved_id = key_norm
            elif scope_norm == "character":
                resolved_id = _fuzzy_match_name(key_norm, roster)
            else:
                resolved_id = key_norm if key_norm in roster else ""

        if not resolved_id:
            if delete_whole or is_character_field_key(key_norm):
                return None, None, "item_id required for character/chapter delete"
            return None, None, f"memory key not found: {key_norm or key}"

        if delete_whole or (
            not is_character_field_key(key_norm)
            and (key_norm == resolved_id or key_norm in roster)
        ):
            return scope_norm, "*", resolved_id

        if is_character_field_key(key_norm) and not item_norm:
            return None, None, "item_id required for character/chapter field delete"

        field_key = key_norm or "*"
        return scope_norm, field_key, resolved_id

    if not key_norm and not delete_whole:
        return None, None, "key required"
    if delete_whole:
        return None, None, "flat scope delete requires concrete key"
    return scope_norm, key_norm, item_norm


def list_memory_entries_from_tree(
    tree: dict[str, Any],
    *,
    scope_filter: str | None = None,
) -> list[dict[str, str]]:
    """Build ListMemory entries with item_id/kind for nested scopes."""
    out: list[dict[str, str]] = []
    scopes = [scope_filter] if scope_filter else ["world", "background", "character", "chapter"]
    for sc in scopes:
        sc_norm = normalize_memory_scope(sc)
        if sc_norm == "character":
            bucket = tree.get("characters")
        elif sc_norm == "chapter":
            bucket = tree.get("chapters")
        elif sc_norm == "background":
            bucket = tree.get("background")
        else:
            bucket = tree.get(sc_norm)
        if not isinstance(bucket, dict):
            continue
        if sc_norm in ("character", "chapter"):
            for item_id in sorted(bucket.keys(), key=str):
                out.append(
                    {
                        "scope": sc_norm,
                        "key": str(item_id),
                        "item_id": str(item_id),
                        "kind": "item",
                    }
                )
        else:
            for key in sorted(bucket.keys(), key=str):
                out.append({"scope": sc_norm, "key": str(key), "kind": "entry"})
    return out


def resolve_patch_api_payload(
    *,
    scope: str,
    key: str,
    item_id: str = "",
    characters: dict[str, Any] | None = None,
    chapters: dict[str, Any] | None = None,
) -> tuple[str, str, str] | tuple[None, None, str]:
    """
    Map tool-level write inputs to Content API patch body fields.

    Returns (scope, api_key, api_item_id) or (None, None, error).
    """
    scope_norm = normalize_memory_scope(scope)
    key_norm = (key or "").strip()
    item_norm = (item_id or "").strip()

    if scope_norm == "character":
        roster = characters if isinstance(characters, dict) else {}
        if item_norm:
            resolved_id = _fuzzy_match_name(item_norm, roster) or item_norm
            field_key = key_norm or CHARACTER_CARD_KEY
            return scope_norm, field_key, resolved_id
        matched = _fuzzy_match_name(key_norm, roster)
        if matched or key_norm in roster:
            resolved_id = matched or key_norm
            return scope_norm, CHARACTER_CARD_KEY, resolved_id
        if is_character_field_key(key_norm):
            return None, None, "item_id required for character field write"
        if not key_norm:
            return None, None, "key required"
        return scope_norm, CHARACTER_CARD_KEY, key_norm

    if scope_norm == "chapter":
        roster = chapters if isinstance(chapters, dict) else {}
        if item_norm:
            resolved_id = item_norm if item_norm in roster else item_norm
            field_key = key_norm or CHARACTER_CARD_KEY
            return scope_norm, field_key, resolved_id
        if key_norm in roster:
            return scope_norm, CHARACTER_CARD_KEY, key_norm
        if is_character_field_key(key_norm):
            return None, None, "item_id required for chapter field write"
        if not key_norm:
            return None, None, "key required"
        return scope_norm, CHARACTER_CARD_KEY, key_norm

    if not key_norm:
        return None, None, "key required"
    return scope_norm, key_norm, item_norm


def _fuzzy_match_name(query: str, roster: dict[str, Any]) -> str:
    q = (query or "").strip()
    if not q or not roster:
        return ""
    if q in roster:
        return q
    q_lower = q.lower()
    for name in roster:
        if name.lower() == q_lower:
            return name
    return ""
