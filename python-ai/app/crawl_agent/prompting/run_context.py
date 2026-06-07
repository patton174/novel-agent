"""RUN_CONTEXT assembly for crawl agent loop (mirrors agent_step.run_context)."""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage

from app.crawl_agent.catalog_context import format_catalog_snapshot
from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.memory import CrawlContextMemory


def build_crawl_run_context(ctx: CrawlAgentContext) -> str:
    memory = ctx.memory
    parts = [
        "## 任务",
        f"- 入口 URL: {ctx.entry_url}",
        f"- 用户目标: {ctx.goal}",
        f"- 章节上限: {'不限' if ctx.max_chapters <= 0 else ctx.max_chapters}",
        f"- Stealth: {'开' if ctx.use_stealth else '关'}",
        "## 当前进度",
        json.dumps(ctx.snapshot(), ensure_ascii=False),
    ]

    parts.extend(
        [
            "## 书库快照（已关联作品；改书库/章节前先看这里）",
            format_catalog_snapshot(ctx.catalog_snapshot),
        ]
    )

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
            "- 以子目标选工具；书库操作用 List/Get/Update/Add/Delete Catalog*",
            "- 补封面：FetchPage 找 img → UpdateCoverUrl 或 UpdateCatalogNovel(cover_url=…)",
            "- 改章节：ListCatalogChapters 拿 id → UpdateCatalogChapter / DeleteCatalogChapter",
            "- 从网页批量抓书：QueueChapters → InitNovel → SaveQueuedChapters",
            "- 下一 URL 须来自 HTML 真实 href",
            "- 同一工具连续失败两次：换策略或 FailJob",
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
