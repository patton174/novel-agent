"""Tool call id mapping through prepare_execution_batch."""

from app.agent.schemas import AgentRunContext, PlanToolCall
from app.agent.harness.tool_prepare import prepare_execution_batch


class _Ai:
    def __init__(self, tool_call_id: str, call: PlanToolCall):
        self.tool_call_id = tool_call_id
        self.call = call


def test_prepare_preserves_tools():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        novel_id="n1",
    )
    ai = [
        _Ai("id1", PlanToolCall(tool="Glob", input={"pattern": "*"})),
        _Ai("id2", PlanToolCall(tool="Read", input={"file_path": "/novel/n1/meta.json"})),
    ]
    prep = prepare_execution_batch(ctx, ai)
    assert [i.tool for i in prep.items] == ["Glob", "Read"]
