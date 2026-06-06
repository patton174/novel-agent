"""RUN_CONTEXT assembly for crawl agent loop (mirrors agent_step.run_context)."""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage

from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.memory import CrawlContextMemory


def build_crawl_run_context(ctx: CrawlAgentContext) -> str:
    memory = ctx.memory
    parts = [
        "## 任务",
        f"- 入口 URL: {ctx.entry_url}",
        f"- 用户目标: {ctx.goal}",
        f"- 章节上限: {ctx.max_chapters}",
        f"- Stealth: {'开' if ctx.use_stealth else '关'}",
        "## 当前进度",
        json.dumps(ctx.snapshot(), ensure_ascii=False),
    ]

    sections = memory.format_sections()
    if sections:
        parts.extend(
            [
                "## 工作上下文（逐步追加；请先阅读页面正文再决策）",
                *sections,
            ]
        )
    else:
        parts.append("## 工作上下文\n（尚无页面内容，请先 FetchPage 入口 URL）")

    parts.extend(
        [
            "## 决策要求",
            "- 下一步必须基于上方**页面正文**与**页内链接锚文本**判断，不要凭空拼路径",
            "- 导航：FetchPage 打开候选 URL；目录已就绪后 DiscoverChapters / InitNovel / SaveQueuedChapters",
            "- 完成：CompleteJob；无法完成：FailJob",
        ]
    )
    return "\n\n".join(parts)


def refresh_crawl_run_context(messages: list, ctx: CrawlAgentContext) -> None:
    block = build_crawl_run_context(ctx)
    for i, msg in enumerate(messages):
        if isinstance(msg, HumanMessage) and i == 1:
            messages[i] = HumanMessage(content=block)
            return
    if len(messages) >= 1:
        messages.insert(1, HumanMessage(content=block))
    else:
        messages.append(HumanMessage(content=block))
