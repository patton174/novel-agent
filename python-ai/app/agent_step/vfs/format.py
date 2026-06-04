"""CC Read-style line numbering."""

from __future__ import annotations


def add_line_numbers(text: str, *, start: int = 1) -> str:
    lines = (text or "").splitlines()
    if not lines:
        return ""
    width = len(str(start + len(lines) - 1))
    out: list[str] = []
    for i, line in enumerate(lines):
        n = start + i
        out.append(f"{str(n).rjust(width)}\t{line}")
    return "\n".join(out)


FILE_UNCHANGED_STUB = (
    "File unchanged since last read. Refer to the earlier Read tool_result "
    "in this conversation instead of re-reading."
)
