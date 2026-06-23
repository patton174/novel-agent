"""Memory tree catalog for RUN_CONTEXT — title + memory_id only (no content bodies)."""

from __future__ import annotations

import time
from typing import Any

from app.agent.backend.memory_node_store import (
    fetch_all_memory_trees_sync,
    normalize_tree_summary,
)
from app.agent.harness.tool_contract import (
    MEMORY_ID_FIELD,
    MEMORY_SCOPE_FIELD,
    format_memory_tree_line,
)
from app.agent.schemas import AgentRunContext

SCOPE_LABELS: dict[str, str] = {}

_TREES_CACHE_TTL_SEC = 15.0
_trees_cache: dict[tuple[int, str], tuple[float, dict[str, dict[str, Any]]]] = {}


def _novel_id(ctx: AgentRunContext) -> str:
    return str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()


def _trees_have_nodes(trees: dict[str, dict[str, Any]]) -> bool:
    for tree in trees.values():
        if not isinstance(tree, dict):
            continue
        nodes = tree.get("nodes")
        if isinstance(nodes, list) and nodes:
            return True
    return False


def extract_scope_root_ids(trees: dict[str, dict[str, Any]]) -> dict[str, str]:
    """scope key → scope root memory_id (CreateMemory child parent_id)."""
    out: dict[str, str] = {}
    for scope, tree in trees.items():
        if not isinstance(tree, dict):
            continue
        nodes = tree.get("nodes") if isinstance(tree.get("nodes"), list) else []
        if not nodes:
            continue
        root = sorted(nodes, key=lambda n: int(n.get("sort_order") or 0))[0]
        mid = str(root.get("memory_id") or "").strip()
        if mid:
            out[str(scope)] = mid
    return out


def resolve_scope_root_id(ctx: AgentRunContext, scope: str) -> str | None:
    """Resolve scope tab name → scope root memory_id for CreateMemory(child)."""
    key = str(scope or "").strip()
    if not key:
        return None
    root_ids = extract_scope_root_ids(load_all_memory_trees(ctx))
    if key in root_ids:
        return root_ids[key]
    key_lower = key.lower()
    for name, mid in root_ids.items():
        if name.lower() == key_lower:
            return mid
    return None


def format_scope_root_ids_hint(ctx: AgentRunContext) -> str:
    """Human-readable scope→parent_id map for CreateMemory child validation errors."""
    root_ids = extract_scope_root_ids(load_all_memory_trees(ctx))
    if not root_ids:
        return ""
    lines = ["Available scope_root_ids (copy parent_id UUID into CreateMemory child):"]
    for scope in sorted(root_ids.keys()):
        lines.append(f"  scope={scope} → parent_id={root_ids[scope]}")
    return "\n".join(lines)


def _trees_from_context_patch(ctx: AgentRunContext) -> dict[str, dict[str, Any]] | None:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    raw = patch.get("memory_tree_index")
    if not isinstance(raw, dict) or not raw:
        return None
    out: dict[str, dict[str, Any]] = {}
    for scope, tree in raw.items():
        if isinstance(tree, dict):
            out[str(scope)] = normalize_tree_summary(tree)
    return out or None


def load_all_memory_trees(ctx: AgentRunContext) -> dict[str, dict[str, Any]]:
    """Prefer live /tree-index HTTP; fall back to context_patch only when fetch is empty."""
    nid = _novel_id(ctx)
    if not nid or ctx.user_id <= 0:
        preloaded = _trees_from_context_patch(ctx)
        return preloaded if preloaded is not None else {}

    key = (ctx.user_id, nid)
    now = time.monotonic()
    cached = _trees_cache.get(key)
    if cached and now - cached[0] < _TREES_CACHE_TTL_SEC:
        return cached[1]

    trees = fetch_all_memory_trees_sync(ctx)
    if _trees_have_nodes(trees):
        _trees_cache[key] = (now, trees)
        return trees

    preloaded = _trees_from_context_patch(ctx)
    if preloaded is not None and _trees_have_nodes(preloaded):
        return preloaded

    _trees_cache[key] = (now, trees)
    return trees


def invalidate_memory_trees_cache(*, user_id: int, novel_id: str) -> None:
    _trees_cache.pop((user_id, (novel_id or "").strip()), None)


