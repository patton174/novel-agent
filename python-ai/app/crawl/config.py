"""Centralized crawl tunables (env-backed via Settings)."""

from __future__ import annotations

from dataclasses import dataclass

from app.config import settings


@dataclass(frozen=True)
class CrawlLimits:
    max_turns: int
    preview_turns: int
    batch_save: int
    html_budget: int
    memory_budget: int
    orch_slots: int
    orch_max_turns: int
    max_concurrent_jobs: int
    map_links_limit: int


def get_crawl_limits() -> CrawlLimits:
    return CrawlLimits(
        max_turns=max(1, int(getattr(settings, "crawl_max_turns", 160) or 160)),
        preview_turns=max(1, int(getattr(settings, "crawl_preview_turns", 12) or 12)),
        batch_save=max(1, int(getattr(settings, "crawl_batch_save", 20) or 20)),
        html_budget=max(4000, int(getattr(settings, "crawl_html_budget", 22_000) or 22_000)),
        memory_budget=max(4000, int(getattr(settings, "crawl_memory_budget", 24_000) or 24_000)),
        orch_slots=max(1, int(getattr(settings, "crawl_orch_slots", 3) or 3)),
        orch_max_turns=max(1, int(getattr(settings, "crawl_orch_max_turns", 8) or 8)),
        max_concurrent_jobs=max(1, int(getattr(settings, "crawl_max_concurrent_jobs", 4) or 4)),
        map_links_limit=max(10, int(getattr(settings, "crawl_map_links_limit", 120) or 120)),
    )
