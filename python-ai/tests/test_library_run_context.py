"""run_context library 区块单测。"""

from __future__ import annotations

from app.agent.context.prompting.run_context import assemble_run_context
from app.agent.schemas import AgentRunContext


def test_assemble_run_context_includes_library_block():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=10,
        novel_id="novel-1",
        referenced_books=[
            {
                "catalogNovelId": "c1",
                "title": "武动乾坤",
                "summary": "林动修仙之路",
                "chapterTitles": ["第一章", "第二章"],
                "indexStatus": "ready",
                "namespace": "library:10:c1",
            }
        ],
    )
    out = assemble_run_context(ctx)
    assert "library" in out
    books = out["library"]["books"]
    assert len(books) == 1
    assert books[0]["title"] == "武动乾坤"
    assert books[0]["catalog_novel_id"] == "c1"
    assert books[0]["chapter_titles"] == ["第一章", "第二章"]
    assert books[0]["index_status"] == "ready"
    assert "SearchKnowledge" in out["library"]["hint"]


def test_assemble_run_context_omits_library_when_empty():
    ctx = AgentRunContext(
        run_id="r", session_id="s", message_id="m", user_id=10, novel_id="novel-1"
    )
    out = assemble_run_context(ctx)
    assert "library" not in out
