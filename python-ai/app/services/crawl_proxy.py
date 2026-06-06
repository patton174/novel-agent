"""爬虫 HTTP 代理解析 — 环境变量 / 任务 config 覆盖 / 多代理轮询。"""

from __future__ import annotations

import itertools
import threading
from typing import Any
from urllib.parse import urlparse

from app.config import settings

_rotator_lock = threading.Lock()
_rotator_cycle: itertools.cycle[str] | None = None


def _split_proxy_list(raw: str) -> list[str]:
    items: list[str] = []
    for part in raw.replace("\n", ",").split(","):
        url = part.strip()
        if url:
            items.append(url)
    return items


def _init_rotator() -> itertools.cycle[str] | None:
    global _rotator_cycle
    if _rotator_cycle is not None:
        return _rotator_cycle
    proxies = _split_proxy_list(settings.crawl_proxy_list)
    if not proxies:
        return None
    _rotator_cycle = itertools.cycle(proxies)
    return _rotator_cycle


def pick_crawl_proxy(config: dict[str, Any] | None = None) -> str | None:
    """解析本次请求使用的代理 URL（可为空）。"""
    cfg = config or {}
    override = (
        cfg.get("proxy")
        or cfg.get("http_proxy")
        or cfg.get("httpProxy")
        or cfg.get("crawl_proxy")
    )
    if isinstance(override, str) and override.strip():
        return override.strip()

    use_env = cfg.get("use_proxy")
    if use_env is False:
        return None

    if settings.crawl_http_proxy.strip():
        return settings.crawl_http_proxy.strip()

    rotator = _init_rotator()
    if rotator is None:
        return None
    with _rotator_lock:
        return next(rotator)


def mask_proxy_url(proxy: str | None) -> str:
    if not proxy:
        return ""
    parsed = urlparse(proxy)
    if parsed.hostname:
        host = parsed.hostname
        if parsed.port:
            host = f"{host}:{parsed.port}"
        return host
    if "@" in proxy:
        return proxy.rsplit("@", 1)[-1]
    return proxy


def crawl_proxy_enabled(config: dict[str, Any] | None = None) -> bool:
    return pick_crawl_proxy(config) is not None
