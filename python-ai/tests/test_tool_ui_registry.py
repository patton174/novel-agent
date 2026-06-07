"""Default ui_excerpt registry + build_tool auto-wire."""

from app.agent.harness.tool_ui import (
    default_ui_excerpt_for_name,
    glob_ui_excerpt,
    read_ui_excerpt,
    todo_write_ui_excerpt,
)
from app.agent.tools.registry import find_tool_by_name
from app.agent.tools.tool import build_tool
from app.agent.schemas import AgentRunContext
from pydantic import BaseModel


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
    assert default_ui_excerpt_for_name("Agent") is not None
    assert default_ui_excerpt_for_name("ListChapters") is not None
    assert find_tool_by_name("ReadChapter") is not None
    assert find_tool_by_name("ReadChapter").ui_excerpt is read_ui_excerpt


def test_list_chapters_excerpt_from_json():
    from app.agent.harness.tool_display import format_list_chapters_excerpt

    content = '{"chapters": [{"chapter_id": "a", "title": "第一章"}, {"chapter_id": "b", "title": "第二章"}]}'
    excerpt = format_list_chapters_excerpt(content)
    assert "第一章" in excerpt
    assert "第二章" in excerpt


def test_glob_sse_style_summary():
    from app.agent.harness.events import build_tool_completed_sse_payload

    payload = build_tool_completed_sse_payload(
        "ListChapters",
        content='{"chapters": [{"chapter_id": "a", "title": "第一章"}]}',
        tool_input={},
    )
    assert "display_excerpt" in payload
    assert "第一章" in payload["display_excerpt"]
    assert "output" in payload
