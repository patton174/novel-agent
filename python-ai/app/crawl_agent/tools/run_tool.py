"""Execute a single crawl tool call."""

from __future__ import annotations

import json
from typing import Any

from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.tools.registry import find_tool
from app.crawl_agent.tools.tool import CrawlToolResult


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 20] + "\n…(truncated)"


async def run_crawl_tool(
    ctx: CrawlAgentContext,
    tool_name: str,
    raw_input: dict[str, Any],
) -> CrawlToolResult:
    tool = find_tool(tool_name)
    if tool is None:
        return CrawlToolResult(
            content=f'{{"ok": false, "error": "unknown tool: {tool_name}"}}',
            is_error=True,
        )
    parsed, err = tool.parse_input(raw_input)
    if parsed is None:
        return CrawlToolResult(
            content=json.dumps({"ok": False, "error": err or "invalid input"}, ensure_ascii=False),
            is_error=True,
        )
    try:
        result = await tool.call(ctx, parsed)
    except Exception as exc:
        return CrawlToolResult(
            content=json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False),
            is_error=True,
        )
    result.content = _truncate(result.content, tool.max_result_chars)
    if result.context_patch:
        for key, value in result.context_patch.items():
            if hasattr(ctx, key):
                setattr(ctx, key, value)
    if result.end_run:
        ctx.end_run = True
    return result
