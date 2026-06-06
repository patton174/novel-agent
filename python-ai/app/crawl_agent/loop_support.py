"""Crawl loop helpers — tool pairing repair, LLM/tool silent retry."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage

from app.agent_step.message_history import (
    is_tool_pairing_llm_error,
    prune_message_tail,
    repair_tool_message_pairing,
)
from app.agent_step.tool_execution import TOOL_EXECUTION_MAX_ATTEMPTS, tool_retry_delay
from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.prompting.run_context import refresh_crawl_run_context
from app.crawl_agent.tools.run_tool import run_crawl_tool
from app.crawl_agent.tools.tool import CrawlToolResult

logger = logging.getLogger(__name__)

_MAX_LLM_PAIRING_RETRIES_PER_TURN = 2
_PAIRING_RETRY_HINT = (
    "上一条请求因 tool_use 与 tool_result 不匹配被 API 拒绝。"
    "已修复对话历史，请根据 RUN_CONTEXT 与已有工具结果继续，"
    "不要重复已成功完成的工具调用。"
)


@dataclass(frozen=True)
class AiToolCall:
    tool_call_id: str
    name: str
    args: dict[str, Any]


def tool_calls_from_ai(message: AIMessage) -> list[AiToolCall]:
    out: list[AiToolCall] = []
    for tc in message.tool_calls or []:
        if isinstance(tc, dict):
            name = str(tc.get("name") or "").strip()
            args = tc.get("args") or {}
            tid = str(tc.get("id") or "").strip()
        else:
            name = str(getattr(tc, "name", "") or "").strip()
            args = getattr(tc, "args", None) or {}
            tid = str(getattr(tc, "id", "") or "").strip()
        if not name or not tid:
            continue
        if not isinstance(args, dict):
            args = {}
        out.append(AiToolCall(tool_call_id=tid, name=name, args=dict(args)))
    return out


def prepare_messages_for_llm(messages: list, ctx: CrawlAgentContext) -> None:
    if len(messages) > 42:
        prune_message_tail(messages, keep_tail_messages=32)
    repaired, changed = repair_tool_message_pairing(messages)
    messages[:] = repaired
    if changed:
        logger.warning("crawl agent repaired tool message pairing before LLM turn")
    refresh_crawl_run_context(messages, ctx)


async def invoke_llm_with_pairing_retry(llm, messages: list, ctx: CrawlAgentContext) -> AIMessage:
    pairing_retries = 0
    while True:
        prepare_messages_for_llm(messages, ctx)
        try:
            ai: AIMessage = await llm.ainvoke(messages)
            return ai
        except Exception as exc:
            if (
                is_tool_pairing_llm_error(exc)
                and pairing_retries < _MAX_LLM_PAIRING_RETRIES_PER_TURN
            ):
                pairing_retries += 1
                logger.warning(
                    "crawl agent LLM pairing error retry=%s job=%s: %s",
                    pairing_retries,
                    ctx.job_id,
                    exc,
                )
                fixed, _ = repair_tool_message_pairing(messages)
                messages[:] = fixed
                messages.append(HumanMessage(content=_PAIRING_RETRY_HINT))
                continue
            raise


async def run_crawl_tool_with_retry(
    ctx: CrawlAgentContext,
    tool_name: str,
    raw_input: dict[str, Any],
) -> CrawlToolResult:
    last: CrawlToolResult | None = None
    for attempt in range(1, TOOL_EXECUTION_MAX_ATTEMPTS + 1):
        result = await run_crawl_tool(ctx, tool_name, raw_input)
        last = result
        if not result.is_error or result.end_run:
            return result
        if attempt >= TOOL_EXECUTION_MAX_ATTEMPTS:
            break
        logger.warning(
            "crawl tool %s attempt %s failed job=%s, silent retry",
            tool_name,
            attempt,
            ctx.job_id,
        )
        await tool_retry_delay(attempt)
    assert last is not None
    return last
