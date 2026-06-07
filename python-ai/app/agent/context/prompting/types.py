"""Prompt layer types — Run / Plan / Tool injection."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.agent.schemas import AgentRunContext, PlanRequest


class PromptLayer(str, Enum):
    RUN = "run"
    PLAN = "plan"
    TOOL = "tool"


class ToolPromptMode(str, Enum):
    STREAM = "stream"
    STRUCTURED = "structured"
    SUBMIT = "submit"
    PLAIN = "plain"
    ASK_USER_QUESTIONS = "ask_user_questions"


@dataclass(frozen=True)
class RetryContext:
    attempt: int
    max_attempts: int
    error_code: str
    error_detail: str
    target_schema: str = ""
    last_payload_hint: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "attempt": self.attempt,
            "max_attempts": self.max_attempts,
            "error_code": self.error_code,
            "error_detail": self.error_detail[:800],
            "target_schema": self.target_schema,
            "last_payload_hint": self.last_payload_hint[:400],
        }


@dataclass
class ToolPromptRequest:
    tool_name: str
    ctx: AgentRunContext
    tool_input: dict[str, Any] = field(default_factory=dict)
    mode: ToolPromptMode = ToolPromptMode.STRUCTURED
    visible_markdown: str = ""
    extra_system: str = ""
    include_run_context: bool = True
    include_think_summary: bool = True


@dataclass
class PlanPromptRequest:
    req: PlanRequest
    retry: RetryContext | None = None
    allowed_tools: frozenset[str] | None = None
