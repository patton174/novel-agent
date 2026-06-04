"""Separate UI (SSE) tool payloads from model-facing tool results (CC-aligned).

Claude Code reference (read-only under claude-code-ref/src/):

| CC | Role |
|----|------|
| ``tool.call()`` → ``result.data`` | Native tool output (like our ``ToolCallResult.content``) |
| ``mapToolResultToToolResultBlockParam`` | **Model** — ``user`` message ``tool_result`` block sent to API |
| ``processToolResultBlock`` / ``toolResultStorage`` | Large results → disk reference in model block |
| ``createUserMessage({ toolUseResult })`` | **UI** — ``renderToolResultMessage(output)`` in terminal |
| ``transcriptSearch.ts`` | Explicit: API ``tool_result`` text ≠ ``toolUseResult`` display text |

This project:

| Channel | Event / field | Builder |
|---------|---------------|---------|
| **Model** | ``step.completed`` → ``display.content`` | ``build_model_step_payload`` ← ``ToolCallResult.content`` |
| **Model** | LangChain ``ToolMessage`` | ``tool_message_text`` / ``model_text_from_step_payload`` |
| **UI** | ``tool.completed`` | ``events.build_tool_completed_sse_payload`` → excerpts only |
| **UI** | ``tool.progress`` / ``tool.completed`` excerpts | ``AgentTool.ui_excerpt``（``tool_ui.py``） |

Never use ``tool.completed.output`` / ``output_summary`` for successful tool turns.
"""

from __future__ import annotations

from typing import Any

from app.agent_step.tools.tool import ToolCallResult

# Keys on tool.completed that are safe for the browser only (see frontend toolDetailFormat.ts).
SSE_UI_PAYLOAD_KEYS = frozenset(
    {
        "display_excerpt",
        "output_summary",
        "result_labels",
        "action_label",
        "output",  # Glob/Grep inventory + errors — not model input
    }
)


def map_tool_result_for_model(result: ToolCallResult) -> str:
    """CC ``mapToolResultToToolResultBlockParam`` equivalent — full text for the LLM."""
    return (result.content or "").strip()


def build_model_step_payload(tool: str, result: ToolCallResult) -> dict[str, Any]:
    """Internal ``step.completed`` — authoritative model body in ``display.content``."""
    action = result.action
    if result.end_run:
        action = "end"
    content = map_tool_result_for_model(result)
    return {
        "step_kind": tool,
        "action": action,
        "wait_for": result.wait_for,
        "next_tool": "end" if action == "end" else tool,
        "next_input": {},
        "context_patch": result.context_patch,
        "display": {
            "type": "tool",
            "tool": tool,
            "content": content,
            "interaction": result.interaction,
        },
        # Planner/transcript hint only — not used for ToolMessage when display.content is set.
        "reason": content[:200],
    }


def model_text_from_step_payload(payload: dict[str, Any]) -> str:
    """Full tool result for ToolMessage and transcript — never read from SSE excerpts."""
    display = payload.get("display")
    if isinstance(display, dict):
        content = display.get("content")
        if isinstance(content, str) and content.strip():
            return content
    reason = payload.get("reason")
    if isinstance(reason, str) and reason.strip():
        return reason
    return ""


def model_text_from_sse_tool_completed(payload: dict[str, Any]) -> str:
    """Only for failed tool.completed when step.completed is absent."""
    if str(payload.get("status") or "") != "error":
        return ""
    out = payload.get("output")
    if isinstance(out, str) and out.strip():
        return out
    err = payload.get("error")
    if isinstance(err, str) and err.strip():
        return err
    summary = payload.get("output_summary")
    if isinstance(summary, str) and summary.strip():
        return summary
    return ""


def tool_message_text(
    *,
    message_output: str = "",
    step_result_display_content: str | None = None,
    step_result_reason: str | None = None,
    error: str = "",
    is_error: bool = False,
) -> str:
    """Pick text for LangChain ToolMessage (query loop / batch)."""
    if is_error:
        return (error or step_result_reason or message_output or "tool failed").strip()
    candidates: list[str] = []
    if step_result_display_content and str(step_result_display_content).strip():
        candidates.append(str(step_result_display_content).strip())
    if message_output.strip():
        candidates.append(message_output.strip())
    if candidates:
        return max(candidates, key=len)
    return (step_result_reason or "").strip()
