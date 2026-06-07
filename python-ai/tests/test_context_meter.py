"""Tests for CC-aligned context metering."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agent.context.meter import (
    get_token_count_from_api_usage,
    measure_agent_context,
    token_count_with_estimation,
)
from app.agent.context.usage import RunUsageAccumulator, build_context_usage_payload
from app.agent.schemas import AgentRunContext, PlanRequest


def test_get_token_count_from_api_usage_includes_cache():
    usage = {
        "input_tokens": 1000,
        "output_tokens": 200,
        "cache_read_input_tokens": 500,
        "cache_creation_input_tokens": 50,
    }
    assert get_token_count_from_api_usage(usage) == 1750


def test_token_count_with_estimation_prefers_api():
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="hello"),
        AIMessage(
            content="",
            response_metadata={
                "usage": {
                    "input_tokens": 4000,
                    "output_tokens": 100,
                }
            },
        ),
    ]
    assert token_count_with_estimation(messages) >= 4000


def test_build_context_usage_payload_cc_fields():
    measure = {
        "prompt_tokens": 50_000,
        "context_limit": 200_000,
        "context_percent": 25.0,
        "percent_left": 75.0,
        "sections": {"user_message": 100},
        "source": "api",
        "thresholds": {
            "context_limit": 200_000,
            "compress_threshold_tokens": 144_000,
            "warning_threshold_tokens": 170_000,
        },
    }
    payload = build_context_usage_payload(
        prompt_measure=measure,
        run_usage=RunUsageAccumulator(),
        turn=2,
        last_compact_mode="message_tail",
    )
    assert payload["source"] == "api"
    assert payload["percent_left"] == 75.0
    assert payload["last_compact_mode"] == "message_tail"
    assert payload["thresholds"]["compress_threshold_tokens"] == 144_000


def test_measure_agent_context_sections_from_plan():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="续写",
        mode="auto",
        step_index=0,
    )
    req = PlanRequest(context=ctx, transcript=[])
    measure = measure_agent_context(
        [SystemMessage(content="x"), HumanMessage(content="y")],
        req=req,
        source="estimate",
    )
    assert measure["source"] == "estimate"
    assert measure["prompt_tokens"] > 0
    assert "sections" in measure
    assert measure["percent_left"] >= 0
