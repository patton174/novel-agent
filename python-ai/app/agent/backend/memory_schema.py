"""Per-scope story-memory JSON rules (v1 envelope)."""

from __future__ import annotations

import re
from typing import Any

# envelope
MEMORY_DOC_VERSION = 1
MAX_TITLE_LEN = 40
MAX_SUMMARY_LEN = 200
MAX_KEY_LEN = 16
MAX_VALUE_LEN = 16_000

KEY_PATTERN = re.compile(r"^[\u4e00-\u9fa5A-Za-z0-9_\-]{1,16}$")

FLAT_SCOPES = frozenset({"novel", "world", "background"})
GROUP_SCOPES = frozenset({"character", "chapter"})

BODY_ALIASES = frozenset({"body", "content", "正文"})

# 角色库：必填键（data 内扁平键值，值用 Markdown 字符串）
CHARACTER_REQUIRED_DATA_KEYS = ("身份", "性格")
CHARACTER_RECOMMENDED_KEYS = (
    "外貌",
    "能力",
    "能力体系",
    "核心动机",
    "立场",
    "剧情价值",
    "隐藏秘密",
)

# 章节记忆：必填一条正文摘要
CHAPTER_REQUIRED_DATA_KEYS: tuple[str, ...] = ("摘要",)

# 大纲 / 背景：与世界观相同，正文用 data.body（Markdown）
FLAT_REQUIRED_BODY = True


def memory_schema_prompt_lines() -> list[str]:
    return [
        "记忆 Write 必须使用 v1 JSON 信封："
        '{"v":1,"title":"…","summary":"…","data":{…}}。',
        "角色库 character：data 为扁平键值；必填键「身份」「性格」；"
        "键名 1–16 字（中文/字母/数字/_/-），值用 Markdown 字符串（勿嵌套 JSON 对象）。",
        "可增任意合规键值扩展字段。",
        "世界观 world / 背景 background / 大纲 novel：data.body 必填（Markdown 正文）；"
        "summary 可选；除 body 外可少量扩展键值。",
        "章节记忆 chapter：路径 …/memory/chapter/{chapter_id}.json（UUID，见 chapter_catalog）；"
        "data 扁平键值；必填「摘要」（Markdown）；可扩展「伏笔」「约束」等。",
        "禁止把逐章摘要写入 novel/大纲路径（…/memory/novel/…）。",
    ]


def schema_example_for_scope(scope: str) -> str:
    s = (scope or "").strip().lower()
    if s == "character":
        return (
            '{"v":1,"title":"唐云","summary":"男主",'
            '"data":{"身份":"散修","性格":"冷静","外貌":"……"}}'
        )
    if s == "chapter":
        return (
            '{"v":1,"title":"第3章","summary":"",'
            '"data":{"摘要":"本章剧情…","伏笔":"…"}}'
        )
    return (
        '{"v":1,"title":"势力体系","summary":"可选短摘要",'
        '"data":{"body":"## 设定\\n正文 Markdown…"}}'
    )


def _normalize_key(key: str) -> str:
    return str(key or "").strip()


def _validate_key_name(key: str, *, label: str = "data key") -> str:
    k = _normalize_key(key)
    if not k:
        raise ValueError(f"{label} must be non-empty")
    if len(k) > MAX_KEY_LEN:
        raise ValueError(f"{label} too long (max {MAX_KEY_LEN}): {k!r}")
    if not KEY_PATTERN.match(k):
        raise ValueError(
            f"{label} invalid {k!r}: use 1–16 chars (中文/字母/数字/_/- only)"
        )
    return k


def _validate_markdown_value(value: Any, *, label: str) -> str:
    if value is None:
        raise ValueError(f"{label} must be a non-empty string (Markdown)")
    if isinstance(value, (dict, list)):
        raise ValueError(f"{label} must be Markdown string, not nested JSON")
    text = str(value).strip()
    if not text:
        raise ValueError(f"{label} must be non-empty")
    if len(text) > MAX_VALUE_LEN:
        raise ValueError(f"{label} too long (max {MAX_VALUE_LEN} chars)")
    return text


