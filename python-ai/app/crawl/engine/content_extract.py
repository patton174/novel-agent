"""Selector-first chapter body extraction (LLM fallback in crawl_ai_extractor)."""

from __future__ import annotations

import re
from html.parser import HTMLParser
from typing import Any

from app.crawl.fetch.scrapling import page_text as _page_text

_VOID_TAGS = frozenset(
    {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
)
_BLOCK_TAGS = frozenset({"p", "div", "br", "h1", "h2", "h3", "h4", "h5", "section", "article", "li"})

DEFAULT_CONTENT_SELECTORS: tuple[str, ...] = (
    "#content",
    ".read-content",
    "#chaptercontent",
    ".novelcontent",
    "#booktext",
    "#htmlContent",
    "article",
    ".chapter-content",
)

_TITLE_SELECTORS: tuple[str, ...] = ("h1", ".chapter-title", "#chapterTitle", ".title")


def _content_selectors(site_config: dict[str, Any] | None) -> list[str]:
    out: list[str] = []
    if site_config:
        custom = str(site_config.get("content_selector") or site_config.get("contentSelector") or "").strip()
        if custom:
            out.append(custom)
    out.extend(DEFAULT_CONTENT_SELECTORS)
    return out


def _node_text(node: Any) -> str:
    if node is None:
        return ""
    if hasattr(node, "text"):
        try:
            return str(node.text or "").strip()
        except Exception:
            pass
    if hasattr(node, "get_all_text"):
        try:
            return str(node.get_all_text() or "").strip()
        except Exception:
            pass
    return str(node).strip()


class _SelectorTextParser(HTMLParser):
    """Tag-balanced extraction of a node's inner text by id/class/tag selector.

    Handles nested elements correctly (unlike a non-greedy regex which stops at
    the first inner closing tag).
    """

    def __init__(self, kind: str, needle: str) -> None:
        super().__init__(convert_charrefs=True)
        self._kind = kind  # "id" | "class" | "tag"
        self._needle = needle.lower()
        self._stack: list[str] = []
        self._capture_depth: int | None = None
        self._parts: list[str] = []

    def _matches(self, tag: str, attrs: list[tuple[str, str | None]]) -> bool:
        if self._kind == "tag":
            return tag == self._needle
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        if self._kind == "id":
            return attr_map.get("id", "").lower() == self._needle
        classes = attr_map.get("class", "").lower().split()
        return self._needle in classes

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in _VOID_TAGS:
            if self._capture_depth is not None and tag in _BLOCK_TAGS:
                self._parts.append("\n")
            return
        self._stack.append(tag)
        if self._capture_depth is None and self._matches(tag, attrs):
            self._capture_depth = len(self._stack)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in _VOID_TAGS:
            return
        depth = len(self._stack)
        if self._capture_depth is not None and tag in _BLOCK_TAGS:
            self._parts.append("\n")
        # pop the most recent matching tag
        for i in range(depth - 1, -1, -1):
            if self._stack[i] == tag:
                del self._stack[i:]
                depth = i
                break
        if self._capture_depth is not None and depth < self._capture_depth:
            self._capture_depth = None

    def handle_data(self, data: str) -> None:
        if self._capture_depth is not None:
            self._parts.append(data)

    def text(self) -> str:
        raw = "".join(self._parts)
        return "\n".join(line.strip() for line in raw.splitlines() if line.strip())


def _selector_kind(selector: str) -> tuple[str, str]:
    if selector.startswith("#"):
        return "id", selector[1:]
    if selector.startswith("."):
        return "class", selector[1:]
    return "tag", selector


def _regex_extract(html: str, selector: str) -> str:
    body = html or ""
    if not body:
        return ""
    kind, needle = _selector_kind(selector)
    if not needle:
        return ""
    parser = _SelectorTextParser(kind, needle)
    try:
        parser.feed(body)
        parser.close()
    except Exception:
        return ""
    return parser.text()


def _guess_title(page: Any, fallback: str) -> str:
    if hasattr(page, "css"):
        for sel in _TITLE_SELECTORS:
            try:
                nodes = page.css(sel)
                if nodes:
                    title = _node_text(nodes[0])
                    if title:
                        return title[:200]
            except Exception:
                continue
    return (fallback or "未命名章节").strip()[:200]


def extract_chapter_via_selector(
    page: Any,
    *,
    fallback_title: str = "",
    site_config: dict[str, Any] | None = None,
    min_chars: int = 50,
) -> tuple[str, str] | None:
    """Return (title, content) when selector path hits; else None."""
    selectors = _content_selectors(site_config)
    for sel in selectors:
        content = ""
        try:
            if hasattr(page, "css"):
                nodes = page.css(sel)
                if nodes:
                    content = _node_text(nodes[0])
            elif hasattr(page, "body"):
                content = _regex_extract(str(page.body or ""), sel)
            if not content and hasattr(page, "html"):
                content = _regex_extract(str(getattr(page, "html", "") or ""), sel)
        except Exception:
            content = ""
        if len(content) >= min_chars:
            return _guess_title(page, fallback_title), content
    # Whole-page text fallback when body is already stripped (small pages)
    try:
        whole = _page_text(page, 24_000)
        if len(whole) >= min_chars and not whole.startswith("[HTTP"):
            return _guess_title(page, fallback_title), whole
    except Exception:
        pass
    return None
