"""Crawl agent loop — bind_tools + tool_calls (aligned with agent_step query_loop)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.core.llm import llm_provider
from app.config import settings
from app.crawl.config import get_crawl_limits
from app.crawl.agent.context import CrawlAgentContext
from app.crawl.agent.loop_support import (
    invoke_llm_with_pairing_retry,
    record_tool_outcome,
    repeat_failure_hint,
    run_crawl_tool_with_retry,
    tool_calls_from_ai,
)
from app.crawl.agent.prompts import build_crawl_system_prompt, build_crawl_task_message
from app.crawl.agent.prompting.run_context import refresh_crawl_run_context
from app.crawl.fetch.browser import close_browser_session
from app.crawl.agent.tools import impl  # noqa: F401 — register tools
from app.crawl.agent.tools.langchain_bind import build_crawl_langchain_tools

logger = logging.getLogger(__name__)

_LIMITS = get_crawl_limits()
_MAX_TURNS = _LIMITS.max_turns
_PREVIEW_MAX_TURNS = _LIMITS.preview_turns


@dataclass
class CrawlLoopResult:
    ok: bool
    message: str = ""
    novel_title: str = ""
    author: str = ""
    chapter_count: int = 0
    sample_chapters: list[dict[str, str]] | None = None


async def run_crawl_tool_loop(
    ctx: CrawlAgentContext,
    *,
    max_turns: int = _MAX_TURNS,
    preview_mode: bool = False,
) -> CrawlLoopResult:
    if not llm_provider.is_crawl_configured:
        raise RuntimeError("爬虫 LLM 未配置（CRAWL_LLM_API_KEY 或 AGNES_IMAGE_API_KEY）")

    tools = build_crawl_langchain_tools()
    llm = llm_provider.get_llm(profile="crawl").bind_tools(tools)
    crawl_cfg = settings.get_crawl_llm_config()
    logger.info(
        "crawl agent llm model=%s base_url=%s",
        crawl_cfg.get("model"),
        crawl_cfg.get("base_url"),
    )
    messages: list = [
        SystemMessage(content=build_crawl_system_prompt(ctx)),
        HumanMessage(content=build_crawl_task_message(ctx)),
    ]
    refresh_crawl_run_context(messages, ctx)

    if preview_mode:
        messages.append(
            HumanMessage(
                content="【预览模式】FetchPage 导航并 QueueChapters 即可，不要 InitNovel/入库/CompleteJob。"
            )
        )

    if ctx.job_id != "preview":
        await ctx.client.append_log(
            ctx.job_id,
            level="INFO",
            message=f"AI 代理 loop 启动 · 目标：{ctx.goal[:200]}",
        )

    try:
        for turn in range(max_turns):
            if ctx.end_run:
                break

            if ctx.job_id != "preview":
                await ctx.client.append_log(
                    ctx.job_id,
                    level="INFO",
                    message=f"AI 推理中…（第 {turn + 1} 轮）",
                )

            try:
                ai: AIMessage = await invoke_llm_with_pairing_retry(llm, messages, ctx)
            except Exception as exc:
                logger.warning("crawl agent llm turn failed: %s", exc)
                if ctx.job_id != "preview":
                    await ctx.client.append_log(ctx.job_id, level="ERROR", message=f"LLM 调用失败: {str(exc)[:500]}")
                    await ctx.client.fail_job(ctx.job_id, error_message=str(exc)[:500])
                return CrawlLoopResult(ok=False, message=str(exc))

            messages.append(ai)
            calls = tool_calls_from_ai(ai)

            if not calls:
                if not preview_mode and ctx.all_chapters_saved():
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

            for call in calls:
                result = await run_crawl_tool_with_retry(ctx, call.name, call.args)
                record_tool_outcome(ctx, call.name, call.args, result)
                messages.append(
                    ToolMessage(content=result.content, tool_call_id=call.tool_call_id)
                )
                hint = repeat_failure_hint(ctx, call.name, call.args)
                if hint and result.is_error:
                    messages.append(HumanMessage(content=hint))
                if preview_mode and ctx.chapters_queue and call.name == "QueueChapters":
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

        if ctx.end_success:
            return CrawlLoopResult(
                ok=True,
                message=ctx.end_message or "完成",
                novel_title=ctx.novel_title,
                author=ctx.novel_author,
                chapter_count=ctx.chapters_saved,
            )

        if ctx.all_chapters_saved():
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
    finally:
        await close_browser_session(ctx.browser_session)
        ctx.browser_session = None
