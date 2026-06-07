"""Tests for context token estimation and compression triggers."""

from app.agent.context.usage import (
    RunUsageAccumulator,
    estimate_text_tokens,
    measure_plan_prompt,
    should_compress_context,
)
from app.agent.schemas import AgentRunContext, PlanRequest


def test_estimate_text_tokens_cjk_heavier_than_ascii():
    zh = estimate_text_tokens("这是一段中文测试文本用于估算 token")
    en = estimate_text_tokens("This is an English sentence for token estimate.")
    assert zh > 0
    assert en > 0
    assert zh > en // 2


def test_should_compress_context_near_threshold():
    from app.agent.context.usage import compress_threshold_tokens

    limit = compress_threshold_tokens()
    assert should_compress_context(limit)
    assert not should_compress_context(max(0, limit - 5000))


def test_measure_plan_prompt_sections():
    ctx = AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="msg_test",
        user_id=1,
        user_message="帮我续写下一章",
        mode="auto",
        step_index=0,
        story_memory="世界观：修仙\n角色：林枫",
    )
    req = PlanRequest(context=ctx, think_content="## 分析\n用户希望续写", transcript=[])
    measure = measure_plan_prompt(req)
    assert measure["prompt_tokens"] > 0
    assert measure["context_limit"] > 0
    assert "sections" in measure


def test_run_usage_accumulator_sums():
    acc = RunUsageAccumulator()
    acc.add_llm_usage({"input_tokens": 100, "output_tokens": 20})
    acc.add_llm_usage({"input_tokens": 50, "output_tokens": 10, "cache_read_input_tokens": 30})
    d = acc.as_dict()
    assert d["input_tokens"] == 150
    assert d["output_tokens"] == 30
    assert d["cache_read_tokens"] == 30
