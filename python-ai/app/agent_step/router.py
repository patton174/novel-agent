"""FastAPI route for single agent step."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agent_step.context_enrich import enrich_context as _enrich_context
from app.agent_step.tools.sse_bridge import stream_cc_tool_step
from app.agent_step.query_loop import run_query_loop
from app.agent_step.run_session import abort_run_session, get_run_session
from app.agent_step.schemas import RunRequest, StepRequest
from app.agent_step.session_title import (
    SessionTitleRequest,
    SessionTitleResponse,
    generate_session_title,
)
from app.core.llm import llm_provider
from app.runtime.events import encode_sse
from app.runtime.host_guard import resolve_host_mode, stream_text_with_keepalive

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/agent/step")
async def agent_step(raw_request: Request):
    """Execute one agent step; returns SSE agent-event stream."""
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        body = await raw_request.json()
        req = StepRequest.model_validate(body)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    req = StepRequest(
        context=_enrich_context(req.context, refresh_story_memory=True),
        tool=req.tool,
        tool_input=req.tool_input,
    )

    logger.info(
        "agent_step run_id=%s tool=%s step_index=%s",
        req.context.run_id,
        req.tool,
        req.context.step_index,
    )

    async def event_generator():
        try:
            async for event in stream_cc_tool_step(
                req.context,
                req.tool or "Read",
                dict(req.tool_input or {}),
                sequence=0,
            ):
                yield encode_sse("agent-event", event)
        except Exception as exc:
            logger.error("agent_step stream error: %s", exc)
            yield encode_sse(
                "agent-event",
                {
                    "type": "step.failed",
                    "payload": {"error": str(exc)},
                    "run_id": req.context.run_id,
                },
            )
        yield "event: stream-end\ndata: done\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agent/run/stream")
async def agent_run_stream(raw_request: Request):
    """Agent run loop (bind_tools); returns full run SSE."""
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        body = await raw_request.json()
        req = RunRequest.model_validate(body)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    req = RunRequest(
        context=_enrich_context(req.context, refresh_story_memory=True),
    )
    logger.info(
        "agent_run_stream run_id=%s step_index=%s",
        req.context.run_id,
        req.context.step_index,
    )

    host_mode = resolve_host_mode(req.context.model_dump())

    async def event_generator():
        try:
            async for event in run_query_loop(req):
                yield encode_sse("agent-event", event)
        except Exception as exc:
            logger.error("agent_run_stream error: %s", exc)
            yield encode_sse(
                "agent-event",
                {
                    "type": "run.failed",
                    "payload": {"error": str(exc)},
                    "run_id": req.context.run_id,
                },
            )
        yield "event: stream-end\ndata: done\n\n"

    async def guarded_events():
        async for chunk in stream_text_with_keepalive(
            event_generator(),
            enabled=host_mode,
        ):
            yield chunk

    return StreamingResponse(
        guarded_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agent/run/{run_id}/interaction")
async def agent_run_interaction(run_id: str, raw_request: Request):
    """Resume query loop blocked on ask_user/choose."""
    try:
        body = await raw_request.json()
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not isinstance(body, dict):
        raise HTTPException(status_code=422, detail="body must be object")
    session = get_run_session(run_id)
    if session is None:
        raise HTTPException(status_code=404, detail="run session not found or not waiting")
    if not session.submit_interaction(body):
        raise HTTPException(status_code=409, detail="run not accepting interaction")
    return {"ok": True}


@router.post("/agent/session/title")
async def agent_session_title(body: SessionTitleRequest) -> SessionTitleResponse:
    """Generate a short Chinese title for a chat session."""
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    return await generate_session_title(body)


@router.post("/agent/run/{run_id}/abort")
async def agent_run_abort(run_id: str):
    session = get_run_session(run_id)
    if session is None:
        return {"ok": False, "reason": "not found"}
    abort_run_session(run_id)
    return {"ok": True}

