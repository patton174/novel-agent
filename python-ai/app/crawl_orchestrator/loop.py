"""Crawl orchestrator daemon — global singleton on Worker."""

from __future__ import annotations

import asyncio
import json
import logging

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.config import settings
from app.core.llm import llm_provider
from app.crawl_orchestrator.client import OrchestratorClient
from app.crawl_orchestrator.tools import ORCHESTRATOR_TOOLS, run_orchestrator_tool

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是爬虫主编排 Agent（全局唯一、常驻运行）。你不直接 FetchPage，只负责：
1. 理解当前总目标 goal
2. 查看书库进度、运行中子任务、未完成作品
3. 在并发上限内创建/暂停子任务（每个子任务 = 一本书的 CrawlJob）
4. 目标完成后调用 CompleteGoal；无事可做时调用 Sleep

规则：
- 同时 RUNNING 子任务最多 10 个
- 续爬：对 chaptersDone < chaptersExpected 的书，用 catalogNovelId + sourceUrl 创建 resume 任务
- 新建书：CreateCrawlJob 传 sourceUrl 与 goal
- maxChapters 传 0 表示不限章节
- 不要长篇解释，只调用工具"""


async def _one_cycle(client: OrchestratorClient) -> None:
    state = await client.get_state()
    goal = str(state.get("goal") or "").strip()
    status = str(state.get("status") or "SLEEPING")
    if not goal:
        logger.debug("orchestrator: no goal, sleeping")
        await client.mark_sleeping()
        return
    if status == "SLEEPING" and str(state.get("runningJobCount") or 0) == "0":
        # still have goal but was sleeping — orchestrator wakes on goal set from CRM
        pass

    llm = llm_provider.get_llm(profile="plan").bind_tools(ORCHESTRATOR_TOOLS)
    running = state.get("runningJobCount", 0)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"## 当前状态\n{json.dumps(state, ensure_ascii=False)}\n\n"
                f"## 目标\n{goal}\n\n"
                "请决定下一步：查进度、派发子任务、暂停任务、CompleteGoal 或 Sleep。"
            )
        ),
    ]

    for _ in range(8):
        ai: AIMessage = await llm.ainvoke(messages)
        messages.append(ai)
        calls = getattr(ai, "tool_calls", None) or []
        if not calls:
            await client.record_decision("等待下一轮")
            break
        for call in calls:
            name = call.get("name", "")
            args = call.get("args") or {}
            tid = call.get("id") or name
            result = await run_orchestrator_tool(client, name, args, goal=goal)
            messages.append(ToolMessage(content=result, tool_call_id=tid))
            await client.record_decision(f"{name}: {result[:200]}")
            if name in {"Sleep", "CompleteGoal"}:
                return


async def orchestrator_daemon() -> None:
    logger.info("Crawl orchestrator daemon started (poll=%ss)", settings.crawl_orchestrator_poll_sec)
    client = OrchestratorClient()
    try:
        while True:
            try:
                if llm_provider.is_configured:
                    await _one_cycle(client)
                else:
                    logger.warning("orchestrator: LLM not configured, idle")
            except Exception as exc:
                logger.exception("orchestrator cycle failed: %s", exc)
            await asyncio.sleep(max(5, settings.crawl_orchestrator_poll_sec))
    finally:
        await client.close()


def start_orchestrator_background() -> None:
    if not settings.crawl_orchestrator_enabled:
        return
    asyncio.create_task(orchestrator_daemon())
