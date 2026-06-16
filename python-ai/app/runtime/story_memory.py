"""Novel-scoped story memory for world, characters, chapters, background and novel profile."""

from __future__ import annotations

import re
from threading import RLock
from typing import Any

from app.runtime import story_memory_content

_LOCK = RLock()
_STORE: dict[str, dict[str, Any]] = {}

_EMPTY = {
    "novel": {},
    "world": {},
    "characters": {},
    "chapters": {},
    "background": {},
}


def resolve_novel_id(
    novel_id: str | None = None,
    *,
    project: dict[str, Any] | None = None,
) -> str | None:
    raw = (novel_id or "").strip()
    if raw:
        return raw
    if isinstance(project, dict):
        pid = project.get("id")
        if pid is not None and str(pid).strip():
            return str(pid).strip()
    return None


def _store_key(session_id: str, novel_id: str | None = None) -> str:
    novel = resolve_novel_id(novel_id)
    if novel:
        return f"novel:{novel}"
    return f"session:{session_id}"


def _ensure_store(store_key: str) -> dict[str, Any]:
    with _LOCK:
        row = _STORE.get(store_key)
        if row is None:
            row = {
                "novel": {},
                "world": {},
                "characters": {},
                "chapters": {},
                "background": {},
            }
            _STORE[store_key] = row
        return row


def get_story_memory(
    session_id: str,
    *,
    user_id: int | None = None,
    novel_id: str | None = None,
    project: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not session_id and not resolve_novel_id(novel_id, project=project):
        return dict(_EMPTY)
    store_key = _store_key(session_id, resolve_novel_id(novel_id, project=project))
    resolved_novel = resolve_novel_id(novel_id, project=project)
    if user_id and user_id > 0:
        remote = story_memory_content.fetch_story_memory(
            user_id,
            novel_id=resolved_novel,
            session_id=session_id if not resolved_novel else None,
        )
        if remote is not None:
            with _LOCK:
                _STORE[store_key] = _copy_memory_tree(remote)
            return _snapshot_from_row(remote)
    with _LOCK:
        row = _STORE.get(store_key)
        if not row:
            return {
                "novel": {},
                "world": {},
                "characters": {},
                "chapters": {},
                "background": {},
            }
        return _snapshot_from_row(row)


def _copy_memory_tree(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "novel": dict(data.get("novel") or {}),
        "world": dict(data.get("world") or {}),
        "characters": {
            str(k): dict(v or {})
            for k, v in (data.get("characters") or {}).items()
        },
        "chapters": {
            str(k): dict(v or {})
            for k, v in (data.get("chapters") or {}).items()
        },
        "background": dict(data.get("background") or {}),
    }


def _snapshot_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "novel": dict(row.get("novel") or {}),
        "world": dict(row.get("world") or {}),
        "characters": {
            str(k): dict(v or {})
            for k, v in (row.get("characters") or {}).items()
        },
        "chapters": {
            str(k): dict(v or {})
            for k, v in (row.get("chapters") or {}).items()
        },
        "background": dict(row.get("background") or {}),
    }


_VALID_SCOPES = frozenset({"novel", "world", "character", "chapter", "background"})

_SCOPE_ALIASES: dict[str, str] = {
    "worldbuilding": "world",
    "world_building": "world",
    "world-view": "world",
    "worldview": "world",
    "setting": "world",
    "settings": "world",
    "世界观": "world",
    "characters": "character",
    "char": "character",
    "person": "character",
    "人物": "character",
    "chapters": "chapter",
    "chapter_memory": "chapter",
    "章节": "chapter",
    "backgrounds": "background",
    "背景设定": "background",
}


def normalize_memory_scope(scope: str) -> str:
    """Map LLM-friendly scope names to canonical storage scopes."""
    raw = (scope or "").strip().lower()
    if not raw:
        return ""
    return _SCOPE_ALIASES.get(raw, raw)


def _normalize_scope(scope: str) -> str:
    return normalize_memory_scope(scope)


def _require_bucket_id(scope_norm: str, item_id: str | None) -> str:
    bucket_id = (item_id or "").strip()
    if not bucket_id:
        raise ValueError(f"item_id required for {scope_norm} scope")
    return bucket_id


