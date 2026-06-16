"""Memory tools — story-memory API with scope enum + raw key."""

from __future__ import annotations

import json
from typing import Any

from app.agent.backend import memory_client
from app.agent.backend.memory_api_contract import list_memory_entries_from_tree
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import (
    ClearMemoryInput,
    DeleteMemoryInput,
    EditMemoryInput,
    ListMemoryInput,
    MemoryScope,
    ReadMemoryInput,
    WriteMemoryInput,
)
from app.agent.tools.text_edit import apply_string_replace
from app.agent.tools.tool import ToolCallResult, build_tool
from app.runtime.story_memory import get_story_memory


def _list_memory_entries(ctx: AgentRunContext, scope: MemoryScope | None) -> list[dict[str, str]]:
    tree = get_story_memory(
        ctx.session_id,
        user_id=ctx.user_id,
        novel_id=ctx.novel_id,
        project=ctx.project if isinstance(ctx.project, dict) else None,
    )
    scope_value = scope.value if scope else None
    return list_memory_entries_from_tree(tree, scope_filter=scope_value)


async def list_memory(ctx: AgentRunContext, inp: ListMemoryInput) -> ToolCallResult:
    items = _list_memory_entries(ctx, inp.scope)
    return ToolCallResult(content=json.dumps({"entries": items}, ensure_ascii=False))


async def read_memory(ctx: AgentRunContext, inp: ReadMemoryInput) -> ToolCallResult:
    scope = inp.scope.value
    item_id = (inp.item_id or "").strip()
    text, err = await memory_client.fetch_memory_read_slice(
        ctx,
        scope,
        inp.key,
        item_id=item_id,
        offset=inp.offset,
        limit=inp.limit,
    )
    if err:
        text, err = await memory_client.read_memory_json(
            ctx, scope, inp.key, item_id=item_id
        )
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
    ok, err = await memory_client.persist_memory_document(
        ctx,
        scope,
        inp.key,
        envelope,
        item_id=(inp.item_id or inp.key) if scope in ("character", "chapter") else "",
    )
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps({"ok": True, "scope": scope, "key": inp.key}, ensure_ascii=False),
        context_patch={"last_memory_patch": {"scope": scope, "key": inp.key}},
    )


async def edit_memory(ctx: AgentRunContext, inp: EditMemoryInput) -> ToolCallResult:
    scope = inp.scope.value
    item_id = (inp.item_id or "").strip()
    text, err = await memory_client.read_memory_json(ctx, scope, inp.key, item_id=item_id)
    if err or not text:
        return ToolCallResult(
            content=f"<tool_use_error>{err or 'memory not found'}</tool_use_error>",
            is_error=True,
        )
    new_text, edit_err = apply_string_replace(
        text,
        inp.old_string,
        inp.new_string,
        replace_all=inp.replace_all,
    )
    if edit_err or new_text is None:
        return ToolCallResult(
            content=f"<tool_use_error>{edit_err or 'old_string not found'}</tool_use_error>",
            is_error=True,
        )
    try:
        payload = json.loads(new_text)
    except json.JSONDecodeError:
        ok, err = await memory_client.write_memory_json(
            ctx, scope, inp.key, new_text, item_id=item_id
        )
        if not ok:
            return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
        return ToolCallResult(content=json.dumps({"ok": True}, ensure_ascii=False))
    ok, err = await memory_client.persist_memory_document(
        ctx, scope, inp.key, payload, item_id=item_id or inp.key if scope in ("character", "chapter") else ""
    )
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(content=json.dumps({"ok": True}, ensure_ascii=False))


async def delete_memory_tool(ctx: AgentRunContext, inp: DeleteMemoryInput) -> ToolCallResult:
    scope = inp.scope.value
    key = (inp.key or "").strip()
    item_id = (inp.item_id or "").strip()
    if not key:
        return ToolCallResult(
            content="<tool_use_error>key is required</tool_use_error>",
            is_error=True,
        )
    if not item_id and key not in ("*", "全部", "__all__"):
        entries = _list_memory_entries(ctx, inp.scope)
        known = {e["key"] for e in entries}
        by_key = {e["key"]: e.get("item_id", e["key"]) for e in entries}
        if key in by_key and by_key[key]:
            item_id = str(by_key[key])
        if key not in known:
            exact_ci = [e["key"] for e in entries if e["key"].lower() == key.lower()]
            if len(exact_ci) == 1:
                key = exact_ci[0]
            else:
                prefix = [e["key"] for e in entries if e["key"].startswith(key) or key in e["key"]]
                if len(prefix) == 1:
                    key = prefix[0]
                elif key not in known:
                    sample = ", ".join(sorted(known)[:6])
                    return ToolCallResult(
                        content=f"<tool_use_error>memory key not found: {inp.key}. Known: {sample}</tool_use_error>",
                        is_error=True,
                    )
    ok, err = await memory_client.delete_memory(ctx, scope, key, item_id=item_id)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps({"ok": True, "deleted": inp.key, "scope": scope}, ensure_ascii=False),
    )


async def clear_memory(ctx: AgentRunContext, inp: ClearMemoryInput) -> ToolCallResult:
    ok, err = await memory_client.clear_memory_scope(ctx, inp.scope.value)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps({"ok": True, "cleared": True, "scope": inp.scope.value}, ensure_ascii=False),
    )


MEMORY_TOOLS = [
    build_tool(
        name="ListMemory",
        description="List memory entries. character/chapter rows include item_id; use key=item name for whole-item ops.",
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
        description="Delete a memory entry by scope and key (character/chapter key from ListMemory deletes the whole item).",
        input_model=DeleteMemoryInput,
        call=delete_memory_tool,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="ClearMemory",
        description="Clear all entries under a memory scope. Prefer over looping DeleteMemory when wiping a scope.",
        input_model=ClearMemoryInput,
        call=clear_memory,
        is_destructive=lambda _i: True,
    ),
]
