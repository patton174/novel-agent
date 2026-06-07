"""Incremental extract display.content from streaming StepResult JSON."""

from __future__ import annotations


def sanitize_stream_text(text: str) -> str:
    """Remove replacement chars from partial decode glitches."""
    return (text or "").replace("\ufffd", "")


class DisplayContentStreamParser:
    """Extract growing display.content while LLM streams partial JSON."""

    def __init__(self) -> None:
        self._buf = ""
        self._decoded_emitted = ""

    def feed(self, chunk: str) -> str:
        if not chunk:
            return ""
        self._buf += chunk
        decoded = self._extract_content_partial()
        if decoded is None:
            return ""
        decoded = sanitize_stream_text(decoded)
        if len(decoded) <= len(self._decoded_emitted):
            return ""
        delta = decoded[len(self._decoded_emitted) :]
        self._decoded_emitted = decoded
        return delta

    def _extract_content_partial(self) -> str | None:
        buf = self._strip_markdown_fence(self._buf)
        display_idx = buf.find('"display"')
        if display_idx < 0:
            return None
        content_key = buf.find('"content"', display_idx)
        if content_key < 0:
            return None
        colon = buf.find(":", content_key + len('"content"'))
        if colon < 0:
            return None
        i = colon + 1
        while i < len(buf) and buf[i] in " \t\n\r":
            i += 1
        if i >= len(buf) or buf[i] != '"':
            return None
        return self._parse_json_string(buf, i)

    def _parse_json_string(self, buf: str, start: int) -> str | None:
        if buf[start] != '"':
            return None
        i = start + 1
        out: list[str] = []
        while i < len(buf):
            c = buf[i]
            if c == '"':
                return "".join(out)
            if c == "\\":
                if i + 1 >= len(buf):
                    return "".join(out)
                n = buf[i + 1]
                mapping = {
                    "n": "\n",
                    "r": "\r",
                    "t": "\t",
                    '"': '"',
                    "\\": "\\",
                    "/": "/",
                }
                if n in mapping:
                    out.append(mapping[n])
                    i += 2
                    continue
                if n == "u":
                    if i + 5 >= len(buf):
                        return "".join(out)
                    hex_part = buf[i + 2 : i + 6]
                    if not all(c in "0123456789abcdefABCDEF" for c in hex_part):
                        out.append("\\")
                        out.append(n)
                        i += 2
                        continue
                    try:
                        out.append(chr(int(hex_part, 16)))
                    except ValueError:
                        out.append("\\")
                        out.append(n)
                    i += 6
                    continue
                out.append("\\")
                out.append(n)
                i += 2
                continue
            out.append(c)
            i += 1
        return "".join(out)

    @staticmethod
    def _strip_markdown_fence(buf: str) -> str:
        text = buf.lstrip()
        if not text.startswith("```"):
            return text
        first_nl = text.find("\n")
        if first_nl < 0:
            return text
        body = text[first_nl + 1 :]
        trimmed = body.rstrip()
        if trimmed.endswith("```"):
            body = trimmed[:-3].rstrip()
        return body

    @property
    def decoded_content(self) -> str:
        if self._decoded_emitted:
            return self._decoded_emitted
        partial = self._extract_content_partial()
        return sanitize_stream_text(partial or "")
