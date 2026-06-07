"""mihomo / Clash 外部控制器 — 抓取失败时自动切换出口节点。"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any
from urllib.parse import quote

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_GROUP_TYPES = frozenset({"Selector", "URLTest", "Fallback", "LoadBalance", "Relay"})
_SKIP_NAMES = frozenset({"DIRECT", "REJECT", "GLOBAL"})
_NODE_CACHE_TTL_SEC = 120.0

_lock = threading.Lock()
_nodes_cache: list[str] | None = None
_nodes_cache_at: float = 0.0
_failed_until: dict[str, float] = {}


def mihomo_rotation_enabled() -> bool:
    return bool(settings.crawl_mihomo_api.strip()) and settings.crawl_mihomo_max_nodes > 0


def _api_base() -> str:
    return settings.crawl_mihomo_api.strip().rstrip("/")


def _group_name() -> str:
    name = settings.crawl_mihomo_proxy_group.strip()
    return name or "🚀 节点选择"


def _headers() -> dict[str, str]:
    secret = settings.crawl_mihomo_secret.strip()
    if secret:
        return {"Authorization": f"Bearer {secret}"}
    return {}


def _request(method: str, path: str, *, json_body: dict[str, Any] | None = None) -> Any:
    url = f"{_api_base()}{path}"
    timeout = settings.crawl_mihomo_timeout
    with httpx.Client(timeout=timeout) as client:
        resp = client.request(method, url, json=json_body, headers=_headers())
        resp.raise_for_status()
        if resp.content:
            return resp.json()
        return {}


def _all_proxies() -> dict[str, dict[str, Any]]:
    data = _request("GET", "/proxies")
    proxies = data.get("proxies") if isinstance(data, dict) else {}
    return proxies if isinstance(proxies, dict) else {}


def _is_eligible_leaf(name: str, proxies: dict[str, dict[str, Any]]) -> bool:
    if not name or name in _SKIP_NAMES:
        return False
    if name.startswith("⚠"):
        return False
    meta = proxies.get(name) or {}
    ptype = str(meta.get("type") or "")
    if ptype in _GROUP_TYPES:
        return False
    return True


def list_rotatable_nodes(*, force_refresh: bool = False) -> list[str]:
    """返回 selector 组内可切换的叶子节点（不含 DIRECT / 子策略组）。"""
    global _nodes_cache, _nodes_cache_at
    now = time.monotonic()
    with _lock:
        if (
            not force_refresh
            and _nodes_cache is not None
            and now - _nodes_cache_at < _NODE_CACHE_TTL_SEC
        ):
            return list(_nodes_cache)

    group = _group_name()
    proxies = _all_proxies()
    group_meta = proxies.get(group) or {}
    raw = group_meta.get("all") if isinstance(group_meta, dict) else []
    nodes: list[str] = []
    for name in raw or []:
        if isinstance(name, str) and _is_eligible_leaf(name, proxies):
            nodes.append(name)

    with _lock:
        _nodes_cache = nodes
        _nodes_cache_at = now
    return list(nodes)


def current_node() -> str | None:
    group = _group_name()
    proxies = _all_proxies()
    group_meta = proxies.get(group) or {}
    now = group_meta.get("now") if isinstance(group_meta, dict) else None
    return str(now) if now else None


def select_node(name: str) -> None:
    group = _group_name()
    encoded = quote(group, safe="")
    _request("PUT", f"/proxies/{encoded}", json_body={"name": name})
    logger.info("mihomo 切换节点 group=%s node=%s", group, name[:60])


def _mark_node_failed(name: str) -> None:
    ttl = max(30, settings.crawl_mihomo_fail_cooldown_sec)
    with _lock:
        _failed_until[name] = time.monotonic() + ttl


def _node_available(name: str) -> bool:
    with _lock:
        until = _failed_until.get(name, 0.0)
    return time.monotonic() >= until


def iter_nodes_for_retry() -> list[str]:
    """按当前节点优先排序，跳过冷却中的失败节点；必要时强制刷新列表。"""
    nodes = list_rotatable_nodes()
    if not nodes:
        nodes = list_rotatable_nodes(force_refresh=True)
    if not nodes:
        return []

    cur = current_node()
    ordered: list[str] = []
    seen: set[str] = set()

    def add(name: str) -> None:
        if name in seen or not _node_available(name):
            return
        if name not in nodes:
            return
        seen.add(name)
        ordered.append(name)

    if cur:
        add(cur)
    for name in nodes:
        add(name)

    limit = max(1, settings.crawl_mihomo_max_nodes)
    return ordered[:limit]


def clear_node_cache() -> None:
    global _nodes_cache, _nodes_cache_at
    with _lock:
        _nodes_cache = None
        _nodes_cache_at = 0.0


def record_node_failure(name: str) -> None:
    _mark_node_failed(name)


def record_node_success(name: str) -> None:
    with _lock:
        _failed_until.pop(name, None)
