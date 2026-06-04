"""Split streamed LLM chunks into model reasoning vs user-visible text."""

from __future__ import annotations

from typing import Any

from app.core.llm_content import extract_llm_text
from app.runtime.stream_partition import partition_stream_chunk_stateful


class LlmChunkSplitter:
    """Stateful splitter for astream chunks (Anthropic blocks or tag-wrapped text)."""

    def __init__(self, *, emit_reasoning: bool) -> None:
        self.emit_reasoning = emit_reasoning
        self._in_tag_block = False

    def feed(self, raw: Any) -> list[tuple[str, str]]:
        """Return list of (kind, text) where kind is 'reasoning' or 'text'."""
        if raw is None:
            return []

        if isinstance(raw, list):
            out: list[tuple[str, str]] = []
            for item in raw:
                if isinstance(item, str):
                    out.extend(self.feed(item))
                    continue
                if not isinstance(item, dict):
                    continue
                block_type = str(item.get("type") or "").lower()
                if block_type in {"thinking", "redacted_thinking"}:
                    if not self.emit_reasoning:
                        continue
                    text = item.get("thinking") or item.get("text")
                    if text:
                        out.append(("reasoning", str(text)))
                    continue
                if block_type in {"text", "output_text"} or "text" in item:
                    text = item.get("text")
                    if text:
                        out.append(("text", str(text)))
            return out

        if isinstance(raw, str):
            if self.emit_reasoning:
                reasoning, text, self._in_tag_block = partition_stream_chunk_stateful(
                    raw,
                    emit_think=True,
                    in_think_block=self._in_tag_block,
                )
                out: list[tuple[str, str]] = []
                if reasoning:
                    out.append(("reasoning", reasoning))
                if text:
                    out.append(("text", text))
                return out
            visible = extract_llm_text(raw, include_thinking=False)
            return [("text", visible)] if visible else []

        visible = extract_llm_text(raw, include_thinking=False)
        return [("text", visible)] if visible else []
