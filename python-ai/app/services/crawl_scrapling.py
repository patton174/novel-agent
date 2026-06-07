"""Scrapling 抓取封装 — https://github.com/d4vinci/Scrapling"""

from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

from app.config import settings
from app.services.crawl_proxy import mask_proxy_url, pick_crawl_proxy, proxy_candidates_for_fetch
from app.services.crawl_mihomo import (
    iter_nodes_for_retry,
    mihomo_rotation_enabled,
    record_node_failure,
    record_node_success,
    select_node,
)

logger = logging.getLogger(__name__)

_ANCHOR_RE = re.compile(
    r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
    flags=re.IGNORECASE | re.DOTALL,
)

# curl_cffi 高并发下 TLS 易抖动；Stealth 浏览器占内存，单独限流
_http_fetch_sem: threading.Semaphore | None = None
_browser_fetch_sem: threading.Semaphore | None = None


def _http_sem() -> threading.Semaphore:
    global _http_fetch_sem
    if _http_fetch_sem is None:
        _http_fetch_sem = threading.Semaphore(max(1, settings.crawl_fetch_concurrency))
    return _http_fetch_sem


def _browser_sem() -> threading.Semaphore:
    global _browser_fetch_sem
    if _browser_fetch_sem is None:
        _browser_fetch_sem = threading.Semaphore(max(1, settings.crawl_browser_concurrency))
    return _browser_fetch_sem


@dataclass
class PageFetchMeta:
    http_status: int
    used_stealth: bool
    content_chars: int
    link_count: int
    blocked: bool
    hint: str = ""
    proxy_node_retries: int = 0


