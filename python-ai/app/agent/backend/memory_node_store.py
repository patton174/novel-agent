"""Memory node CRUD via Content API ``/memory-nodes`` (replacement storage)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.agent.backend.content_api import content_auth_url, extract_api_error, unwrap_result, user_headers
from app.agent.schemas import AgentRunContext

logger = logging.getLogger(__name__)


def _novel_id(ctx: AgentRunContext) -> str:
    return str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()


def _nodes_base(novel_id: str) -> str:
    return content_auth_url(f"/novels/{novel_id}/memory-nodes")


def _http_error(resp: httpx.Response) -> str:
    body: Any = None
    try:
        if resp.content:
            body = resp.json()
    except Exception:
        body = None
    return extract_api_error(
        body,
        status_code=resp.status_code,
        default=resp.text[:300] if resp.text else f"HTTP {resp.status_code}",
    )


def normalize_memory_node(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "memory_id": str(raw.get("memory_id") or raw.get("memoryId") or ""),
        "novel_id": str(raw.get("novel_id") or raw.get("novelId") or ""),
        "scope": str(raw.get("scope") or ""),
        "parent_id": raw.get("parent_id") or raw.get("parentId"),
        "sort_order": int(raw.get("sort_order") or raw.get("sortOrder") or 0),
        "title": str(raw.get("title") or ""),
        "node_kind": str(raw.get("node_kind") or raw.get("nodeKind") or "both"),
        "content": raw.get("content"),
        "style": raw.get("style") if isinstance(raw.get("style"), dict) else None,
        "meta": raw.get("meta") if isinstance(raw.get("meta"), dict) else None,
        "child_count": int(raw.get("child_count") or raw.get("childCount") or 0),
    }


def normalize_tree_summary(raw: dict[str, Any]) -> dict[str, Any]:
    scope = str(raw.get("scope") or "")
    nodes = raw.get("nodes") if isinstance(raw.get("nodes"), list) else []
    count = int(raw.get("count") or 0)
    return {"scope": scope, "count": count, "nodes": [_normalize_tree_node(n) for n in nodes if isinstance(n, dict)]}


def _normalize_tree_node(raw: dict[str, Any]) -> dict[str, Any]:
    children_raw = raw.get("children") if isinstance(raw.get("children"), list) else []
    return {
        "memory_id": str(raw.get("memory_id") or raw.get("memoryId") or ""),
        "title": str(raw.get("title") or ""),
        "sort_order": int(raw.get("sort_order") or raw.get("sortOrder") or 0),
        "node_kind": str(raw.get("node_kind") or raw.get("nodeKind") or "both"),
        "child_count": int(raw.get("child_count") or raw.get("childCount") or 0),
        "children": [_normalize_tree_node(c) for c in children_raw if isinstance(c, dict)],
    }


async def fetch_memory_tree(ctx: AgentRunContext, scope: str) -> dict[str, Any]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return {"scope": scope, "count": 0, "nodes": []}
    url = f"{_nodes_base(novel_id)}/tree"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            url,
            params={"scope": scope},
            headers=user_headers(ctx.user_id),
        )
    if resp.status_code >= 400:
        logger.warning("memory tree fetch failed scope=%s: %s", scope, _http_error(resp))
        return {"scope": scope, "count": 0, "nodes": []}
    data = unwrap_result(resp.json())
    return normalize_tree_summary(data if isinstance(data, dict) else {})


def fetch_memory_tree_sync(ctx: AgentRunContext, scope: str) -> dict[str, Any]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return {"scope": scope, "count": 0, "nodes": []}
    url = f"{_nodes_base(novel_id)}/tree"
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params={"scope": scope}, headers=user_headers(ctx.user_id))
    if resp.status_code >= 400:
        logger.warning("memory tree fetch failed scope=%s: %s", scope, _http_error(resp))
        return {"scope": scope, "count": 0, "nodes": []}
    data = unwrap_result(resp.json())
    return normalize_tree_summary(data if isinstance(data, dict) else {})


def normalize_tree_index(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """``/tree-index`` payload: scope -> title-only tree summary."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for scope, tree in raw.items():
        if not isinstance(tree, dict):
            continue
        out[str(scope)] = normalize_tree_summary(tree)
    return out


def fetch_all_memory_trees_sync(ctx: AgentRunContext) -> dict[str, dict[str, Any]]:
    """All scopes in one request (title-only nodes)."""
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return {}
    url = f"{_nodes_base(novel_id)}/tree-index"
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=user_headers(ctx.user_id))
    except httpx.HTTPError as exc:
        logger.warning("memory tree-index fetch error: %s", exc)
        return {}
    if resp.status_code >= 400:
        logger.warning("memory tree-index fetch failed: %s", _http_error(resp))
        return {}
    data = unwrap_result(resp.json())
    return normalize_tree_index(data if isinstance(data, dict) else {})


async def fetch_all_memory_trees(ctx: AgentRunContext) -> dict[str, dict[str, Any]]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return {}
    url = f"{_nodes_base(novel_id)}/tree-index"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=user_headers(ctx.user_id))
    except httpx.HTTPError as exc:
        logger.warning("memory tree-index fetch error: %s", exc)
        return {}
    if resp.status_code >= 400:
        logger.warning("memory tree-index fetch failed: %s", _http_error(resp))
        return {}
    data = unwrap_result(resp.json())
    return normalize_tree_index(data if isinstance(data, dict) else {})


