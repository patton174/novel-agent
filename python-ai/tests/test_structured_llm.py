"""Tests for structured LLM helpers."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ValidationError

from app.agent.schemas import PlanResult, StepResult
from app.agent.harness.structured_llm import (
    format_schema_error,
    invoke_structured,
    invoke_structured_with_retry,
    try_invoke_structured,
)


class _SampleModel(BaseModel):
    action: str
    reason: str = "ok"


@pytest.mark.asyncio
async def test_invoke_structured_returns_parsed_model():
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(
        return_value={"parsed": _SampleModel(action="continue"), "parsing_error": None}
    )
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_chain

    with patch("app.agent.harness.structured_llm.llm_provider.get_llm", return_value=mock_llm):
        result = await invoke_structured(
            [SystemMessage(content="sys"), HumanMessage(content="hi")],
            _SampleModel,
            profile="plan",
        )
    assert result.action == "continue"
    mock_llm.with_structured_output.assert_called_once()
    kwargs = mock_llm.with_structured_output.call_args.kwargs
    assert kwargs.get("method") == "function_calling"
    assert kwargs.get("include_raw") is True


@pytest.mark.asyncio
async def test_invoke_structured_with_retry_retries_on_validation_error():
    ok = _SampleModel(action="continue")
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(
        side_effect=[
            ValueError("structured parse failed: bad"),
            {"parsed": ok, "parsing_error": None},
        ]
    )
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_chain

    with (
        patch("app.agent.harness.structured_llm.llm_provider.get_llm", return_value=mock_llm),
        patch("app.agent.harness.structured_llm.asyncio.sleep", new_callable=AsyncMock),
    ):
        result = await invoke_structured_with_retry(
            [HumanMessage(content="x")],
            _SampleModel,
            profile="default",
            max_attempts=3,
        )
    assert result.action == "continue"
    assert mock_chain.ainvoke.await_count == 2
    second_call_messages = mock_chain.ainvoke.await_args_list[1].args[0]
    assert len(second_call_messages) == 2
    assert "tool_use_error" in second_call_messages[1].content
    assert "schema validation failed" in second_call_messages[1].content.lower()


@pytest.mark.asyncio
async def test_invoke_structured_wrong_native_tool_raises_without_salvage():
    from langchain_core.messages import AIMessage

    raw = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "memory_read",
                "args": {"scope": "world"},
                "id": "call_bad",
                "type": "tool_call",
            }
        ],
    )
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(
        return_value={
            "parsed": None,
            "parsing_error": ValueError("Unknown tool type: 'memory_read'"),
            "raw": raw,
        }
    )
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_chain

    with patch("app.agent.harness.structured_llm.llm_provider.get_llm", return_value=mock_llm):
        with pytest.raises(ValueError, match="tool_use_error.*No such tool available.*memory_read"):
            await invoke_structured([HumanMessage(content="x")], PlanResult, profile="plan")


@pytest.mark.asyncio
async def test_invoke_structured_with_retry_on_wrong_native_tool():
    from langchain_core.messages import AIMessage

    ok = PlanResult.model_validate(
        {
            "action": "continue",
            "tool_calls": [{"tool": "ReadMemory", "input": {"scope": "world", "key": "rules"}}],
            "reason": "ok",
        }
    )
    bad_raw = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "memory_read",
                "args": {"scope": "world"},
                "id": "call_bad",
                "type": "tool_call",
            }
        ],
    )
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(
        side_effect=[
            {
                "parsed": None,
                "parsing_error": ValueError("Unknown tool type: 'memory_read'"),
                "raw": bad_raw,
            },
            {"parsed": ok, "parsing_error": None},
        ]
    )
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_chain

    with (
        patch("app.agent.harness.structured_llm.llm_provider.get_llm", return_value=mock_llm),
        patch("app.agent.harness.structured_llm.asyncio.sleep", new_callable=AsyncMock),
    ):
        result = await invoke_structured_with_retry(
            [HumanMessage(content="x")],
            PlanResult,
            profile="plan",
            max_attempts=3,
        )
    assert result.tool_calls[0].tool == "ReadMemory"
    assert mock_chain.ainvoke.await_count == 2


@pytest.mark.asyncio
async def test_invoke_structured_salvages_raw_tool_args_on_parse_error():
    from langchain_core.messages import AIMessage

    raw = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "PlanResult",
                "args": {
                    "action": "continue",
                    "tool_calls": '[{"tool":"ReadMemory","input":{"scope":"world","key":"rules"}}]',
                    "reason": "ok",
                    "continue_plan": False,
                },
                "id": "call_1",
                "type": "tool_call",
            }
        ],
    )
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(
        return_value={
            "parsed": None,
            "parsing_error": ValidationError.from_exception_data(
                "PlanResult",
                [
                    {
                        "type": "list_type",
                        "loc": ("tool_calls",),
                        "msg": "Input should be a valid list",
                        "input": "[]",
                    }
                ],
            ),
            "raw": raw,
        }
    )
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_chain

    from app.agent.schemas import PlanResult

    with patch("app.agent.harness.structured_llm.llm_provider.get_llm", return_value=mock_llm):
        result = await invoke_structured([HumanMessage(content="x")], PlanResult, profile="plan")
    assert result.tool_calls[0].tool == "ReadMemory"


@pytest.mark.asyncio
async def test_try_invoke_structured_returns_none_on_failure():
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(side_effect=RuntimeError("api down"))
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_chain

    with (
        patch("app.agent.harness.structured_llm.llm_provider.get_llm", return_value=mock_llm),
        patch("app.agent.harness.structured_llm.asyncio.sleep", new_callable=AsyncMock),
    ):
        result = await try_invoke_structured(
            [HumanMessage(content="x")],
            _SampleModel,
            profile="default",
        )
    assert result is None
    from app.agent.harness.tool_errors import max_structured_output_retries

    assert mock_chain.ainvoke.await_count == max_structured_output_retries()


def test_plan_result_coerces_tool_calls_json_string():
    raw = (
        '[{"tool":"ReadMemory","input":{"scope":"world","key":"rules"}},'
        '{"tool":"ListChapters","input":{}}]'
    )
    result = PlanResult.model_validate(
        {
            "action": "continue",
            "tool_calls": raw,
            "reason": "batch",
        }
    )
    assert len(result.tool_calls) == 2
    assert result.tool_calls[0].tool == "ReadMemory"
    assert result.next_tool == "ReadMemory"


def test_step_result_action_end_auto_fills_next_tool():
    result = StepResult.model_validate(
        {
            "step_kind": "think",
            "action": "end",
            "next_input": {},
            "context_patch": {},
            "display": {"type": "none"},
            "reason": "done",
        }
    )
    assert result.next_tool == "end"


def test_format_schema_error_from_validation_error():
    try:
        PlanResult.model_validate({"action": "continue", "reason": "x"})
    except ValidationError as exc:
        text = format_schema_error(exc)
    else:
        raise AssertionError("expected validation error")
    assert "next_tool" in text or "tool_calls" in text
