"""Crawl agent tool contract (aligned with agent_step AgentTool)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Generic, TypeVar

from pydantic import BaseModel

from app.crawl_agent.context import CrawlAgentContext

TIn = TypeVar("TIn", bound=BaseModel)


@dataclass
class CrawlToolResult:
    content: str
    is_error: bool = False
    end_run: bool = False
    context_patch: dict[str, Any] = field(default_factory=dict)
    count_as_failure: bool = True


@dataclass
class CrawlTool(Generic[TIn]):
    name: str
    description: str
    input_model: type[BaseModel]
    call: Callable[[CrawlAgentContext, TIn], Awaitable[CrawlToolResult]]
    max_result_chars: int = 24_000

    def parse_input(self, raw: dict[str, Any]) -> tuple[TIn | None, str | None]:
        try:
            return self.input_model.model_validate(raw or {}), None
        except Exception as exc:
            return None, str(exc)
