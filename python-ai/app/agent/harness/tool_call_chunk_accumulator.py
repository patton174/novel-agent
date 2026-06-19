"""Incremental tool_use detection from LLM tool_call_chunks (CC-style)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from json import JSONDecodeError
from typing import Any
from uuid import uuid4

from langchain_core.messages import AIMessageChunk


@dataclass(frozen=True)
class ReadyToolCall:
    tool_call_id: str
    tool: str
    input: dict[str, Any]
    stream_index: int


@dataclass
class _PartialCall:
    index: int
    tool_call_id: str | None = None
    tool: str | None = None
    args_buf: str = ""


@dataclass
class ToolCallChunkAccumulator:
    """Merge streaming tool_call_chunks; emit calls once name/id/args JSON are complete."""

    _partials: dict[int, _PartialCall] = field(default_factory=dict)
    _emitted_ids: set[str] = field(default_factory=set)
    _stream_order: int = 0

    @property
    def emitted_ids(self) -> set[str]:
        return set(self._emitted_ids)

    def feed(self, chunk: AIMessageChunk) -> list[ReadyToolCall]:
        ready: list[ReadyToolCall] = []
        for raw in getattr(chunk, "tool_call_chunks", None) or []:
            if not isinstance(raw, dict):
                continue
            idx = int(raw.get("index") if raw.get("index") is not None else 0)
            partial = self._partials.get(idx)
            if partial is None:
                partial = _PartialCall(index=idx)
                self._partials[idx] = partial
            name = raw.get("name")
            if isinstance(name, str) and name.strip():
                partial.tool = name.strip()
            tid = raw.get("id")
            if isinstance(tid, str) and tid.strip():
                partial.tool_call_id = tid.strip()
            args_piece = raw.get("args")
            if args_piece is not None:
                partial.args_buf += str(args_piece)
            ready.extend(self._try_emit(partial))
        return ready

    def feed_gathered_tool_calls(self, tool_calls: list[Any]) -> list[ReadyToolCall]:
        """Fallback when provider only exposes complete tool_calls on the final message."""
        ready: list[ReadyToolCall] = []
        for idx, tc in enumerate(tool_calls or []):
            if isinstance(tc, dict):
                name = str(tc.get("name") or "").strip()
                args = tc.get("args") or {}
                tid = str(tc.get("id") or "") or f"call_{uuid4().hex[:8]}"
            else:
                name = str(getattr(tc, "name", "") or "").strip()
                args = getattr(tc, "args", None) or {}
                tid = str(getattr(tc, "id", "") or "") or f"call_{uuid4().hex[:8]}"
            if not name or not isinstance(args, dict):
                continue
            if tid in self._emitted_ids:
                continue
            self._emitted_ids.add(tid)
            self._stream_order += 1
            ready.append(
                ReadyToolCall(
                    tool_call_id=tid,
                    tool=name,
                    input=dict(args),
                    stream_index=self._stream_order,
                )
            )
            _ = idx
        return ready

    def _try_emit(self, partial: _PartialCall) -> list[ReadyToolCall]:
        if not partial.tool:
            return []
        tid = (partial.tool_call_id or "").strip()
        if not tid:
            # Wait for provider tool_call id — random ids break AIMessage/ToolMessage pairing.
            return []
        if tid in self._emitted_ids:
            return []
        parsed = _parse_tool_args_json(partial.args_buf)
        if parsed is None:
            return []
        self._emitted_ids.add(tid)
        self._stream_order += 1
        return [
            ReadyToolCall(
                tool_call_id=tid,
                tool=partial.tool,
                input=parsed,
                stream_index=self._stream_order,
            )
        ]


def _parse_tool_args_json(buf: str) -> dict[str, Any] | None:
    text = (buf or "").strip()
    if not text:
        return None
    if not text.startswith("{"):
        return None
    try:
        obj, end = json.JSONDecoder().raw_decode(text)
    except JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    if end != len(text):
        return None
    return dict(obj)