def _flatten_card_into_data(data: dict[str, Any]) -> dict[str, str]:
    """Merge legacy data.card / data.人物卡 object into flat string fields."""
    out: dict[str, str] = {}
    card = data.get("card")
    if card is None:
        card = data.get("人物卡")
    if isinstance(card, dict):
        for ck, cv in card.items():
            key = _validate_key_name(str(ck), label="card key")
            out[key] = _validate_markdown_value(cv, label=f"card.{key}")
    elif card is not None:
        out["人物卡"] = _validate_markdown_value(card, label="人物卡")

    for raw_key, raw_val in data.items():
        if raw_key in ("card", "人物卡", "summary"):
            continue
        if raw_key in BODY_ALIASES:
            continue
        key = _validate_key_name(str(raw_key))
        if key in out:
            continue
        out[key] = _validate_markdown_value(raw_val, label=key)
    return out


def _extract_body(data: dict[str, Any]) -> str:
    for alias in BODY_ALIASES:
        if alias in data and str(data.get(alias) or "").strip():
            return _validate_markdown_value(data[alias], label="data.body")
    return ""


def _validate_flat_data(data: dict[str, Any], *, scope: str) -> dict[str, str]:
    if not isinstance(data, dict):
        raise ValueError("data must be object")
    body = _extract_body(data)
    if not body:
        raise ValueError(
            f'{scope}: data.body required (Markdown string). '
            f'Example: "data":{{"body":"## 标题\\n正文…"}}'
        )
    out: dict[str, str] = {"body": body}
    for raw_key, raw_val in data.items():
        if raw_key in BODY_ALIASES or raw_key == "summary":
            continue
        key = _validate_key_name(str(raw_key))
        if key in out:
            continue
        out[key] = _validate_markdown_value(raw_val, label=key)
    return out


def _validate_character_data(data: dict[str, Any]) -> dict[str, str]:
    if not isinstance(data, dict):
        raise ValueError("data must be object")
    flat = _flatten_card_into_data(data)
    missing = [k for k in CHARACTER_REQUIRED_DATA_KEYS if not flat.get(k)]
    if missing:
        raise ValueError(
            "character data missing required keys: "
            + "、".join(missing)
            + f" (required: {'、'.join(CHARACTER_REQUIRED_DATA_KEYS)})"
        )
    return flat


def _validate_chapter_data(data: dict[str, Any]) -> dict[str, str]:
    if not isinstance(data, dict):
        raise ValueError("data must be object")
    flat = _flatten_card_into_data(data)
    missing = [k for k in CHAPTER_REQUIRED_DATA_KEYS if not flat.get(k)]
    if missing:
        raise ValueError(
            "chapter data missing required keys: "
            + "、".join(missing)
        )
    body = _extract_body(data)
    if body:
        flat["正文"] = body
    return flat


def validate_and_normalize_envelope(
    raw: dict[str, Any],
    *,
    scope: str,
    entry_id: str,
) -> dict[str, Any]:
    scope_norm = (scope or "").strip().lower()
    title = str(raw.get("title") or entry_id or "").strip() or entry_id
    if len(title) > MAX_TITLE_LEN:
        raise ValueError(f"title too long (max {MAX_TITLE_LEN})")
    summary = str(raw.get("summary") or "").strip()
    if len(summary) > MAX_SUMMARY_LEN:
        raise ValueError(f"summary too long (max {MAX_SUMMARY_LEN})")

    data_raw = raw.get("data")
    if not isinstance(data_raw, dict):
        raise ValueError('memory document requires "data" object')

    if scope_norm == "character":
        data_norm = _validate_character_data(data_raw)
    elif scope_norm == "chapter":
        data_norm = _validate_chapter_data(data_raw)
    elif scope_norm in FLAT_SCOPES:
        data_norm = _validate_flat_data(data_raw, scope=scope_norm)
    else:
        raise ValueError(f"unsupported memory scope: {scope_norm}")

    # Rebuild data dict for storage layer (body + flat fields)
    data_out: dict[str, Any] = dict(data_norm)
    if scope_norm in FLAT_SCOPES and "body" in data_out:
        body = data_out.pop("body")
        data_out = {"body": body, **data_out}

    return {
        "v": MEMORY_DOC_VERSION,
        "title": title,
        "summary": summary,
        "data": data_out,
    }
