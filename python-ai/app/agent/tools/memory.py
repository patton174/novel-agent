"""Memory tools — memory_node tree API (replacement, not v2 upgrade)."""

from __future__ import annotations

import json
from typing import Any

from app.agent.backend.memory_node_store import (
    create_memory_node,
    delete_memory_node,
    fetch_memory_tree,
    get_memory_node,
    list_memory_nodes,
    move_memory_node,
    update_memory_node,
)
from app.agent.backend.memory_catalog import invalidate_memory_trees_cache
from app.agent.backend.memory_style_presets import default_style_for_scope, normalize_style
from app.agent.context.memory_log import append_memory_op_log, append_memory_read_record
from app.agent.schemas import AgentRunContext
from app.agent.tools.errors import ToolError, ToolErrorCode, tool_error_result
from app.agent.tools.schemas import (
    CreateMemoryInput,
    DeleteMemoryInput,
    GetMemoryTreeInput,
    ListMemoryInput,
    MoveMemoryInput,
    ReadMemoryInput,
    UpdateMemoryContentInput,
    UpdateMemoryFieldsInput,
    UpdateMemoryMetaInput,
)
from app.agent.tools.tool import ToolCallResult, build_tool


def _api_error(message: str, *, code: str = ToolErrorCode.UPSTREAM_5XX) -> ToolCallResult:
    return tool_error_result(
        ToolError(
            code=code,
            message=(message or "memory API error").strip()[:500],
            retryable=code == ToolErrorCode.UPSTREAM_5XX,
        )
    )


def _invalidate_memory_index(ctx: AgentRunContext) -> dict[str, Any]:
    """Bust cached tree-index HTTP cache; batch end reloads into context_patch."""
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if ctx.user_id > 0 and novel_id:
        invalidate_memory_trees_cache(user_id=ctx.user_id, novel_id=novel_id)
    return {}


def _memory_mutation_patch(
    ctx: AgentRunContext,
    *,
    tool: str,
    ok: bool,
    summary: str,
    memory_id: str = "",
    scope: str = "",
    title: str = "",
    reason: str = "",
) -> dict[str, Any]:
    base = dict(ctx.context_patch or {}) if isinstance(ctx.context_patch, dict) else {}
    fields: dict[str, Any] = {}
    if scope:
        fields["scope"] = scope
    if memory_id:
        fields["item_id"] = memory_id
    if title:
        fields["title"] = title
    if reason:
        fields["reason"] = reason
    patch = append_memory_op_log(
        base,
        tool=tool,
        ok=ok,
        summary=summary[:240],
        **fields,
    )
    if ok and memory_id:
        entry: dict[str, Any] = {"ok": True, "memory_id": memory_id}
        if scope:
            entry["scope"] = scope
        if title:
            entry["title"] = title
        patch["last_memory_patch"] = entry
    patch.update(_invalidate_memory_index(ctx))
    out: dict[str, Any] = {
        "memory_ops_log": patch.get("memory_ops_log"),
    }
    if patch.get("last_memory_patch"):
        out["last_memory_patch"] = patch["last_memory_patch"]
    return out


def _list_entry(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "memory_id": row.get("memory_id"),
        "scope": row.get("scope"),
        "parent_id": row.get("parent_id"),
        "sort_order": row.get("sort_order"),
        "title": row.get("title"),
        "node_kind": row.get("node_kind"),
        "child_count": row.get("child_count", 0),
    }


async def list_memory(ctx: AgentRunContext, inp: ListMemoryInput) -> ToolCallResult:
    rows = await list_memory_nodes(ctx, inp.scope, parent_id=inp.parent_id)
    entries = [_list_entry(r) for r in rows]
    return ToolCallResult(
        content=json.dumps({"scope": inp.scope, "entries": entries}, ensure_ascii=False),
    )


async def get_memory_tree(ctx: AgentRunContext, inp: GetMemoryTreeInput) -> ToolCallResult:
    tree = await fetch_memory_tree(ctx, inp.scope)
    return ToolCallResult(
        content=json.dumps(tree, ensure_ascii=False),
    )