async def list_memory_nodes(
    ctx: AgentRunContext,
    scope: str,
    *,
    parent_id: str | None = None,
) -> list[dict[str, Any]]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return []
    params: dict[str, str] = {"scope": scope}
    if parent_id:
        params["parentId"] = parent_id
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            _nodes_base(novel_id),
            params=params,
            headers=user_headers(ctx.user_id),
        )
    if resp.status_code >= 400:
        return []
    data = unwrap_result(resp.json())
    if not isinstance(data, list):
        return []
    return [normalize_memory_node(item) for item in data if isinstance(item, dict)]


async def get_memory_node(ctx: AgentRunContext, memory_id: str) -> tuple[dict[str, Any] | None, str]:
    novel_id = _novel_id(ctx)
    mid = (memory_id or "").strip()
    if not novel_id or ctx.user_id <= 0 or not mid:
        return None, "invalid novel_id or memory_id"
    url = f"{_nodes_base(novel_id)}/{mid}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=user_headers(ctx.user_id))
    if resp.status_code >= 400:
        return None, _http_error(resp)
    data = unwrap_result(resp.json())
    if not isinstance(data, dict):
        return None, "invalid response"
    return normalize_memory_node(data), ""


async def list_all_in_scope(ctx: AgentRunContext, scope: str) -> list[dict[str, Any]]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return []
    url = f"{_nodes_base(novel_id)}/flat"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            url,
            params={"scope": scope},
            headers=user_headers(ctx.user_id),
        )
    if resp.status_code >= 400:
        return []
    data = unwrap_result(resp.json())
    if not isinstance(data, list):
        return []
    return [normalize_memory_node(item) for item in data if isinstance(item, dict)]


def fetch_memory_flat_sync(ctx: AgentRunContext, scope: str) -> list[dict[str, Any]]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return []
    url = f"{_nodes_base(novel_id)}/flat"
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params={"scope": scope}, headers=user_headers(ctx.user_id))
    if resp.status_code >= 400:
        return []
    data = unwrap_result(resp.json())
    if not isinstance(data, list):
        return []
    return [normalize_memory_node(item) for item in data if isinstance(item, dict)]


async def create_memory_node(ctx: AgentRunContext, body: dict[str, Any]) -> tuple[dict[str, Any] | None, str]:
    novel_id = _novel_id(ctx)
    if not novel_id or ctx.user_id <= 0:
        return None, "invalid user/novel"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _nodes_base(novel_id),
            json=body,
            headers=user_headers(ctx.user_id, edit_source="agent"),
        )
    if resp.status_code >= 400:
        return None, _http_error(resp)
    data = unwrap_result(resp.json())
    if not isinstance(data, dict):
        return None, "invalid response"
    return normalize_memory_node(data), ""


async def update_memory_node(
    ctx: AgentRunContext,
    memory_id: str,
    body: dict[str, Any],
) -> tuple[dict[str, Any] | None, str]:
    novel_id = _novel_id(ctx)
    mid = (memory_id or "").strip()
    if not novel_id or ctx.user_id <= 0 or not mid:
        return None, "invalid novel_id or memory_id"
    url = f"{_nodes_base(novel_id)}/{mid}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.put(
            url,
            json=body,
            headers=user_headers(ctx.user_id, edit_source="agent"),
        )
    if resp.status_code >= 400:
        return None, _http_error(resp)
    data = unwrap_result(resp.json())
    if not isinstance(data, dict):
        return None, "invalid response"
    return normalize_memory_node(data), ""


async def move_memory_node(
    ctx: AgentRunContext,
    memory_id: str,
    body: dict[str, Any],
) -> tuple[dict[str, Any] | None, str]:
    novel_id = _novel_id(ctx)
    mid = (memory_id or "").strip()
    if not novel_id or ctx.user_id <= 0 or not mid:
        return None, "invalid novel_id or memory_id"
    url = f"{_nodes_base(novel_id)}/{mid}/move"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            json=body,
            headers=user_headers(ctx.user_id, edit_source="agent"),
        )
    if resp.status_code >= 400:
        return None, _http_error(resp)
    data = unwrap_result(resp.json())
    if not isinstance(data, dict):
        return None, "invalid response"
    return normalize_memory_node(data), ""


async def delete_memory_node(
    ctx: AgentRunContext,
    memory_id: str,
    *,
    cascade: bool = True,
) -> tuple[bool, str]:
    novel_id = _novel_id(ctx)
    mid = (memory_id or "").strip()
    if not novel_id or ctx.user_id <= 0 or not mid:
        return False, "invalid novel_id or memory_id"
    url = f"{_nodes_base(novel_id)}/{mid}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.delete(
            url,
            params={"cascade": str(cascade).lower()},
            headers=user_headers(ctx.user_id, edit_source="agent"),
        )
    if resp.status_code >= 400:
        return False, _http_error(resp)
    return True, ""
