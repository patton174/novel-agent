"""Orchestrator tool definitions and handlers."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlparse

from langchain_core.tools import tool

from app.crawl_orchestrator.client import OrchestratorClient
from app.crawl_orchestrator.context_builder import ACTIVE_JOB_STATUSES

DEFAULT_SUB_GOAL = "把链接中的小说全部章节抓取并清洗正文，入库公共书库"


def _normalize_url(url: str) -> str:
    u = (url or "").strip().rstrip("/")
    if not u:
        return ""
    parsed = urlparse(u)
    if parsed.scheme and parsed.netloc:
        path = parsed.path.rstrip("/") or "/"
        return f"{parsed.scheme}://{parsed.netloc}{path}"
    return u.rstrip("/")


async def _active_source_urls(client: OrchestratorClient) -> set[str]:
    page = await client.page_jobs(page=1, size=50)
    jobs = page.get("list") if isinstance(page, dict) else []
    if not isinstance(jobs, list):
        return set()
    out: set[str] = set()
    for job in jobs:
        if str(job.get("status") or "").upper() not in ACTIVE_JOB_STATUSES:
            continue
        norm = _normalize_url(str(job.get("sourceUrl") or ""))
        if norm:
            out.add(norm)
    return out


@tool
async def GetOrchestratorState() -> str:
    """读取编排器 goal/status/运行中任务数。"""
    return ""


@tool
async def ListIncompleteCatalog(limit: int = 50) -> str:
    """列出未完成爬取的书库作品（chaptersDone < chaptersExpected）。"""
    return ""


@tool
async def ListCrawlJobs(page: int = 1, size: int = 20) -> str:
    """分页列出 CrawlJob 任务。"""
    return ""


@tool
async def GetRunningJobCount() -> str:
    """当前占用并发槽位的子任务数（RUNNING+PAUSED）与上限。"""
    return ""


@tool
async def CreateCrawlJob(
    source_url: str,
    goal: str = "",
    catalog_novel_id: str = "",
    crawl_type: str = "full",
) -> str:
    """创建并启动子任务。必须提供具体 sub_goal（goal 参数）；续爬传 catalog_novel_id。"""
    return ""


@tool
async def StopCrawlJob(job_id: str) -> str:
    """暂停 RUNNING 中的子任务；已 PAUSED 勿重复调用。"""
    return ""


@tool
async def CancelCrawlJob(job_id: str) -> str:
    """取消 PAUSED/FAILED 子任务以释放槽位（不可取消 RUNNING）。"""
    return ""


@tool
async def GetCrawlJobStatus(job_id: str) -> str:
    """查询单个子任务状态与进度。"""
    return ""


@tool
async def Sleep() -> str:
    """当前无事可做，进入睡眠等待下一轮。"""
    return ""


@tool
async def CompleteGoal() -> str:
    """标记总目标已完成。"""
    return ""


ORCHESTRATOR_TOOLS = [
    GetOrchestratorState,
    ListIncompleteCatalog,
    ListCrawlJobs,
    GetRunningJobCount,
    CreateCrawlJob,
    StopCrawlJob,
    CancelCrawlJob,
    GetCrawlJobStatus,
    Sleep,
    CompleteGoal,
]


async def run_orchestrator_tool(
    client: OrchestratorClient,
    name: str,
    args: dict[str, Any],
    *,
    goal: str,
    cycle_ctx: dict[str, Any] | None = None,
) -> str:
    try:
        if name == "GetOrchestratorState":
            return json.dumps(await client.get_state(), ensure_ascii=False)
        if name == "ListIncompleteCatalog":
            items = await client.list_incomplete(int(args.get("limit") or 50))
            return json.dumps(items[:30], ensure_ascii=False)
        if name == "ListCrawlJobs":
            page = await client.page_jobs(int(args.get("page") or 1), int(args.get("size") or 20))
            return json.dumps(page, ensure_ascii=False)
        if name == "GetRunningJobCount":
            return json.dumps(await client.running_count(), ensure_ascii=False)
        if name == "CreateCrawlJob":
            source_url = str(args.get("source_url") or "").strip()
            if not source_url:
                return json.dumps({"ok": False, "error": "source_url 不能为空"})
            sub_goal = str(args.get("goal") or "").strip()
            if not sub_goal:
                return json.dumps({"ok": False, "error": "必须提供具体 sub_goal（goal 参数），不可空"})
            if sub_goal == goal.strip() and len(sub_goal) > 80:
                return json.dumps(
                    {
                        "ok": False,
                        "error": "sub_goal 过长且与总目标相同，请拆成单本书/单封面等可执行描述",
                    }
                )
            norm = _normalize_url(source_url)
            active_urls = await _active_source_urls(client)
            if cycle_ctx:
                active_urls |= set(cycle_ctx.get("activeSourceUrls") or [])
            if norm in active_urls:
                return json.dumps(
                    {
                        "ok": False,
                        "error": f"sourceUrl 已有活跃任务，禁止重复派发: {source_url}",
                    }
                )
            if re.search(r"封面|cover", sub_goal, re.I) and not str(
                args.get("catalog_novel_id") or ""
            ).strip():
                return json.dumps(
                    {
                        "ok": False,
                        "error": "补封面 sub_goal 必须同时传 catalog_novel_id（来自 catalog.missingCover）",
                    }
                )
            cfg = {
                "goal": sub_goal,
                "maxChapters": 0,
                "crawlType": str(args.get("crawl_type") or "full"),
                "useStealth": True,
                "usePlaywright": True,
            }
            job = await client.create_and_start_job(
                source_url=source_url,
                config_json=json.dumps(cfg, ensure_ascii=False),
                catalog_novel_id=str(args.get("catalog_novel_id") or ""),
            )
            if cycle_ctx is not None:
                urls = set(cycle_ctx.get("activeSourceUrls") or [])
                urls.add(norm)
                cycle_ctx["activeSourceUrls"] = sorted(urls)
                compact = {
                    "id": job.get("id"),
                    "sourceUrl": job.get("sourceUrl"),
                    "title": job.get("title"),
                    "status": job.get("status"),
                    "chaptersDone": job.get("chaptersDone"),
                    "chaptersTotal": job.get("chaptersTotal"),
                    "catalogNovelId": job.get("catalogNovelId"),
                    "errorMessage": job.get("errorMessage"),
                }
                jobs = [compact] + list(cycle_ctx.get("activeJobs") or [])
                cycle_ctx["activeJobs"] = jobs[:10]
            return json.dumps({"ok": True, "job": job}, ensure_ascii=False)
        if name == "StopCrawlJob":
            job_id = str(args.get("job_id") or "").strip()
            if not job_id:
                return json.dumps({"ok": False, "error": "job_id 不能为空"})
            job = await client.get_job(job_id)
            status = str(job.get("status") or "").upper()
            if status == "PAUSED":
                return json.dumps(
                    {"ok": True, "job": job, "note": "已是 PAUSED，无需重复暂停（仍占槽位）"},
                    ensure_ascii=False,
                )
            if status not in {"RUNNING", "PENDING"}:
                return json.dumps(
                    {"ok": False, "error": f"当前状态 {status} 不可暂停，请改用 GetCrawlJobStatus 查看"},
                    ensure_ascii=False,
                )
            job = await client.pause_job(job_id)
            return json.dumps({"ok": True, "job": job}, ensure_ascii=False)
        if name == "CancelCrawlJob":
            job_id = str(args.get("job_id") or "").strip()
            if not job_id:
                return json.dumps({"ok": False, "error": "job_id 不能为空"})
            job = await client.get_job(job_id)
            status = str(job.get("status") or "").upper()
            if status == "RUNNING":
                return json.dumps(
                    {"ok": False, "error": "RUNNING 请用 StopCrawlJob 暂停，或等待完成"},
                    ensure_ascii=False,
                )
            if status == "CANCELLED":
                return json.dumps({"ok": True, "job": job, "note": "已是 CANCELLED"}, ensure_ascii=False)
            job = await client.cancel_job(job_id)
            if cycle_ctx is not None:
                norm = _normalize_url(str(job.get("sourceUrl") or ""))
                urls = [u for u in (cycle_ctx.get("activeSourceUrls") or []) if u != norm]
                cycle_ctx["activeSourceUrls"] = urls
                cycle_ctx["activeJobs"] = [
                    j for j in (cycle_ctx.get("activeJobs") or []) if str(j.get("id")) != job_id
                ]
            return json.dumps({"ok": True, "job": job}, ensure_ascii=False)
        if name == "GetCrawlJobStatus":
            job = await client.get_job(str(args["job_id"]))
            return json.dumps(job, ensure_ascii=False)
        if name == "Sleep":
            state = await client.mark_sleeping()
            return json.dumps({"ok": True, "state": state}, ensure_ascii=False)
        if name == "CompleteGoal":
            state = await client.complete_goal()
            return json.dumps({"ok": True, "message": "goal cleared", "state": state}, ensure_ascii=False)
        return json.dumps({"ok": False, "error": f"unknown tool {name}"})
    except Exception as exc:
        return json.dumps({"ok": False, "error": str(exc)[:500]}, ensure_ascii=False)
