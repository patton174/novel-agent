"""Scrapling 抓取封装 — https://github.com/d4vinci/Scrapling"""

from __future__ import annotations

import logging
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


def _browser_unavailable(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return (
        "executable doesn't exist" in msg
        or "patchright install" in msg
        or "playwright install" in msg
        or "browser_type.launch" in msg
    )


def fetch_page(url: str, *, stealth: bool = False):
    try:
        from scrapling.fetchers import Fetcher

        if stealth:
            try:
                from scrapling.fetchers import StealthyFetcher

                return StealthyFetcher.fetch(url, headless=True, network_idle=True)
            except Exception as exc:
                if _browser_unavailable(exc):
                    logger.warning(
                        "Stealth 浏览器未安装或不可用，回退 HTTP Fetcher。"
                        " Docker 镜像需 patchright install chromium：%s",
                        exc,
                    )
                else:
                    raise
        return Fetcher.get(url, stealthy_headers=True)
    except ImportError as exc:
        raise RuntimeError("Scrapling 未安装，请执行 pip install scrapling[fetchers]") from exc


def page_text(page, max_chars: int = 18000) -> str:
    if page is None:
        return ""
    if hasattr(page, "get_text"):
        try:
            text = page.get_text()
            if text and len(text.strip()) > 100:
                return text.strip()[:max_chars]
        except Exception:
            pass
    body_nodes = page.css("body")
    if body_nodes and hasattr(body_nodes[0], "text") and body_nodes[0].text:
        return body_nodes[0].text.strip()[:max_chars]
    return str(page)[:max_chars]


def page_links(page, base_url: str, limit: int = 600) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for anchor in page.css("a"):
        href = anchor.attrib.get("href") if hasattr(anchor, "attrib") else None
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        full = urljoin(base_url, href)
        if full in seen:
            continue
        text = ""
        if hasattr(anchor, "text") and anchor.text:
            text = anchor.text.strip()
        if not text and hasattr(anchor, "get"):
            text = str(anchor.get("text", "")).strip()
        if len(text) > 160:
            text = text[:160]
        seen.add(full)
        items.append({"title": text or full.rsplit("/", 1)[-1], "url": full})
        if len(items) >= limit:
            break
    return items