def _browser_unavailable(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return (
        "executable doesn't exist" in msg
        or "patchright install" in msg
        or "playwright install" in msg
        or "browser_type.launch" in msg
    )


def _is_tls_or_proxy_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return (
        "tls connect error" in msg
        or "curl: (35)" in msg
        or "curl: (56)" in msg
        or "curl: (52)" in msg
        or "invalid library" in msg
        or "openssl_internal" in msg
        or "ssl: unexpected_eof" in msg
        or "sslerror" in msg
        or "certificate verify failed" in msg
        or "proxy connect" in msg
        or "connection reset" in msg
    )


def _use_mihomo_node_rotation(proxy: str | None) -> bool:
    if not mihomo_rotation_enabled():
        return False
    base = settings.crawl_http_proxy.strip()
    if not base:
        return False
    effective = (proxy or base).strip()
    return effective == base


def _should_retry_next_mihomo_node(
    meta: PageFetchMeta | None,
    exc: BaseException | None,
) -> bool:
    """仅 TLS/代理链路失败时换节点；403 等业务拦截不换节点。"""
    if exc is not None:
        return _is_tls_or_proxy_error(exc)
    return False


def _fetch_with_mihomo_node_rotation(
    url: str,
    *,
    auto_stealth: bool,
    proxy: str | None,
) -> tuple[Any, PageFetchMeta] | None:
    """经 mihomo API 切换节点并重试；不可用时返回 None 走原有逻辑。"""
    if not _use_mihomo_node_rotation(proxy):
        return None

    http_proxy = (proxy or settings.crawl_http_proxy).strip()
    nodes = iter_nodes_for_retry()
    if not nodes:
        logger.warning("mihomo 无可用叶子节点，跳过自动换节点")
        return None

    last_tls_exc: BaseException | None = None
    last_meta: PageFetchMeta | None = None
    tls_attempts = 0
    select_lock = threading.Lock()

    def try_http(node: str) -> tuple[Any, PageFetchMeta] | None:
        nonlocal last_tls_exc, last_meta, tls_attempts
        with select_lock:
            select_node(node)
        try:
            page = fetch_page(url, stealth=False, proxy=http_proxy)
            meta = _build_meta(page, url, used_stealth=False, proxy=http_proxy)
            meta.proxy_node_retries = tls_attempts
            record_node_success(node)
            if tls_attempts:
                logger.info(
                    "FetchPage 换节点成功 node=%s url=%s status=%s tries=%s",
                    node[:45],
                    url,
                    meta.http_status,
                    tls_attempts,
                )
            return page, meta
        except Exception as exc:
            if _should_retry_next_mihomo_node(None, exc):
                tls_attempts += 1
                last_tls_exc = exc
                record_node_failure(node)
                logger.debug(
                    "FetchPage TLS 静默换节点 node=%s url=%s err=%s",
                    node[:45],
                    url,
                    str(exc)[:160],
                )
                return None
            raise

    for node in nodes:
        result = try_http(node)
        if result is not None:
            return result

    if auto_stealth and settings.crawl_browser_fetch_enabled:
        stealth_limit = min(3, len(nodes))
        for node in nodes[:stealth_limit]:
            with select_lock:
                select_node(node)
            try:
                logger.debug("FetchPage Stealth 静默换节点 node=%s url=%s", node[:45], url)
                page = fetch_page(url, stealth=True, proxy=http_proxy)
                meta = _build_meta(page, url, used_stealth=True, proxy=http_proxy)
                meta.proxy_node_retries = tls_attempts
                record_node_success(node)
                return page, meta
            except Exception as exc:
                if _browser_unavailable(exc):
                    logger.warning("Stealth 浏览器不可用: %s", exc)
                    break
                if _should_retry_next_mihomo_node(None, exc):
                    tls_attempts += 1
                    record_node_failure(node)
                    logger.debug(
                        "Stealth TLS 静默换节点 node=%s url=%s err=%s",
                        node[:45],
                        url,
                        str(exc)[:160],
                    )
                    continue
                record_node_failure(node)
                logger.debug("Stealth 节点失败 node=%s url=%s: %s", node[:45], url, exc)

    if last_tls_exc:
        logger.info(
            "mihomo 已静默尝试 %d 个节点仍无法握手 url=%s",
            len(nodes),
            url,
        )
        return None


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
        hint = "目标站拒绝访问（403），可尝试 BrowserOpen 或 FailJob"
    elif status >= 400:
        hint = f"HTTP {status}，页面不可用"
    elif status == 0:
        hint = "无法打开该 URL，可尝试 BrowserOpen 或 FailJob"
    elif blocked:
        hint = "响应正文过短，可能为反爬空壳页，可换 BrowserOpen"

    return PageFetchMeta(
        http_status=status,
        used_stealth=used_stealth,
        content_chars=content_chars,
        link_count=link_count,
        blocked=blocked,
        hint=hint,
    )


class _EmptyFetchPage:
    status = 0
    reason = "Unavailable"
    body = b""

    def css(self, _sel):
        return []


def _transport_failure_meta(url: str, *, proxy_node_retries: int = 0) -> PageFetchMeta:
    return PageFetchMeta(
        http_status=0,
        used_stealth=False,
        content_chars=0,
        link_count=0,
        blocked=True,
        hint="无法打开该 URL，可尝试 BrowserOpen 或 FailJob",
        proxy_node_retries=proxy_node_retries,
    )


def _transport_failure_result(
    url: str,
    *,
    proxy_node_retries: int = 0,
) -> tuple[Any, PageFetchMeta]:
    return _EmptyFetchPage(), _transport_failure_meta(url, proxy_node_retries=proxy_node_retries)


def _fetch_http(url: str, *, proxy: str | None) -> Any:
    """Scrapling HTTP Fetcher（curl_cffi），带 impersonate 与并发限流。"""
    from scrapling.fetchers import Fetcher

    kwargs: dict[str, Any] = {
        "stealthy_headers": True,
        "impersonate": settings.crawl_impersonate,
        "retries": max(1, settings.crawl_http_retries),
        "timeout": settings.crawl_http_timeout,
    }
    if proxy:
        kwargs["proxy"] = proxy
    with _http_sem():
        return Fetcher.get(url, **kwargs)


def _fetch_stealth_browser(url: str, *, proxy: str | None) -> Any:
    """Scrapling StealthyFetcher — Chromium 网络栈，绕过 curl_cffi+代理 TLS 问题。"""
    from scrapling.fetchers import StealthyFetcher

    kwargs: dict[str, Any] = {
        "headless": True,
        "network_idle": False,
        "timeout": settings.crawl_browser_timeout_ms,
        "disable_resources": True,
    }
    if proxy:
        kwargs["proxy"] = proxy
        kwargs["geoip"] = True
        kwargs["block_webrtc"] = True
    with _browser_sem():
        return StealthyFetcher.fetch(url, **kwargs)


def fetch_page(url: str, *, stealth: bool = False, proxy: str | None = None):
    if stealth:
        try:
            return _fetch_stealth_browser(url, proxy=proxy)
        except Exception as exc:
            if _browser_unavailable(exc):
                logger.warning(
                    "Stealth 浏览器不可用（需 patchright chromium；容器内存建议 ≥512MB）：%s",
                    exc,
                )
                raise RuntimeError(
                    "Stealth 浏览器不可用，请确认镜像已 patchright install chromium 且 PYTHON_MEM_LIMIT≥512m"
                ) from exc
            raise
    return _fetch_http(url, proxy=proxy)


def fetch_page_with_retry(
    url: str,
    *,
    stealth: bool = False,
    auto_stealth: bool = True,
    proxy: str | None = None,
) -> tuple[Any, PageFetchMeta]:
    """抓取页面：mihomo 换节点 → HTTP Fetcher → 代理轮换/直连 → Stealth 浏览器。"""
    if stealth:
        page = fetch_page(url, stealth=True, proxy=proxy)
        return page, _build_meta(page, url, used_stealth=True, proxy=proxy)

    mihomo_result = _fetch_with_mihomo_node_rotation(
        url,
        auto_stealth=auto_stealth,
        proxy=proxy,
    )
    if mihomo_result is not None:
        return mihomo_result

    candidates = proxy_candidates_for_fetch(proxy)
    last_tls_exc: BaseException | None = None
    tls_proxy_attempts = 0

    for candidate in candidates:
        label = mask_proxy_url(candidate) or "direct"
        try:
            page = fetch_page(url, stealth=False, proxy=candidate)
            meta = _build_meta(page, url, used_stealth=False, proxy=candidate)
            meta.proxy_node_retries = tls_proxy_attempts
            if not meta.blocked:
                return page, meta
            if meta.http_status in {403, 429} and meta.content_chars >= 80:
                return page, meta
            logger.debug(
                "FetchPage blocked via %s url=%s status=%s chars=%s",
                label,
                url,
                meta.http_status,
                meta.content_chars,
            )
        except Exception as exc:
            if _is_tls_or_proxy_error(exc):
                tls_proxy_attempts += 1
                last_tls_exc = exc
                logger.debug(
                    "FetchPage TLS 静默重试 proxy=%s url=%s err=%s",
                    label,
                    url,
                    str(exc)[:160],
                )
                continue
            raise

    if auto_stealth and settings.crawl_browser_fetch_enabled:
        for candidate in candidates:
            label = mask_proxy_url(candidate) or "direct"
            try:
                logger.debug("FetchPage 升级 Stealth proxy=%s url=%s", label, url)
                page = fetch_page(url, stealth=True, proxy=candidate)
                meta = _build_meta(page, url, used_stealth=True, proxy=candidate)
                meta.proxy_node_retries = tls_proxy_attempts
                if not meta.blocked or meta.content_chars >= 80:
                    return page, meta
            except Exception as exc:
                if _browser_unavailable(exc):
                    logger.warning("Stealth 浏览器不可用: %s", exc)
                    break
                if _is_tls_or_proxy_error(exc):
                    tls_proxy_attempts += 1
                    last_tls_exc = exc
                    logger.debug(
                        "Stealth TLS 静默重试 proxy=%s url=%s err=%s",
                        label,
                        url,
                        str(exc)[:160],
                    )
                    continue
                logger.debug("Stealth fetch failed proxy=%s url=%s: %s", label, url, exc)
                continue

    if last_tls_exc:
        logger.info("FetchPage 代理链 TLS 均失败 url=%s attempts=%s", url, tls_proxy_attempts)
        return _transport_failure_result(url, proxy_node_retries=tls_proxy_attempts)

    page = fetch_page(url, stealth=False, proxy=proxy)
    meta = _build_meta(page, url, used_stealth=False, proxy=proxy)
    meta.proxy_node_retries = tls_proxy_attempts
    return page, meta


# 测试 / 诊断用
def _is_scrapling_tls_error(exc: BaseException) -> bool:
    return _is_tls_or_proxy_error(exc)
