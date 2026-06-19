"""Best-effort durable checkpoint for SSE runs."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import BaseMessage

from app.agent.backend.content_run_client import ContentRunCheckpointClient
from app.agent.harness.loop_support import RunLoopState
from app.agent.harness.run_checkpoint import serialize_run_checkpoint
from app.config import settings

logger = logging.getLogger(__name__)


async def persist_sse_checkpoint(state: RunLoopState, messages: list[BaseMessage]) -> None:
    if not settings.agent_durable_checkpoint:
        return
    run_id = str(state.ctx.run_id or "").strip()
    if not run_id:
        return
    try:
        client = ContentRunCheckpointClient()
        try:
            blob = serialize_run_checkpoint(state, messages=messages)
            await client.upsert_checkpoint(
                run_id,
                step_index=state.ctx.step_index,
                last_action="continue",
                context_patch_json=json.dumps(
                    state.ctx.context_patch or {}, ensure_ascii=False
                ),
                checkpoint_state_json=blob,
            )
        finally:
            await client.close()
    except Exception as exc:
        logger.warning("sse checkpoint persist skipped run_id=%s: %s", run_id, exc)
