"""Structured tool error protocol (AGENT_REFACTOR_PLAN P0.2).

A :class:`ToolError` carries a machine-readable ``code`` plus an optional
``hint`` / ``suggested_tools`` so the model can pick the correct next action
instead of parsing free-form English. Serialization keeps the legacy
``<tool_use_error>…</tool_use_error>`` envelope (so existing parsers and the
classifier keep working) while adding ``code``/``hint`` attributes.

Phase 0 only defines the protocol; individual tools start returning
``ToolError`` in Phase 2 behind ``settings.agent_rf_error_protocol``.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field


class ToolErrorCode:
    """Enumerated, stable tool error codes (string constants).

    Kept as plain ``str`` constants (not ``enum.Enum``) so they serialize and
    compare transparently and can be referenced from JSON fixtures / the
    failure classifier without import gymnastics.
    """

    OLD_STRING_NOT_FOUND = "OLD_STRING_NOT_FOUND"
    CHAPTER_NOT_FOUND = "CHAPTER_NOT_FOUND"
    AMBIGUOUS_TITLE = "AMBIGUOUS_TITLE"
    INDEX_OUT_OF_RANGE = "INDEX_OUT_OF_RANGE"
    MEMORY_ITEM_NOT_FOUND = "MEMORY_ITEM_NOT_FOUND"
    SCHEMA_INVALID = "SCHEMA_INVALID"
    UPSTREAM_5XX = "UPSTREAM_5XX"
    INDEXING_PENDING = "INDEXING_PENDING"
    CONFLICT = "CONFLICT"
    UNKNOWN = "UNKNOWN"

    _ALL = frozenset(
        {
            OLD_STRING_NOT_FOUND,
            CHAPTER_NOT_FOUND,
            AMBIGUOUS_TITLE,
            INDEX_OUT_OF_RANGE,
            MEMORY_ITEM_NOT_FOUND,
            SCHEMA_INVALID,
            UPSTREAM_5XX,
            INDEXING_PENDING,
            CONFLICT,
            UNKNOWN,
        }
    )

    @classmethod
    def is_known(cls, code: str) -> bool:
        return code in cls._ALL


def _attr(name: str, value: str) -> str:
    return f' {name}="{html.escape(str(value), quote=True)}"'


@dataclass
class ToolError:
    """Structured, model-facing tool failure.

    Attributes mirror AGENT_REFACTOR_PLAN §0.2:
      - ``code``: stable :class:`ToolErrorCode` value.
      - ``message``: short human-readable explanation.
      - ``hint``: optional actionable next step (e.g. ``ReadChapter(id)``).
      - ``suggested_tools``: tools that could resolve the situation.
      - ``resource``: optional structured context (ids, titles, candidates…).
      - ``retryable``: whether retrying the *same* call may succeed.
    """

    code: str = ToolErrorCode.UNKNOWN
    message: str = ""
    hint: str | None = None
    suggested_tools: list[str] = field(default_factory=list)
    resource: dict | None = None
    retryable: bool = False

    def to_tool_use_error(self) -> str:
        """Serialize to the model-facing ``<tool_use_error …>…</tool_use_error>``.

        ``code`` is always emitted; ``hint`` / ``suggested_tools`` / ``retryable``
        only when present so the envelope stays compact.
        """
        body = (self.message or "").strip() or "Unknown error"
        attrs = _attr("code", self.code or ToolErrorCode.UNKNOWN)
        if self.hint:
            attrs += _attr("hint", self.hint.strip())
        if self.suggested_tools:
            attrs += _attr("suggested_tools", ",".join(self.suggested_tools))
        if self.retryable:
            attrs += _attr("retryable", "true")
        return f"<tool_use_error{attrs}>{body}</tool_use_error>"

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "hint": self.hint,
            "suggested_tools": list(self.suggested_tools),
            "resource": self.resource,
            "retryable": self.retryable,
        }


# --- Semantic groups driving loop recovery / silent retry (P2.3) ---

# Codes the main loop can feed back via ToolMessage and let the model re-plan.
RECOVERABLE_CODES = frozenset(
    {
        ToolErrorCode.OLD_STRING_NOT_FOUND,
        ToolErrorCode.CHAPTER_NOT_FOUND,
        ToolErrorCode.AMBIGUOUS_TITLE,
        ToolErrorCode.INDEX_OUT_OF_RANGE,
        ToolErrorCode.MEMORY_ITEM_NOT_FOUND,
        ToolErrorCode.SCHEMA_INVALID,
        ToolErrorCode.CONFLICT,
        ToolErrorCode.INDEXING_PENDING,
        ToolErrorCode.UPSTREAM_5XX,
    }
)

# Input-fixable codes worth an in-tool silent LLM repair retry (re-running the
# same call after fixing arguments). Upstream/indexing/conflict are NOT here —
# repairing the input cannot help, so we surface them to the model immediately.
SILENT_REPAIRABLE_CODES = frozenset(
    {
        ToolErrorCode.SCHEMA_INVALID,
        ToolErrorCode.OLD_STRING_NOT_FOUND,
        ToolErrorCode.AMBIGUOUS_TITLE,
        ToolErrorCode.INDEX_OUT_OF_RANGE,
    }
)

_CODE_ATTR_RE = re.compile(r'<tool_use_error\b[^>]*\bcode="([^"]+)"', re.IGNORECASE)


def extract_error_code(text: str | None) -> str | None:
    """Parse the ``code="…"`` attribute from a serialized tool_use_error envelope."""
    if not text:
        return None
    m = _CODE_ATTR_RE.search(text)
    if not m:
        return None
    code = (m.group(1) or "").strip()
    return code or None


def is_recoverable_code(code: str | None) -> bool:
    return (code or "").strip() in RECOVERABLE_CODES


def is_silent_repairable_code(code: str | None) -> bool:
    return (code or "").strip() in SILENT_REPAIRABLE_CODES


def tool_error_result(error: ToolError):
    """Build a model-facing error ``ToolCallResult`` carrying the structured error."""
    from app.agent.tools.tool import ToolCallResult

    return ToolCallResult(
        content=error.to_tool_use_error(),
        is_error=True,
        error=error,
    )
