"""Run loop state + tool step streaming (shared by CC query loop)."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from langchain_core.messages import BaseMessage

from app.agent.context.usage import RunUsageAccumulator
from app.agent.harness.orchestration_contract import (
    QUERY_LOOP_END_RUN_TOOLS as _END_RUN_TOOLS,
)
from app.agent.harness.run_session import RunSession, WorkerSliceSession
from app.agent.harness.tool_execution import (
    _RETRY_SUPPRESS_EVENT_TYPES,
    RETRYABLE_TOOLS,
    TOOL_EXECUTION_MAX_ATTEMPTS,
    classify_tool_step_failure,
    is_tool_failure_retryable,
    merge_tool_retry_context,
    prepare_tool_retry_input,
    tool_retry_delay,
)
from app.agent.harness.tool_result_routing import (
    model_text_from_sse_tool_completed,
    model_text_from_step_payload,
)
from app.agent.harness.transcript import AgentTranscript, apply_interaction_to_context
from app.agent.schemas import AgentRunContext, StepResult
from app.agent.streaming.sse_bridge import stream_cc_tool_step
from app.runtime.events import build_event

logger = logging.getLogger(__name__)


def merge_context(ctx: AgentRunContext, patch: dict[str, Any] | None) -> AgentRunContext:
    if not patch:
        return ctx
    merged = dict(ctx.context_patch or {})
    merged.update(patch)
    return ctx.model_copy(
        update={
            "context_patch": merged,
            "step_index": ctx.step_index + 1,
        }
    )


def apply_step_completed(ctx: AgentRunContext, payload: dict[str, Any]) -> AgentRunContext:
    patch = payload.get("context_patch")
    if isinstance(patch, dict) and patch:
        ctx = merge_context(ctx, patch)
    return ctx.model_copy(
        update={
            "step_index": ctx.step_index + 1,
            "last_tool": str(payload.get("step_kind") or payload.get("next_tool") or ""),
            "last_reason": str(payload.get("reason") or ""),
        }
    )


def rewrite_sequence(event: dict[str, Any], sequence: int) -> dict[str, Any]:
    out = dict(event)
    out["sequence"] = sequence
    return out


def tool_batch_end_run(tool: str, tool_input: dict[str, Any], step_result: StepResult) -> bool:
    if step_result.action == "end":
        return True
    if tool in _END_RUN_TOOLS and tool_input.get("end_run") is True:
        return True
    return False


@dataclass
class ToolStepOutcome:
    result: StepResult | None = None
    next_sequence: int = 0
    tool_output: str = ""
    message_output: str = ""
    failed: bool = False
    error: str = ""


async def stream_tool_step_once(
    ctx: AgentRunContext,
    tool: str,
    tool_input: dict[str, Any],
    *,
    sequence: int,
    outcome: ToolStepOutcome,
    step_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    tool_output = ""
    tool_interaction: dict[str, Any] | None = None
    seq = sequence
    async for raw in stream_cc_tool_step(
        ctx, tool, tool_input, sequence=seq, step_id=step_id
    ):
        ev = rewrite_sequence(raw, seq)
        seq += 1
        if ev.get("type") == "tool.completed":
            tp = ev.get("payload")
            if isinstance(tp, dict):
                err_text = model_text_from_sse_tool_completed(tp)
                if err_text:
                    tool_output = err_text
                interaction = tp.get("interaction")
                if isinstance(interaction, dict):
                    tool_interaction = interaction
        if ev.get("type") == "message.delta":
            payload = ev.get("payload")
            if isinstance(payload, dict):
                outcome.message_output += str(payload.get("text") or "")
        if ev.get("type") == "step.failed":
            payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
            outcome.failed = True
            outcome.error = str(payload.get("error") or "step failed")
        if ev.get("type") == "step.completed":
            payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
            model_text = model_text_from_step_payload(payload)
            if model_text:
                tool_output = model_text
            try:
                from app.agent.schemas import DisplayPayload

                display = DisplayPayload(
                    type="tool",
                    tool=tool,
                    content=tool_output or str(payload.get("reason") or ""),
                    interaction=tool_interaction,
                )
                outcome.result = StepResult(
                    step_kind=str(payload.get("step_kind") or tool),
                    action=payload.get("action") or "continue",
                    wait_for=payload.get("wait_for"),
                    next_tool=str(payload.get("next_tool") or ""),
                    next_input=payload.get("next_input")
                    if isinstance(payload.get("next_input"), dict)
                    else {},
                    context_patch=payload.get("context_patch")
                    if isinstance(payload.get("context_patch"), dict)
                    else {},
                    display=display,
                    reason=str(payload.get("reason") or ""),
                )
            except Exception as exc:
                logger.warning("step.completed parse failed tool=%s: %s", tool, exc)
        yield ev
    outcome.tool_output = tool_output
    outcome.next_sequence = seq


async def stream_tool_step(
    ctx: AgentRunContext,
    tool: str,
    tool_input: dict[str, Any],
    *,
    sequence: int,
    outcome: ToolStepOutcome,
    step_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    use_retry = tool in RETRYABLE_TOOLS
    working_ctx = ctx
    working_input = dict(tool_input or {})
    seq = sequence
    last_code = ""
    last_detail = ""

    for attempt in range(1, TOOL_EXECUTION_MAX_ATTEMPTS + 1):
        attempt_outcome = ToolStepOutcome()
        async for ev in stream_tool_step_once(
            working_ctx,
            tool,
            working_input,
            sequence=seq,
            outcome=attempt_outcome,
            step_id=step_id,
        ):
            if attempt > 1 and ev.get("type") in _RETRY_SUPPRESS_EVENT_TYPES:
                continue
            yield ev

        seq = attempt_outcome.next_sequence
        is_fail, code, detail = classify_tool_step_failure(
            tool,
            attempt_outcome.result,
            executor_failed=attempt_outcome.failed,
            executor_error=attempt_outcome.error,
        )

        if not is_fail:
            outcome.result = attempt_outcome.result
            outcome.tool_output = attempt_outcome.tool_output
            outcome.message_output = attempt_outcome.message_output
            outcome.failed = attempt_outcome.failed
            outcome.error = attempt_outcome.error
            outcome.next_sequence = seq
            return

        if not is_tool_failure_retryable(
            tool,
            attempt_outcome.result,
            executor_failed=attempt_outcome.failed,
            executor_error=attempt_outcome.error,
        ):
            outcome.result = attempt_outcome.result
            outcome.tool_output = attempt_outcome.tool_output
            outcome.message_output = attempt_outcome.message_output
            outcome.failed = True
            outcome.error = detail or code or "tool validation failed"
            outcome.next_sequence = seq
            return

        last_code, last_detail = code, detail
        if attempt >= TOOL_EXECUTION_MAX_ATTEMPTS or not use_retry:
            break

        working_ctx = merge_tool_retry_context(
            working_ctx,
            tool,
            error_code=code,
            error_detail=detail,
            attempt=attempt + 1,
        )
        working_input = prepare_tool_retry_input(
            tool,
            working_input,
            error_code=code,
            error_detail=detail,
            attempt=attempt + 1,
        )
        await tool_retry_delay(attempt + 1)

    outcome.failed = True
    outcome.error = last_detail or last_code or f"{tool} failed after retries"
    outcome.result = None
    outcome.next_sequence = seq
    yield build_event(
        event_type="step.failed",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id=f"step_{uuid4().hex[:8]}",
        sequence=seq,
        payload={
            "error": outcome.error,
            "tool": tool,
            "error_code": last_code,
            "attempts": TOOL_EXECUTION_MAX_ATTEMPTS,
            "retryable": False,
        },
    )
    outcome.next_sequence = seq + 1


_MAX_VALIDATION_RETRIES_PER_TURN = 6
_MAX_TOOL_RECOVERIES_PER_TURN = 6
_MAX_LLM_PAIRING_RETRIES_PER_TURN = 2


@dataclass
class RunLoopState:
    ctx: AgentRunContext
    transcript: AgentTranscript
    think_content: str
    sequence: int
    turn: int = 0
    terminal: bool = False
    last_run_error: str | None = None
    run_usage: RunUsageAccumulator = field(default_factory=RunUsageAccumulator)
    autocompacted_turn: int = 0
    after_interaction: bool = False
    validation_retries: int = 0
    tool_recoveries: int = 0
    assistant_message_emitted: bool = False
    messages: list[BaseMessage] | None = None


_CC_TOOL_TITLES = {
    "Read": "读取",
    "Write": "写入",
    "Edit": "编辑",
    "Glob": "列举",
    "Grep": "搜索",
    "Delete": "删除",
    "AskUser": "询问",
    "TodoWrite": "任务",
    "ToolSearch": "查找工具",
    "EnterPlanMode": "计划模式",
    "ExitPlanMode": "退出计划",
}


def planning_title(tool: str, *, after_interaction: bool = False) -> str:
    if after_interaction:
        return "根据你的选择继续…"
    return _CC_TOOL_TITLES.get(tool, tool or "执行工具")


def open_todo_items(context_patch: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(context_patch, dict):
        return []
    todos = context_patch.get("todos")
    if not isinstance(todos, list):
        return []
    out: list[dict[str, Any]] = []
    for t in todos:
        if not isinstance(t, dict):
            continue
        status = str(t.get("status") or "").strip()
        if status in ("pending", "in_progress"):
            out.append(t)
    return out


def build_todo_exit_review_message(context_patch: dict[str, Any] | None) -> str | None:
    """Ask the model to verify open todos before ending — not blind TodoWrite."""
    items = open_todo_items(context_patch)
    if not items:
        return None
    lines: list[str] = []
    for t in items[:12]:
        label = str(t.get("content") or t.get("id") or "待办").strip()[:80]
        status = str(t.get("status") or "pending")
        lines.append(f"- [{status}] {label}")
    more = len(items) - len(lines)
    tail = f"\n（另有 {more} 项未列出）" if more > 0 else ""
    return (
        "【系统】你正准备结束本轮，但待办清单中仍有以下项标记为未完成：\n"
        + "\n".join(lines)
        + tail
        + "\n\n请先**核对实际工作是否做完**（不要仅为结束而把待办标成完成）：\n"
        "1. 若某项**尚未完成** → 继续调用相应工具执行，不要结束本轮。\n"
        "2. 若某项**确实已完成** → 调用 TodoWrite 更新为 completed 或 cancelled。\n"
        "3. 若已全部完成且已更新待办 → 可再次尝试结束。\n"
        "确认完成后再结束；发现未做完则继续执行。"
    )


def build_open_todos_blocking_message(context_patch: dict[str, Any] | None) -> str | None:
    """Alias for tests / legacy import."""
    return build_todo_exit_review_message(context_patch)


async def wait_for_user_interaction(
    state: RunLoopState,
    session: RunSession | WorkerSliceSession,
) -> AsyncIterator[dict[str, Any]]:
    has_resume = isinstance(session, WorkerSliceSession) and session._resume_payload is not None
    if not has_resume:
        yield build_event(
            event_type="run.waiting",
            run_id=state.ctx.run_id,
            session_id=state.ctx.session_id,
            message_id=state.ctx.message_id,
            step_id=f"step_{uuid4().hex[:8]}",
            sequence=state.sequence,
            payload={"reason": "waiting for user interaction"},
        )
        state.sequence += 1
    interaction = await session.wait_interaction()
    if session.aborted:
        state.terminal = True
        return
    patch = apply_interaction_to_context(
        state.ctx.context_patch if isinstance(state.ctx.context_patch, dict) else {},
        interaction,
    )
    state.ctx = state.ctx.model_copy(update={"context_patch": patch})
    if patch.get("selected_choice"):
        state.ctx = state.ctx.model_copy(update={"selected_choice": patch["selected_choice"]})
    state.transcript.append_interaction(interaction)
    interaction_summary = state.transcript.latest_interaction_summary()
    if interaction_summary:
        state.think_content = (
            f"{state.think_content}\n\n## 用户已确认\n{interaction_summary}"
        ).strip()[:6500]
    state.after_interaction = True
    yield build_event(
        event_type="interaction.accepted",
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        step_id=f"step_{uuid4().hex[:8]}",
        sequence=state.sequence,
        payload={"status": "accepted"},
    )
    state.sequence += 1
    yield build_event(
        event_type="run.resumed",
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        step_id=f"step_{uuid4().hex[:8]}",
        sequence=state.sequence,
        payload={"reason": "user interaction received"},
    )
    state.sequence += 1


def build_visible_assistant_reply(state: RunLoopState) -> str:
    """User-visible chat body when the model only used tools (no legacy output tool)."""
    patch = state.ctx.context_patch if isinstance(state.ctx.context_patch, dict) else {}
    cw = patch.get("chapter_write")
    if isinstance(cw, dict):
        # Chapter body is shown via chapter.stream / editor — never duplicate in chat.
        return ""
    for entry in reversed(state.transcript.entries):
        if entry.tool == "Write" and entry.detail and entry.detail.strip():
            return entry.detail.strip()[:6000]
        if entry.tool == "Brief" and entry.summary and entry.summary.strip():
            return entry.summary.strip()[:4000]
    return ""


async def yield_visible_assistant_message(
    state: RunLoopState,
) -> AsyncIterator[dict[str, Any]]:
    if state.assistant_message_emitted:
        return
    text = build_visible_assistant_reply(state)
    if not text:
        return
    from app.agent.harness.events import assistant_message_events

    events, seq = assistant_message_events(
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        sequence=state.sequence,
        text=text,
    )
    state.sequence = seq
    state.assistant_message_emitted = True
    for ev in events:
        yield ev


def planned_tool_visibility_events(
    ctx: AgentRunContext,
    items: list[Any],
    *,
    sequence: int,
) -> tuple[list[dict[str, Any]], int]:
    """Emit step.started + tool.started before long tool runs so the UI can shimmer early."""
    from app.agent.harness.cc_visibility import (
        is_hidden_timeline_tool,
        should_emit_tool_started,
        tool_display_name,
    )

    events: list[dict[str, Any]] = []
    seq = sequence
    for item in items:
        tool = str(getattr(item, "tool", "") or "").strip()
        if not tool or is_hidden_timeline_tool(tool):
            continue
        step_id = str(getattr(item, "tool_call_id", "") or "").strip() or f"call_{seq}"
        inp = dict(getattr(item, "input", None) or {})
        events.append(
            build_event(
                event_type="step.started",
                run_id=ctx.run_id,
                session_id=ctx.session_id,
                message_id=ctx.message_id,
                step_id=step_id,
                sequence=seq,
                payload={"tool": tool, "step_index": ctx.step_index},
            )
        )
        seq += 1
        if should_emit_tool_started(tool):
            payload: dict[str, Any] = {
                "name": tool,
                "display_name": tool_display_name(tool, inp),
            }
            if inp:
                payload["tool_input"] = inp
            events.append(
                build_event(
                    event_type="tool.started",
                    run_id=ctx.run_id,
                    session_id=ctx.session_id,
                    message_id=ctx.message_id,
                    step_id=step_id,
                    sequence=seq,
                    payload=payload,
                )
            )
            seq += 1
    return events, seq
