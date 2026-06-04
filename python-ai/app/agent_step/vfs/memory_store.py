"""Memory read/write via story_memory runtime."""

from __future__ import annotations

import json
from typing import Any

from app.agent_step.schemas import AgentRunContext
from app.runtime import story_memory_content
from app.runtime.story_memory import (
    delete_story_memory_item,
    patch_story_memory,
    read_story_memory_item,
)


async def fetch_memory_read_slice(
    ctx: AgentRunContext,
    scope: str,
    key: str = "",
    *,
    item_id: str = "",
    offset: int | None = None,
    limit: int | None = None,
) -> tuple[str | None, str | None]:
    """Content API paginated read (numbered lines)."""
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    return story_memory_content.fetch_memory_read_slice(
        ctx.user_id,
        novel_id=novel_id or None,
        session_id=ctx.session_id if not novel_id else None,
        scope=scope,
        key=key,
        item_id=item_id or None,
        offset=offset,
        limit=limit,
    )


def read_memory_json(
    ctx: AgentRunContext, scope: str, key: str, *, item_id: str = ""
) -> tuple[str | None, str | None]:
    try:
        result = read_story_memory_item(
            ctx.session_id,
            scope=scope,
            key=key or None,
            item_id=item_id or None,
            user_id=ctx.user_id,
            novel_id=ctx.novel_id,
            project=ctx.project,
        )
    except Exception as exc:
        return None, str(exc)
    if not isinstance(result, dict) or not result.get("ok"):
        return None, str(result.get("reason") if isinstance(result, dict) else "memory read failed")
    if "value" in result:
        val = result.get("value")
        text = val if isinstance(val, str) else json.dumps(val, ensure_ascii=False, indent=2)
        return text, None
    return json.dumps(result, ensure_ascii=False, indent=2), None


def write_memory_json(
    ctx: AgentRunContext,
    scope: str,
    key: str,
    value: Any,
    *,
    item_id: str = "",
) -> tuple[bool, str]:
    try:
        if not isinstance(value, str):
            value = json.dumps(value, ensure_ascii=False)
        result = patch_story_memory(
            ctx.session_id,
            scope=scope,
            key=key,
            value=str(value),
            item_id=item_id or None,
            user_id=ctx.user_id,
            novel_id=ctx.novel_id,
            project=ctx.project,
        )
        if isinstance(result, dict) and result.get("ok"):
            return True, ""
        reason = result.get("reason") if isinstance(result, dict) else "patch failed"
        return False, str(reason or "patch failed")
    except Exception as exc:
        return False, str(exc)


def delete_memory(
    ctx: AgentRunContext, scope: str, key: str, *, item_id: str = ""
) -> tuple[bool, str]:
    try:
        result = delete_story_memory_item(
            ctx.session_id,
            scope=scope,
            key=key,
            item_id=item_id or None,
            user_id=ctx.user_id,
            novel_id=ctx.novel_id,
        )
        if not isinstance(result, dict):
            return False, "delete failed"
        if result.get("ok"):
            return True, ""
        return False, str(result.get("reason") or "delete failed")
    except Exception as exc:
        return False, str(exc)


def persist_memory_document(
    ctx: AgentRunContext,
    scope: str,
    entry_id: str,
    envelope: dict[str, Any],
    *,
    item_id: str = "",
) -> tuple[bool, str]:
    """Write v1 envelope to story-memory API (flat key or character item_id)."""
    from app.agent_step.vfs.memory_document import envelope_to_storage_fields

    fields = envelope_to_storage_fields(envelope, scope=scope)
    scope_norm = (scope or "").strip().lower()
    if scope_norm in ("character", "chapter"):
        cid = (item_id or entry_id or "").strip()
        if not cid:
            return False, "item_id required for character/chapter memory"
        for field_key, value in fields.items():
            ok, err = write_memory_json(ctx, scope_norm, field_key, value, item_id=cid)
            if not ok:
                return False, err or "patch failed"
        return True, ""

    storage_key = (entry_id or "").strip()
    if not storage_key:
        return False, "memory key required"
    payload = json.dumps(envelope, ensure_ascii=False)
    return write_memory_json(ctx, scope_norm, storage_key, payload)
