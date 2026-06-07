"""LangChain bind_tools for crawl agent."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import StructuredTool

from app.crawl.agent.tools.registry import get_all_tools


def _noop(**_kwargs: Any) -> str:
    return ""


def build_crawl_langchain_tools() -> list[StructuredTool]:
    out: list[StructuredTool] = []
    for tool in sorted(get_all_tools(), key=lambda t: t.name):
        out.append(
            StructuredTool.from_function(
                func=_noop,
                name=tool.name,
                description=tool.description,
                args_schema=tool.input_model,
            )
        )
    return out
