"""AI-first novel crawler: Scrapling fetch + LLM extract → 公共书库入库."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Literal
from urllib.parse import urlparse

from app.config import settings
from app.core.llm import llm_provider
from app.services.crawl_ai_extractor import extract_catalog, extract_chapter
from app.services.crawl_content_client import CrawlContentClient

logger = logging.getLogger(__name__)

CANCELLED = {"CANCELLED", "PAUSED"}
CrawlLogLevel = Literal["DEBUG", "INFO", "SUCCESS", "WARN", "ERROR"]


@dataclass
class CrawlOptions:
    use_stealth: bool = False
    max_chapters: int = 200

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> CrawlOptions:
        if not data:
            return cls()
        return cls(
            use_stealth=bool(data.get("useStealth") or data.get("use_stealth")),
            max_chapters=int(data.get("maxChapters") or data.get("max_chapters") or 200),
        )


@dataclass
class PreviewResult:
    ok: bool
    title: str = ""
    author: str = ""
    chapter_count: int = 0
    sample_chapters: list[dict[str, str]] = field(default_factory=list)
    message: str = ""


async def _log(client: CrawlContentClient, job_id: str, level: CrawlLogLevel, message: str) -> None:
    await client.append_log(job_id, level=level, message=message)


def _fetch_page(url: str, *, stealth: bool = False):
    try:
        if stealth:
            from scrapling.fetchers import StealthyFetcher

            return StealthyFetcher.fetch(url, headless=True, network_idle=True)
        from scrapling.fetchers import Fetcher

        return Fetcher.get(url, stealthy_headers=True)
    except ImportError as exc:
        raise RuntimeError("Scrapling 未安装，请执行 pip install scrapling[fetchers]") from exc


def _require_llm() -> None:
    if not llm_provider.is_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行（请配置 OPENAI_API_KEY 等）")


async def preview_crawl(source_url: str, site_config: dict[str, Any] | None = None) -> PreviewResult:
    _require_llm()
    opts = CrawlOptions.from_dict(site_config)
    try:
        page = await asyncio.to_thread(_fetch_page, source_url, stealth=opts.use_stealth)
        catalog = await extract_catalog(page, source_url, max_chapters=opts.max_chapters)
        sample = [{"title": c.title, "url": c.url} for c in catalog.chapters[:5]]
        return PreviewResult(
            ok=True,
            title=catalog.novel_title,
            author=catalog.author,
            chapter_count=len(catalog.chapters),
            sample_chapters=sample,
            message=f"AI 识别：{catalog.novel_title}，共 {len(catalog.chapters)} 章",
        )
    except Exception as exc:
        logger.warning("AI 预览失败 url=%s: %s", source_url, exc)
        return PreviewResult(ok=False, message=str(exc))


async def execute_crawl_job(
    *,
    job_id: str,
    source_url: str,
    site_config: dict[str, Any] | None = None,
) -> None:
    _require_llm()
    opts = CrawlOptions.from_dict(site_config)
    client = CrawlContentClient()
    try:
        job = await client.get_job(job_id)
        if not job:
            logger.warning("crawl job missing jobId=%s", job_id)
            return
        status = str(job.get("status") or "").upper()
        if status in CANCELLED:
            return

        await _log(client, job_id, "INFO", "python-ai 已接收任务，开始执行")
        stealth_hint = "（Stealth 模式）" if opts.use_stealth else ""
        await _log(client, job_id, "INFO", f"抓取目录页{stealth_hint}: {source_url}")

        await client.update_progress(job_id, status="RUNNING")
        page = await asyncio.to_thread(_fetch_page, source_url, stealth=opts.use_stealth)
        await _log(client, job_id, "INFO", "目录页下载完成，AI 解析章节列表…")

        catalog = await extract_catalog(page, source_url, max_chapters=opts.max_chapters)
        total = len(catalog.chapters)
        await _log(
            client,
            job_id,
            "SUCCESS",
            f"识别书目《{catalog.novel_title}》"
            + (f" · 作者 {catalog.author}" if catalog.author else "")
            + f"，共 {total} 章（上限 {opts.max_chapters}）",
        )

        await client.update_progress(
            job_id,
            title=catalog.novel_title,
            chapters_total=total,
            chapters_done=0,
        )
        await _log(client, job_id, "INFO", "初始化书库记录…")
        await client.init_catalog(
            job_id,
            title=catalog.novel_title,
            author=catalog.author,
            description=catalog.description,
            source_url=source_url,
        )

        catalog_id = ""
        for index, link in enumerate(catalog.chapters, start=1):
            current = await client.get_job(job_id)
            if not current:
                break
            current_status = str(current.get("status") or "").upper()
            if current_status in CANCELLED:
                await _log(client, job_id, "WARN", f"任务已停止（{current_status}），退出执行")
                logger.info("crawl job stopped jobId=%s status=%s", job_id, current_status)
                return

            await _log(client, job_id, "INFO", f"[{index}/{total}] 抓取章节: {link.title}")

            chapter_page = await asyncio.to_thread(
                _fetch_page,
                link.url,
                stealth=opts.use_stealth,
            )
            await _log(client, job_id, "DEBUG", f"[{index}/{total}] 页面已下载，AI 提取正文…")

            extracted = await extract_chapter(chapter_page, link.url, fallback_title=link.title)
            content_len = len(extracted.content or "")
            await _log(
                client,
                job_id,
                "INFO",
                f"[{index}/{total}] 正文解析完成（{content_len} 字）",
            )

            result = await client.import_chapter(
                job_id,
                title=extracted.title,
                content=extracted.content,
                sort_order=index,
                source_url=link.url,
            )
            catalog_id = str(result.get("catalogNovelId") or catalog_id)
            await client.update_progress(job_id, chapters_done=index)
            await _log(client, job_id, "SUCCESS", f"[{index}/{total}] 已入库: {extracted.title}")
            await asyncio.sleep(max(0, settings.crawl_request_delay_ms) / 1000.0)

        if catalog_id:
            await _log(client, job_id, "SUCCESS", f"全部章节处理完成，书库 ID: {catalog_id}")
            await client.complete_job(
                job_id,
                catalog_novel_id=catalog_id,
                title=catalog.novel_title,
            )
        else:
            await _log(client, job_id, "ERROR", "未入库任何章节")
            await client.fail_job(job_id, error_message="未入库任何章节")
    except Exception as exc:
        logger.exception("crawl job failed jobId=%s", job_id)
        try:
            await _log(client, job_id, "ERROR", f"执行失败: {str(exc)[:500]}")
            await client.fail_job(job_id, error_message=str(exc)[:500])
        except Exception:
            pass
    finally:
        await client.close()
