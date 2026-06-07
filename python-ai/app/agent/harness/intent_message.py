"""Split user task text from embedded Q&A lines that must not count as AskUser answers."""

from __future__ import annotations

import re

# Trailing lines like "请问如何续写？：都可以" (question + answer on one line).
_EMBEDDED_QA_LINE = re.compile(r"^.+[？?].*[：:]\s*\S", re.UNICODE)


def split_embedded_qa_from_user_message(raw: str) -> tuple[str, list[str]]:
    """Return (task_text, stripped_qa_lines).

    Session persistence sometimes appends AskUser-style ``问：答`` lines to the
    stored user message. Those must not satisfy an AskUser step unless the run
    transcript records a real interaction.
    """
    text = (raw or "").strip()
    if not text:
        return "", []

    parts = text.split("\n\n")
    stripped: list[str] = []
    while parts:
        last = parts[-1].strip()
        if not last:
            parts.pop()
            continue
        lines = [ln.strip() for ln in last.split("\n") if ln.strip()]
        if lines and all(_EMBEDDED_QA_LINE.match(ln) for ln in lines):
            stripped[:0] = lines
            parts.pop()
            continue
        break

    task = "\n\n".join(parts).strip()
    return task, stripped


def intent_user_message_for_context(
    raw: str,
    *,
    has_run_interaction: bool = False,
) -> str:
    task, embedded = split_embedded_qa_from_user_message(raw)
    if not embedded or has_run_interaction:
        return (raw or "").strip()
    return task or (raw or "").strip()