def refresh_memory_tree_index_patch(ctx: AgentRunContext) -> dict[str, Any]:
    """Fetch fresh title-only trees into context_patch after memory mutations."""
    nid = _novel_id(ctx)
    if not nid or ctx.user_id <= 0:
        return {"memory_tree_index": {}}
    invalidate_memory_trees_cache(user_id=ctx.user_id, novel_id=nid)
    trees = fetch_all_memory_trees_sync(ctx)
    return {"memory_tree_index": trees}


def _append_tree_lines(
    lines: list[str],
    nodes: list[dict[str, Any]],
    *,
    indent: int,
    max_lines: int,
    counter: list[int],
) -> None:
    for node in sorted(nodes, key=lambda n: int(n.get("sort_order") or 0)):
        if counter[0] >= max_lines:
            lines.append("…（其余节点请 ListMemory / GetMemoryTree）")
            return
        lines.append(
            format_memory_tree_line(
                memory_id=str(node.get("memory_id") or ""),
                title=str(node.get("title") or ""),
                sort_order=int(node.get("sort_order") or 0),
                node_kind=str(node.get("node_kind") or "both"),
                child_count=int(node.get("child_count") or 0),
                indent=indent,
            )
        )
        counter[0] += 1
        children = node.get("children") if isinstance(node.get("children"), list) else []
        if children:
            _append_tree_lines(
                lines,
                children,
                indent=indent + 1,
                max_lines=max_lines,
                counter=counter,
            )
        if counter[0] >= max_lines:
            return


def format_memory_index(
    ctx: AgentRunContext,
    *,
    max_lines: int = 56,
    trees: dict[str, dict[str, Any]] | None = None,
) -> str:
    """Title-only memory index for RUN_CONTEXT — ReadMemory(memory_id) for bodies."""
    nid = _novel_id(ctx)
    if not nid or ctx.user_id <= 0:
        return "（无 novel_id，无法列举记忆）"

    scope_trees = trees if trees is not None else load_all_memory_trees(ctx)
    lines = [
        "【故事记忆 · 标题索引】",
        "每行含 memory_id（UUID）；正文请 ReadMemory(memory_id)。",
        f"{MEMORY_SCOPE_FIELD} = 主分类 Tab（node_type=root，每类一次）。正文放在 node_type=child 子条目，按主题拆分，便于 UI 子菜单浏览。",
        "CreateMemory(node_type=child) **必填 parent_id**：scope 根 UUID（见 scope_root_ids，逐条复制）。",
        "禁止在 scope 根节点堆过长正文；多主题/超长内容 → 多个 CreateMemory(child) + UpdateMemoryContent(child)。",
        "禁止超过两层；scope 已存在时仅 node_type=child，勿重复 root。",
    ]
    root_ids = extract_scope_root_ids(scope_trees)
    if root_ids:
        lines.append("scope_root_ids（child 的 parent_id 从此复制，勿省略）：")
        for scope in sorted(root_ids.keys()):
            lines.append(f"  - scope={scope} → parent_id={root_ids[scope]}")
    counter = [0]
    total = 0
    for scope in scope_trees.keys():
        tree = scope_trees.get(scope) or {"count": 0, "nodes": []}
        count = int(tree.get("count") or 0)
        if count <= 0:
            continue
        total += count
        label = SCOPE_LABELS.get(scope, scope)
        lines.append(f"## {label}（{count} 节点） scope={scope}")
        nodes = tree.get("nodes") if isinstance(tree.get("nodes"), list) else []
        _append_tree_lines(lines, nodes, indent=1, max_lines=max_lines, counter=counter)
        if counter[0] >= max_lines:
            break

    if total == 0:
        lines.append("（当前无记忆根分类 — CreateMemory(node_type=root, title=分类名)，每类仅一次）")
    return "\n".join(lines)


# Legacy aliases — callers/tests may still import these names.
def format_memory_catalog_db(
    ctx: AgentRunContext,
    *,
    max_lines: int = 48,
    trees: dict[str, dict[str, Any]] | None = None,
) -> str:
    return format_memory_index(ctx, max_lines=max_lines, trees=trees)


def format_memory_tree_block(
    ctx: AgentRunContext,
    *,
    max_lines: int = 32,
    trees: dict[str, dict[str, Any]] | None = None,
) -> str:
    _ = max_lines
    return format_memory_index(ctx, trees=trees)
