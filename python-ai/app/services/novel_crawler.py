"""AI 自动爬虫入口 — Scrapling 抓取 + 自然语言目标驱动的自主代理。"""

from __future__ import annotations

import logging
from typing import Any

from app.core.llm import llm_provider
from app.services.crawl_agent import (
    CrawlOptions,
    PreviewResult,
    preview_with_agent,
    run_crawl_agent,
)
from app.services.crawl_content_client import CrawlContentClient

logger = logging.getLogger(__name__)

# 兼容旧 import
__all__ = [
    "CrawlOptions",
    "PreviewResult",
    "preview_crawl",
    "execute_crawl_job",
]


def _require_llm() -> None:
    if not llm_provider.is_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行（请配置 OPENAI_API_KEY 等）")


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
        job = await client.get_job(job_id)
        if not job:
            logger.warning("crawl job missing jobId=%s", job_id)
            return
        status = str(job.get("status") or "").upper()
        if status in {"CANCELLED", "PAUSED"}:
            return
        await run_crawl_agent(
            job_id=job_id,
            source_url=source_url,
            site_config=site_config,
            client=client,
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
