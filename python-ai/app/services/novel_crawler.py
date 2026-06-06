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
    import asyncio

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
