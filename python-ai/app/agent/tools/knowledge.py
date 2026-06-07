"""Knowledge retrieval tools — RAG + knowledge graph."""

from __future__ import annotations

import json

from app.agent.tools.schemas import GetCharacterGraphInput, SearchKnowledgeInput, SearchMode
from app.agent.schemas import AgentRunContext
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings
from app.kg.query import character_graph
from app.rag.chapter_index import search_novel


async def search_knowledge(ctx: AgentRunContext, inp: SearchKnowledgeInput) -> ToolCallResult:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id:
        return ToolCallResult(
            content="<tool_use_error>missing novel_id</tool_use_error>", is_error=True
        )
    if inp.mode == SearchMode.graph:
        if not settings.kg_enabled:
            return ToolCallResult(
                content=json.dumps(
                    {"hits": [], "note": "知识图谱未启用（KG_ENABLED=false）"},
                    ensure_ascii=False,
                ),
            )
        graph = character_graph(novel_id, inp.query)
        return ToolCallResult(
            content=json.dumps({"hits": [], "graph": graph}, ensure_ascii=False),
        )
    mode = "vector" if inp.mode == SearchMode.vector else "hybrid"
    hits = await search_novel(novel_id, inp.query, top_k=inp.top_k, mode=mode)
    return ToolCallResult(content=json.dumps({"hits": hits}, ensure_ascii=False))


async def get_character_graph(
    ctx: AgentRunContext, inp: GetCharacterGraphInput
) -> ToolCallResult:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id:
        return ToolCallResult(
            content="<tool_use_error>missing novel_id</tool_use_error>", is_error=True
        )
    if not settings.kg_enabled:
        return ToolCallResult(
            content=json.dumps(
                {"nodes": [], "edges": [], "note": "知识图谱未启用"}, ensure_ascii=False
            ),
        )
    graph = character_graph(novel_id, inp.character)
    return ToolCallResult(content=json.dumps(graph, ensure_ascii=False))


KNOWLEDGE_TOOLS = [
    build_tool(
        name="SearchKnowledge",
        description="Semantic search over this novel's chapters (and catalog when indexed).",
        input_model=SearchKnowledgeInput,
        call=search_knowledge,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="GetCharacterGraph",
        description="Get character relationship subgraph for consistency checks.",
        input_model=GetCharacterGraphInput,
        call=get_character_graph,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
]
