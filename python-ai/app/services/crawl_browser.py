"""Playwright 浏览器会话 — 跨工具调用保持页面状态，支持点击/跳转。"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_SCRIPT_STYLE_RE = [
    re.compile(r"(?is)<script[^>]*>.*?</script>"),
    re.compile(r"(?is)<style[^>]*>.*?</style>"),
]


@dataclass
class BrowserSnapshot:
    url: str
    title: str
    html: str
    http_status: int = 200


def prepare_html_for_ai(html: str, *, max_chars: int = 22_000) -> str:
    """去掉 script/style，保留 DOM 结构供 LLM 自行读 href/正文。"""
    text = html or ""
    for pat in _SCRIPT_STYLE_RE:
        text = pat.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:max_chars]


def playwright_proxy(proxy_url: str | None) -> dict[str, str] | None:
    if not proxy_url:
        return None
    parsed = urlparse(proxy_url.strip())
    if not parsed.hostname:
        return None
    scheme = parsed.scheme or "http"
    port = parsed.port or (1080 if scheme.startswith("socks") else 8080)
    out: dict[str, str] = {"server": f"{scheme}://{parsed.hostname}:{port}"}
    if parsed.username:
        out["username"] = parsed.username
    if parsed.password:
        out["password"] = parsed.password
    return out


class CrawlBrowserSession:
    """单任务单浏览器会话；FetchPage 是无状态 HTTP，本类用于需要点击/SPA 的场景。"""

    def __init__(self, *, proxy: str | None = None) -> None:
        self._proxy = proxy
        self._playwright: Any = None
        self._browser: Any = None
        self._page: Any = None

    @property
    def is_open(self) -> bool:
        return self._page is not None

    async def _ensure(self) -> None:
        if self._page is not None:
            return
        try:
            from patchright.async_api import async_playwright
        except ImportError as exc:
            raise RuntimeError(
                "Playwright 浏览器未安装。Docker 镜像需 patchright install chromium"
            ) from exc

        self._playwright = await async_playwright().start()
        launch_kwargs: dict[str, Any] = {"headless": True}
        proxy_cfg = playwright_proxy(self._proxy)
        if proxy_cfg:
            launch_kwargs["proxy"] = proxy_cfg
        self._browser = await self._playwright.chromium.launch(**launch_kwargs)
        self._page = await self._browser.new_page()

    async def goto(self, url: str, *, timeout_ms: int = 60_000) -> BrowserSnapshot:
        await self._ensure()
        assert self._page is not None
        response = await self._page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=timeout_ms,
        )
        status = int(response.status) if response else 200
        return await self.snapshot(http_status=status)

    async def click(
        self,
        *,
        text: str = "",
        selector: str = "",
        timeout_ms: int = 30_000,
    ) -> BrowserSnapshot:
        await self._ensure()
        assert self._page is not None
        label = text.strip()
        sel = selector.strip()
        if label:
            await self._page.get_by_text(label, exact=False).first.click(timeout=timeout_ms)
        elif sel:
            await self._page.click(sel, timeout=timeout_ms)
        else:
            raise ValueError("必须提供 text（可见链接/按钮文字）或 selector（CSS）")
        try:
            await self._page.wait_for_load_state("domcontentloaded", timeout=timeout_ms)
        except Exception:
            pass
        return await self.snapshot()

    async def snapshot(self, *, http_status: int = 200) -> BrowserSnapshot:
        await self._ensure()
        assert self._page is not None
        html = await self._page.content()
        title = await self._page.title()
        return BrowserSnapshot(
            url=self._page.url,
            title=title or "",
            html=html,
            http_status=http_status,
        )

    async def close(self) -> None:
        page, browser, pw = self._page, self._browser, self._playwright
        self._page = None
        self._browser = None
        self._playwright = None
        for target, method in ((page, "close"), (browser, "close"), (pw, "stop")):
            if target is None:
                continue
            try:
                await getattr(target, method)()
            except Exception as exc:
                logger.debug("browser %s failed: %s", method, exc)


async def close_browser_session(session: CrawlBrowserSession | None) -> None:
    if session is not None:
        await session.close()
