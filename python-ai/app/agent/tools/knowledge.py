"""Knowledge retrieval tools — RAG + knowledge graph."""

from __future__ import annotations

import json

from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import GetCharacterGraphInput, SearchKnowledgeInput
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings
from app.kg.query import character_graph
from app.rag.chapter_index import search_novel

_INDEXING_HINT = (
    "参考书正在索引，请稍后重试 SearchKnowledge 或先阅读章节目录。"
)
_INDEX_FAILED_HINT = "索引失败，请在书库页重试索引。"
_NOT_IN_LIBRARY_HINT = "该书未在当前对话 @ 引用列表中。"


def _find_referenced_book(
    ctx: AgentRunContext, catalog_id: str
) -> dict[str, object] | None:
    for book in ctx.referenced_books or []:
        if not isinstance(book, dict):
            continue
        bid = str(
            book.get("catalogNovelId") or book.get("catalog_novel_id") or ""
        ).strip()
        if bid == catalog_id:
            return book
    return None


def _book_index_status(book: dict[str, object]) -> str:
    raw = str(
        book.get("indexStatus") or book.get("index_status") or ""
    ).strip().lower()
    if raw == "ready":
        return "indexed"
    return raw


def _book_scope_hint_response(status: str, hint: str) -> ToolCallResult:
    return ToolCallResult(
        content=json.dumps(
            {"hits": [], "status": status, "hint": hint},
            ensure_ascii=False,
        ),
    )


async def search_knowledge(ctx: AgentRunContext, inp: SearchKnowledgeInput) -> ToolCallResult:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id:
        return ToolCallResult(
            content="<tool_use_error>missing novel_id</tool_use_error>", is_error=True
        )
    # scope: book:<catalogNovelId> → 从 referenced_books 取 namespace + index_status
    target_ns = novel_id
    if inp.scope and inp.scope.startswith("book:"):
        catalog_id = inp.scope[len("book:") :].strip()
        book = _find_referenced_book(ctx, catalog_id)
        if book is None:
            return _book_scope_hint_response("not_in_library", _NOT_IN_LIBRARY_HINT)
        ns = str(book.get("namespace") or "").strip()
        if not ns:
            return _book_scope_hint_response("not_in_library", _NOT_IN_LIBRARY_HINT)
        index_status = _book_index_status(book)
        if index_status in ("indexing", "pending"):
            return _book_scope_hint_response("indexing", _INDEXING_HINT)
        if index_status == "failed":
            return _book_scope_hint_response("index_failed", _INDEX_FAILED_HINT)
        if index_status != "indexed":
            return _book_scope_hint_response("indexing", _INDEXING_HINT)
        target_ns = ns

    # Single hybrid retrieval path — graph is exposed separately via GetCharacterGraph.
    hits = await search_novel(target_ns, inp.query, top_k=inp.top_k, mode="hybrid")
    if not hits:
        return ToolCallResult(
            content=json.dumps(
                {
                    "hits": [],
                    "status": "no_match",
                    "hint": (
                        "No indexed match. A recently written chapter may still be "
                        "indexing — retry shortly, or ReadChapter / ListChapters directly."
                    ),
                },
                ensure_ascii=False,
            ),
        )
    return ToolCallResult(
        content=json.dumps({"hits": hits, "status": "ok"}, ensure_ascii=False)
    )


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
    graph = await character_graph(novel_id, inp.character)
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
