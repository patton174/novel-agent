"""Stream chunk partitioning (think vs public text)."""

from __future__ import annotations

_THINKING_OPEN = "<think>"
_THINKING_CLOSE = "</think>"
_THINK_TAG = "think"
_LEGACY_THINK_OPEN = f"<{_THINK_TAG}>"
_LEGACY_THINK_CLOSE = f"</{_THINK_TAG}>"


def partition_stream_chunk_stateful(
    content: str,
    *,
    emit_think: bool,
    in_think_block: bool,
) -> tuple[str | None, str | None, bool]:
    """Split stream chunk into think vs message parts; track open think blocks."""
    if not content:
        return None, None, in_think_block

    text = content
    think_parts: list[str] = []
    message_parts: list[str] = []
    i = 0
    while i < len(text):
        if in_think_block:
            close_idx = text.lower().find(_THINKING_CLOSE.lower(), i)
            legacy_close = text.lower().find(_LEGACY_THINK_CLOSE.lower(), i)
            if close_idx == -1 and legacy_close == -1:
                if emit_think:
                    think_parts.append(text[i:])
                return (
                    "".join(think_parts) if think_parts else None,
                    None,
                    True,
                )
            if close_idx == -1 or (legacy_close != -1 and legacy_close < close_idx):
                close_idx = legacy_close
                close_tag = _LEGACY_THINK_CLOSE
            else:
                close_tag = _THINKING_CLOSE
            if emit_think:
                think_parts.append(text[i:close_idx])
            i = close_idx + len(close_tag)
            in_think_block = False
            continue

        open_idx = text.lower().find(_THINKING_OPEN.lower(), i)
        legacy_open = text.lower().find(_LEGACY_THINK_OPEN.lower(), i)
        next_open = -1
        open_tag = ""
        if open_idx != -1 and (legacy_open == -1 or open_idx <= legacy_open):
            next_open = open_idx
            open_tag = _THINKING_OPEN
        elif legacy_open != -1:
            next_open = legacy_open
            open_tag = _LEGACY_THINK_OPEN

        if next_open == -1:
            message_parts.append(text[i:])
            break
        if next_open > i:
            message_parts.append(text[i:next_open])
        i = next_open + len(open_tag)
        in_think_block = True

    think = "".join(think_parts) if think_parts else None
    message = "".join(message_parts) if message_parts else None
    return think, message, in_think_block


def partition_stream_chunk(content: str, *, emit_think: bool) -> tuple[str | None, str | None]:
    think, message, _ = partition_stream_chunk_stateful(
        content, emit_think=emit_think, in_think_block=False
    )
    return think, message
