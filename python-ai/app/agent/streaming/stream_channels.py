"""CC-style stream channels: visible text vs model reasoning vs structured submit."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

StreamChannel = Literal["think", "reasoning", "message", "chapter"]


@dataclass(frozen=True, slots=True)
class LlmStreamPart:
    """One incremental piece routed to think.delta, reasoning.delta, or message.delta."""

    channel: StreamChannel
    text: str


@dataclass(frozen=True, slots=True)
class ThinkStreamEnd:
    """Visible think stream finished; structured submit may still run."""
