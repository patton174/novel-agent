"""Silent LLM repair for failed tool inputs (no SSE)."""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import find_tool_by_name

logger = logging.getLogger(__name__)


async def repair_tool_input_with_llm(
    ctx: AgentRunContext,
    tool_name: str,
    tool_input: dict[str, Any],
    *,
    error_code: str,
    error_detail: str,
    attempt: int,
) -> dict[str, Any] | None:
    """Ask LLM to fix tool arguments; returns validated raw dict or None."""
    tool = find_tool_by_name(tool_name)
    if tool is None:
        return None

    cleaned = {
        k: v
        for k, v in dict(tool_input or {}).items()
        if not str(k).startswith("_")
    }
    schema_hint = json.dumps(
        tool.input_model.model_json_schema(),
        ensure_ascii=False,
    )[:4000]

    system = (
        "You fix invalid novel-agent tool call arguments. "
        "Output ONLY valid JSON matching the tool input schema. "
        "Keep fields unchanged unless the error requires a change. "
        "Do not add commentary."
    )
    human = f"""Tool: {tool_name}
Attempt: {attempt}
Error code: {error_code}
Error detail:
{(error_detail or '')[:1200]}

Original input:
{json.dumps(cleaned, ensure_ascii=False, indent=2)}

Schema (reference):
{schema_hint}

Return corrected input for {tool_name}."""

    try:
        parsed = await invoke_structured_with_retry(
            [SystemMessage(content=system), HumanMessage(content=human)],
            tool.input_model,
            profile="default",
        )
        repaired = parsed.model_dump(exclude_none=True)
        validated, err = tool.parse_input(repaired)
        if validated is None:
            logger.warning(
                "tool input repair invalid tool=%s attempt=%s err=%s",
                tool_name,
                attempt,
                err,
            )
            return None
        return validated.model_dump(exclude_none=True)
    except Exception as exc:
        logger.warning(
            "tool input repair LLM failed tool=%s attempt=%s: %s",
            tool_name,
            attempt,
            exc,
        )
        return None