def _scope_bucket(row: dict[str, Any], scope_norm: str, item_id: str | None) -> dict[str, Any]:
    if scope_norm == "character":
        return row["characters"].setdefault(_require_bucket_id(scope_norm, item_id), {})
    if scope_norm == "chapter":
        return row["chapters"].setdefault(_require_bucket_id(scope_norm, item_id), {})
    if scope_norm == "world":
        return row["world"]
    if scope_norm == "background":
        return row["background"]
    return row["novel"]


_CHARACTER_CARD_KEY = "人物卡"

_FLAT_SCOPES = frozenset({"world", "novel", "background"})

_FLAT_KEY_ALIASES: dict[str, tuple[str, ...]] = {
    "worldview": ("worldview", "世界观框架", "世界观"),
    "core_settings": ("core_settings", "核心设定", "核心机制"),
    "世界观框架": ("世界观框架", "worldview", "世界观"),
    "核心设定": ("核心设定", "core_settings", "核心机制"),
}

_WORLD_VALUE_RAG_THRESHOLD = 900
_WORLD_VALUE_RAG_MAX = 2400

_CHARACTER_FIELD_KEYS = frozenset(
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


def fuzzy_match_character_name(
    query: str,
    roster: dict[str, Any],
) -> tuple[str | None, str | None]:
    """Fuzzy match query against character bucket keys. Returns (name, ambiguity_error)."""
    q = (query or "").strip()
    if not q:
        return None, None
    if not roster:
        return None, None
    if q in roster:
        return q, None

    q_lower = q.lower()
    for name in roster:
        if name.lower() == q_lower:
            return name, None

    substring_hits = [name for name in roster if q in name or name in q]
    if not substring_hits:
        return None, None
    if len(substring_hits) == 1:
        return substring_hits[0], None

    prefix_hits = [name for name in substring_hits if name.startswith(q) or q.startswith(name)]
    if len(prefix_hits) == 1:
        return prefix_hits[0], None

    substring_hits.sort(key=lambda name: (0 if q in name else 1, abs(len(name) - len(q)), len(name)))
    best = substring_hits[0]
    if len(substring_hits) > 1 and substring_hits[1].startswith(q) == best.startswith(q):
        options = ", ".join(substring_hits[:5])
        return None, f"角色名模糊匹配歧义: {q!r} 可能指 {options}"
    return best, None


def _resolve_character_bucket_and_field(
    *,
    key: str,
    item_id: str | None,
    characters: dict[str, Any],
) -> tuple[str | None, str | None, str | None]:
    """Resolve character bucket id and attribute key. Returns (bucket_id, field_key, error)."""
    key_norm = (key or "").strip()
    id_norm = (item_id or "").strip()

    if id_norm:
        matched, ambiguity = fuzzy_match_character_name(id_norm, characters)
        if ambiguity:
            return None, None, ambiguity
        bucket_id = matched or id_norm
        if not key_norm:
            return None, None, "key required"
        return bucket_id, key_norm, None

    matched, ambiguity = fuzzy_match_character_name(key_norm, characters)
    if ambiguity:
        return None, None, ambiguity
    if matched:
        return matched, _CHARACTER_CARD_KEY, None

    if key_norm in _CHARACTER_FIELD_KEYS:
        return (
            None,
            None,
            "character scope: key 应为角色名（支持模糊匹配），更新具体字段请同时提供 item_id",
        )
    if not key_norm:
        return None, None, "item_id required for character write"
    return key_norm, _CHARACTER_CARD_KEY, None


def _resolve_character_bucket_id(
    *,
    key: str | None,
    item_id: str | None,
    characters: dict[str, Any],
) -> tuple[str | None, str | None]:
    """Resolve character bucket id for read/delete. Returns (bucket_id, error)."""
    id_norm = (item_id or "").strip()
    key_norm = (key or "").strip()

    if id_norm:
        matched, ambiguity = fuzzy_match_character_name(id_norm, characters)
        if ambiguity:
            return None, ambiguity
        return matched or id_norm, None

    if not key_norm:
        return None, None

    matched, ambiguity = fuzzy_match_character_name(key_norm, characters)
    if ambiguity:
        return None, ambiguity
    if matched:
        return matched, None
    if key_norm in _CHARACTER_FIELD_KEYS:
        return None, "item_id required for character read"
    return key_norm, None


def _fuzzy_match_dict_key(
    query: str,
    rows: dict[str, Any],
) -> tuple[str | None, str | None]:
    q = (query or "").strip()
    if not q or not rows:
        return None, None
    if q in rows:
        return q, None

    q_lower = q.lower()
    for name in rows:
        if name.lower() == q_lower:
            return name, None

    substring_hits = [name for name in rows if q in name or name in q]
    if not substring_hits:
        return None, None
    if len(substring_hits) == 1:
        return substring_hits[0], None

    prefix_hits = [name for name in substring_hits if name.startswith(q) or q.startswith(name)]
    if len(prefix_hits) == 1:
        return prefix_hits[0], None

    substring_hits.sort(key=lambda name: (0 if q in name else 1, abs(len(name) - len(q)), len(name)))
    best = substring_hits[0]
    if len(substring_hits) > 1 and substring_hits[1].startswith(q) == best.startswith(q):
        options = ", ".join(substring_hits[:5])
        return None, f"记忆键模糊匹配歧义: {q!r} 可能指 {options}"
    return best, None


def _resolve_flat_scope_read_key(
    *,
    key: str | None,
    item_id: str | None,
    rows: dict[str, Any],
) -> tuple[str | None, str | None]:
    """Resolve a flat-scope memory key from key and/or item_id."""
    candidates: list[str] = []
    for raw in (key, item_id):
        text = (raw or "").strip()
        if text and text not in candidates:
            candidates.append(text)
    if not candidates:
        return None, None

    for candidate in candidates:
        if candidate in rows:
            return candidate, None

        alias_group = _FLAT_KEY_ALIASES.get(candidate) or _FLAT_KEY_ALIASES.get(candidate.lower())
        if alias_group:
            for alias in alias_group:
                if alias in rows:
                    return alias, None

        matched, ambiguity = _fuzzy_match_dict_key(candidate, rows)
        if ambiguity:
            return None, ambiguity
        if matched:
            return matched, None

    return None, f"key not found: {candidates[0]}"


def _retrieve_relevant_text_chunks(
    text: str,
    query: str | None,
    *,
    max_chars: int = _WORLD_VALUE_RAG_MAX,
    top_k: int = 6,
) -> str:
    """Keyword RAG within a large flat memory value."""
    raw = (text or "").strip()
    if not raw:
        return raw
    if len(raw) <= _WORLD_VALUE_RAG_THRESHOLD:
        return raw

    q = (query or "").strip()
    if not q:
        return raw[:max_chars] + ("…" if len(raw) > max_chars else "")

    chunks = [part.strip() for part in re.split(r"\n{2,}", raw) if part.strip()]
    if not chunks:
        chunks = [raw[i : i + 420] for i in range(0, len(raw), 420)]

    terms = [t for t in re.split(r"[\s,，、；;]+", q) if len(t) >= 2]
    scored: list[tuple[int, int, str]] = []
    q_lower = q.lower()
    for index, chunk in enumerate(chunks):
        lower = chunk.lower()
        score = 0
        if q_lower in lower:
            score += 5
        for term in terms:
            if term.lower() in lower:
                score += 2
        if score > 0:
            scored.append((score, index, chunk))

    if not scored:
        return raw[:max_chars] + ("…" if len(raw) > max_chars else "")

    scored.sort(key=lambda item: (-item[0], item[1]))
    picked = [chunk for _, _, chunk in scored[:top_k]]
    merged = "\n\n".join(picked).strip()
    if len(merged) > max_chars:
        return merged[:max_chars] + "…"
    return merged


def read_story_memory_item(
    session_id: str,
    *,
    scope: str,
    key: str | None = None,
    item_id: str | None = None,
    query: str | None = None,
    novel_id: str | None = None,
    project: dict[str, Any] | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    if not session_id and not resolve_novel_id(novel_id, project=project):
        return {"ok": False, "reason": "empty session/novel id"}
    scope_norm = _normalize_scope(scope)
    if scope_norm not in _VALID_SCOPES:
        return {"ok": False, "reason": f"unsupported scope: {scope_norm}"}
    snapshot = get_story_memory(
        session_id,
        user_id=user_id,
        novel_id=novel_id,
        project=project,
    )
    if scope_norm in ("character", "chapter"):
        bucket = snapshot["characters"] if scope_norm == "character" else snapshot["chapters"]
        if not item_id and not key:
            return {
                "ok": True,
                "scope": scope_norm,
                "entries": {
                    str(name): dict(attrs or {})
                    for name, attrs in bucket.items()
                },
                "item_ids": list(bucket.keys()),
                "count": len(bucket),
            }
        if scope_norm == "character":
            bucket_key, resolve_err = _resolve_character_bucket_id(
                key=key,
                item_id=item_id,
                characters=bucket,
            )
            if resolve_err:
                return {"ok": False, "reason": resolve_err}
            if not bucket_key:
                return {
                    "ok": False,
                    "reason": "item_id required for character read",
                }
            key_norm = (key or "").strip()
            matched_name, _ = fuzzy_match_character_name(key_norm, bucket)
            field_key = None if matched_name else key_norm
            if field_key:
                item = bucket.get(bucket_key) or {}
                if field_key not in item:
                    return {"ok": False, "reason": f"key not found: {field_key}"}
                return {
                    "ok": True,
                    "scope": scope_norm,
                    "item_id": bucket_key,
                    "key": field_key,
                    "value": item.get(field_key),
                }
            if bucket_key not in bucket:
                return {"ok": False, "reason": f"item not found: {bucket_key}"}
            return {
                "ok": True,
                "scope": scope_norm,
                "item_id": bucket_key,
                "entries": dict(bucket.get(bucket_key) or {}),
            }
        bucket_key = (item_id or "").strip()
        if key or bucket_key:
            if not bucket_key:
                return {
                    "ok": False,
                    "reason": f"item_id required for {scope_norm} read",
                }
        if key:
            item = bucket.get(bucket_key) or {}
            if key not in item:
                return {"ok": False, "reason": f"key not found: {key}"}
            return {
                "ok": True,
                "scope": scope_norm,
                "item_id": bucket_key,
                "key": key,
                "value": item.get(key),
            }
        if bucket_key not in bucket:
            return {"ok": False, "reason": f"item not found: {bucket_key}"}
        return {
            "ok": True,
            "scope": scope_norm,
            "item_id": bucket_key,
            "entries": dict(bucket.get(bucket_key) or {}),
        }
    rows = snapshot["world"] if scope_norm == "world" else (
        snapshot["background"] if scope_norm == "background" else snapshot["novel"]
    )
    if scope_norm in _FLAT_SCOPES:
        resolved_key, resolve_err = _resolve_flat_scope_read_key(
            key=key,
            item_id=item_id,
            rows=rows,
        )
        if resolve_err:
            return {"ok": False, "reason": resolve_err}
        if resolved_key:
            value = _retrieve_relevant_text_chunks(
                str(rows.get(resolved_key) or ""),
                query or key or item_id,
            )
            return {
                "ok": True,
                "scope": scope_norm,
                "key": resolved_key,
                "value": value,
                "retrieved": len(value) < len(str(rows.get(resolved_key) or "")),
            }
        return {"ok": True, "scope": scope_norm, "entries": dict(rows)}
    if key:
        if key not in rows:
            return {"ok": False, "reason": f"key not found: {key}"}
        return {"ok": True, "scope": scope_norm, "key": key, "value": rows[key]}
    return {"ok": True, "scope": scope_norm, "entries": dict(rows)}


def delete_story_memory_item(
    session_id: str,
    *,
    scope: str,
    key: str,
    item_id: str | None = None,
    novel_id: str | None = None,
    project: dict[str, Any] | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    if not session_id and not resolve_novel_id(novel_id, project=project):
        return {"ok": False, "reason": "empty session/novel id"}
    scope_norm = _normalize_scope(scope)
    key_norm = (key or "").strip()
    if scope_norm not in _VALID_SCOPES:
        return {"ok": False, "reason": f"unsupported scope: {scope_norm}"}

    resolved_novel = resolve_novel_id(novel_id, project=project)
    store_key = _store_key(session_id, resolved_novel)
    delete_whole_item = key_norm in ("*", "全部", "__all__")
    resolved_item_id = item_id

    if scope_norm in ("character", "chapter") and not key_norm and (item_id or "").strip():
        key_norm = "*"
        delete_whole_item = True
    elif scope_norm not in ("character", "chapter") and not key_norm:
        return {"ok": False, "reason": "key required"}

    if scope_norm == "character":
        snapshot = get_story_memory(
            session_id,
            user_id=user_id,
            novel_id=novel_id,
            project=project,
        )
        id_norm = (item_id or "").strip()
        if id_norm:
            bucket_id, resolve_err = _resolve_character_bucket_id(
                item_id=id_norm,
                key=None,
                characters=snapshot["characters"],
            )
        elif delete_whole_item or key_norm in _CHARACTER_FIELD_KEYS:
            bucket_id, resolve_err = None, "item_id required for character/chapter delete"
        else:
            bucket_id, resolve_err = _resolve_character_bucket_id(
                key=key_norm,
                item_id=None,
                characters=snapshot["characters"],
            )
        if resolve_err:
            return {"ok": False, "reason": resolve_err}
        if not bucket_id:
            return {"ok": False, "reason": "item_id required for character/chapter delete"}
        resolved_item_id = bucket_id

    if user_id and user_id > 0:
        snapshot = get_story_memory(
            session_id,
            user_id=user_id,
            novel_id=novel_id,
            project=project,
        )
        from app.agent.backend.memory_api_contract import resolve_delete_api_payload

        resolved = resolve_delete_api_payload(
            scope=scope_norm,
            key=key_norm,
            item_id=(item_id or resolved_item_id or ""),
            characters=snapshot.get("characters"),
            chapters=snapshot.get("chapters"),
        )
        if resolved[0] is None:
            return {"ok": False, "reason": str(resolved[2])}
        api_scope, api_key, api_item_id = resolved
        remote = story_memory_content.delete_story_memory_remote(
            user_id,
            novel_id=resolved_novel,
            session_id=session_id if not resolved_novel else None,
            scope=api_scope,
            key=api_key,
            item_id=api_item_id or None,
        )
        if remote.get("ok"):
            memory = remote.get("memory")
            if isinstance(memory, dict):
                with _LOCK:
                    _STORE[store_key] = _copy_memory_tree(memory)
            result = {
                "ok": True,
                "scope": remote.get("scope", scope_norm),
                "deleted": True,
            }
            if remote.get("item_id"):
                result["item_id"] = remote.get("item_id")
            if remote.get("key"):
                result["key"] = remote.get("key")
            elif key_norm not in ("*", "全部", "__all__"):
                result["key"] = key_norm
            return result
        return remote

    row = _ensure_store(store_key)
    if scope_norm in ("character", "chapter"):
        groups = row["characters"] if scope_norm == "character" else row["chapters"]
        if scope_norm == "character":
            bucket_id = (resolved_item_id or "").strip()
            if not bucket_id:
                return {"ok": False, "reason": "item_id required for character/chapter delete"}
        else:
            bucket_id = (item_id or "").strip()
            if not bucket_id:
                return {"ok": False, "reason": "item_id required for character/chapter delete"}
        if bucket_id not in groups:
            return {"ok": False, "reason": f"item not found: {bucket_id}"}
        if delete_whole_item:
            del groups[bucket_id]
            return {
                "ok": True,
                "scope": scope_norm,
                "item_id": bucket_id,
                "deleted": True,
            }
        bucket = groups[bucket_id]
        if key_norm not in bucket:
            return {"ok": False, "reason": f"key not found: {key_norm}"}
        del bucket[key_norm]
        if not bucket:
            del groups[bucket_id]
        return {
            "ok": True,
            "scope": scope_norm,
            "item_id": bucket_id,
            "key": key_norm,
            "deleted": True,
        }

    if delete_whole_item:
        return {"ok": False, "reason": "flat scope delete requires concrete key"}
    bucket = _scope_bucket(row, scope_norm, item_id)
    if key_norm not in bucket:
        return {"ok": False, "reason": f"key not found: {key_norm}"}
    del bucket[key_norm]
    return {"ok": True, "scope": scope_norm, "key": key_norm, "deleted": True}


def patch_story_memory(
    session_id: str,
    *,
    scope: str,
    key: str,
    value: str,
    item_id: str | None = None,
    user_id: int | None = None,
    novel_id: str | None = None,
    project: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not session_id and not resolve_novel_id(novel_id, project=project):
        return {"ok": False, "reason": "empty session/novel id"}
    scope_norm = _normalize_scope(scope)
    key_norm = (key or "").strip()
    value_norm = (value or "").strip()
    if scope_norm not in _VALID_SCOPES:
        return {"ok": False, "reason": f"unsupported scope: {scope_norm}"}
    if not key_norm or not value_norm:
        return {"ok": False, "reason": "key/value required"}

    resolved_novel = resolve_novel_id(novel_id, project=project)
    store_key = _store_key(session_id, resolved_novel)
    resolved_item_id = item_id
    resolved_key = key_norm

    if scope_norm == "character":
        snapshot = get_story_memory(
            session_id,
            user_id=user_id,
            novel_id=novel_id,
            project=project,
        )
        bucket_id, field_key, resolve_err = _resolve_character_bucket_and_field(
            key=key_norm,
            item_id=item_id,
            characters=snapshot["characters"],
        )
        if resolve_err:
            return {"ok": False, "reason": resolve_err}
        resolved_item_id = bucket_id
        resolved_key = field_key or key_norm

    if scope_norm in ("character", "chapter") and not (resolved_item_id or "").strip():
        return {"ok": False, "reason": f"item_id required for {scope_norm} write"}

    if user_id and user_id > 0:
        remote = story_memory_content.patch_story_memory_remote(
            user_id,
            novel_id=resolved_novel,
            session_id=session_id if not resolved_novel else None,
            scope=scope_norm,
            key=resolved_key,
            value=value_norm,
            item_id=resolved_item_id,
        )
        if remote.get("ok"):
            memory = remote.get("memory")
            if isinstance(memory, dict):
                with _LOCK:
                    _STORE[store_key] = _copy_memory_tree(memory)
            return {
                "ok": True,
                "scope": remote.get("scope", scope_norm),
                "key": remote.get("key", resolved_key),
                "changed": remote.get("changed", True),
                **({"item_id": resolved_item_id.strip()} if resolved_item_id else {}),
            }
        return remote

    row = _ensure_store(store_key)
    bucket = _scope_bucket(row, scope_norm, resolved_item_id)
    prev = str(bucket.get(resolved_key) or "").strip()
    changed = prev != value_norm
    bucket[resolved_key] = value_norm
    result = {"ok": True, "scope": scope_norm, "key": resolved_key, "changed": changed}
    if resolved_item_id:
        result["item_id"] = resolved_item_id.strip()
    return result


def render_story_memory_for_prompt(
    session_id: str,
    *,
    max_len: int = 900,
    compact: bool = True,
    user_id: int | None = None,
    novel_id: str | None = None,
    project: dict[str, Any] | None = None,
) -> str:
    snapshot = get_story_memory(
        session_id,
        user_id=user_id,
        novel_id=novel_id,
        project=project,
    )
    if compact:
        from app.agent.context.compact import render_story_memory_compact_from_snapshot

        return render_story_memory_compact_from_snapshot(
            snapshot,
            max_len=max_len,
            character_first=bool(snapshot.get("characters")),
        )

    lines: list[str] = []

    def _emit(title: str, rows: dict[str, Any]) -> None:
        if not rows:
            return
        lines.append(f"{title}:")
        for k, v in rows.items():
            lines.append(f"- {k}: {v}")

    _emit("小说信息", snapshot["novel"])
    _emit("世界观设定", snapshot["world"])
    _emit("背景设定", snapshot["background"])

    if snapshot["characters"]:
        lines.append("人物塑造:")
        for name, attrs in snapshot["characters"].items():
            lines.append(f"- {name}:")
            for k, v in (attrs or {}).items():
                lines.append(f"  - {k}: {v}")

    if snapshot["chapters"]:
        lines.append("章节记忆:")
        for chapter, attrs in snapshot["chapters"].items():
            lines.append(f"- {chapter}:")
            for k, v in (attrs or {}).items():
                lines.append(f"  - {k}: {v}")

    text = "\n".join(lines).strip()
    if len(text) > max_len:
        return text[:max_len] + "…"
    return text
