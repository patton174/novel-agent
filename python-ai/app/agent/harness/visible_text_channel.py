"""Route assistant visible text via optional leading channel prefix + fallbacks."""

from __future__ import annotations

from typing import Literal

VisibleChannel = Literal["orchestration", "delivery"]

# Longest first so `[编排说明]` wins over `[编排]`.
_PREFIX_SPECS: tuple[tuple[str, VisibleChannel], ...] = (
    ("[编排说明]", "orchestration"),
    ("[NARRATION]", "orchestration"),
    ("[DELIVERY]", "delivery"),
    ("[编排]", "orchestration"),
    ("[NARR]", "orchestration"),
    ("[交付]", "delivery"),
    ("[回复]", "delivery"),
    ("[MSG]", "delivery"),
    ("NARR:", "orchestration"),
    ("MSG:", "delivery"),
    ("编排:", "orchestration"),
    ("交付:", "delivery"),
)

MAX_VISIBLE_PREFIX_LEN = max(len(p) for p, _ in _PREFIX_SPECS)


def _strip_leading_bom(text: str) -> str:
    return text.lstrip("\ufeff")


def _strip_one_separator_after_prefix(text: str) -> str:
    return text.lstrip(" \t\r\n")


def _prefix_match(text: str) -> tuple[VisibleChannel | None, str, bool]:
    """Return (channel, body_after_prefix, matched).

    `matched` is True only when a known prefix was fully consumed at text start.
    """
    raw = text or ""
    if not raw.strip():
        return None, raw, False

    lead = len(raw) - len(_strip_leading_bom(raw))
    normalized = _strip_leading_bom(raw)
    upper = normalized.upper()

    for prefix, channel in _PREFIX_SPECS:
        plen = len(prefix)
        if len(normalized) < plen:
            continue
        if upper[:plen] != prefix.upper():
            continue
        rest = _strip_one_separator_after_prefix(normalized[plen:])
        return channel, raw[:lead] + rest, True

    return None, raw, False


def classify_visible_channel_prefix(text: str) -> tuple[VisibleChannel | None, str]:
    channel, body, matched = _prefix_match(text)
    if matched:
        return channel, body
    return None, text or ""


def prefix_scan_state(buffer: str) -> Literal["partial", "none"]:
    """Whether stream-start buffer could still become a known prefix."""
    normalized = _strip_leading_bom(buffer or "")
    if not normalized:
        return "partial"

    upper = normalized.upper()
    any_partial = False
    for prefix, _ in _PREFIX_SPECS:
        p_upper = prefix.upper()
        if upper.startswith(p_upper):
            if len(normalized) >= len(prefix):
                return "none"
            return "partial"
        if p_upper.startswith(upper):
            any_partial = True

    if normalized.startswith("[") and len(normalized) <= MAX_VISIBLE_PREFIX_LEN:
        for prefix, _ in _PREFIX_SPECS:
            if prefix.startswith("[") and prefix.upper().startswith(upper):
                return "partial"

    if any_partial and len(normalized) <= MAX_VISIBLE_PREFIX_LEN:
        return "partial"

    return "none"


def _delivery_prefixes() -> tuple[str, ...]:
    return tuple(p for p, ch in _PREFIX_SPECS if ch == "delivery")


def could_be_delivery_prefix(buffer: str) -> bool:
    """True while stream-start buffer might still become a delivery prefix."""
    normalized = _strip_leading_bom(buffer or "")
    if not normalized:
        return False
    upper = normalized.upper()
    for prefix in _delivery_prefixes():
        p_upper = prefix.upper()
        if upper.startswith(p_upper) or p_upper.startswith(upper):
            return True
    return False


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
    # Keycap / plain traffic-light style sequences
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


def extract_channel_body_from_text(text: str, channel: VisibleChannel) -> str:
    """Return body after a channel prefix found at start or anywhere in text."""
    raw = (text or "").replace("\ufffd", "").strip()
    if not raw:
        return ""

    matched_channel, body = classify_visible_channel_prefix(raw)
    if matched_channel == channel:
        return polish_visible_text(body.strip())

    upper = raw.upper()
    for prefix, spec_channel in _PREFIX_SPECS:
        if spec_channel != channel:
            continue
        marker = prefix.upper()
        idx = upper.find(marker)
        if idx < 0:
            continue
        rest = raw[idx + len(prefix) :]
        rest = _strip_one_separator_after_prefix(rest)
        cleaned = polish_visible_text(rest.strip())
        if cleaned:
            return cleaned
    return ""