async def read_memory(ctx: AgentRunContext, inp: ReadMemoryInput) -> ToolCallResult:
    node, err = await get_memory_node(ctx, inp.memory_id)
    if err or not node:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.MEMORY_ITEM_NOT_FOUND,
                message=err or "memory node not found",
                hint="Call ListMemory or GetMemoryTree for valid memory_id values.",
                suggested_tools=["ListMemory", "GetMemoryTree"],
            )
        )
    content = (node.get("content") or "").strip()
    title = str(node.get("title") or "")
    header = f"# {title}\n\n" if title else ""
    patch = append_memory_read_record(
        ctx.context_patch if isinstance(ctx.context_patch, dict) else {},
        memory_id=inp.memory_id,
        scope=str(node.get("scope") or "") or None,
        title=title or None,
    )
    return ToolCallResult(content=f"{header}{content}", context_patch=patch)


async def _memory_node_depth(ctx: AgentRunContext, memory_id: str) -> int:
    """Ancestor hops from node to scope root (root depth = 0)."""
    depth = 0
    node_id = memory_id.strip()
    seen: set[str] = set()
    while node_id and node_id not in seen:
        seen.add(node_id)
        node, err = await get_memory_node(ctx, node_id)
        if err or not node:
            break
        parent = str(node.get("parent_id") or "").strip()
        if not parent:
            break
        depth += 1
        node_id = parent
    return depth


async def _depth_for_new_node(ctx: AgentRunContext, parent_id: str | None) -> int:
    pid = (parent_id or "").strip()
    if not pid:
        return 0
    return await _memory_node_depth(ctx, pid) + 1


async def create_memory(ctx: AgentRunContext, inp: CreateMemoryInput) -> ToolCallResult:
    is_root = inp.node_type == "root"
    parent_id = (inp.parent_id or "").strip()
    if not is_root and not parent_id:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="node_type=child requires parent_id",
                hint=(
                    "Set node_type=child and parent_id (UUID from memory.scope_root_ids). "
                    "Use node_type=root only once per new scope category."
                ),
                suggested_tools=["GetMemoryTree", "ListMemory"],
                retryable=True,
            )
        )
    if is_root and parent_id:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="node_type=root must not set parent_id",
                hint="Omit parent_id when node_type=root. Use node_type=child to add entries under an existing scope.",
                retryable=True,
            )
        )
    if not is_root:
        parent, parent_err = await get_memory_node(ctx, parent_id)
        if parent_err or not parent:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.MEMORY_ITEM_NOT_FOUND,
                    message=parent_err or "parent memory node not found",
                    hint=(
                        "Use node_type=child with parent_id = scope root memory_id "
                        "(UUID from memory_index / ListMemory / GetMemoryTree). "
                        "Never use scope title as parent_id."
                    ),
                    suggested_tools=["ListMemory", "GetMemoryTree"],
                )
            )
        scope = str(parent.get("scope") or "").strip()
        parent_depth = await _memory_node_depth(ctx, parent_id)
        if parent_depth != 0:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.SCHEMA_INVALID,
                    message="Memory tree supports two levels only: scope root → content node",
                    hint=(
                        "parent_id must be the scope root's memory_id (depth 0). "
                        "Do not nest content under another content node."
                    ),
                    suggested_tools=["GetMemoryTree", "ListMemory"],
                    retryable=False,
                )
            )
    else:
        scope = inp.title.strip().lower()

    node_kind = inp.node_kind or "both"
    depth = await _depth_for_new_node(ctx, parent_id or None)
    if inp.style:
        style = normalize_style(
            inp.style,
            scope=scope,
            node_kind=node_kind,
            depth=depth,
            is_root=is_root,
        )
    else:
        style = default_style_for_scope(
            scope,
            node_kind=node_kind,
            is_root=is_root,
            depth=depth,
        )
    body: dict[str, Any] = {
        "scope": scope,
        "title": inp.title.strip(),
        "node_kind": node_kind,
    }
    if parent_id:
        body["parent_id"] = parent_id
    if inp.sort_order is not None:
        body["sort_order"] = inp.sort_order
    if inp.content is not None:
        body["content"] = inp.content
    if style:
        body["style"] = style
    if inp.meta:
        body["meta"] = inp.meta

    node, err = await create_memory_node(ctx, body)
    if err or not node:
        if err and "scope root already exists" in err.lower():
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.SCHEMA_INVALID,
                    message=err,
                    hint=(
                        "This scope root already exists. Use node_type=child with parent_id = that root's memory_id. "
                        "Do NOT call CreateMemory with node_type=root again for the same scope."
                    ),
                    suggested_tools=["GetMemoryTree", "ListMemory", "CreateMemory"],
                    retryable=False,
                )
            )
        return _api_error(err or "create failed")
    node_id = str(node.get("memory_id") or "")
    title_s = inp.title.strip()
    head = (
        f"CreateMemory OK · title={title_s!r} · scope={scope!r} · memory_id={node_id}"
        + (" · new scope root" if is_root else "")
    )
    patch = _memory_mutation_patch(
        ctx,
        tool="CreateMemory",
        ok=True,
        summary=head,
        memory_id=node_id,
        scope=scope,
        title=title_s,
    )
    return ToolCallResult(
        content=f"{head}\n{json.dumps(node, ensure_ascii=False)}",
        context_patch=patch,
    )


