"""Shared crawl engine datatypes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.crawl.engine.modes import FetchMode


@dataclass
class LinkItem:
    text: str
    url: str
    kind: str = "unknown"


@dataclass
class ScrapeOptions:
    mode: FetchMode | None = None
    formats: tuple[str, ...] = ("html",)
    proxy: str | None = None
    timeout_ms: int | None = None
    reuse_session: bool = False
    use_cache: bool = False
    auto_stealth: bool = True


@dataclass
class ScrapeResult:
    url: str
    http_status: int
    mode: FetchMode
    blocked: bool
    html: str = ""
    text: str = ""
    links: list[LinkItem] = field(default_factory=list)
    markdown: str = ""
    used_stealth: bool = False
    hint: str = ""
    page: Any = None

    def to_tool_payload(self, *, max_preview: int = 1500) -> dict[str, Any]:
        preview = self.html[:max_preview] if self.html else self.text[:max_preview]
        return {
            "url": self.url,
            "http_status": self.http_status,
            "mode": self.mode.value,
            "blocked": self.blocked,
            "used_stealth": self.used_stealth,
            "content": preview,
            "html_chars": len(self.html),
            "link_count": len(self.links),
            "hint": self.hint,
        }
