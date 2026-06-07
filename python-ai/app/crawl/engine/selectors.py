"""Structured link extraction (Scrapling-style hints + regex fallback)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urljoin

from app.crawl.engine.types import LinkItem

_CHAPTER_TITLE_RE = re.compile(
    r"(第\s*\d+\s*[章节回话]|chapter\s*\d+|^\d+\s*[\.\、])",
    re.IGNORECASE,
)
_PAGINATION_RE = re.compile(r"(下一页|下页|next|上一页|prev|pagination)", re.IGNORECASE)
_CATALOG_HINTS = ("目录", "章节", "章节目录", "全部章节", "开始阅读", "catalog", "index", "mulu")


@dataclass
class LinkKind:
    CHAPTER = "chapter"
    CATALOG = "catalog"
    PAGINATION = "pagination"
    OTHER = "other"


def _classify_link(text: str, url: str) -> str:
    lower_t = text.lower()
    lower_u = url.lower()
    if _PAGINATION_RE.search(lower_t) or "page=" in lower_u:
        return LinkKind.PAGINATION
    if _CHAPTER_TITLE_RE.search(text) or re.search(r"/\d+\.(html?|htm|shtml)$", lower_u):
        return LinkKind.CHAPTER
    for hint in _CATALOG_HINTS:
        if hint in lower_t or hint in lower_u:
            return LinkKind.CATALOG
    return LinkKind.OTHER


def extract_links_from_items(
    items: list[dict[str, str]],
    base_url: str,
    *,
    limit: int = 120,
) -> list[LinkItem]:
    """Turn page_links() dicts into classified LinkItem list."""
    out: list[LinkItem] = []
    seen: set[str] = set()
    for raw in items:
        url = str(raw.get("url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        text = str(raw.get("title") or "").strip()[:200]
        full = urljoin(base_url, url)
        out.append(
            LinkItem(
                text=text or full.rsplit("/", 1)[-1],
                url=full,
                kind=_classify_link(text, full),
            )
        )
        if len(out) >= limit:
            break
    return out


def guess_sort_orders(links: list[LinkItem]) -> list[dict[str, str | int]]:
    """Best-effort chapter sort_order from title/url patterns."""
    chapter_links = [ln for ln in links if ln.kind == LinkKind.CHAPTER]
    preview: list[dict[str, str | int]] = []
    for idx, ln in enumerate(chapter_links[:30], start=1):
        m = re.search(r"第\s*(\d+)", ln.text)
        order = int(m.group(1)) if m else idx
        preview.append({"sort_order": order, "title": ln.text, "url": ln.url, "kind": ln.kind})
    return preview
