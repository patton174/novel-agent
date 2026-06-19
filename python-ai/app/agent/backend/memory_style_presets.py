"""Memory node layout presets — canonical for AI prompts and frontend rendering.

See docs/TOOL_CONTRACT_AND_MEMORY_REFACTOR_PLAN.md §3
"""

from __future__ import annotations

import re
from typing import Any

# layout values must stay in sync with frontend/src/components/memory/memoryStylePresets.ts

MEMORY_LAYOUT_KEYS: tuple[str, ...] = (
    "accordion",
    "outline",
    "cards",
    "timeline",
    "hero",
    "quote",
    "prose",
)

VALID_VARIANTS: frozenset[str] = frozenset({"default", "emphasis", "muted", "quote"})

VALID_ACCENTS: frozenset[str] = frozenset(
    {"primary", "emerald", "amber", "rose", "violet", "sky"}
)

# Lucide PascalCase names — sync with frontend/src/components/memory/memoryNodeIcons.tsx
VALID_MEMORY_ICONS: frozenset[str] = frozenset(
    {
        "BookMarked",
        "BookOpen",
        "Bookmark",
        "Brain",
        "Calendar",
        "Clock",
        "Compass",
        "Contact",
        "Crown",
        "Drama",
        "Eye",
        "Feather",
        "FileText",
        "Flag",
        "Flame",
        "Folder",
        "FolderOpen",
        "Gem",
        "Globe",
        "Heart",
        "History",
        "Landmark",
        "Layers",
        "List",
        "ListTree",
        "Map",
        "MapPin",
        "PenLine",
        "Scroll",
        "ScrollText",
        "Shield",
        "Sparkles",
        "Star",
        "Sword",
        "Target",
        "User",
        "UserCircle",
        "Users",
        "Zap",
    }
)

MEMORY_LAYOUT_PRESETS: dict[str, dict[str, Any]] = {
    "accordion": {
        "layout": "accordion",
        "variant": "default",
        "collapse_default": False,
        "show_content_inline": False,
        "ai_hint": "Multi-level worldview / outline sections; collapsible hierarchy.",
    },
    "outline": {
        "layout": "outline",
        "variant": "default",
        "collapse_default": True,
        "show_content_inline": False,
        "ai_hint": "Deep nesting (depth≥2); indented outline like a table of contents.",
    },
    "cards": {
        "layout": "cards",
        "variant": "emphasis",
        "collapse_default": False,
        "show_content_inline": True,
        "ai_hint": "Sibling items at same level (characters, parallel settings).",
    },
    "timeline": {
        "layout": "timeline",
        "variant": "default",
        "collapse_default": False,
        "show_content_inline": True,
        "ai_hint": "Chronological novel outline or history sections.",
    },
    "hero": {
        "layout": "hero",
        "variant": "emphasis",
        "collapse_default": False,
        "show_content_inline": True,
        "ai_hint": "Scope root with overview content (node_kind=both).",
    },
    "quote": {
        "layout": "quote",
        "variant": "muted",
        "collapse_default": False,
        "show_content_inline": True,
        "ai_hint": "Short leaf excerpt (<400 chars), pull-quote style.",
    },
    "prose": {
        "layout": "prose",
        "variant": "default",
        "collapse_default": False,
        "show_content_inline": True,
        "ai_hint": "Default long-form Markdown leaf; omit style or use this.",
    },
}

DEFAULT_SCOPE_LAYOUT: dict[str, str] = {}

# Fields mirrored in frontend MEMORY_LAYOUT_PRESETS (see test_memory_style_presets.py)
SYNC_PRESET_FIELDS: tuple[str, ...] = (
    "layout",
    "variant",
    "collapse_default",
    "show_content_inline",
)


def preset_sync_manifest() -> list[dict[str, Any]]:
    """Export preset fields for cross-language sync tests."""
    out: list[dict[str, Any]] = []
    for key in MEMORY_LAYOUT_KEYS:
        preset = MEMORY_LAYOUT_PRESETS[key]
        out.append({field: preset.get(field) for field in SYNC_PRESET_FIELDS})
    return out


def _strip_ai_hint(preset: dict[str, Any]) -> dict[str, Any]:
    cleaned = dict(preset)
    cleaned.pop("ai_hint", None)
    return cleaned


def default_style_for_scope(
    scope: str,
    *,
    node_kind: str = "both",
    is_root: bool = False,
    depth: int = 0,
) -> dict[str, Any]:
    """Suggest style when AI omits layout on CreateMemory / UpdateMemoryFields."""
    if is_root and node_kind in ("both", "section"):
        return _strip_ai_hint(MEMORY_LAYOUT_PRESETS["hero"])
    if depth >= 2:
        return _strip_ai_hint(MEMORY_LAYOUT_PRESETS["outline"])
    s = (scope or "").strip().lower()
    key = DEFAULT_SCOPE_LAYOUT.get(s, "prose")
    return _strip_ai_hint(MEMORY_LAYOUT_PRESETS.get(key, MEMORY_LAYOUT_PRESETS["prose"]))


