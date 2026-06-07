"""Tests for think-tag filtering."""

from app.runtime.text_sanitize import extract_visible_text, strip_think_markup
from app.agent.harness.llm_parse import (
    extract_json_object,
    extract_plan_json_from_text,
    sanitize_step_result,
)
from app.agent.schemas import DisplayPayload, StepResult


def test_strip_think_markup_keeps_outside_text():
    raw = "<think>内部推理</think>\n\n雨停了，街道很安静。"
    assert strip_think_markup(raw) == "\n\n雨停了，街道很安静。"


def test_extract_visible_text_never_keeps_inner_think():
    raw = "<think>雨停了，街道很安静。</think>"
    assert extract_visible_text(raw) == ""


def test_extract_json_object_strips_think_before_parse():
    raw = (
        '<think>planning</think>'
        '{"version":1,"step_kind":"output","action":"end","next_tool":"end",'
        '"next_input":{},"context_patch":{},'
        '"display":{"type":"message","content":"你好"},"reason":"ok"}'
    )
    data = extract_json_object(raw)
    assert data["display"]["content"] == "你好"


def test_sanitize_step_result_strips_message_content():
    result = StepResult(
        step_kind="output",
        action="end",
        next_tool="end",
        next_input={},
        context_patch={},
        display=DisplayPayload(
            type="message",
            content="<think>secret</think>正文段落。",
        ),
        reason="test",
    )
    cleaned = sanitize_step_result(result)
    assert cleaned.display.content == "正文段落。"


def test_extract_json_object_from_inside_think_block():
    raw = (
        '<think>{"version":1,"step_kind":"output","action":"end",'
        '"next_tool":"end","display":{"type":"message","content":"雨停了。"},'
        '"reason":"ok"}</think>'
    )
    data = extract_json_object(raw)
    assert data["display"]["content"] == "雨停了。"


def test_extract_plan_json_from_reasoning_without_outer_json():
    raw = (
        '<think>先 memory_read 再 memory_update</think>'
        '推理结束。{"action":"continue","next_tool":"output","next_input":{},"reason":"done"}'
    )
    data = extract_plan_json_from_text(raw)
    assert data["action"] == "continue"
    assert data["next_tool"] == "output"


def test_extract_plan_json_finds_embedded_object():
    reasoning = "编排中…"
    tail = (
        '{"action":"continue","tool_calls":[{"tool":"memory_read","input":{"scope":"world"}}],'
        '"continue_plan":false,"reason":"batch"}'
    )
    data = extract_plan_json_from_text(reasoning + tail)
    assert data["tool_calls"][0]["tool"] == "memory_read"


def test_needs_user_direction_for_incomplete_prompt():
    from app.agent.harness.routing import needs_user_direction
    from app.agent.schemas import AgentRunContext

    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="我想写一篇网游类型的",
    )
    assert needs_user_direction(ctx) is True
