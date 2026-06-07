"""Worker HTTP request/response models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from app.agent.schemas import AgentRunContext


class WorkerExecuteRequest(BaseModel):
    run_id: str
    action: Literal["start", "resume"] = "start"
    worker_id: str = "python-worker"
    command_id: str | None = None
    context: AgentRunContext | None = None
    resume_interaction: dict[str, Any] | None = None


class WorkerExecuteResponse(BaseModel):
    run_id: str
    status: Literal["waiting_user", "running", "completed", "failed", "skipped"]
    events_appended: int = 0
    message: str = ""
