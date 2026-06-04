"""Per-tool_call_id validation errors."""

from langchain_core.messages import ToolMessage

from app.agent_step.schemas import PlanToolCall
from app.agent_step.tool_batch_errors import append_batch_validation_errors


def test_append_batch_validation_errors_uses_tool_messages():
    messages: list = []
    append_batch_validation_errors(messages, ["id_a", "id_b"], "bad input")
    assert len(messages) == 2
    assert all(isinstance(m, ToolMessage) for m in messages)
    assert messages[0].tool_call_id == "id_a"
    assert "<tool_use_error>" in str(messages[0].content)
