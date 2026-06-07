"""Single HTML cleaning implementation for crawl AI context."""

from __future__ import annotations

import re

_SCRIPT_STYLE_PATTERNS = (
    re.compile(r"(?is)<script[^>]*>.*?</script>"),
    re.compile(r"(?is)<style[^>]*>.*?</style>"),
)


def strip_scripts_and_styles(html: str, *, max_chars: int = 22_000) -> str:
    """Remove script/style tags; preserve DOM for LLM href/body parsing."""
    text = html or ""
    for pat in _SCRIPT_STYLE_PATTERNS:
        text = pat.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:max_chars]
