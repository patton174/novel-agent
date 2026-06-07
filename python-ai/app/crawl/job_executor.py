"""Bounded in-flight crawl job execution (backpressure)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from app.crawl.config import get_crawl_limits

logger = logging.getLogger(__name__)

_semaphore: asyncio.Semaphore | None = None
_inflight: set[str] = set()


def _sem() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        limits = get_crawl_limits()
        _semaphore = asyncio.Semaphore(limits.max_concurrent_jobs)
    return _semaphore


def inflight_count() -> int:
    return len(_inflight)


def has_capacity() -> bool:
    sem = _sem()
    # Semaphore._value is internal but stable for capacity checks in CPython asyncio
    return getattr(sem, "_value", 1) > 0


async def run_bounded(job_id: str, runner: Callable[[], Awaitable[Any]]) -> None:
    sem = _sem()
    async with sem:
        _inflight.add(job_id)
        try:
            await runner()
        finally:
            _inflight.discard(job_id)
            logger.debug("crawl job finished jobId=%s inflight=%s", job_id, len(_inflight))
