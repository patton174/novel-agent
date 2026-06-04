from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_event(
    event_type: str,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    sequence: int,
    payload: dict[str, Any],
    *,
    parent_step_id: str | None = None,
    source: str = "runtime",
    persist: bool = True,
) -> dict[str, Any]:
    return {
        "event_id": f"evt_{uuid4().hex}",
        "run_id": run_id,
        "session_id": session_id,
        "message_id": message_id,
        "step_id": step_id,
        "parent_step_id": parent_step_id,
        "sequence": sequence,
        "timestamp": _utc_now(),
        "type": event_type,
        "source": source,
        "persist": persist,
        "payload": payload,
    }


def encode_sse(event_name: str, data: dict[str, Any]) -> str:
    return f"event: {event_name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
