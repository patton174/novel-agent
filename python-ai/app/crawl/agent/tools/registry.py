"""Crawl tool registry."""

from __future__ import annotations

from app.crawl.agent.tools.tool import CrawlTool

_TOOLS: list[CrawlTool] = []


def register_tool(tool: CrawlTool) -> CrawlTool:
    _TOOLS.append(tool)
    return tool


def get_all_tools() -> list[CrawlTool]:
    return list(_TOOLS)


def find_tool(name: str) -> CrawlTool | None:
    key = (name or "").strip()
    for tool in _TOOLS:
        if tool.name == key:
            return tool
    return None
