"""Shared owner Java ↔ Python SSE run stream."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.agent.context.enrich import enrich_context as _enrich_context
from app.agent.loop import run_query_loop
from app.agent.schemas import RunRequest
from app.core.llm import llm_provider
from app.runtime.events import encode_sse
from app.runtime.host_guard import resolve_host_mode, stream_text_with_keepalive

logger = logging.getLogger(__name__)

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def build_run_stream_response(req: RunRequest) -> StreamingResponse:
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    enriched = RunRequest(
        context=_enrich_context(req.context),
    )
    logger.info(
        "agent_run_stream run_id=%s step_index=%s",
        enriched.context.run_id,
        enriched.context.step_index,
    )
    host_mode = resolve_host_mode(enriched.context.model_dump())

    async def event_generator():
        try:
            async for event in run_query_loop(enriched):
                yield encode_sse("agent-event", event)
        except Exception as exc:
            logger.error("agent_run_stream error: %s", exc)
            yield encode_sse(
                "agent-event",
                {
                    "type": "run.failed",
                    "payload": {"error": str(exc)},
                    "run_id": enriched.context.run_id,
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
        headers=_SSE_HEADERS,
    )