async def _load_memory_node(ctx: AgentRunContext, memory_id: str) -> tuple[dict[str, Any] | None, ToolCallResult | None]:
    existing, existing_err = await get_memory_node(ctx, memory_id)
    if existing_err or not existing:
        return None, tool_error_result(
            ToolError(
                code=ToolErrorCode.MEMORY_ITEM_NOT_FOUND,
                message=existing_err or "memory node not found",
                hint="Call ListMemory or GetMemoryTree for valid memory_id values.",
                suggested_tools=["ListMemory", "GetMemoryTree"],
            )
        )
    return existing, None


def _parent_id_guard_error(tool_name: str) -> ToolCallResult:
    return tool_error_result(
        ToolError(
            code=ToolErrorCode.SCHEMA_INVALID,
            message="parent_id does not match the target node",
            hint=(
                "Use ListMemory(scope, parent_id=…) to confirm hierarchy; "
                f"{tool_name} parent_id is a guard only. To reparent, use MoveMemory."
            ),
            suggested_tools=["ListMemory", "GetMemoryTree"],
        )
    )


async def _verify_parent_id_guard(
    inp: UpdateMemoryFieldsInput | UpdateMemoryContentInput | UpdateMemoryMetaInput,
    existing: dict[str, Any],
    *,
    tool_name: str,
) -> ToolCallResult | None:
    fields_set = getattr(inp, "model_fields_set", set())
    if "parent_id" not in fields_set:
        return None
    actual_parent = str(existing.get("parent_id") or "").strip()
    expected_parent = (inp.parent_id or "").strip()
    if actual_parent != expected_parent:
        return _parent_id_guard_error(tool_name)
    return None


async def _commit_memory_update(
    ctx: AgentRunContext,
    memory_id: str,
    body: dict[str, Any],
    *,
    tool_name: str = "UpdateMemory",
) -> ToolCallResult:
    if not body:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="no fields to update",
            )
        )
    node, err = await update_memory_node(ctx, memory_id, body)
    if err or not node:
        return _api_error(err or "update failed")
    node_id = str(node.get("memory_id") or memory_id)
    scope = str(node.get("scope") or "")
    title = str(node.get("title") or "")
    head = f"UpdateMemory OK · memory_id={node_id}"
    if title:
        head += f" · title={title!r}"
    patch = _memory_mutation_patch(
        ctx,
        tool=tool_name,
        ok=True,
        summary=head,
        memory_id=node_id,
        scope=scope,
        title=title,
    )
    return ToolCallResult(
        content=f"{head}\n{json.dumps(node, ensure_ascii=False)}",
        context_patch=patch,
    )


