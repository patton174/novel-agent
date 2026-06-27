"""Crew orchestration data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CrewStageDef:
    key: str
    profile_id: str
    prompt_template: str
    output_schema: str = "none"
    gate: str = "always"
    on_fail: str = "abort_with_report"


@dataclass(frozen=True)
class CrewTemplate:
    id: str
    display_name: str
    stages: list[CrewStageDef]
    description: str = ""


@dataclass
class CrewContext:
    stage_outputs: dict[str, Any] = field(default_factory=dict)
    current_stage_key: str | None = None
    template: CrewTemplate | None = None


@dataclass(frozen=True)
class CrewResult:
    handled: bool
    failed: bool
    report: str = ""
    stage_outputs: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def skipped() -> "CrewResult":
        return CrewResult(handled=False, failed=False)

    @staticmethod
    def completed(stage_outputs: dict[str, Any]) -> "CrewResult":
        return CrewResult(handled=True, failed=False, stage_outputs=dict(stage_outputs))

    @staticmethod
    def failed(report: str, stage_outputs: dict[str, Any] | None = None) -> "CrewResult":
        return CrewResult(
            handled=True,
            failed=True,
            report=(report or "crew failed").strip(),
            stage_outputs=dict(stage_outputs or {}),
        )
