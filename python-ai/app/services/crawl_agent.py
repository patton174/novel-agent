"""Scrapling + LLM 自主爬虫代理：根据自然语言目标持续执行直到完成或失败。"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Literal

from app.config import settings
from app.core.llm import generate_text, llm_provider
from app.services.crawl_ai_extractor import discover_catalog, extract_chapter
from app.services.crawl_content_client import CrawlContentClient
from app.services.crawl_goal import CrawlGoalSpec, DEFAULT_GOAL, goal_from_config, interpret_goal, options_from_config
from app.services.crawl_scrapling import fetch_page

logger = logging.getLogger(__name__)

CrawlLogLevel = Literal["DEBUG", "INFO", "SUCCESS", "WARN", "ERROR"]
CANCELLED = {"CANCELLED", "PAUSED"}


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


async def _log(client: CrawlContentClient | None, job_id: str | None, level: CrawlLogLevel, message: str) -> None:
    if client is None or not job_id:
        return
    await client.append_log(job_id, level=level, message=message)


async def _job_cancelled(client: CrawlContentClient, job_id: str) -> bool:
    job = await client.get_job(job_id)
    if not job:
        return True
    return str(job.get("status") or "").upper() in CANCELLED


async def _discover_catalog(
    source_url: str,
    *,
    use_stealth: bool,
    max_chapters: int,
    on_hop=None,
):
    def fetch(url: str):
        return fetch_page(url, stealth=use_stealth)

    page = await asyncio.to_thread(fetch_page, source_url, stealth=use_stealth)
    try:
        return await discover_catalog(
            page,
            source_url,
            max_chapters=max_chapters,
            fetch_page=fetch,
            on_hop=on_hop,
        )
    except ValueError:
        if use_stealth:
            raise
        stealth_page = await asyncio.to_thread(fetch_page, source_url, stealth=True)
        return await discover_catalog(
            stealth_page,
            source_url,
            max_chapters=max_chapters,
            fetch_page=lambda url: fetch_page(url, stealth=True),
            on_hop=on_hop,
        )


async def _agent_plan_recovery(
    goal: CrawlGoalSpec,
    *,
    chapter_title: str,
    error: str,
) -> str:
    """LLM 决定章节抓取失败后的策略：retry_stealth | skip | abort"""
    if not llm_provider.is_configured:
        return "skip"
    prompt = f"""爬取目标：{goal.raw_goal}
章节「{chapter_title}」抓取失败：{error[:300]}