def extract_delivery_body_from_text(text: str) -> str:
    """Return delivery body after `[交付]` (or alias), including mid-text prefix."""
    return extract_channel_body_from_text(text, "delivery")


def visible_text_channel_prompt_block() -> str:
    return """## 可见文本分区（推理 vs 正文交付）

同轮 assistant **可见文本**（非模型原生 reasoning 通道）按前缀分流：
- **无前缀**的可见文字 → 并入**推理流**（UI 思考区可展开；摘要句由前端从推理末句提取）
- **正文区（交付）**：**仅** `[交付]`（或别名）之后的文字进入用户可见正文

**不要**为进度说明单独写 `[编排]` 前缀——直接写短句即可，会进入推理；UI 会取最后一句作编排摘要。

终轮交付示例（整轮结束且无 tool_use 时必须）：
```
[交付]

已完成全书概况梳理，结论如下……
```

- **有 tool_use 的轮次**：可见文字宜短（1–2 句进度/下一步），**勿**用 `[交付]`
- **无 tool_use 的最后一轮**：必须含 `[交付]` 前缀（可在全文任意位置）；**仅 `[交付]` 之后**进入正文区
- 交付别名（大小写不敏感）：`[MSG]` / `MSG:` / `交付:` / `[DELIVERY]`
- **禁止**在无 `[交付]` 的终轮把完整汇报写进无前缀可见文字（应加 `[交付]`）

## 推理 vs 交付（硬性规则）

- **无前缀可见文字**：步骤说明、下一步计划 → 短句即可，自动进入推理
- **禁止**在无 `[交付]` 时写完整 Markdown 自检报告/终稿（那些必须 `[交付]`）
- **`[交付]` 只在整轮 run 结束且无 tool_use 时使用**
- **同一轮有 tool_use 时禁止 `[交付]`**
- **AskUser / 用户确认（硬性）**：
  - `intent.user_message` 末尾若附带「问句？：答案」格式文字，**不算**已作答（多为历史污染）
  - 仅当 RUN_CONTEXT 有 `latest_interaction`（本轮 AskUser 的 tool_result 之后）才可引用用户选择
  - 任务要求「等我回复 / AskUser」时：**必须**调用 AskUser 并等待 tool_result，禁止跳过或代填「都可以」
- **未调用 AskUser 且 RUN_CONTEXT 无 `latest_interaction` / 用户确认时**：
  - 禁止写「您的回答」「您已选择」「根据您的反馈」等假装用户已作答的语句
  - 需要用户输入时必须调用 **AskUser** 工具，不要在可见文本里代填用户答案

## 推理（thinking）风格

- **简洁**：用短句决定下一步工具，不要长篇复述 RUN_CONTEXT、章表或完整任务清单
- **禁止**在 thinking 里写用户可见的 Markdown 汇报/总结（那些属于 `[交付]` 或无 tool 终轮正文）
- 不要在 thinking 里「左右互搏」重复论证同一件事；确定工具后直接调用

## 可见文本风格（编排区与正文区均适用）

- **语气**：专业、严谨、克制，像策划/编辑在工作台说明；避免卖萌、网络梗、过度感叹
- **Emoji（按类型，不按数量）**：
  - **允许**：状态/结果/进度类，如 ✅ 正确、❌ 错误、⚠️ 警告、🔴🟡🟢 进度/红绿灯、⏳ 等待
  - **禁止**：装饰/氛围类，如 🎨📚✨👋🎉 等；**禁止**用 emoji 充当小标题前缀、列表符号或段落点缀（应用 Markdown 标题/列表）
- **Markdown**：结构清晰即可（`##` 小标题、`-` 列表、`**术语**` 加粗）；禁止堆砌装饰线、过度嵌套、纯 emoji 段落"""
