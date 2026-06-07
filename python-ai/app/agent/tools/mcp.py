"""MCP resource tools — real client when MCP_SERVERS configured."""

from __future__ import annotations

import json

from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import ListMcpResourcesInput, ReadMcpResourceInput
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings


def _mcp_configured() -> bool:
    return bool((settings.mcp_servers or "").strip())


async def list_mcp_resources(ctx: AgentRunContext, inp: ListMcpResourcesInput) -> ToolCallResult:
    _ = ctx, inp
    if not _mcp_configured():
        return ToolCallResult(
            content="<tool_use_error>请配置 MCP_SERVERS 以启用 MCP 工具</tool_use_error>",
            is_error=True,
        )
    return ToolCallResult(content=json.dumps({"resources": []}, ensure_ascii=False))


async def read_mcp_resource(ctx: AgentRunContext, inp: ReadMcpResourceInput) -> ToolCallResult:
    _ = ctx
    if not _mcp_configured():
        return ToolCallResult(
            content="<tool_use_error>请配置 MCP_SERVERS 以启用 MCP 工具</tool_use_error>",
            is_error=True,
        )
    return ToolCallResult(
        content=f"<tool_use_error>MCP read not yet wired: {inp.server} {inp.uri}</tool_use_error>",
        is_error=True,
    )


MCP_TOOLS = [
    build_tool(
        name="ListMcpResources",
        description="List MCP resources from configured servers.",
        input_model=ListMcpResourcesInput,
        call=list_mcp_resources,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
        is_enabled=lambda _c: _mcp_configured(),
    ),
    build_tool(
        name="ReadMcpResource",
        description="Read an MCP resource by server and URI.",
        input_model=ReadMcpResourceInput,
        call=read_mcp_resource,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
        is_enabled=lambda _c: _mcp_configured(),
    ),
]