返回 JSON：{{"action": "retry_stealth" | "skip" | "abort", "reason": "简短中文"}}
"""
    try:
        raw = await generate_text(prompt, system_message="只输出 JSON。", temperature=0.1)
        import json

        data = json.loads(raw.strip())
        action = str(data.get("action") or "skip").lower()
        if action in ("retry_stealth", "skip", "abort"):
            return action
    except Exception:
        pass
    return "skip"


async def run_crawl_agent(
    *,
    job_id: str,
    source_url: str,
    site_config: dict[str, Any] | None,
    client: CrawlContentClient,
) -> None:
    opts = CrawlOptions.from_config(site_config)
    spec = await interpret_goal(opts.goal, base_max_chapters=opts.max_chapters)
    use_stealth = spec.use_stealth or opts.use_stealth

    await _log(client, job_id, "INFO", f"AI 代理启动 · 目标：{spec.summary or spec.raw_goal}")
    await _log(client, job_id, "DEBUG", f"参数：最多 {spec.max_chapters} 章 · Stealth={'开' if use_stealth else '关'}")
    await client.update_progress(job_id, status="RUNNING")

    async def on_hop(msg: str) -> None:
        await _log(client, job_id, "INFO", msg)

    await _log(client, job_id, "INFO", f"Scrapling 打开入口：{source_url}")
    catalog = await _discover_catalog(
        source_url,
        use_stealth=use_stealth,
        max_chapters=spec.max_chapters,
        on_hop=on_hop,
    )
    chapters = catalog.chapters[: spec.max_chapters]
    total = len(chapters)

    await _log(
        client,
        job_id,
        "SUCCESS",
        f"识别《{catalog.novel_title}》"
        + (f" · {catalog.author}" if catalog.author else "")
        + f"，将抓取 {total} 章",
    )
    await client.update_progress(job_id, title=catalog.novel_title, chapters_total=total, chapters_done=0)
    await client.init_catalog(
        job_id,
        title=catalog.novel_title,
        author=catalog.author,
        description=catalog.description,
        source_url=source_url,
    )

    catalog_id = ""
    stealth_for_chapters = use_stealth

    for index, link in enumerate(chapters, start=1):
        if await _job_cancelled(client, job_id):
            await _log(client, job_id, "WARN", "任务已暂停/取消，代理停止")
            return

        await _log(client, job_id, "INFO", f"[{index}/{total}] Scrapling 抓取：{link.title}")

        chapter_page = None
        last_err = ""
        for attempt in range(2):
            try:
                chapter_page = await asyncio.to_thread(
                    fetch_page,
                    link.url,
                    stealth=stealth_for_chapters or attempt > 0,
                )
                break
            except Exception as exc:
                last_err = str(exc)
                if attempt == 0 and not stealth_for_chapters:
                    action = await _agent_plan_recovery(spec, chapter_title=link.title, error=last_err)
                    if action == "abort":
                        raise RuntimeError(last_err) from exc
                    if action == "retry_stealth":
                        stealth_for_chapters = True
                        await _log(client, job_id, "WARN", f"[{index}/{total}] 切换 Stealth 重试")
                        continue
                    await _log(client, job_id, "WARN", f"[{index}/{total}] 跳过：{last_err[:120]}")
                    chapter_page = None
                    break
                raise

        if chapter_page is None:
            continue

        await _log(client, job_id, "DEBUG", f"[{index}/{total}] AI 提取正文…")
        extracted = await extract_chapter(chapter_page, link.url, fallback_title=link.title)
        result = await client.import_chapter(
            job_id,
            title=extracted.title,
            content=extracted.content,
            sort_order=index,
            source_url=link.url,
        )
        catalog_id = str(result.get("catalogNovelId") or catalog_id)
        await client.update_progress(job_id, chapters_done=index)
        await _log(client, job_id, "SUCCESS", f"[{index}/{total}] 已入库 · {len(extracted.content)} 字")
        await asyncio.sleep(max(0, settings.crawl_request_delay_ms) / 1000.0)

    if catalog_id:
        await _log(client, job_id, "SUCCESS", f"目标完成，书库 ID：{catalog_id}")
        await client.complete_job(job_id, catalog_novel_id=catalog_id, title=catalog.novel_title)
    else:
        await _log(client, job_id, "ERROR", "未入库任何章节")
        await client.fail_job(job_id, error_message="未入库任何章节")


async def preview_with_agent(source_url: str, site_config: dict[str, Any] | None = None) -> PreviewResult:
    opts = CrawlOptions.from_config(site_config)
    spec = await interpret_goal(opts.goal, base_max_chapters=opts.max_chapters)
    use_stealth = spec.use_stealth or opts.use_stealth
    try:
        catalog = await _discover_catalog(
            source_url,
            use_stealth=use_stealth,
            max_chapters=spec.max_chapters,
        )
        count = min(len(catalog.chapters), spec.max_chapters)
        sample = [{"title": c.title, "url": c.url} for c in catalog.chapters[:5]]
        return PreviewResult(
            ok=True,
            title=catalog.novel_title,
            author=catalog.author,
            chapter_count=count,
            sample_chapters=sample,
            goal_summary=spec.summary,
            message=f"AI 将执行：{spec.summary} · 识别《{catalog.novel_title}》约 {count} 章",
        )
    except Exception as exc:
        logger.warning("AI 预览失败 url=%s: %s", source_url, exc)
        return PreviewResult(ok=False, message=str(exc), goal_summary=spec.summary)
