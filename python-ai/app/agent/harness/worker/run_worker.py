"""Execute one worker slice for a distributed run."""

from __future__ import annotations

import json
import logging
import socket
import uuid
from typing import Any

from app.agent.harness.run_session import WorkerSliceSession
from app.agent.harness.worker.checkpoint import restore_worker_state, serialize_worker_state
from app.agent.harness.worker.content_client import ContentRunClient
from app.agent.harness.worker.exceptions import WorkerSliceWaiting
from app.agent.harness.worker.schemas import WorkerExecuteRequest, WorkerExecuteResponse
from app.agent.loop import run_query_loop
from app.agent.schemas import RunRequest
from app.config import settings

logger = logging.getLogger(__name__)


def _build_terminal_event(state, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    from app.runtime.events import build_event

    return build_event(
        event_type=event_type,
        run_id=state.ctx.run_id,
        session_id=state.ctx.session_id,
        message_id=state.ctx.message_id,
        step_id=f"step_{uuid.uuid4().hex[:8]}",
        sequence=state.sequence,
        payload=payload,
    )


def _worker_id(explicit: str | None) -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    if settings.worker_id.strip():
        return settings.worker_id.strip()
    return socket.gethostname()


async def execute_worker_slice(req: WorkerExecuteRequest) -> WorkerExecuteResponse:
    run_id = req.run_id
    worker_id = _worker_id(req.worker_id)
    client = ContentRunClient()
    leased = False
    try:
        lease = await client.try_lease(run_id, worker_id)
        if not lease.get("acquired"):
            return WorkerExecuteResponse(
                run_id=run_id,
                status="skipped",
                message=str(lease.get("message") or "lease not acquired"),
            )
        leased = True

        if req.context is None:
            return WorkerExecuteResponse(
                run_id=run_id,
                status="failed",
                message="context required for worker execute",
            )
        if req.action == "resume" and req.resume_interaction is None:
            return WorkerExecuteResponse(
                run_id=run_id,
                status="failed",
                message="resume requires resume_interaction payload",
            )

        base_ctx = req.context
        checkpoint = await client.get_checkpoint(run_id)
        context_patch: dict[str, Any] = {}
        worker_blob = None
        if checkpoint:
            worker_blob = checkpoint.get("transcriptRef") or checkpoint.get("transcript_ref")
            patch_raw = checkpoint.get("contextPatchJson") or checkpoint.get("context_patch_json") or "{}"
            try:
                context_patch = json.loads(patch_raw) if isinstance(patch_raw, str) else dict(patch_raw or {})
            except json.JSONDecodeError:
                context_patch = {}
        if context_patch:
            merged_patch = dict(base_ctx.context_patch or {})
            merged_patch.update(context_patch)
            base_ctx = base_ctx.model_copy(update={"context_patch": merged_patch})

        initial_state = restore_worker_state(worker_blob, base_ctx)
        session = WorkerSliceSession(run_id, resume_payload=req.resume_interaction)
        run_req = RunRequest(context=initial_state.ctx)
        events: list[dict[str, Any]] = []
        terminal_status = "running"

        try:
            async for event in run_query_loop(
                run_req,
                worker_mode=True,
                worker_session=session,
                initial_state=initial_state,
            ):
                events.append(event)
                if str(event.get("type") or "") == "run.failed":
                    terminal_status = "failed"
        except WorkerSliceWaiting:
            terminal_status = "waiting_user"

        if terminal_status == "running":
            if initial_state.terminal:
                terminal_status = "completed"
            elif initial_state.last_run_error:
                terminal_status = "failed"

        if terminal_status == "completed":
            events.append(
                _build_terminal_event(initial_state, "run.completed", {"status": "completed"})
            )
        elif terminal_status == "failed":
            events.append(
                _build_terminal_event(
                    initial_state,
                    "run.failed",
                    {"error": initial_state.last_run_error or "worker slice failed"},
                )
            )

        appended = 0
        for event in events:
            await client.append_event(
                run_id,
                event_id=str(event.get("event_id") or f"evt_{uuid.uuid4().hex}"),
                event_type=str(event.get("type") or "agent.event"),
                payload=event,
            )
            appended += 1

        if terminal_status == "waiting_user":
            await client.upsert_checkpoint(
                run_id,
                step_index=initial_state.ctx.step_index,
                last_action="wait",
                context_patch_json=json.dumps(initial_state.ctx.context_patch or {}, ensure_ascii=False),
                worker_state_json=serialize_worker_state(initial_state),
            )
            await client.transition(run_id, "WAITING_USER")
        elif terminal_status == "completed":
            await client.transition(run_id, "COMPLETED")
        elif terminal_status == "failed":
            await client.transition(
                run_id,
                "FAILED",
                initial_state.last_run_error or "worker slice failed",
            )
        else:
            await client.upsert_checkpoint(
                run_id,
                step_index=initial_state.ctx.step_index,
                last_action="continue",
                context_patch_json=json.dumps(initial_state.ctx.context_patch or {}, ensure_ascii=False),
                worker_state_json=serialize_worker_state(initial_state),
            )

        return WorkerExecuteResponse(
            run_id=run_id,
            status=terminal_status,  # type: ignore[arg-type]
            events_appended=appended,
        )
    except Exception as exc:
        logger.exception("worker execute failed run_id=%s", run_id)
        try:
            await client.transition(run_id, "FAILED", str(exc))
        except Exception:
            pass
        return WorkerExecuteResponse(
            run_id=run_id,
            status="failed",
            message=str(exc),
        )
    finally:
        if leased:
            await client.release_lease(run_id, worker_id)
        await client.close()
