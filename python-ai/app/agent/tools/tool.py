"""CC-style AgentTool contract (mirrors claude-code-ref Tool.ts + buildTool)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from app.agent.schemas import AgentRunContext

TIn = TypeVar("TIn", bound=BaseModel)
TOut = TypeVar("TOut")


@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    message: str = ""

    @staticmethod
    def success() -> ValidationResult:
        return ValidationResult(ok=True)

    @staticmethod
    def fail(message: str) -> ValidationResult:
        return ValidationResult(ok=False, message=message)


@dataclass
class ToolCallResult:
    """Model-facing tool output (CC ``mapToolResultToToolResultBlockParam`` body).

    UI excerpts are derived later in ``events.build_tool_completed_sse_payload`` /
    ``tool_display.format_tool_display_excerpt`` — do not shorten ``content`` for SSE.
    """

    content: str
    is_error: bool = False
    context_patch: dict[str, Any] = field(default_factory=dict)
    action: str = "continue"  # continue | wait | end
    wait_for: str | None = None
    interaction: dict[str, Any] | None = None
    end_run: bool = False


@dataclass
class AgentTool(Generic[TIn, TOut]):
    name: str
    description: str
    input_model: type[BaseModel]
    call: Callable[[AgentRunContext, TIn], Awaitable[ToolCallResult]]
    is_concurrency_safe: Callable[[TIn], bool] = field(default=lambda _i: False)
    is_read_only: Callable[[TIn], bool] = field(default=lambda _i: False)
    is_destructive: Callable[[TIn], bool] = field(default=lambda _i: False)
    is_enabled: Callable[[AgentRunContext], bool] = field(default=lambda _c: True)
    always_load: bool = True
    defer_loading: bool = False
    max_result_size_chars: int = 80_000
    aliases: frozenset[str] = field(default_factory=frozenset)
    validate_input: Callable[[AgentRunContext, TIn], ValidationResult] | None = None
    user_facing_name: Callable[[TIn | None], str] | None = None
    ui_excerpt: Callable[[str, dict[str, Any]], str] | None = None

    def parse_input(self, raw: dict[str, Any]) -> tuple[TIn | None, str | None]:
        try:
            return self.input_model.model_validate(raw or {}), None
        except Exception as exc:
            return None, str(exc)

    def display_name(self, parsed: TIn | None) -> str:
        if self.user_facing_name and parsed is not None:
            return self.user_facing_name(parsed)
        return self.name


def build_tool(
    *,
    name: str,
    description: str,
    input_model: type[BaseModel],
    call: Callable[[AgentRunContext, Any], Awaitable[ToolCallResult]],
    **kwargs: Any,
) -> AgentTool:
    if kwargs.get("ui_excerpt") is None:
        from app.agent.harness.tool_ui import default_ui_excerpt_for_name

        fn = default_ui_excerpt_for_name(name)
        if fn is not None:
            kwargs = {**kwargs, "ui_excerpt": fn}
    return AgentTool(
        name=name,
        description=description,
        input_model=input_model,
        call=call,
        **kwargs,
    )
