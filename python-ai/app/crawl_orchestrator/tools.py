"""Orchestrator tool definitions and handlers."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.tools import tool

from app.crawl_orchestrator.client import OrchestratorClient

DEFAULT_SUB_GOAL = "把链接中的小说全部章节抓取并清洗正文，入库公共书库"


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
    """当前 RUNNING 子任务数量与上限。"""
    return ""


@tool
async def CreateCrawlJob(
    source_url: str,
    goal: str = "",
    catalog_novel_id: str = "",
    crawl_type: str = "full",
) -> str:
    """创建并启动子任务。续爬传 catalog_novel_id 与 crawl_type=resume。"""
    return ""


@tool
async def StopCrawlJob(job_id: str) -> str:
    """暂停指定子任务。"""
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
            sub_goal = str(args.get("goal") or goal or DEFAULT_SUB_GOAL).strip()
            cfg = {
                "goal": sub_goal,
                "maxChapters": 0,
                "crawlType": str(args.get("crawl_type") or "full"),
            }
            job = await client.create_and_start_job(
                source_url=str(args["source_url"]).strip(),
                config_json=json.dumps(cfg, ensure_ascii=False),
                catalog_novel_id=str(args.get("catalog_novel_id") or ""),
            )
            return json.dumps({"ok": True, "job": job}, ensure_ascii=False)
        if name == "StopCrawlJob":
            job = await client.pause_job(str(args["job_id"]))
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
