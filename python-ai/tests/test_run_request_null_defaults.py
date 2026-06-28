"""RunRequest accepts Java null defaults for optional context fields."""

from app.agent.schemas import AgentRunContext, RunRequest


def test_run_request_accepts_null_skill_prompt_and_crew_vars():
    req = RunRequest.model_validate(
        {
            "context": {
                "run_id": "run_1",
                "session_id": "session_1",
                "message_id": "message_1",
                "user_id": 1,
                "skill_prompt": None,
                "crew_vars": None,
            }
        }
    )
    assert req.context.skill_prompt == ""
    assert req.context.crew_vars == {}
