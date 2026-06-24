"""Default ui_excerpt registry + build_tool auto-wire."""

from pydantic import BaseModel

from app.agent.harness.tool_ui import (
    default_ui_excerpt_for_name,
    read_chapter_ui_excerpt,
)
from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import find_tool_by_name
from app.agent.tools.tool import build_tool


class _In(BaseModel):
    x: str = ""


async def _noop(_ctx: AgentRunContext, _inp: _In):
    from app.agent.tools.tool import ToolCallResult

    return ToolCallResult(content="ok")


def test_build_tool_auto_wires_ui_excerpt():
    t = build_tool(name="TodoWrite", description="t", input_model=_In, call=_noop)
    assert t.ui_excerpt is not None
    assert t.ui_excerpt("Todos updated.", {}) == ""


def test_registry_covers_api_tools():
    from app.agent.tools.registry import build_agent_tools

    assert default_ui_excerpt_for_name("Agent") is not None
    assert default_ui_excerpt_for_name("ListChapters") is not None
    assert default_ui_excerpt_for_name("ChapterAudit") is not None
    assert default_ui_excerpt_for_name("NarrativeReview") is not None
    assert find_tool_by_name("ReadChapter") is not None
    assert find_tool_by_name("ReadChapter").ui_excerpt is read_chapter_ui_excerpt
    missing = [
        t.name
        for t in build_agent_tools()
        if t.name not in {"TodoWrite"} and default_ui_excerpt_for_name(t.name) is None
    ]
    assert missing == []


def test_list_chapters_excerpt_from_json():
    from app.agent.harness.tool_display import format_list_chapters_excerpt

    content = '{"chapters": [{"chapter_id": "a", "title": "第一章"}, {"chapter_id": "b", "title": "第二章"}]}'
    excerpt = format_list_chapters_excerpt(content)
    assert "第一章" in excerpt
    assert "第二章" in excerpt


def test_list_chapters_excerpt_empty():
    from app.agent.harness.tool_display import format_list_chapters_excerpt

    assert format_list_chapters_excerpt('{"count": 0, "chapters": []}') == "暂无章节"


def test_list_chapters_sse_display_excerpt():
    from app.agent.harness.events import build_tool_completed_sse_payload

    payload = build_tool_completed_sse_payload(
        "ListChapters",
        content='{"chapters": [{"chapter_id": "a", "title": "第一章"}]}',
        tool_input={},
    )
    assert payload.get("display_excerpt") == "1 章"
