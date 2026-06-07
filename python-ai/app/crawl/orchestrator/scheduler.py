"""Centralized orchestrator slot + URL dedupe (replaces prompt-only limits)."""

from __future__ import annotations

from urllib.parse import urlparse

from app.crawl.config import get_crawl_limits
from app.crawl.orchestrator.client import OrchestratorClient
from app.crawl.orchestrator.context_builder import ACTIVE_JOB_STATUSES


def normalize_source_url(url: str) -> str:
    u = (url or "").strip().rstrip("/")
    if not u:
        return ""
    parsed = urlparse(u)
    if parsed.scheme and parsed.netloc:
        path = parsed.path.rstrip("/") or "/"
        return f"{parsed.scheme}://{parsed.netloc}{path}"
    return u.rstrip("/")


async def active_source_urls(client: OrchestratorClient) -> set[str]:
    page = await client.page_jobs(page=1, size=50)
    jobs = page.get("list") if isinstance(page, dict) else []
    if not isinstance(jobs, list):
        return set()
    out: set[str] = set()
    for job in jobs:
        if str(job.get("status") or "").upper() not in ACTIVE_JOB_STATUSES:
            continue
        norm = normalize_source_url(str(job.get("sourceUrl") or ""))
        if norm:
            out.add(norm)
    return out


class OrchestratorScheduler:
    """Tracks in-flight creates within a worker process."""

    def __init__(self) -> None:
        self._local_inflight: set[str] = set()

    def register(self, source_url: str) -> None:
        norm = normalize_source_url(source_url)
        if norm:
            self._local_inflight.add(norm)

    def release(self, source_url: str) -> None:
        self._local_inflight.discard(normalize_source_url(source_url))

    async def can_create_job(
        self,
        client: OrchestratorClient,
        source_url: str,
        *,
        cycle_active_urls: set[str] | None = None,
    ) -> tuple[bool, str]:
        norm = normalize_source_url(source_url)
        if not norm:
            return False, "source_url 无效"

        limits = get_crawl_limits()
        running = await client.running_count()
        active_count = int(running.get("count") or running.get("running") or 0)
        max_slots = int(running.get("max") or limits.orch_slots)
        if active_count >= max_slots:
            return False, f"并发槽位已满 ({active_count}/{max_slots})"

        if norm in self._local_inflight:
            return False, f"sourceUrl 本进程已在派发中: {source_url}"

        remote_active = await active_source_urls(client)
        if cycle_active_urls:
            remote_active |= {normalize_source_url(u) for u in cycle_active_urls if u}
        if norm in remote_active:
            return False, f"sourceUrl 已有活跃任务，禁止重复派发: {source_url}"

        return True, ""


_scheduler = OrchestratorScheduler()


def get_orchestrator_scheduler() -> OrchestratorScheduler:
    return _scheduler
