"""Modular prompt injection tests."""

from app.agent_step.prompting.tool_prompt import (
    build_ask_user_questions_messages,
    build_output_stream_messages,
    build_think_stream_messages,
    build_tool_messages,
    output_submit_messages,
)
from app.agent_step.prompting.types import ToolPromptMode, ToolPromptRequest
from app.agent_step.schemas import AgentRunContext


def _ctx(**overrides) -> AgentRunContext:
    base = {
        "run_id": "run_p",
        "session_id": "session_p",
        "message_id": "message_p",
        "user_id": 1,
        "mode": "auto",
        "user_message": "写第一章",
    }
    base.update(overrides)
    return AgentRunContext(**base)


def test_run_context_in_think_messages():
    msgs = build_think_stream_messages(_ctx(), {"question": "续写"})
    human = msgs[1].content
    assert "RUN_CONTEXT_JSON:" in human
    assert "TOOL_TASK:" in human


def test_ask_user_questions_mode():
    msgs = build_ask_user_questions_messages(
        _ctx(),
        {"topic": "世界观", "context": "前文"},
    )
    assert "AskUserQuestionsOutput" in msgs[0].content
    assert "RUN_CONTEXT_JSON:" in msgs[1].content


def test_output_stream_includes_delivery_modes():
    from app.agent_step.prompting.tool_contracts import output_stream_system_lines

    text = "\n".join(output_stream_system_lines())
    assert "交付倾向" in text or "进度" in text


def test_output_delivery_hint_uses_mode():
    from app.agent_step.prompting.fragments import build_output_delivery_hint

    assert "进度" in build_output_delivery_hint({"output_mode": "progress"})
    assert "收尾" in build_output_delivery_hint({"output_mode": "complete"})


def test_output_submit_end_run_routing():
    msgs = output_submit_messages(
        _ctx(),
        {"end_run": True},
        "可见正文",
    )
    system = msgs[0].content
    assert "action=end" in system
    assert "可见正文" in msgs[1].content


def test_output_stream_memory_from_tool_input():
    msgs = build_output_stream_messages(
        _ctx(context_patch={"character_roster": ["甲", "乙"]}),
        {
            "task": "说明",
            "memory_context": {
                "ok": True,
                "scope": "world",
                "value_preview": "末世",
            },
        },
    )
    human = msgs[1].content
    assert "末世" in human


def test_tool_structured_includes_run_context():
    msgs = build_tool_messages(
        ToolPromptRequest(
            tool_name="choose",
            ctx=_ctx(),
            tool_input={"topic": "主题"},
            mode=ToolPromptMode.STRUCTURED,
        )
    )
    assert "RUN_CONTEXT_JSON:" in msgs[1].content
