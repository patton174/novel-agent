"""Crawl agent runtime context (mirrors AgentRunContext)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.crawl_content_client import CrawlContentClient


@dataclass
class ChapterItem:
    title: str
    url: str
    sort_order: int = 0


@dataclass
class CrawlAgentContext:
    job_id: str
    entry_url: str
    goal: str
    client: CrawlContentClient
    max_chapters: int = 200
    use_stealth: bool = False

    novel_title: str = ""
    novel_author: str = ""
    novel_description: str = ""
    catalog_novel_id: str = ""
    source_url: str = ""

    chapters_queue: list[ChapterItem] = field(default_factory=list)
    chapters_saved: int = 0
    last_fetched_url: str = ""
    allowed_nav_urls: set[str] = field(default_factory=set)
    last_navigation: dict[str, Any] = field(default_factory=dict)

    end_run: bool = False
    end_success: bool = False
    end_message: str = ""

    def snapshot(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "entry_url": self.entry_url,
            "goal": self.goal,
            "max_chapters": self.max_chapters,
            "use_stealth": self.use_stealth,
            "novel_title": self.novel_title,
            "catalog_novel_id": self.catalog_novel_id,
            "chapters_discovered": len(self.chapters_queue),
            "chapters_saved": self.chapters_saved,
            "chapters_remaining": max(0, len(self.chapters_queue) - self.chapters_saved),
            "last_fetched_url": self.last_fetched_url,
        }
