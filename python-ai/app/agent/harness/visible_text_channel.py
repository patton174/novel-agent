"""Polish assistant visible text for SSE / ToolMessage (no channel prefixes)."""

from __future__ import annotations


def _functional_emoji_allowlist() -> frozenset[str]:
    """Status / progress glyphs only — not decorative icons."""
    return frozenset(
        {
            "✅",
            "✔",
            "✔️",
            "☑",
            "☑️",
            "✓",
            "❌",
            "✗",
            "✘",
            "❎",
            "⚠",
            "⚠️",
            "❗",
            "❕",
            "‼",
            "⛔",
            "🚫",
            "🔴",
            "🟠",
            "🟡",
            "🟢",
            "🔵",
            "🟣",
            "⚫",
            "⚪",
            "🟤",
            "⏳",
            "🔄",
            "ℹ",
            "ℹ️",
        }
    )


def _normalize_emoji_token(token: str) -> str:
    import unicodedata

    return "".join(ch for ch in unicodedata.normalize("NFC", token) if unicodedata.category(ch) != "Mn")


def _is_allowed_functional_emoji(token: str) -> bool:
    normalized = _normalize_emoji_token(token)
    if normalized in _functional_emoji_allowlist():
        return True
    for ch in normalized:
        if ch in _functional_emoji_allowlist():
            return True
    return False


def polish_visible_text(text: str) -> str:
    """Strip decorative emoji; keep functional status/progress glyphs."""
    import re

    if not text:
        return text

    emoji_re = re.compile(
        "["
        "\U0001F300-\U0001FAFF"
        "\U00002600-\U000027BF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002700-\U000027BF"
        "\U0000FE00-\U0000FE0F"
        "\U0000200D"
        "\U0001F900-\U0001F9FF"
        "]+",
        flags=re.UNICODE,
    )

    def _replace(match: re.Match[str]) -> str:
        token = match.group(0)
        return token if _is_allowed_functional_emoji(token) else ""

    polished = emoji_re.sub(_replace, text)
    polished = re.sub(r"[ \t]+\n", "\n", polished)
    polished = re.sub(r"\n{3,}", "\n\n", polished)
    return polished


def visible_text_prompt_block() -> str:
    return """## 回复方式

- 本轮会调用工具：正文简短说明下一步即可（1–3 句）。
- 本轮不再调用工具：正文即完整回复（Markdown 表格/列表均可）。
- 需要用户确认时调用 **AskUser**；`intent.user_message` 里「问句？：答案」不算已作答，须以 RUN_CONTEXT `latest_interaction` 为准。"""
