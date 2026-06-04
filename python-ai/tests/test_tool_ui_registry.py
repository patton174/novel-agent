"""Default ui_excerpt registry + build_tool auto-wire."""

from app.agent_step.tool_ui import (
    default_ui_excerpt_for_name,
    glob_ui_excerpt,
    read_ui_excerpt,
    todo_write_ui_excerpt,
    tool_search_ui_excerpt,
)
from app.agent_step.tools.registry import find_tool_by_name
from app.agent_step.tools.tool import build_tool
from app.agent_step.schemas import AgentRunContext
from pydantic import BaseModel


class _In(BaseModel):
    x: str = ""


async def _noop(_ctx: AgentRunContext, _inp: _In):
    from app.agent_step.tools.tool import ToolCallResult

    return ToolCallResult(content="ok")


def test_build_tool_auto_wires_ui_excerpt():
    t = build_tool(name="TodoWrite", description="t", input_model=_In, call=_noop)
    assert t.ui_excerpt is not None
    assert t.ui_excerpt("Todos updated.", {}) == ""


def test_registry_covers_deferred_tools():
    assert default_ui_excerpt_for_name("Agent") is not None
    assert default_ui_excerpt_for_name("TaskList") is not None
    assert find_tool_by_name("Read") is not None
    assert find_tool_by_name("Read").ui_excerpt is read_ui_excerpt


def test_tool_search_excerpt():
    assert "3 个工具" in tool_search_ui_excerpt("A\nB\nC", {})


def test_glob_sse_style_summary():
    from app.agent_step.events import build_tool_completed_sse_payload

    inv = (
        "# 数据来源\n# 章节（Content API）: 2 条可访问路径\n"
        "# 记忆（story-memory API）: 1 条\n/novel/n1/chapters/a.md"
    )
    payload = build_tool_completed_sse_payload(
        "Glob",
        content=inv,
        tool_input={"pattern": "*"},
    )
    assert "display_excerpt" in payload
    assert "列举" in payload["display_excerpt"]
    assert "output" in payload