async def update_memory_fields(ctx: AgentRunContext, inp: UpdateMemoryFieldsInput) -> ToolCallResult:
    existing, err_result = await _load_memory_node(ctx, inp.memory_id)
    if err_result:
        return err_result
    assert existing is not None
    guard_err = await _verify_parent_id_guard(inp, existing, tool_name="UpdateMemoryFields")
    if guard_err:
        return guard_err

    body: dict[str, Any] = {}
    if inp.title is not None:
        body["title"] = inp.title.strip()
    if inp.node_kind is not None:
        body["node_kind"] = inp.node_kind
    if inp.style is not None:
        merged_style = {**(existing.get("style") or {}), **inp.style}
        scope = str(existing.get("scope") or "")
        node_kind = str(inp.node_kind or existing.get("node_kind") or "leaf")
        is_root = not str(existing.get("parent_id") or "").strip()
        depth = await _memory_node_depth(ctx, inp.memory_id)
        body["style"] = normalize_style(
            merged_style,
            scope=scope,
            node_kind=node_kind,
            depth=depth,
            is_root=is_root,
        )
    return await _commit_memory_update(ctx, inp.memory_id, body, tool_name="UpdateMemoryFields")


async def update_memory_content(ctx: AgentRunContext, inp: UpdateMemoryContentInput) -> ToolCallResult:
    existing, err_result = await _load_memory_node(ctx, inp.memory_id)
    if err_result:
        return err_result
    assert existing is not None
    guard_err = await _verify_parent_id_guard(inp, existing, tool_name="UpdateMemoryContent")
    if guard_err:
        return guard_err
    return await _commit_memory_update(
        ctx, inp.memory_id, {"content": inp.content}, tool_name="UpdateMemoryContent"
    )


async def update_memory_meta(ctx: AgentRunContext, inp: UpdateMemoryMetaInput) -> ToolCallResult:
    existing, err_result = await _load_memory_node(ctx, inp.memory_id)
    if err_result:
        return err_result
    assert existing is not None
    guard_err = await _verify_parent_id_guard(inp, existing, tool_name="UpdateMemoryMeta")
    if guard_err:
        return guard_err
    return await _commit_memory_update(
        ctx, inp.memory_id, {"meta": inp.meta}, tool_name="UpdateMemoryMeta"
    )


async def move_memory(ctx: AgentRunContext, inp: MoveMemoryInput) -> ToolCallResult:
    fields_set = getattr(inp, "model_fields_set", set())
    body: dict[str, Any] = {}
    if "parent_id" in fields_set:
        body["parent_id"] = inp.parent_id.strip() if inp.parent_id else None
    elif inp.sort_order is not None:
        existing, existing_err = await get_memory_node(ctx, inp.memory_id)
        if existing_err or not existing:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.MEMORY_ITEM_NOT_FOUND,
                    message=existing_err or "memory node not found",
                    suggested_tools=["ListMemory", "GetMemoryTree"],
                )
            )
        pid = str(existing.get("parent_id") or "").strip()
        if pid:
            body["parent_id"] = pid
    if inp.sort_order is not None:
        body["sort_order"] = inp.sort_order
    if not body:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="parent_id or sort_order required",
            )
        )
    node, err = await move_memory_node(ctx, inp.memory_id, body)
    if err or not node:
        return _api_error(err or "move failed")
    node_id = str(node.get("memory_id") or inp.memory_id)
    scope = str(node.get("scope") or "")
    title = str(node.get("title") or "")
    head = f"MoveMemory OK · memory_id={node_id}"
    patch = _memory_mutation_patch(
        ctx,
        tool="MoveMemory",
        ok=True,
        summary=head,
        memory_id=node_id,
        scope=scope,
        title=title,
    )
    return ToolCallResult(
        content=f"{head}\n{json.dumps(node, ensure_ascii=False)}",
        context_patch=patch,
    )


