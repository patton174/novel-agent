"""Crawl agent loop — bind_tools + tool_calls (aligned with agent_step query_loop)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.core.llm import llm_provider
from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.prompts import build_crawl_system_prompt, build_crawl_task_message
from app.crawl_agent.prompting.run_context import refresh_crawl_run_context
from app.crawl_agent.tools import impl  # noqa: F401 — register tools
from app.crawl_agent.tools.langchain_bind import build_crawl_langchain_tools
from app.crawl_agent.tools.run_tool import run_crawl_tool

logger = logging.getLogger(__name__)

_MAX_TURNS = 160
_PREVIEW_MAX_TURNS = 12


@dataclass
class CrawlLoopResult:
    ok: bool
    message: str = ""
    novel_title: str = ""
    author: str = ""
    chapter_count: int = 0
    sample_chapters: list[dict[str, str]] | None = None


def _tool_calls_from_ai(message: AIMessage) -> list[tuple[str, str, dict]]:
    out: list[tuple[str, str, dict]] = []
    for tc in message.tool_calls or []:
        if isinstance(tc, dict):
            name = str(tc.get("name") or "").strip()
            args = tc.get("args") or {}
            tid = str(tc.get("id") or "") or str(uuid4())
        else:
            name = str(getattr(tc, "name", "") or "").strip()
            args = getattr(tc, "args", None) or {}
            tid = str(getattr(tc, "id", "") or "") or str(uuid4())
        if not name:
            continue
        if not isinstance(args, dict):
            args = {}
        out.append((tid, name, args))
    return out


async def run_crawl_tool_loop(
    ctx: CrawlAgentContext,
    *,
    max_turns: int = _MAX_TURNS,
    preview_mode: bool = False,
) -> CrawlLoopResult:
    if not llm_provider.is_configured:
        raise RuntimeError("LLM 未配置")

    tools = build_crawl_langchain_tools()
    llm = llm_provider.get_llm(profile="plan").bind_tools(tools)
    messages: list = [
        SystemMessage(content=build_crawl_system_prompt(ctx)),
        HumanMessage(content=build_crawl_task_message(ctx)),
    ]
    refresh_crawl_run_context(messages, ctx)

    if preview_mode:
        messages.append(
            HumanMessage(
                content="【预览模式】只需导航到目标书并 DiscoverChapters，不要 InitNovel/入库/CompleteJob。"
            )
        )

    if ctx.job_id != "preview":
        await ctx.client.append_log(
            ctx.job_id,
            level="INFO",
            message=f"AI 代理 loop 启动 · 目标：{ctx.goal[:200]}",
        )

    for turn in range(max_turns):
        if ctx.end_run:
            break

        try:
            refresh_crawl_run_context(messages, ctx)
            ai: AIMessage = await llm.ainvoke(messages)
        except Exception as exc:
            logger.warning("crawl agent llm turn failed: %s", exc)
            if ctx.job_id != "preview":
                await ctx.client.append_log(ctx.job_id, level="ERROR", message=f"LLM 调用失败: {exc}")
                await ctx.client.fail_job(ctx.job_id, error_message=str(exc)[:500])
            return CrawlLoopResult(ok=False, message=str(exc))

        messages.append(ai)
        calls = _tool_calls_from_ai(ai)

        if not calls:
            if (
                not preview_mode
                and ctx.chapters_saved > 0
                and ctx.chapters_saved >= len(ctx.chapters_queue)
            ):
                await ctx.client.complete_job(
                    ctx.job_id,
                    catalog_novel_id=ctx.catalog_novel_id,
                    title=ctx.novel_title or "未命名",
                )
                return CrawlLoopResult(
                    ok=True,
                    message="章节已全部入库",
                    novel_title=ctx.novel_title,
                    author=ctx.novel_author,
                    chapter_count=ctx.chapters_saved,
                )
            messages.append(
                HumanMessage(
                    content="请继续调用工具推进任务；完成用 CompleteJob，失败用 FailJob。"
                )
            )
            continue

        for tool_call_id, name, args in calls:
            result = await run_crawl_tool(ctx, name, args)
            refresh_crawl_run_context(messages, ctx)
            messages.append(
                ToolMessage(content=result.content, tool_call_id=tool_call_id)
            )
            if preview_mode and ctx.chapters_queue and name == "DiscoverChapters":
                sample = [
                    {"title": c.title, "url": c.url}
                    for c in ctx.chapters_queue[:5]
                ]
                return CrawlLoopResult(
                    ok=True,
                    message=f"预览：识别《{ctx.novel_title}》约 {len(ctx.chapters_queue)} 章",
                    novel_title=ctx.novel_title,
                    author=ctx.novel_author,
                    chapter_count=len(ctx.chapters_queue),
                    sample_chapters=sample,
                )
            if ctx.end_run:
                break

        if len(messages) > 40:
            messages = [messages[0], messages[1]] + messages[-30:]

    if ctx.end_success:
        return CrawlLoopResult(
            ok=True,
            message=ctx.end_message or "完成",
            novel_title=ctx.novel_title,
            author=ctx.novel_author,
            chapter_count=ctx.chapters_saved,
        )

    if ctx.chapters_queue and ctx.chapters_saved >= len(ctx.chapters_queue):
        return CrawlLoopResult(
            ok=True,
            message="章节已全部入库",
            novel_title=ctx.novel_title,
            author=ctx.novel_author,
            chapter_count=ctx.chapters_saved,
        )

    msg = ctx.end_message or "代理达到最大轮次或未完成目标"
    if not ctx.end_run and ctx.job_id != "preview":
        await ctx.client.fail_job(ctx.job_id, error_message=msg[:500])
    return CrawlLoopResult(ok=False, message=msg)
