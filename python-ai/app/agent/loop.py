"""Agent run loop — bind_tools, tool partition, parallel read / serial write."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.backend.memory_catalog import refresh_memory_tree_index_patch
from app.agent.context.compact import apply_chapter_tool_patch_to_ctx
from app.agent.context.compact_autocompact import autocompact_conversation
from app.agent.context.compact_micro import microcompact_messages
from app.agent.context.enrich import (
    bootstrap_run_context,
    enrich_context as _enrich_context,
    enrich_context_for_run,
)
from app.agent.context.memory_log import build_memory_write_batch_ack
from app.agent.context.meter import measure_agent_context
from app.agent.context.policy import (
    should_autocompact_context,
    should_microcompact_context,
)
from app.agent.context.relevance import inject_relevant_context
from app.agent.context.usage import (
    build_context_usage_event,
    should_compress_context,
)
from app.agent.harness.checkpoint_persist import persist_sse_checkpoint
from app.agent.harness.events import _tool_input_for_sse
from app.agent.harness.llm_trace import extract_cache_usage
from app.agent.harness.loop_support import (
    _MAX_LLM_PAIRING_RETRIES_PER_TURN,
    _MAX_PARAM_REPAIR_ROUNDS,
    _MAX_TOOL_RECOVERIES_PER_TURN,
    _MAX_VALIDATION_RETRIES_PER_TURN,
    RunLoopState,
    block_run_end_for_open_todos,
    build_todo_reminder_message,
    planned_tool_visibility_events,
    planning_title,
    should_inject_todo_reminder,
    stream_tool_step,
    tool_batch_end_run,
    wait_for_user_interaction,
    yield_pause_checkpoint,
    yield_visible_assistant_message,
)
from app.agent.harness.main_loop_llm import stream_bind_tools_turn
from app.agent.harness.message_history import (
    build_run_context_human,
    filter_ai_message_tool_calls,
    is_tool_pairing_llm_error,
    prune_message_tail,
    refresh_run_context_human,
    repair_tool_message_pairing,
    seal_tool_results_for_last_assistant,
)
from app.core.llm_content import sanitize_ai_message_for_history
from app.agent.harness.orchestration_contract import (
    PLAN_MAX_TOOL_CALLS,
    QUERY_LOOP_INTERACTION_TOOLS,
    blocking_resolved_plan_violations,
    build_main_loop_system_prompt,
    get_main_loop_tools,
    normalize_tool_calls,
    validate_plan_batch,
)
from app.agent.harness.review_agent import (
    build_review_subagent_run_context_human,
    build_review_subagent_system_prompt,
    is_review_agent,
    mark_batch_needs_review,
    record_chapter_mutation,
)
from app.agent.harness.review_agent_sse import stream_review_subagent
from app.agent.harness.run_session import (
    RunSession,
    register_run_session,
    unregister_run_session,
)
from app.agent.harness.subagent import (
    build_subagent_run_context_human,
    build_subagent_system_prompt,
)
from app.agent.harness.subagent_policy import is_subagent_run
from app.agent.harness.tool_batch_errors import (
    append_batch_validation_errors,
    append_per_tool_validation_errors,
    append_unknown_tool_errors,
)
from app.agent.harness.turn_tool_batch import TurnToolBatchState
from app.agent.harness.tool_errors import format_input_validation_error
from app.agent.harness.tool_execution import (
    classify_tool_step_failure,
    is_recoverable_tool_execution_failure,
)
from app.agent.harness.tool_orchestration import ToolExecutionItem, partition_tool_calls
from app.agent.harness.tool_prepare import prepare_execution_batch
from app.agent.tools.streaming_executor import StreamingToolExecutor
from app.agent.harness.tool_result_routing import tool_message_text
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext, PlanRequest, PlanToolCall, RunRequest
from app.agent.tools.langchain_bind import build_agent_langchain_tools
from app.core.llm import llm_provider
from app.core.llm_cache import cached_system_message
from app.runtime.events import build_event

logger = logging.getLogger(__name__)

_MAX_TURNS = 48
_MEMORY_WRITE_TOOLS = frozenset(
    {
        "CreateMemory",
        "UpdateMemoryFields",
        "UpdateMemoryContent",
        "UpdateMemoryMeta",
        "MoveMemory",
        "DeleteMemory",
    }
)


@dataclass(frozen=True)
class _AiToolCall:
    tool_call_id: str
    call: PlanToolCall


def _tool_calls_from_ai(message: AIMessage) -> list[_AiToolCall]:
    out: list[_AiToolCall] = []
    for tc in message.tool_calls or []:
        if isinstance(tc, dict):
            name = str(tc.get("name") or "").strip()
            args = tc.get("args") or {}
            tid = str(tc.get("id") or "") or str(uuid4())
        else:
            name = str(getattr(tc, "name", "") or "").strip()
            args = getattr(tc, "args", None) or {}
            tid = str(getattr(tc, "id", "") or "") or str(uuid4())
        if not name:
            continue
        if not isinstance(args, dict):
            args = {}
        out.append(_AiToolCall(tool_call_id=tid, call=PlanToolCall(tool=name, input=dict(args))))
    return out


def _planning_failed_event(state: RunLoopState, step_id: str, error: str) -> dict[str, Any]:
    ev = build_event(
        event_type="planning.failed",
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        step_id=step_id,
        sequence=state.sequence,
        payload={"error": error},
    )
    state.sequence += 1
    return ev


def _format_tool_result_text(tool: str, text: str, *, is_error: bool = False) -> str:
    body = (text or "").strip() or ("ok" if not is_error else f"{tool} failed")
    if is_error:
        if "<tool_use_error>" in body:
            return body
        return format_input_validation_error(body)
    return body[:120_000]


def _context_request(state: RunLoopState) -> PlanRequest:
    return PlanRequest(
        context=state.ctx,
        think_content=state.transcript.latest_think_text() or state.think_content,
        think_tool_input={"topic": state.ctx.user_message},
        transcript=state.transcript.format_for_plan(),
    )


async def _try_autocompact(
    state: RunLoopState,
    messages: list,
) -> dict[str, Any] | None:
    """Run LLM autocompact once per turn when at compress threshold."""
    if state.autocompacted_turn == state.turn:
        return None
    measure = measure_agent_context(
        messages, req=_context_request(state), source="estimate"
    )
    if not should_autocompact_context(measure):
        return None
    ac = await autocompact_conversation(
        messages,
        state.transcript,
        trigger="auto",
        run_usage=state.run_usage,
    )
    if not ac.changed:
        if ac.error:
            logger.warning(
                "autocompact skipped run_id=%s error=%s",
                state.ctx.run_id,
                ac.error,
            )
        return None
    state.autocompacted_turn = state.turn
    repaired, _ = repair_tool_message_pairing(messages)
    messages[:] = repaired
    refresh_run_context_human(messages, state.ctx, state.transcript)
    note = (
        f"已自动压缩会话（{ac.pre_tokens}→{ac.post_tokens} tokens，"
        f"移除 {ac.messages_removed} 条消息）"
    )
    return build_event(
        event_type="context.compacted",
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        step_id=f"step_ctx_{uuid4().hex[:8]}",
        sequence=state.sequence,
        payload={
            "mode": "autocompact",
            "message": note,
            "pre_tokens": ac.pre_tokens,
            "post_tokens": ac.post_tokens,
            "messages_removed": ac.messages_removed,
            "summary_chars": ac.summary_chars,
            "compaction_input_tokens": ac.compaction_input_tokens,
            "compaction_output_tokens": ac.compaction_output_tokens,
        },
    )


def _yield_context_usage(
    state: RunLoopState,
    messages: list,
    *,
    source: str,
    compressed: bool = False,
    compact_note: str = "",
    last_compact_mode: str = "",
) -> dict[str, Any]:
    measure = measure_agent_context(
        messages, req=_context_request(state), source=source
    )
    ev, state.sequence = build_context_usage_event(
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        sequence=state.sequence,
        prompt_measure=measure,
        run_usage=state.run_usage,
        turn=state.turn,
        compressed=compressed,
        compact_note=compact_note,
        last_compact_mode=last_compact_mode,
        resolved_model=state.ctx.resolved_model,
    )
    return ev


def _fresh_run_context(ctx: AgentRunContext) -> AgentRunContext:
    """Strip stale ask_user residue from prior runs so a new run cannot hallucinate answers."""
    patch = dict(ctx.context_patch) if isinstance(ctx.context_patch, dict) else {}
    patch.pop("user_interactions", None)
    patch.pop("run_needs_review", None)
    patch.pop("run_changed_chapter_ids", None)
    return ctx.model_copy(update={"context_patch": patch, "selected_choice": None})


def _max_turns_for_ctx(ctx: AgentRunContext) -> int:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    raw = patch.get("_max_turns")
    if raw is not None:
        try:
            return max(1, min(int(raw), _MAX_TURNS))
        except (TypeError, ValueError):
            pass
    return _MAX_TURNS


def _build_messages(ctx: AgentRunContext, transcript: AgentTranscript) -> list:
    if is_subagent_run(ctx):
        if is_review_agent(ctx):
            system = build_review_subagent_system_prompt()
            human = build_review_subagent_run_context_human(ctx, transcript)
        else:
            system = build_subagent_system_prompt()
            human = build_subagent_run_context_human(ctx, transcript)
    else:
        system = build_main_loop_system_prompt()
        human = build_run_context_human(ctx, transcript)
    return [cached_system_message(system), HumanMessage(content=human)]


def tool_batch_end_run_for_loop(
    tool: str, tool_input: dict[str, Any], step_result
) -> bool:
    return tool_batch_end_run(tool, tool_input, step_result)


def should_end_run_after_batch(
    *,
    waited: bool,
    batch_end_run: bool,
    batch_had_terminal: bool = False,
    continue_plan: bool = False,
) -> bool:
    """Tests / legacy helpers; main loop uses explicit flags instead of continue_plan."""
    if waited:
        return False
    if batch_end_run:
        return True
    if not continue_plan:
        return True
    return batch_had_terminal


# Backward-compatible aliases for tests
_tool_batch_end_run = tool_batch_end_run_for_loop
_should_end_run_after_batch = should_end_run_after_batch


async def run_query_loop(
    req: RunRequest,
) -> AsyncIterator[dict[str, Any]]:
    base_ctx = _enrich_context(req.context)
    base_ctx = await bootstrap_run_context(base_ctx)
    base_ctx = await inject_relevant_context(base_ctx)
    base_ctx = _fresh_run_context(base_ctx)
    state = RunLoopState(
        ctx=base_ctx,
        transcript=AgentTranscript(),
        think_content="",
        sequence=0,
    )
    session = register_run_session(state.ctx.run_id)
    if state.messages:
        messages, _ = repair_tool_message_pairing(list(state.messages))
    else:
        messages = _build_messages(state.ctx, state.transcript)

    llm = (
        llm_provider.get_llm(profile="default", config=base_ctx.resolved_model).bind_tools(
            build_agent_langchain_tools(state.ctx)
        )
        if base_ctx.resolved_model
        else llm_provider.get_llm(profile="default").bind_tools(
            build_agent_langchain_tools(state.ctx)
        )
    )

    turn_limit = _max_turns_for_ctx(state.ctx)
    pause_announced = [False]
    try:
        while state.turn < turn_limit and not state.terminal:
            async for ev in yield_pause_checkpoint(state, session, pause_announced=pause_announced):
                yield ev
            if session.aborted:
                state.terminal = True
                break

            state.turn += 1
            state.turns_since_todo_write += 1
            step_id = f"step_turn_{uuid4().hex[:8]}"

            refresh_run_context_human(messages, state.ctx, state.transcript)

            if should_inject_todo_reminder(state):
                patch = (
                    state.ctx.context_patch
                    if isinstance(state.ctx.context_patch, dict)
                    else {}
                )
                reminder = build_todo_reminder_message(patch)
                if reminder:
                    messages.append(HumanMessage(content=reminder))
                    state.last_todo_reminder_turn = state.turn
                    refresh_run_context_human(messages, state.ctx, state.transcript)

            yield build_event(
                event_type="planning.next_step",
                run_id=state.ctx.run_id,
                session_id=state.ctx.session_id,
                message_id=state.ctx.message_id,
                step_id=step_id,
                sequence=state.sequence,
                payload={"title": "执行中…", "message": "模型选择工具…"},
            )
            state.sequence += 1

            refresh_run_context_human(messages, state.ctx, state.transcript)
            yield _yield_context_usage(state, messages, source="estimate")

            pruned = prune_message_tail(messages)
            if pruned:
                yield build_event(
                    event_type="context.compacted",
                    run_id=state.ctx.run_id,
                    session_id=state.ctx.session_id,
                    message_id=state.ctx.message_id,
                    step_id=f"step_ctx_{uuid4().hex[:8]}",
                    sequence=state.sequence,
                    payload={
                        "removed_messages": pruned,
                        "mode": "message_tail",
                        "message": f"已裁剪 {pruned} 条历史消息",
                    },
                )
                state.sequence += 1
                yield _yield_context_usage(
                    state,
                    messages,
                    source="estimate",
                    compressed=True,
                    compact_note=f"已裁剪 {pruned} 条历史消息",
                    last_compact_mode="message_tail",
                )

            repaired_msgs, pairing_repaired = repair_tool_message_pairing(messages)
            messages[:] = repaired_msgs
            if pairing_repaired:
                yield build_event(
                    event_type="context.compacted",
                    run_id=state.ctx.run_id,
                    session_id=state.ctx.session_id,
                    message_id=state.ctx.message_id,
                    step_id=f"step_ctx_{uuid4().hex[:8]}",
                    sequence=state.sequence,
                    payload={
                        "removed_messages": 0,
                        "mode": "tool_pairing_repair",
                        "message": "已修复工具调用配对",
                    },
                )
                state.sequence += 1
                yield _yield_context_usage(
                    state,
                    messages,
                    source="estimate",
                    compressed=True,
                    compact_note="已修复工具调用配对",
                    last_compact_mode="tool_pairing_repair",
                )

            pre_llm_measure = measure_agent_context(
                messages, req=_context_request(state), source="estimate"
            )
            if should_microcompact_context(pre_llm_measure):
                mc = microcompact_messages(messages)
                if mc.changed:
                    note = (
                        f"已微压缩 {mc.cleared_count} 个旧工具结果"
                        f"（约节省 {mc.tokens_saved} tokens，保留最近 {mc.kept_recent} 个）"
                    )
                    yield build_event(
                        event_type="context.compacted",
                        run_id=state.ctx.run_id,
                        session_id=state.ctx.session_id,
                        message_id=state.ctx.message_id,
                        step_id=f"step_ctx_{uuid4().hex[:8]}",
                        sequence=state.sequence,
                        payload={
                            "mode": "microcompact",
                            "message": note,
                            "cleared_tools": mc.cleared_count,
                            "tokens_saved": mc.tokens_saved,
                            "compacted_tool_ids": mc.compacted_tool_ids[:32],
                        },
                    )
                    state.sequence += 1
                    yield _yield_context_usage(
                        state,
                        messages,
                        source="estimate",
                        compressed=True,
                        compact_note=note,
                        last_compact_mode="microcompact",
                    )

            ac_ev = await _try_autocompact(state, messages)
            if ac_ev:
                yield ac_ev
                state.sequence += 1
                ac_payload = (
                    ac_ev.get("payload") if isinstance(ac_ev.get("payload"), dict) else {}
                )
                yield _yield_context_usage(
                    state,
                    messages,
                    source="estimate",
                    compressed=True,
                    compact_note=str(ac_payload.get("message") or ""),
                    last_compact_mode="autocompact",
                )

            yield build_event(
                event_type="planning.invoking",
                run_id=state.ctx.run_id,
                session_id=state.ctx.session_id,
                message_id=state.ctx.message_id,
                step_id=step_id,
                sequence=state.sequence,
                payload={"title": "调用模型…"},
            )
            state.sequence += 1

            ai_msg: AIMessage | None = None
            llm_pairing_retries = 0
            stream_executor: StreamingToolExecutor | None = None
            turn_batch = TurnToolBatchState()

            def _discard_stream_executor() -> None:
                if stream_executor is None:
                    return
                if stream_executor.has_completed:
                    stream_executor.discard_pending()
                else:
                    stream_executor.discard()

            while True:
                try:
                    stream_executor = StreamingToolExecutor(
                        state.ctx,
                        stream_tool_step,
                        sequence=state.sequence,
                    )
                    async for item in stream_bind_tools_turn(
                        llm,
                        messages,
                        ctx=state.ctx,
                        planning_step_id=step_id,
                        sequence=state.sequence,
                    ):
                        if isinstance(item, AIMessage):
                            ai_msg = item
                            continue
                        if isinstance(item, dict):
                            et = str(item.get("type") or "")
                            if et == "tool.use.invalid":
                                payload = item.get("payload")
                                if isinstance(payload, dict):
                                    turn_batch.record_invalid(
                                        str(payload.get("tool_call_id") or ""),
                                        str(payload.get("tool") or ""),
                                        dict(payload.get("input") or {}),
                                        str(payload.get("error") or "invalid input"),
                                    )
                                continue
                            if et == "tool.use.ready":
                                payload = item.get("payload")
                                if isinstance(payload, dict):
                                    tool_name = str(payload.get("tool") or "").strip()
                                    if tool_name:
                                        ready_tid = str(
                                            payload.get("tool_call_id")
                                            or f"call_{uuid4().hex[:8]}"
                                        )
                                        ready_input = dict(payload.get("input") or {})
                                        turn_batch.record_ready(
                                            ready_tid, tool_name, ready_input
                                        )
                                        ready_item = ToolExecutionItem(
                                            tool_call_id=ready_tid,
                                            tool=tool_name,
                                            input=ready_input,
                                            call_order=int(
                                                payload.get("stream_index") or 0
                                            ),
                                        )
                                        await stream_executor.submit(ready_item)
                                        async for kind, ev_payload in (
                                            stream_executor.drain_available()
                                        ):
                                            if kind != "event":
                                                continue
                                            if isinstance(ev_payload, dict) and ev_payload.get(
                                                "type"
                                            ) in (
                                                "message.delta",
                                                "message.started",
                                                "message.completed",
                                            ):
                                                state.assistant_message_emitted = True
                                            yield ev_payload
                                            state.sequence = max(
                                                state.sequence,
                                                int(ev_payload.get("sequence") or 0) + 1,
                                            )
                                continue
                            if et in (
                                "message.delta",
                                "message.started",
                                "message.completed",
                            ):
                                state.assistant_message_emitted = True
                        yield item
                        if isinstance(item, dict):
                            state.sequence = max(
                                state.sequence, int(item.get("sequence") or 0) + 1
                            )
                    break
                except Exception as exc:
                    if (
                        is_tool_pairing_llm_error(exc)
                        and llm_pairing_retries < _MAX_LLM_PAIRING_RETRIES_PER_TURN
                    ):
                        llm_pairing_retries += 1
                        logger.warning(
                            "LLM tool pairing error run_id=%s retry=%s: %s",
                            state.ctx.run_id,
                            llm_pairing_retries,
                            exc,
                        )
                        fixed, _ = repair_tool_message_pairing(messages)
                        messages[:] = fixed
                        messages.append(
                            HumanMessage(
                                content=(
                                    "上一条请求因 tool_use 与 tool_result 不匹配被 API 拒绝。"
                                    "已修复对话历史，请根据 RUN_CONTEXT 与已有工具结果继续，"
                                    "不要重复已成功完成的工具调用。"
                                )
                            )
                        )
                        yield build_event(
                            event_type="planning.invoking",
                            run_id=state.ctx.run_id,
                            session_id=state.ctx.session_id,
                            message_id=state.ctx.message_id,
                            step_id=step_id,
                            sequence=state.sequence,
                            payload={
                                "title": "修复工具配对后重试…",
                                "retry": llm_pairing_retries,
                            },
                        )
                        state.sequence += 1
                        ai_msg = None
                        _discard_stream_executor()
                        continue
                    logger.exception(
                        "agent loop LLM failed run_id=%s", state.ctx.run_id
                    )
                    state.last_run_error = str(exc)
                    yield build_event(
                        event_type="planning.failed",
                        run_id=state.ctx.run_id,
                        session_id=state.ctx.session_id,
                        message_id=state.ctx.message_id,
                        step_id=step_id,
                        sequence=state.sequence,
                        payload={"error": str(exc)},
                    )
                    state.sequence += 1
                    state.terminal = True
                    break
            if state.terminal:
                break

            if ai_msg is None:
                ai_msg = AIMessage(content="")

            preview_calls = _tool_calls_from_ai(ai_msg)
            ai_calls = preview_calls

            if not preview_calls:
                messages.append(sanitize_ai_message_for_history(ai_msg))
                state.run_usage.add_llm_usage(extract_cache_usage(ai_msg))
                yield _yield_context_usage(state, messages, source="api")
                valid_calls, invalid_entries = [], []
            else:
                valid_calls, invalid_entries = turn_batch.reconcile(ai_calls, state.ctx)
                responded_ids = {
                    c.tool_call_id for c in valid_calls
                } | {e.tool_call_id for e in invalid_entries}
                messages.append(
                    sanitize_ai_message_for_history(
                        filter_ai_message_tool_calls(ai_msg, responded_ids)
                    )
                )
                state.run_usage.add_llm_usage(extract_cache_usage(ai_msg))
                yield _yield_context_usage(state, messages, source="api")
                if invalid_entries:
                    append_per_tool_validation_errors(messages, invalid_entries)

            prompt_measure = measure_agent_context(
                messages, req=_context_request(state), source="api"
            )

            if invalid_entries and not valid_calls and not (
                stream_executor and stream_executor.has_completed
            ):
                state.param_repair_rounds += 1
                if state.param_repair_rounds >= _MAX_PARAM_REPAIR_ROUNDS:
                    detail = "; ".join(e.error for e in invalid_entries[:3])
                    state.last_run_error = detail
                    state.terminal = True
                    yield _planning_failed_event(state, step_id, detail)
                    break
                yield build_event(
                    event_type="planning.invoking",
                    run_id=state.ctx.run_id,
                    session_id=state.ctx.session_id,
                    message_id=state.ctx.message_id,
                    step_id=step_id,
                    sequence=state.sequence,
                    payload={
                        "title": "修正工具参数…",
                        "repair_round": state.param_repair_rounds,
                    },
                )
                state.sequence += 1
                _discard_stream_executor()
                continue

            working_calls = valid_calls if invalid_entries else ai_calls
            pending_invalid: list = []

            def _append_pending_invalid() -> None:
                nonlocal pending_invalid
                if pending_invalid:
                    append_per_tool_validation_errors(messages, pending_invalid)
                    pending_invalid = []

            if not working_calls:
                from app.agent.harness.events import assistant_message_events
                from app.core.llm_content import extract_llm_text

                visible = extract_llm_text(ai_msg.content, include_thinking=False).strip()
                if visible and not state.assistant_message_emitted:
                    msg_events, state.sequence = assistant_message_events(
                        run_id=state.ctx.run_id,
                        session_id=state.ctx.session_id,
                        message_id=state.ctx.message_id,
                        sequence=state.sequence,
                        text=visible,
                    )
                    state.assistant_message_emitted = True
                    for ev in msg_events:
                        yield ev
                if block_run_end_for_open_todos(
                    state,
                    messages,
                    refresh_context=refresh_run_context_human,
                ):
                    continue
                state.terminal = True
                yield build_event(
                    event_type="planning.completed",
                    run_id=state.ctx.run_id,
                    session_id=state.ctx.session_id,
                    message_id=state.ctx.message_id,
                    step_id=step_id,
                    sequence=state.sequence,
                    payload={"next_tool": "end", "title": "", "reason": "no tool_use"},
                )
                state.sequence += 1
                break

            calls = normalize_tool_calls([c.call for c in working_calls])
            tool_ids = [c.tool_call_id for c in working_calls]

            def _validation_retry(detail: str) -> bool:
                state.validation_retries += 1
                append_batch_validation_errors(messages, tool_ids, detail)
                if state.validation_retries >= _MAX_VALIDATION_RETRIES_PER_TURN:
                    state.last_run_error = detail
                    state.terminal = True
                    return False
                return True

            if len(calls) > PLAN_MAX_TOOL_CALLS:
                detail = f"too many tools ({len(calls)}); max {PLAN_MAX_TOOL_CALLS}"
                if not _validation_retry(detail):
                    yield _planning_failed_event(state, step_id, detail)
                    break
                _append_pending_invalid()
                _discard_stream_executor()
                continue

            allowed = get_main_loop_tools(state.ctx)
            if any(c.call.tool not in allowed for c in working_calls):
                append_unknown_tool_errors(messages, working_calls, allowed_tools=allowed)
                state.validation_retries += 1
                if state.validation_retries >= _MAX_VALIDATION_RETRIES_PER_TURN:
                    detail = "unknown tool in batch"
                    state.last_run_error = detail
                    state.terminal = True
                    yield _planning_failed_event(state, step_id, detail)
                    break
                _append_pending_invalid()
                _discard_stream_executor()
                continue

            violations = validate_plan_batch(calls, resolved=False, ctx=state.ctx)
            if violations:
                detail = "; ".join(v.message for v in violations[:6])
                if not _validation_retry(detail):
                    yield _planning_failed_event(state, step_id, detail)
                    break
                _append_pending_invalid()
                _discard_stream_executor()
                continue

            think_text = state.transcript.latest_think_text() or state.think_content
            prepared = prepare_execution_batch(
                state.ctx, working_calls, think_text=think_text
            )
            if prepared.end_run:
                if block_run_end_for_open_todos(
                    state,
                    messages,
                    refresh_context=refresh_run_context_human,
                ):
                    continue
                state.terminal = True
                yield build_event(
                    event_type="planning.completed",
                    run_id=state.ctx.run_id,
                    session_id=state.ctx.session_id,
                    message_id=state.ctx.message_id,
                    step_id=step_id,
                    sequence=state.sequence,
                    payload={
                        "next_tool": "end",
                        "title": "",
                        "reason": prepared.reason or "end_run",
                    },
                )
                state.sequence += 1
                break

            enriched = prepared.calls
            if not enriched:
                if not _validation_retry("empty tool batch"):
                    yield _planning_failed_event(state, step_id, "empty tool batch")
                    break
                _append_pending_invalid()
                _discard_stream_executor()
                continue

            resolved_violations = blocking_resolved_plan_violations(enriched, ctx=state.ctx)
            if resolved_violations:
                detail = "; ".join(v.message for v in resolved_violations[:6])
                if not _validation_retry(detail):
                    yield _planning_failed_event(state, step_id, detail)
                    break
                _append_pending_invalid()
                _discard_stream_executor()
                continue

            if not invalid_entries:
                state.param_repair_rounds = 0
            state.validation_retries = 0
            state.tool_recoveries = 0

            exec_items = prepared.items

            state.transcript.append_plan(
                f"tool_use x{len(exec_items)}",
                [i.tool for i in exec_items],
            )

            yield build_event(
                event_type="planning.completed",
                run_id=state.ctx.run_id,
                session_id=state.ctx.session_id,
                message_id=state.ctx.message_id,
                step_id=step_id,
                sequence=state.sequence,
                payload={
                    "next_tool": exec_items[-1].tool if exec_items else "end",
                    "title": planning_title(
                        exec_items[-1].tool if exec_items else "",
                        after_interaction=state.after_interaction,
                    ),
                    "reason": "tool_use",
                    "tool_calls": [
                        {
                            "tool": i.tool,
                            "input": _tool_input_for_sse(i.tool, dict(i.input or {})),
                            "tool_call_id": i.tool_call_id,
                        }
                        for i in exec_items
                    ],
                    "partition": [
                        {
                            "parallel": b.concurrency_safe and len(b.items) > 1,
                            "tools": [i.tool for i in b.items],
                        }
                        for b in partition_tool_calls(exec_items)
                    ],
                },
            )
            state.sequence += 1
            state.after_interaction = False

            vis_events, state.sequence = planned_tool_visibility_events(
                state.ctx,
                exec_items,
                sequence=state.sequence,
            )
            for vis_ev in vis_events:
                yield vis_ev
            await asyncio.sleep(0)

            waited = False
            batch_tool_recover = False
            turn_recoverable_failure = False
            turn_fatal_failure = False
            batches = partition_tool_calls(exec_items)

            if stream_executor is None:
                stream_executor = StreamingToolExecutor(
                    state.ctx,
                    stream_tool_step,
                    sequence=state.sequence,
                )
            stream_executor.sync_call_orders(exec_items)
            for item in exec_items:
                if item.tool_call_id not in stream_executor.submitted_ids:
                    await stream_executor.submit(item)
            await stream_executor.finish_submitting()

            pending_tool_messages: list[tuple[int, ToolMessage]] = []

            async for kind, payload in stream_executor.iter_combined():
                if kind == "ctx":
                    state.ctx = payload
                    continue

                if kind == "event":
                    ev = payload
                    if isinstance(ev, dict) and ev.get("type"):
                        if ev.get("type") in {
                            "message.delta",
                            "message.started",
                            "message.completed",
                        }:
                            state.assistant_message_emitted = True
                        yield ev
                        state.sequence = max(
                            state.sequence, int(ev.get("sequence") or 0) + 1
                        )
                    continue

                runs = payload
                if not isinstance(runs, list):
                    continue

                for run in runs:
                    tool = run.item.tool
                    if run.failed:
                        pending_tool_messages.append(
                            (
                                run.item.call_order,
                                ToolMessage(
                                    content=_format_tool_result_text(
                                        tool, run.error, is_error=True
                                    ),
                                    tool_call_id=run.item.tool_call_id,
                                ),
                            )
                        )
                        _fail, err_code, err_detail = classify_tool_step_failure(
                            tool,
                            run.result,
                            executor_failed=run.result is None,
                            executor_error=run.error,
                        )
                        if _fail and is_recoverable_tool_execution_failure(err_code):
                            # P2.3: 即便已做过静默重试，最终仍失败也必须进 turn 恢复
                            # （旧逻辑 silent_retry>0 时既不恢复也不致命 → 失败被吞）。
                            turn_recoverable_failure = True
                            state.last_run_error = err_detail or run.error
                        elif _fail:
                            turn_fatal_failure = True
                            state.last_run_error = run.error
                        continue

                    display_content = (
                        str(run.result.display.content)
                        if run.result and run.result.display and run.result.display.content
                        else None
                    )
                    pending_tool_messages.append(
                        (
                            run.item.call_order,
                            ToolMessage(
                                content=_format_tool_result_text(
                                    tool,
                                    tool_message_text(
                                        message_output=run.message_output or "",
                                        step_result_display_content=display_content,
                                        step_result_reason=(
                                            run.result.reason if run.result else None
                                        ),
                                    ),
                                ),
                                tool_call_id=run.item.tool_call_id,
                            ),
                        )
                    )

                    if tool == "think" and run.result:
                        summary = str((run.result.context_patch or {}).get("think_summary") or "")
                        if summary:
                            state.think_content = summary[:6000]
                            state.transcript.append_think(summary)

                    if run.result:
                        state.transcript.append_tool_result(
                            tool,
                            run.result,
                            output_text=tool_message_text(
                                message_output=run.message_output or "",
                                step_result_display_content=display_content,
                                step_result_reason=(
                                    run.result.reason if run.result else None
                                ),
                            ),
                        )
                        patch = run.result.context_patch
                        if isinstance(patch, dict):
                            state.ctx = apply_chapter_tool_patch_to_ctx(state.ctx, patch)
                            merged_patch = dict(state.ctx.context_patch or {})
                            merged_patch.update(patch)
                            if tool == "TodoWrite" and patch.get("todos"):
                                merged_patch.pop("_todo_exit_reviewed", None)
                                state.turns_since_todo_write = 0
                            state.ctx = state.ctx.model_copy(
                                update={"context_patch": merged_patch}
                            )
                            state.ctx = record_chapter_mutation(state.ctx, tool, patch)
                            if tool in ("Agent", "ReorderChapters") and not run.failed:
                                state.ctx = mark_batch_needs_review(state.ctx)
                            fresh = patch.get("chapters")
                            if isinstance(fresh, list):
                                state.ctx = state.ctx.model_copy(
                                    update={"chapters": fresh}
                                )
                        _CHAPTER_WRITE_TOOLS = frozenset(
                            {
                                "WriteChapter",
                                "EditChapter",
                                "DeleteChapter",
                                "ReorderChapters",
                            }
                        )
                        catalog_stale = isinstance(patch, dict) and bool(
                            patch.get("catalog_stale")
                        )
                        refresh_chapters = (
                            tool in _CHAPTER_WRITE_TOOLS
                            or tool == "ReorderChapters"
                            or catalog_stale
                        )
                        state.ctx = await enrich_context_for_run(
                            state.ctx,
                            refresh_chapters=refresh_chapters,
                        )

                    if (
                        run.result
                        and run.result.action == "wait"
                        and tool in QUERY_LOOP_INTERACTION_TOOLS
                    ):
                        async for ev in wait_for_user_interaction(state, session):
                            yield ev
                        if state.terminal:
                            return
                        waited = True
                        note = state.transcript.latest_interaction_summary()
                        if note:
                            messages.append(
                                HumanMessage(
                                    content=f"用户已回复：\n{note[:3000]}\n请继续调用工具。"
                                )
                            )
                        break

                if waited:
                    break

            if pending_tool_messages:
                for _, tool_msg in sorted(
                    pending_tool_messages, key=lambda pair: pair[0]
                ):
                    messages.append(tool_msg)
            seal_tool_results_for_last_assistant(messages)

            if any(i.tool in _MEMORY_WRITE_TOOLS for i in exec_items):
                merged_patch = dict(state.ctx.context_patch or {})
                merged_patch.update(refresh_memory_tree_index_patch(state.ctx))
                state.ctx = state.ctx.model_copy(update={"context_patch": merged_patch})
                refresh_run_context_human(messages, state.ctx, state.transcript)
                batch_ack = build_memory_write_batch_ack(state.ctx, min_entries=1)
                if batch_ack:
                    messages.append(HumanMessage(content=batch_ack))
                    refresh_run_context_human(messages, state.ctx, state.transcript)

            if turn_recoverable_failure:
                state.tool_recoveries += 1
                if state.tool_recoveries >= _MAX_TOOL_RECOVERIES_PER_TURN:
                    state.terminal = True
                else:
                    batch_tool_recover = True
            elif turn_fatal_failure:
                state.terminal = True

            patch = state.ctx.context_patch if isinstance(state.ctx.context_patch, dict) else {}
            failures = patch.get("chapter_persist_failures")
            if isinstance(failures, list) and failures:
                lines: list[str] = []
                for item in failures:
                    if not isinstance(item, dict):
                        continue
                    label = str(
                        item.get("display_label") or item.get("title") or "章节"
                    ).strip()
                    err = str(item.get("error") or "unknown").strip()
                    lines.append(f"- {label}：{err[:400]}")
                if lines:
                    messages.append(
                        HumanMessage(
                            content=(
                                "以下章节未能写入作品库（标题与作品列表排序可能不一致），"
                                "请根据错误修正 chapter_id，或查看 RUN_CONTEXT "
                                "novel.chapter_catalog / memory.memory_index（Content API 真值；"
                                "勿臆造 chapter_id）：\n"
                                + "\n".join(lines)
                            )
                        )
                    )

            if pending_invalid:
                _append_pending_invalid()
                state.param_repair_rounds += 1
                if state.param_repair_rounds >= _MAX_PARAM_REPAIR_ROUNDS:
                    detail = "parameter repair exhausted"
                    state.last_run_error = detail
                    state.terminal = True
                    yield _planning_failed_event(state, step_id, detail)
                    break
                yield build_event(
                    event_type="planning.invoking",
                    run_id=state.ctx.run_id,
                    session_id=state.ctx.session_id,
                    message_id=state.ctx.message_id,
                    step_id=step_id,
                    sequence=state.sequence,
                    payload={
                        "title": "修正工具参数…",
                        "repair_round": state.param_repair_rounds,
                    },
                )
                state.sequence += 1
                _discard_stream_executor()
                continue

            if batch_tool_recover:
                continue
            if state.terminal:
                break

            patch = state.ctx.context_patch if isinstance(state.ctx.context_patch, dict) else {}
            if patch.get("run_needs_review") and not is_subagent_run(state.ctx):
                state.ctx = await refresh_chapters_from_content_api(state.ctx)
                changed = patch.get("run_changed_chapter_ids")
                changed_ids = (
                    [str(c) for c in changed if str(c).strip()]
                    if isinstance(changed, list)
                    else None
                )
                review_summary = ""
                review_patch: dict[str, Any] = {}
                try:
                    async for review_ev in stream_review_subagent(
                        state.ctx,
                        changed_chapter_ids=changed_ids,
                        sequence=state.sequence,
                    ):
                        yield review_ev
                        state.sequence = int(review_ev.get("sequence") or state.sequence) + 1
                        et = str(review_ev.get("type") or "")
                        pl = (
                            review_ev.get("payload")
                            if isinstance(review_ev.get("payload"), dict)
                            else {}
                        )
                        if et == "subagent.completed":
                            review_summary = str(pl.get("summary_preview") or "").strip()
                            cp = pl.get("context_patch")
                            if isinstance(cp, dict):
                                review_patch = cp
                        elif et == "subagent.failed":
                            review_summary = str(pl.get("error") or "").strip()
                            cp = pl.get("context_patch")
                            if isinstance(cp, dict):
                                review_patch = cp
                    if review_summary:
                        messages.append(
                            HumanMessage(
                                content=(
                                    "【审查 Agent 报告】\n"
                                    + review_summary[:12000]
                                )
                            )
                        )
                    if review_patch:
                        merged = dict(state.ctx.context_patch or {})
                        merged.update(review_patch)
                        state.ctx = state.ctx.model_copy(
                            update={"context_patch": merged}
                        )
                    refresh_run_context_human(messages, state.ctx, state.transcript)
                except Exception:
                    logger.exception(
                        "review agent failed run_id=%s", state.ctx.run_id
                    )

            if waited:
                continue

            state.messages = list(messages)
            await persist_sse_checkpoint(state, messages)

            if should_compress_context(int(prompt_measure.get("prompt_tokens") or 0)):
                compacted = False
                if should_autocompact_context(prompt_measure):
                    ac_ev = await _try_autocompact(state, messages)
                    if ac_ev:
                        yield ac_ev
                        state.sequence += 1
                        payload = ac_ev.get("payload") if isinstance(ac_ev.get("payload"), dict) else {}
                        yield _yield_context_usage(
                            state,
                            messages,
                            source="estimate",
                            compressed=True,
                            compact_note=str(payload.get("message") or ""),
                            last_compact_mode="autocompact",
                        )
                        compacted = True
                if not compacted:
                    removed = state.transcript.compact(max_entries=20, max_chars=6500)
                    if removed:
                        refresh_run_context_human(messages, state.ctx, state.transcript)
                        note = f"已压缩 transcript（移除 {removed} 条）"
                        yield build_event(
                            event_type="context.compacted",
                            run_id=state.ctx.run_id,
                            session_id=state.ctx.session_id,
                            message_id=state.ctx.message_id,
                            step_id=f"step_ctx_{uuid4().hex[:8]}",
                            sequence=state.sequence,
                            payload={
                                "removed_entries": removed,
                                "mode": "transcript",
                                "message": note,
                            },
                        )
                        state.sequence += 1
                        yield _yield_context_usage(
                            state,
                            messages,
                            source="estimate",
                            compressed=True,
                            compact_note=note,
                            last_compact_mode="transcript",
                        )

        if not state.last_run_error and not state.assistant_message_emitted:
            async for ev in yield_visible_assistant_message(state):
                yield ev

        if state.last_run_error:
            yield build_event(
                event_type="run.failed",
                run_id=state.ctx.run_id,
                session_id=state.ctx.session_id,
                message_id=state.ctx.message_id,
                step_id=f"step_{state.ctx.run_id}",
                sequence=state.sequence,
                payload={"error": state.last_run_error},
            )
    finally:
        state.messages = list(messages)
        session.abort()
        unregister_run_session(state.ctx.run_id)
