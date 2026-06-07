"""Crawl job entrypoints — preview + execute (merged service/orchestration layer)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

from app.config import settings
from app.core.llm import llm_provider
from app.crawl.agent.catalog_context import fetch_catalog_snapshot
from app.crawl.agent.context import CrawlAgentContext
from app.crawl.agent.loop import CrawlLoopResult, run_crawl_tool_loop
from app.crawl.agent.runtime_state import apply_runtime_to_context, parse_config_json
from app.crawl.client import CrawlContentClient
from app.crawl.goal import DEFAULT_GOAL, goal_from_config, options_from_config

logger = logging.getLogger(__name__)

__all__ = [
    "CrawlOptions",
    "PreviewResult",
    "preview_crawl",
    "execute_crawl_job",
    "preview_with_agent",
    "run_crawl_agent",
]


@dataclass
class CrawlOptions:
    goal: str = DEFAULT_GOAL
    use_stealth: bool = False
    max_chapters: int = 0

    @classmethod
    def from_config(cls, site_config: dict[str, Any] | None) -> CrawlOptions:
        cfg = options_from_config(site_config)
        raw = cfg.get("maxChapters") if cfg.get("maxChapters") is not None else cfg.get("max_chapters")
        max_ch = 0 if raw is None else int(raw)
        explicit_stealth = cfg.get("useStealth") if "useStealth" in cfg else cfg.get("use_stealth")
        prefer_pw = cfg.get("usePlaywright") if "usePlaywright" in cfg else cfg.get("use_playwright")
        if prefer_pw is False:
            use_stealth = bool(explicit_stealth)
        elif prefer_pw is True or explicit_stealth is True:
            use_stealth = True
        else:
            use_stealth = bool(explicit_stealth) or (
                settings.crawl_browser_fetch_enabled and settings.crawl_prefer_playwright
            )
        return cls(
            goal=goal_from_config(site_config),
            use_stealth=use_stealth,
            max_chapters=max_ch,
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


def _require_llm() -> None:
    if not llm_provider.is_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行（请配置 OPENAI_API_KEY 等）")


def _build_context(
    job_id: str,
    source_url: str,
    site_config: dict[str, Any] | None,
    client: CrawlContentClient,
) -> CrawlAgentContext:
    opts = CrawlOptions.from_config(site_config)
    cfg = options_from_config(site_config)
    return CrawlAgentContext(
        job_id=job_id,
        entry_url=source_url,
        goal=opts.goal,
        client=client,
        max_chapters=opts.max_chapters,
        use_stealth=opts.use_stealth,
        site_config=cfg,
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
    job_snapshot: dict[str, Any] | None = None,
) -> None:
    ctx = _build_context(job_id, source_url, site_config, client)
    snap = job_snapshot or {}
    ctx.catalog_novel_id = str(snap.get("catalogNovelId") or "")
    ctx.novel_title = str(snap.get("title") or "")
    done = int(snap.get("chaptersDone") or 0)
    if done > 0:
        ctx.saved_sort_orders = set(range(1, done + 1))
    ctx.chapters_saved = len(ctx.saved_sort_orders)
    total = int(snap.get("chaptersTotal") or 0)

    config = parse_config_json(snap.get("configJson"))
    if site_config:
        config = {**config, **options_from_config(site_config)}
    queue_restored = apply_runtime_to_context(ctx, config.get("_runtime"))

    if ctx.catalog_novel_id and ctx.job_id != "preview":
        try:
            ctx.catalog_snapshot = await fetch_catalog_snapshot(client, ctx.catalog_novel_id)
        except Exception as exc:
            logger.debug("catalog snapshot preload failed jobId=%s: %s", job_id, exc)

    await client.update_progress(job_id, status="RUNNING")
    if queue_restored:
        await client.append_log(
            job_id,
            level="INFO",
            message=(
                f"续爬：已恢复章节队列 {len(ctx.chapters_queue)} 章"
                f"，已入库 {ctx.chapters_saved} 章"
                f"{f' · 《{ctx.novel_title}》' if ctx.novel_title else ''}"
                " — 可直接 SaveQueuedChapters 从下一章继续"
            ),
        )
    elif ctx.chapters_saved > 0:
        await client.append_log(
            job_id,
            level="INFO",
            message=(
                f"续爬：已入库 {ctx.chapters_saved}"
                f"{f'/{total}' if total else ''} 章"
                f"{f' · 《{ctx.novel_title}》' if ctx.novel_title else ''}"
                " — 请 FetchPage 目录后 QueueChapters，SaveQueuedChapters 从下一章继续"
            ),
        )
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
        site_config=options_from_config(site_config),
    )
    try:
        loop = await run_crawl_tool_loop(ctx, max_turns=12, preview_mode=True)
        return _loop_to_preview(loop, opts.goal)
    except Exception as exc:
        logger.warning("preview failed url=%s: %s", source_url, exc)
        return PreviewResult(ok=False, message=str(exc), goal_summary=opts.goal[:120])
    finally:
        await client.close()


async def preview_crawl(source_url: str, site_config: dict[str, Any] | None = None) -> PreviewResult:
    _require_llm()
    return await preview_with_agent(source_url, site_config)


async def execute_crawl_job(
    *,
    job_id: str,
    source_url: str,
    site_config: dict[str, Any] | None = None,
) -> None:
    _require_llm()
    client = CrawlContentClient()
    try:
        job = await _wait_job_runnable(client, job_id)
        if job is None:
            return
        await run_crawl_agent(
            job_id=job_id,
            source_url=source_url,
            site_config=site_config,
            client=client,
            job_snapshot=job,
        )
    except Exception as exc:
        logger.exception("crawl job failed jobId=%s", job_id)
        try:
            await client.append_log(job_id, level="ERROR", message=f"执行失败: {str(exc)[:500]}")
            await client.fail_job(job_id, error_message=str(exc)[:500])
        except Exception:
            pass
    finally:
        await client.close()


async def _wait_job_runnable(
    client: CrawlContentClient,
    job_id: str,
    *,
    attempts: int = 8,
    delay_sec: float = 0.4,
) -> dict[str, Any] | None:
    """等待 DB 事务提交后再读状态，避免 startJob 派发 race 导致静默跳过。"""
    last_status = ""
    for attempt in range(attempts):
        job = await client.get_job(job_id)
        if not job:
            logger.warning("crawl job missing jobId=%s", job_id)
            return None
        last_status = str(job.get("status") or "").upper()
        if last_status == "RUNNING":
            return job
        if last_status in {"CANCELLED", "PAUSED"} and attempt + 1 < attempts:
            await asyncio.sleep(delay_sec)
            continue
        break
    if last_status in {"CANCELLED", "PAUSED"}:
        msg = f"派发跳过：任务状态为 {last_status}（可能 MQ 早于 DB 提交或任务已暂停）"
        logger.warning("crawl job %s skipped: %s", job_id, msg)
        try:
            await client.append_log(job_id, level="WARN", message=msg)
        except Exception:
            pass
        return None
    if last_status != "RUNNING":
        logger.warning("crawl job %s unexpected status=%s", job_id, last_status)
    return job
