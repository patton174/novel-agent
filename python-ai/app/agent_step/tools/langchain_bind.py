"""Generate LangChain bind_tools from CC registry."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, create_model

from app.agent_step.schemas import AgentRunContext
from app.agent_step.tools.registry import get_all_tools, is_deferred_tool


def _noop(**_kwargs: Any) -> str:
    return ""


def build_agent_langchain_tools(ctx: AgentRunContext | None = None) -> list[StructuredTool]:
    out: list[StructuredTool] = []
    for tool in sorted(get_all_tools(ctx), key=lambda t: t.name):
        schema = tool.input_model
        lc_tool = StructuredTool.from_function(
            func=_noop,
            name=tool.name,
            description=tool.description,
            args_schema=schema,
        )
        if is_deferred_tool(tool.name):
            lc_tool.metadata = {**(lc_tool.metadata or {}), "defer_loading": True}
        out.append(lc_tool)
    return out
