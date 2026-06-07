"""Web search and fetch tools — real API when configured."""

from __future__ import annotations

import json

import httpx

from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import WebFetchInput, WebSearchInput
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings


async def _tavily_search(query: str) -> list[dict[str, str]]:
    api_key = (settings.web_search_api_key or "").strip()
    if not api_key:
        return []
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.tavily.com/search",
            json={"api_key": api_key, "query": query, "max_results": 5},
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Tavily HTTP {resp.status_code}")
        body = resp.json()
        return [
            {
                "title": str(r.get("title") or ""),
                "url": str(r.get("url") or ""),
                "snippet": str(r.get("content") or r.get("snippet") or ""),
            }
            for r in (body.get("results") or [])
            if isinstance(r, dict)
        ]


async def web_search(ctx: AgentRunContext, inp: WebSearchInput) -> ToolCallResult:
    _ = ctx
    if not (settings.web_search_api_key or "").strip():
        return ToolCallResult(
            content="<tool_use_error>请配置 WEB_SEARCH_API_KEY 以启用 WebSearch</tool_use_error>",
            is_error=True,
        )
    try:
        hits = await _tavily_search(inp.query)
    except Exception as exc:
        return ToolCallResult(
            content=f"<tool_use_error>WebSearch failed: {exc}</tool_use_error>", is_error=True
        )
    return ToolCallResult(content=json.dumps({"results": hits}, ensure_ascii=False))


async def web_fetch(ctx: AgentRunContext, inp: WebFetchInput) -> ToolCallResult:
    _ = ctx
    url = (inp.url or "").strip()
    if not url.startswith(("http://", "https://")):
        return ToolCallResult(content="<tool_use_error>invalid URL</tool_use_error>", is_error=True)
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return ToolCallResult(
                    content=f"<tool_use_error>HTTP {resp.status_code}</tool_use_error>",
                    is_error=True,
                )
            text = resp.text[:12000]
    except Exception as exc:
        return ToolCallResult(
            content=f"<tool_use_error>WebFetch failed: {exc}</tool_use_error>", is_error=True
        )
    return ToolCallResult(content=text)


WEB_TOOLS = [
    build_tool(
        name="WebSearch",
        description="Search the web for reference material (requires WEB_SEARCH_API_KEY).",
        input_model=WebSearchInput,
        call=web_search,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
        is_enabled=lambda _c: bool((settings.web_search_api_key or "").strip()),
    ),
    build_tool(
        name="WebFetch",
        description="Fetch URL content as plain text.",
        input_model=WebFetchInput,
        call=web_fetch,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
]
