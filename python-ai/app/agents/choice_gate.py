"""Session-level gate for interactive tools."""

from __future__ import annotations

import re
from dataclasses import dataclass
from threading import RLock
from typing import Any, Optional

_lock = RLock()
_PENDING: dict[str, dict[str, Any]] = {}


def clear_pending(session_id: str) -> None:
    if not session_id:
        return
    with _lock:
        _PENDING.pop(session_id, None)


def peek_pending(session_id: str) -> Optional[dict[str, Any]]:
    if not session_id:
        return None
    with _lock:
        row = _PENDING.get(session_id)
        return dict(row) if row else None


def set_pending(session_id: str, interaction: dict[str, Any]) -> None:
    if not session_id or not interaction:
        return
    interaction_type = str(interaction.get("type") or "").strip()
    if not interaction_type:
        return
    normalized: dict[str, Any] = {"type": interaction_type}
    for key in ("prompt", "free_text_hint", "min_select", "max_select", "allow_custom"):
        value = interaction.get(key)
        if value is not None:
            normalized[key] = value
    options = interaction.get("options")
    if isinstance(options, list):
        normalized["options"] = [
            {
                "id": str(c.get("id", "")),
                "title": str(c.get("title", "")),
                "description": str(c.get("description", "")),
            }
            for c in options
            if isinstance(c, dict) and str(c.get("title", "")).strip()
        ]
    with _lock:
        _PENDING[session_id] = normalized


def consume_pending(session_id: str) -> Optional[dict[str, Any]]:
    if not session_id:
        return None
    with _lock:
        return _PENDING.pop(session_id, None)


_CHOICE_PICK_RE = re.compile(r"我选择「([^」]+)」")
_CONFIRM_YES_RE = re.compile(r"^(确认|继续|好的|可以|是|是的|ok|yes)$", re.IGNORECASE)
_CONFIRM_NO_RE = re.compile(r"^(取消|不要|不|否|no)$", re.IGNORECASE)


def parse_choice_pick(user_message: str, choices: list[dict[str, str]]) -> Optional[dict[str, str]]:
    """Match frontend handleChoiceSelect: 我选择「标题」"""
    m = _CHOICE_PICK_RE.search(user_message.strip())
    if not m:
        return None
    title = m.group(1).strip()
    for c in choices:
        if c.get("title") == title:
            return dict(c)
    return None


def parse_interaction_submission(
    user_message: str, pending: dict[str, Any]
) -> Optional[dict[str, Any]]:
    text = (user_message or "").strip()
    if not text:
        return None
    interaction_type = str(pending.get("type") or "")
    options = pending.get("options") if isinstance(pending.get("options"), list) else []

    if interaction_type in ("single_select", "choose"):
        picked = parse_choice_pick(text, options)
        if picked:
            return {"type": "single_select", "selected": [picked]}
        return None

    if interaction_type == "multi_select":
        selected: list[dict[str, str]] = []
        for option in options:
            title = str(option.get("title", "")).strip()
            if title and title in text:
                selected.append(dict(option))
        if selected:
            return {"type": "multi_select", "selected": selected}
        return None

    if interaction_type == "confirm":
        if _CONFIRM_YES_RE.search(text):
            return {"type": "confirm", "confirmed": True}
        if _CONFIRM_NO_RE.search(text):
            return {"type": "confirm", "confirmed": False}
        return None

    if interaction_type in ("user_input", "refine"):
        return {"type": interaction_type, "input": text}

    return None


@dataclass(frozen=True)
class RouteTurn:
    """LangGraph router outcome (see novel_graph.route_user_turn)."""

    route: str  # orchestrator | submit_interaction | blocked_hint
    chosen: Optional[dict[str, Any]] = None


HINT_NEED_CHOICE = (
    "请先点击下方卡片选择一项创作方向，再继续；"
    "如需换一批方向，请用自然语言说明偏好后重新发起。"
)

HINT_NEED_INTERACTION = (
    "请先完成当前交互步骤后再继续。"
    "你可以点击卡片/按钮，或按提示输入内容。"
)
