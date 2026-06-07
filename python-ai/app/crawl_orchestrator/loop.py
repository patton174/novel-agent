"""Crawl orchestrator daemon — global singleton on Worker."""

from __future__ import annotations

import asyncio
import json
import logging

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.config import settings
from app.core.llm import llm_provider
from app.crawl_orchestrator.client import OrchestratorClient
from app.crawl_orchestrator.context_builder import build_cycle_context, format_cycle_context
from app.crawl_orchestrator.tools import ORCHESTRATOR_TOOLS, run_orchestrator_tool

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是爬虫主编排 Agent（全局唯一、常驻）。你不直接抓取页面，只负责把「总目标 goal」拆成可执行的子任务并调度。

## 角色
- **总目标 goal**：CRM 设定的战略意图（可能包含多件事，如「爬某站新书 + 补书库封面」）
- **子任务 CrawlJob**：每次 CreateCrawlJob 必须带**明确、可执行的 sub_goal**（一本书/一个封面/一次续爬），子 Agent 只看 sub_goal，看不到总目标

## 决策前必读（已在用户消息注入）
- catalog：书库总量、缺封面列表、未完成续爬、最近入库
- activeJobs / activeSourceUrls：已在跑或占槽的任务，**禁止重复 URL**

## 派发规则（严格遵守）
1. 同时占用槽位（RUNNING+PAUSED）最多 3；**PAUSED 仍占槽**，不要对已 PAUSED 的任务再 StopCrawlJob
2. **禁止**对同一 sourceUrl 创建第二个活跃任务
3. **禁止**无 sub_goal 的盲目 CreateCrawlJob；sub_goal 要具体，例如：
   - 新书：「从 https://…/book/123/ 抓取全部章节入库」
   - 续爬：「续爬 catalogNovelId=xxx，从 sourceUrl 补全剩余章节」
   - 封面：「为 catalogNovelId=xxx 从 sourceUrl 提取封面图，UpdateCoverUrl 后 CompleteJob」（Create 时传 catalog_novel_id）
4. 仅当 RUNNING 子任务过多且需要腾槽时，才对 **RUNNING** 任务 StopCrawlJob；FAILED/COMPLETED 不占槽
5. 槽位满且全是 PAUSED → Sleep 并在 decision 说明需人工 CRM 取消，**不要**反复 Stop/Create
6. 总目标全部完成 → CompleteGoal；本轮无事可做 → Sleep

## 工具
GetOrchestratorState / ListIncompleteCatalog / ListCrawlJobs / GetRunningJobCount /
CreateCrawlJob / StopCrawlJob / GetCrawlJobStatus / Sleep / CompleteGoal

只调用工具，不要长篇解释。"""

_wake_event: asyncio.Event | None = None


def signal_orchestrator_wake() -> None:
    """Interrupt daemon sleep for an immediate cycle (CRM wake / set goal)."""
    if _wake_event is not None:
        _wake_event.set()


async def run_orchestrator_once(client: OrchestratorClient | None = None) -> None:
    owned = client is None
    if owned:
        client = OrchestratorClient()
    try:
        if not settings.crawl_orchestrator_enabled:
            await client.record_decision(
                "主编排未启用：请在 Worker 的 python-ai/.env 设置 CRAWL_ORCHESTRATOR_ENABLED=true 并重启"
            )
            return
        if not llm_provider.is_configured:
            await client.record_decision("主编排 idle：LLM API 未配置，无法决策")
            return
        await _one_cycle(client)
    except Exception as exc:
        logger.exception("orchestrator once failed: %s", exc)
        try:
            await client.record_decision(f"主编排异常：{exc!s}"[:500])
        except Exception:
            pass
    finally:
        if owned:
            await client.close()


async def _one_cycle(client: OrchestratorClient) -> None:
    state = await client.get_state()
    goal = str(state.get("goal") or "").strip()
    if not goal:
        logger.debug("orchestrator: no goal, sleeping")
        await client.mark_sleeping()
        return

    cycle_ctx = await build_cycle_context(client)
    ctx_text = format_cycle_context(cycle_ctx)

    llm = llm_provider.get_llm(profile="plan").bind_tools(ORCHESTRATOR_TOOLS)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"## 总目标（战略）\n{goal}\n\n"
                f"## 当前快照（书库+任务，已预加载）\n{ctx_text}\n\n"
                "请基于快照决策：必要时用工具刷新；派发子任务时必须写清 sub_goal；"
                "不要重复 activeSourceUrls 中的 URL。"
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
            result = await run_orchestrator_tool(client, name, args, goal=goal, cycle_ctx=cycle_ctx)
            messages.append(ToolMessage(content=result, tool_call_id=tid))
            await client.record_decision(f"{name}: {result[:200]}")
            if name in {"Sleep", "CompleteGoal"}:
                return


async def orchestrator_daemon() -> None:
    global _wake_event
    _wake_event = asyncio.Event()
    logger.info("Crawl orchestrator daemon started (poll=%ss)", settings.crawl_orchestrator_poll_sec)
    client = OrchestratorClient()
    try:
        await client.record_decision("主编排 daemon 已启动")
        while True:
            try:
                await run_orchestrator_once(client)
            except Exception as exc:
                logger.exception("orchestrator cycle failed: %s", exc)
                try:
                    await client.record_decision(f"主编排循环异常：{exc!s}"[:500])
                except Exception:
                    pass
            _wake_event.clear()
            poll = max(5, settings.crawl_orchestrator_poll_sec)
            try:
                await asyncio.wait_for(_wake_event.wait(), timeout=poll)
            except asyncio.TimeoutError:
                pass
    finally:
        _wake_event = None
        await client.close()


def start_orchestrator_background() -> None:
    if not settings.crawl_orchestrator_enabled:
        logger.info("Crawl orchestrator disabled (CRAWL_ORCHESTRATOR_ENABLED=false)")
        return
    asyncio.create_task(orchestrator_daemon())
