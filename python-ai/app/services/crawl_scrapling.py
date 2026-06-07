"""Scrapling 抓取封装 — https://github.com/d4vinci/Scrapling"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

_ANCHOR_RE = re.compile(
    r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
    flags=re.IGNORECASE | re.DOTALL,
)


@dataclass
class PageFetchMeta:
    http_status: int
    used_stealth: bool
    content_chars: int
    link_count: int
    blocked: bool
    hint: str = ""


def _browser_unavailable(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return (
        "executable doesn't exist" in msg
        or "patchright install" in msg
        or "playwright install" in msg
        or "browser_type.launch" in msg
    )


def page_http_status(page: Any) -> int:
    try:
        return int(getattr(page, "status", 200) or 200)
    except (TypeError, ValueError):
        return 200


def _raw_html(page: Any) -> str:
    if page is None:
        return ""
    body = getattr(page, "body", None)
    if isinstance(body, bytes):
        return body.decode("utf-8", errors="replace")
    if isinstance(body, str) and body.strip():
        return body
    html = getattr(page, "html_content", None)
    return str(html or "")


def _strip_html(html: str) -> str:
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(text.split())


def page_html(page: Any, max_chars: int = 24_000) -> str:
    """返回原始 HTML（去掉 script/style），供 LLM 自行解析链接与正文。"""
    if page is None:
        return ""

    status = page_http_status(page)
    html = _raw_html(page)
    if not html.strip():
        return page_text(page, max_chars)

    for pat in (
        re.compile(r"(?is)<script[^>]*>.*?</script>"),
        re.compile(r"(?is)<style[^>]*>.*?</style>"),
    ):
        html = pat.sub("", html)

    if status >= 400:
        reason = str(getattr(page, "reason", "") or "").strip()
        head = f"<!-- HTTP {status}"
        if reason:
            head += f" {reason}"
        head += " -->\n"
        html = head + html

    return html.strip()[:max_chars]


def page_text(page: Any, max_chars: int = 18000) -> str:
    if page is None:
        return ""

    status = page_http_status(page)
    if status >= 400:
        reason = str(getattr(page, "reason", "") or "").strip()
        snippet = _strip_html(_raw_html(page))[: max_chars - 80]
        head = f"[HTTP {status}]"
        if reason:
            head += f" {reason}"
        if "403" in head and "Forbidden" in snippet:
            head += " — 当前服务器出口 IP 可能被目标站 WAF 封禁"
        return f"{head}\n{snippet}".strip()[:max_chars]

    if hasattr(page, "get_all_text"):
        try:
            text = str(page.get_all_text() or "").strip()
            if len(text) > 80:
                return text[:max_chars]
        except Exception:
            pass

    if hasattr(page, "get_text"):
        try:
            text = page.get_text()
            if text and len(text.strip()) > 80:
                return text.strip()[:max_chars]
        except Exception:
            pass

    body_nodes = page.css("body")
    if body_nodes and hasattr(body_nodes[0], "text") and body_nodes[0].text:
        return body_nodes[0].text.strip()[:max_chars]

    fallback = _strip_html(_raw_html(page))
    if fallback:
        return fallback[:max_chars]
    return str(page)[:max_chars]


def _anchor_text(raw: str) -> str:
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(text.split())


def _links_from_html(html: str, base_url: str, *, limit: int, seen: set[str]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    if not html or "<a" not in html.lower():
        return items
    for href, inner in _ANCHOR_RE.findall(html):
        href = href.strip()
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        full = urljoin(base_url, href)
        if full in seen:
            continue
        title = _anchor_text(inner)[:160] or full.rsplit("/", 1)[-1]
        seen.add(full)
        items.append({"title": title, "url": full})
        if len(items) >= limit:
            break
    return items


def _anchor_label(anchor: Any) -> str:
    if hasattr(anchor, "text") and anchor.text:
        return str(anchor.text).strip()
    if hasattr(anchor, "get"):
        try:
            val = anchor.get("text")
            if val:
                return str(val).strip()
        except (TypeError, AttributeError):
            pass
    return ""


def page_links(page: Any, base_url: str, limit: int = 600) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    try:
        anchors = page.css("a") if hasattr(page, "css") else []
    except Exception as exc:
        logger.warning("page.css('a') failed base=%s: %s", base_url, exc)
        anchors = []
    for anchor in anchors:
        href = anchor.attrib.get("href") if hasattr(anchor, "attrib") else None
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        full = urljoin(base_url, href)
        if full in seen:
            continue
        text = _anchor_label(anchor)
        if len(text) > 160:
            text = text[:160]
        seen.add(full)
        items.append({"title": text or full.rsplit("/", 1)[-1], "url": full})
        if len(items) >= limit:
            return items

    if not items:
        html = _raw_html(page)
        items = _links_from_html(html, base_url, limit=limit, seen=seen)
        if items:
            logger.debug(
                "page_links html fallback base=%s css=0 html=%s",
                base_url,
                len(items),
            )
    return items


def _build_meta(page: Any, url: str, *, used_stealth: bool, proxy: str | None = None) -> PageFetchMeta:
    status = page_http_status(page)
    html = page_html(page, 12_000)
    text = page_text(page, 8000)
    content_chars = max(len(html.strip()), len(text.strip()))
    link_count = 0

    blocked = status >= 400 or content_chars < 80
    hint = ""
    if status == 403:
        if proxy:
            hint = (
                "HTTP 403：当前代理出口仍被目标站拒绝，请更换住宅/动态代理或检查账号流量"
            )
        else:
            hint = "目标站返回 403 Forbidden，Worker 出口 IP 可能被 WAF 封禁，请配置 CRAWL_HTTP_PROXY"
    elif status >= 400:
        hint = f"HTTP {status}，页面不可用"
    elif blocked:
        hint = "响应正文过短且无有效链接，可能为反爬空壳页"

    return PageFetchMeta(
        http_status=status,
        used_stealth=used_stealth,
        content_chars=content_chars,
        link_count=link_count,
        blocked=blocked,
        hint=hint,
    )


def fetch_page(url: str, *, stealth: bool = False, proxy: str | None = None):
    try:
        from scrapling.fetchers import Fetcher

        if stealth:
            try:
                from scrapling.fetchers import StealthyFetcher

                kwargs: dict[str, Any] = {
                    "headless": True,
                    "network_idle": False,
                    "timeout": 60000,
                }
                if proxy:
                    kwargs["proxy"] = proxy
                    kwargs["geoip"] = True
                    kwargs["block_webrtc"] = True
                return StealthyFetcher.fetch(url, **kwargs)
            except Exception as exc:
                if _browser_unavailable(exc):
                    logger.warning(
                        "Stealth 浏览器未安装或不可用，回退 HTTP Fetcher。"
                        " Docker 镜像需 patchright install chromium：%s",
                        exc,
                    )
                else:
                    raise
        if proxy:
            return Fetcher.get(url, stealthy_headers=True, proxy=proxy)
        return Fetcher.get(url, stealthy_headers=True)
    except ImportError as exc:
        raise RuntimeError("Scrapling 未安装，请执行 pip install scrapling[fetchers]") from exc


def fetch_page_with_retry(
    url: str,
    *,
    stealth: bool = False,
    auto_stealth: bool = True,
    proxy: str | None = None,
) -> tuple[Any, PageFetchMeta]:
    """抓取页面；HTTP 被拦或空壳时自动尝试 Stealth 一次。"""
    page = fetch_page(url, stealth=stealth, proxy=proxy)
    meta = _build_meta(page, url, used_stealth=stealth, proxy=proxy)

    if auto_stealth and not stealth and meta.blocked:
        logger.info("FetchPage auto stealth retry url=%s status=%s", url, meta.http_status)
        try:
            stealth_page = fetch_page(url, stealth=True, proxy=proxy)
            stealth_meta = _build_meta(stealth_page, url, used_stealth=True, proxy=proxy)
            if not stealth_meta.blocked:
                return stealth_page, stealth_meta
            page, meta = stealth_page, stealth_meta
        except Exception as exc:
            logger.warning("Stealth retry failed url=%s: %s", url, exc)
            if not meta.hint:
                meta.hint = f"Stealth 重试失败: {exc}"

    return page, meta
