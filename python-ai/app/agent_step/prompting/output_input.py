"""Light normalization for output tool input (optional output_mode + end_run)."""

from __future__ import annotations

from typing import Any, Literal

OutputMode = Literal["progress", "complete"]


def resolve_output_mode(tool_input: dict[str, Any]) -> OutputMode | None:
    """Return progress|complete when known; None lets the stream model follow task only."""
    raw = str(tool_input.get("output_mode") or "").strip().lower()
    if raw in ("progress", "complete"):
        return raw  # type: ignore[return-value]
    end_run = tool_input.get("end_run")
    if end_run is True:
        return "complete"
    if end_run is False:
        return "progress"
    return None


def normalize_output_input(tool_input: dict[str, Any]) -> dict[str, Any]:
    """Fill missing fields; resolve obvious output_mode vs end_run conflicts (end_run wins)."""
    inp = dict(tool_input or {})
    end_run = inp.get("end_run")
    mode = resolve_output_mode(inp)

    if mode is None:
        inp.pop("output_mode", None)
        return inp

    inp["output_mode"] = mode
    if end_run is None:
        inp["end_run"] = mode == "complete"
        return inp

    if end_run is True and mode == "progress":
        inp["output_mode"] = "complete"
    elif end_run is False and mode == "complete":
        inp["output_mode"] = "progress"
    return inp
