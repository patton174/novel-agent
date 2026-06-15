"""Memory tools — story-memory API with scope enum + raw key."""

from __future__ import annotations

import json
from typing import Any

from app.agent.backend import memory_client
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import (
    DeleteMemoryInput,
    EditMemoryInput,
    ListMemoryInput,
    MemoryScope,
    ReadMemoryInput,
    WriteMemoryInput,
)
from app.agent.tools.tool import ToolCallResult, build_tool
from app.runtime.story_memory import get_story_memory


def _list_memory_entries(ctx: AgentRunContext, scope: MemoryScope | None) -> list[dict[str, str]]:
    tree = get_story_memory(
        ctx.session_id,
        user_id=ctx.user_id,
        novel_id=ctx.novel_id,
        project=ctx.project if isinstance(ctx.project, dict) else None,
    )
    out: list[dict[str, str]] = []
    scopes = [scope.value] if scope else [s.value for s in MemoryScope]
    for sc in scopes:
        bucket = tree.get(sc) if sc != "character" else tree.get("characters")
        if sc == "background":
            bucket = tree.get("background")
        if not isinstance(bucket, dict):
            continue
        for key in sorted(bucket.keys(), key=str):
            out.append({"scope": sc, "key": str(key)})
    return out


async def list_memory(ctx: AgentRunContext, inp: ListMemoryInput) -> ToolCallResult:
    items = _list_memory_entries(ctx, inp.scope)
    return ToolCallResult(content=json.dumps({"entries": items}, ensure_ascii=False))


async def read_memory(ctx: AgentRunContext, inp: ReadMemoryInput) -> ToolCallResult:
    scope = inp.scope.value
    text, err = await memory_client.fetch_memory_read_slice(
        ctx, scope, inp.key, offset=inp.offset, limit=inp.limit
    )
    if err:
        text, err = memory_client.read_memory_json(ctx, scope, inp.key)
    if err:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    patch: dict[str, Any] = {"last_memory_read": {"ok": True, "scope": scope, "key": inp.key}}
    return ToolCallResult(content=text or "", context_patch=patch)


async def write_memory(ctx: AgentRunContext, inp: WriteMemoryInput) -> ToolCallResult:
    scope = inp.scope.value
    from app.agent.backend.memory_document import MemoryDocumentError, validate_memory_document

    try:
        envelope = validate_memory_document(inp.payload, scope=scope, entry_id=inp.key)
    except MemoryDocumentError as exc:
        return ToolCallResult(
            content=f"<tool_use_error>InputValidationError: {exc}</tool_use_error>",
            is_error=True,
        )
    ok, err = memory_client.persist_memory_document(
        ctx, scope, inp.key, envelope, item_id=inp.key if scope in ("character", "chapter") else ""
    )
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps({"ok": True, "scope": scope, "key": inp.key}, ensure_ascii=False),
        context_patch={"last_memory_patch": {"scope": scope, "key": inp.key}},
    )


async def edit_memory(ctx: AgentRunContext, inp: EditMemoryInput) -> ToolCallResult:
    scope = inp.scope.value
    text, err = memory_client.read_memory_json(ctx, scope, inp.key)
    if err or not text:
        return ToolCallResult(
            content=f"<tool_use_error>{err or 'memory not found'}</tool_use_error>",
            is_error=True,
        )
    if inp.old_string not in text:
        return ToolCallResult(
            content="<tool_use_error>old_string not found</tool_use_error>", is_error=True
        )
    new_text = (
        text.replace(inp.old_string, inp.new_string)
        if inp.replace_all
        else text.replace(inp.old_string, inp.new_string, 1)
    )
    try:
        payload = json.loads(new_text)
    except json.JSONDecodeError:
        ok, err = memory_client.write_memory_json(ctx, scope, inp.key, new_text)
        if not ok:
            return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
        return ToolCallResult(content=json.dumps({"ok": True}, ensure_ascii=False))
    ok, err = memory_client.persist_memory_document(ctx, scope, inp.key, payload)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(content=json.dumps({"ok": True}, ensure_ascii=False))


async def delete_memory_tool(ctx: AgentRunContext, inp: DeleteMemoryInput) -> ToolCallResult:
    ok, err = memory_client.delete_memory(ctx, inp.scope.value, inp.key)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps({"ok": True, "deleted": inp.key}, ensure_ascii=False),
    )


MEMORY_TOOLS = [
    build_tool(
        name="ListMemory",
        description="List memory entries (scope + key). Use before ReadMemory/WriteMemory.",
        input_model=ListMemoryInput,
        call=list_memory,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="ReadMemory",
        description="Read a memory entry by scope and key (no path, no URL encoding).",
        input_model=ReadMemoryInput,
        call=read_memory,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="WriteMemory",
        description="Write or replace a memory entry (v1 JSON payload).",
        input_model=WriteMemoryInput,
        call=write_memory,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="EditMemory",
        description="Edit memory by string replace.",
        input_model=EditMemoryInput,
        call=edit_memory,
    ),
    build_tool(
        name="DeleteMemory",
        description="Delete a memory entry by scope and key.",
        input_model=DeleteMemoryInput,
        call=delete_memory_tool,
        is_destructive=lambda _i: True,
    ),
]
