from app.agent_step.routing_protocol import strip_step_routing
from app.agent_step.schemas import DisplayPayload, StepResult


def test_strip_step_routing_continue_clears_next_tool():
    raw = StepResult(
        step_kind="think",
        action="continue",
        next_tool="output",
        next_input={"task": "x"},
        context_patch={},
        display=DisplayPayload(type="think", content="分析"),
        reason="ok",
    )
    result = strip_step_routing(raw)
    assert result.action == "continue"
    assert result.next_tool == ""
    assert result.next_input == {}


def test_strip_step_routing_end_keeps_end():
    raw = StepResult(
        step_kind="output",
        action="end",
        next_tool="end",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="message", content="正文"),
        reason="done",
    )
    result = strip_step_routing(raw)
    assert result.action == "end"
    assert result.next_tool == "end"


def test_strip_step_routing_wait_clears_next_tool():
    raw = StepResult(
        step_kind="choose",
        action="wait",
        wait_for="interaction",
        next_tool="output",
        next_input={"task": "t"},
        context_patch={},
        display=DisplayPayload(
            type="tool",
            tool="choose",
            interaction={"type": "single_select", "options": []},
        ),
        reason="wait",
    )
    result = strip_step_routing(raw)
    assert result.action == "wait"
    assert result.wait_for == "interaction"
    assert result.next_tool == ""
