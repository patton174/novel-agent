"""Tool-call based crawl agent orchestration."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.loop import CrawlLoopResult, run_crawl_tool_loop
from app.services.crawl_content_client import CrawlContentClient
from app.services.crawl_goal import DEFAULT_GOAL, goal_from_config, options_from_config

logger = logging.getLogger(__name__)


@dataclass
class CrawlOptions:
    goal: str = DEFAULT_GOAL
    use_stealth: bool = False
    max_chapters: int = 200

    @classmethod
    def from_config(cls, site_config: dict[str, Any] | None) -> CrawlOptions:
        cfg = options_from_config(site_config)
        return cls(
            goal=goal_from_config(site_config),
            use_stealth=bool(cfg.get("useStealth") or cfg.get("use_stealth")),
            max_chapters=int(cfg.get("maxChapters") or cfg.get("max_chapters") or 200),
        )


@dataclass
class PreviewResult:
    ok: bool
    title: str = ""
    author: str = ""
    chapter_count: int = 0
    sample_chapters: list[dict[str, str]] = field(default_factory=list)
    message: str = ""
    goal_summary: str = ""


def _build_context(
    job_id: str,
    source_url: str,
    site_config: dict[str, Any] | None,
    client: CrawlContentClient,
) -> CrawlAgentContext:
    opts = CrawlOptions.from_config(site_config)
    return CrawlAgentContext(
        job_id=job_id,
        entry_url=source_url,
        goal=opts.goal,
        client=client,
        max_chapters=opts.max_chapters,
        use_stealth=opts.use_stealth,
    )


def _loop_to_preview(loop: CrawlLoopResult, goal: str) -> PreviewResult:
    return PreviewResult(
        ok=loop.ok,
        title=loop.novel_title,
        author=loop.author,
        chapter_count=loop.chapter_count,
        sample_chapters=loop.sample_chapters or [],
        message=loop.message,
        goal_summary=goal[:120],
    )


async def run_crawl_agent(
    *,
    job_id: str,
    source_url: str,
    site_config: dict[str, Any] | None,
    client: CrawlContentClient,
) -> None:
    ctx = _build_context(job_id, source_url, site_config, client)
    await client.update_progress(job_id, status="RUNNING")
    try:
        result = await run_crawl_tool_loop(ctx, preview_mode=False)
        if not result.ok and not ctx.end_run:
            await client.fail_job(job_id, error_message=result.message[:500])
    except Exception as exc:
        logger.exception("crawl agent failed jobId=%s", job_id)
        await client.append_log(job_id, level="ERROR", message=f"执行失败: {str(exc)[:500]}")
        await client.fail_job(job_id, error_message=str(exc)[:500])


async def preview_with_agent(
    source_url: str,
    site_config: dict[str, Any] | None = None,
) -> PreviewResult:
    client = CrawlContentClient()
    job_id = "preview"
    opts = CrawlOptions.from_config(site_config)
    ctx = CrawlAgentContext(
        job_id=job_id,
        entry_url=source_url,
        goal=opts.goal,
        client=client,
        max_chapters=opts.max_chapters,
        use_stealth=opts.use_stealth,
    )
    try:
        loop = await run_crawl_tool_loop(ctx, max_turns=12, preview_mode=True)
        return _loop_to_preview(loop, opts.goal)
    except Exception as exc:
        logger.warning("preview failed url=%s: %s", source_url, exc)
        return PreviewResult(ok=False, message=str(exc), goal_summary=opts.goal[:120])
    finally:
        await client.close()
