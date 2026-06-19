"""Generate LangChain bind_tools from CC registry."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel

from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import get_all_tools, is_deferred_tool


def _noop(**_kwargs: Any) -> str:
    return ""


def bind_args_schema(input_model: type[BaseModel]) -> type[BaseModel] | dict[str, Any]:
    """Schema for bind_tools.

    LangChain flattens Pydantic models and drops custom oneOf branches, so tools like
    CreateMemory would expose parent_id as optional/nullable on Anthropic protocol too.
    Pass the raw JSON Schema dict when oneOf/anyOf is present; runtime validation still
    uses input_model.model_validate in prepare_tool_input.
    """
    schema = input_model.model_json_schema()
    if "oneOf" in schema or "anyOf" in schema:
        return schema
    return input_model


def build_agent_langchain_tools(ctx: AgentRunContext | None = None) -> list[StructuredTool]:
    out: list[StructuredTool] = []
    for tool in sorted(get_all_tools(ctx), key=lambda t: t.name):
        lc_tool = StructuredTool.from_function(
            func=_noop,
            name=tool.name,
            description=tool.description,
            args_schema=bind_args_schema(tool.input_model),
        )
        if is_deferred_tool(tool.name):
            lc_tool.metadata = {**(lc_tool.metadata or {}), "defer_loading": True}
        out.append(lc_tool)
    return out