async def delete_memory_tool(ctx: AgentRunContext, inp: DeleteMemoryInput) -> ToolCallResult:
    existing, existing_err = await get_memory_node(ctx, inp.memory_id)
    title = str(existing.get("title") or "").strip() if existing and not existing_err else ""
    ok, err = await delete_memory_node(ctx, inp.memory_id, cascade=inp.cascade)
    if not ok:
        return _api_error(err or "delete failed", code=ToolErrorCode.MEMORY_ITEM_NOT_FOUND)
    payload: dict[str, Any] = {
        "ok": True,
        "memory_id": inp.memory_id,
        "cascade": inp.cascade,
    }
    if title:
        payload["title"] = title
    head = f"DeleteMemory OK · memory_id={inp.memory_id}"
    if title:
        head += f" · title={title!r}"
    patch = _memory_mutation_patch(
        ctx,
        tool="DeleteMemory",
        ok=True,
        summary=head,
        memory_id=inp.memory_id,
        title=title,
    )
    patch["last_memory_delete"] = payload
    return ToolCallResult(
        content=f"{head}\n{json.dumps(payload, ensure_ascii=False)}",
        context_patch=patch,
    )


MEMORY_TOOLS = [
    build_tool(
        name="ListMemory",
        description="List memory nodes at one tree level (scope roots or children of parent_id). Scope = root title.",
        input_model=ListMemoryInput,
        call=list_memory,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="GetMemoryTree",
        description="Fetch nested tree summary for a scope (scope = outermost root title).",
        input_model=GetMemoryTreeInput,
        call=get_memory_tree,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="ReadMemory",
        description="Read node content by memory_id.",
        input_model=ReadMemoryInput,
        call=read_memory,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="CreateMemory",
        description=(
            "Create a memory tree node (two levels: scope tab → content children). "
            "Required node_type: `root` = new scope tab (once per category; title + optional ≤200-char intro only); "
            "`child` = readable block under that tab (parent_id UUID required — copy from memory.scope_root_ids). "
            "**Structure**: split content into multiple child nodes by topic (e.g. world→eras/factions/rules; "
            "characters→protagonist/supporting/relations). Avoid long Markdown on the root — users read children in the sub-menu UI. "
            "Optional style.layout: accordion|outline|cards|timeline|hero|quote|prose."
        ),
        input_model=CreateMemoryInput,
        call=create_memory,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="UpdateMemoryFields",
        description=(
            "Update title, node_kind, or style on an existing node (not content/meta). "
            "memory_id required (UUID from ListMemory/GetMemoryTree). "
            "Provide at least one of title, node_kind, style. "
            "Optional parent_id guard when editing non-root nodes. "
            "For body text use UpdateMemoryContent; for structured meta use UpdateMemoryMeta."
        ),
        input_model=UpdateMemoryFieldsInput,
        call=update_memory_fields,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="UpdateMemoryContent",
        description=(
            "Replace a memory node's Markdown content. "
            "memory_id + non-empty content required. "
            "Prefer child nodes for long bodies; if the scope root already holds multiple topics or >~800 chars, "
            "CreateMemory(node_type=child) to split instead of appending. "
            "Optional parent_id guard. Do not pass null or empty content."
        ),
        input_model=UpdateMemoryContentInput,
        call=update_memory_content,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="UpdateMemoryMeta",
        description=(
            "Replace a memory node's meta JSON object. "
            "memory_id + non-empty meta object required. "
            "Optional parent_id guard. Do not pass null or {}."
        ),
        input_model=UpdateMemoryMetaInput,
        call=update_memory_meta,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="MoveMemory",
        description="Reparent or reorder a node.",
        input_model=MoveMemoryInput,
        call=move_memory,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="DeleteMemory",
        description="Delete a node by memory_id.",
        input_model=DeleteMemoryInput,
        call=delete_memory_tool,
        is_destructive=lambda _i: True,
    ),
]