def _coerce_variant(raw: Any) -> str | None:
    if raw is None:
        return None
    variant = str(raw).strip().lower()
    return variant if variant in VALID_VARIANTS else "default"


def _coerce_accent(raw: Any) -> str | None:
    if raw is None:
        return None
    accent = str(raw).strip()
    if not accent:
        return None
    if accent.startswith("#") and 4 <= len(accent) <= 9:
        return accent
    lowered = accent.lower()
    return lowered if lowered in VALID_ACCENTS else None


def _to_lucide_icon_key(name: str) -> str:
    text = name.strip()
    if not text:
        return ""
    if text.isascii() and text[0].isupper() and "-" not in text and "_" not in text and " " not in text:
        return text
    parts = [p for p in re.split(r"[-_\s]+", text) if p]
    return "".join(p[:1].upper() + p[1:] for p in parts if p)


def _coerce_icon(raw: Any) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text or not text.isascii():
        return None
    key = _to_lucide_icon_key(text)
    if key in VALID_MEMORY_ICONS:
        return key
    return None


def normalize_style(
    raw: dict[str, Any] | None,
    *,
    scope: str = "",
    node_kind: str = "leaf",
    depth: int = 0,
    is_root: bool = False,
) -> dict[str, Any]:
    """Merge AI/user style JSON with preset defaults; unknown layout → prose."""
    if not isinstance(raw, dict) or not raw.get("layout"):
        base = default_style_for_scope(scope, node_kind=node_kind, is_root=is_root, depth=depth)
        if isinstance(raw, dict):
            icon = _coerce_icon(raw.get("icon"))
            if icon:
                base["icon"] = icon
            elif "icon" in raw:
                base.pop("icon", None)
        return base
    layout = str(raw.get("layout") or "prose").strip().lower()
    if layout not in MEMORY_LAYOUT_PRESETS:
        layout = "prose"
    base = _strip_ai_hint(MEMORY_LAYOUT_PRESETS[layout])
    for key, value in raw.items():
        if key == "ai_hint" or value is None:
            continue
        base[key] = value
    base["layout"] = layout
    variant = _coerce_variant(base.get("variant"))
    if variant is not None:
        base["variant"] = variant
    accent = _coerce_accent(base.get("accent"))
    if "accent" in raw:
        base["accent"] = accent
    if "icon" in raw or "icon" in base:
        icon = _coerce_icon(base.get("icon"))
        if icon:
            base["icon"] = icon
        else:
            base.pop("icon", None)
    level = base.get("level")
    if level is not None:
        try:
            base["level"] = max(0, min(8, int(level)))
        except (TypeError, ValueError):
            base.pop("level", None)
    return base


def memory_style_prompt_block() -> str:
    lines = [
        "## Memory node style presets (set on CreateMemory / UpdateMemoryFields `style` JSON)",
        "Pick `layout` from the table. Optional fields:",
        "- `variant`: default | emphasis | muted | quote",
        "- `icon`: Lucide icon name (PascalCase), rendered by frontend — no emoji. "
        f"Allowed: {', '.join(sorted(VALID_MEMORY_ICONS))}",
        "- `accent`: primary | emerald | amber | rose | violet | sky | #RRGGBB (border tint)",
        "- `collapse_default`, `show_content_inline`: bool overrides",
        "",
        "| layout | When to use |",
        "|--------|-------------|",
    ]
    for key in MEMORY_LAYOUT_KEYS:
        preset = MEMORY_LAYOUT_PRESETS[key]
        hint = str(preset.get("ai_hint") or "")
        lines.append(f"| `{key}` | {hint} |")
    lines.extend(
        [
            "",
            "Rules:",
            "- Two-level UI: scope root = left tab; children = sub-menu; one child body per panel",
            "- Put readable Markdown on **child** nodes; scope root = title + optional short intro only",
            "- Split large topics into multiple CreateMemory(node_type=child) instead of one giant root/update",
            "- section nodes: accordion or outline (depth≥2 nested sections)",
            "- leaf long Markdown: omit style or layout=prose",
            "- sibling parallel items: layout=cards, variant=emphasis",
            "- scope root (CreateMemory node_type=root): layout=hero + node_kind=both; title becomes scope tab",
            "- short leaf (<400 chars): layout=quote, variant=muted",
            "- style.icon must be a Lucide name from the allowlist (never emoji)",
            "- unknown layout values are stored as prose",
        ]
    )
    return "\n".join(lines)
