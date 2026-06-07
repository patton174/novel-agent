"""Typed items yielded from LLM streaming strategies."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ReasoningChunk:
    text: str
