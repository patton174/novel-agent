"""Tests for memory layout presets (AI + frontend sync)."""

from pathlib import Path

from app.agent.backend.memory_style_presets import (
    DEFAULT_SCOPE_LAYOUT,
    MEMORY_LAYOUT_KEYS,
    MEMORY_LAYOUT_PRESETS,
    SYNC_PRESET_FIELDS,
    VALID_MEMORY_ICONS,
    default_style_for_scope,
    memory_style_prompt_block,
    normalize_style,
    preset_sync_manifest,
)

# Mirror frontend presetSyncManifest() — update both when presets change.
FRONTEND_SYNC_MANIFEST = [
    {
        "layout": "accordion",
        "variant": "default",
        "collapse_default": False,
        "show_content_inline": False,
    },
    {
        "layout": "outline",
        "variant": "default",
        "collapse_default": True,
        "show_content_inline": False,
    },
    {
        "layout": "cards",
        "variant": "emphasis",
        "collapse_default": False,
        "show_content_inline": True,
    },
    {
        "layout": "timeline",
        "variant": "default",
        "collapse_default": False,
        "show_content_inline": True,
    },
    {
        "layout": "hero",
        "variant": "emphasis",
        "collapse_default": False,
        "show_content_inline": True,
    },
    {
        "layout": "quote",
        "variant": "muted",
        "collapse_default": False,
        "show_content_inline": True,
    },
    {
        "layout": "prose",
        "variant": "default",
        "collapse_default": False,
        "show_content_inline": True,
    },
]


def test_all_presets_have_ai_hint():
    for key, preset in MEMORY_LAYOUT_PRESETS.items():
        assert preset.get("layout") == key
        assert preset.get("ai_hint")


def test_default_style_world_root_hero():
    style = default_style_for_scope("world", node_kind="both", is_root=True)
    assert style.get("layout") == "hero"


def test_default_style_depth2_outline():
    style = default_style_for_scope("world", depth=2, node_kind="section")
    assert style.get("layout") == "outline"


def test_normalize_unknown_layout_falls_back():
    style = normalize_style({"layout": "not-a-real-layout"}, scope="world")
    assert style.get("layout") == "prose"


def test_normalize_merges_variant_and_icon():
    style = normalize_style(
        {"layout": "cards", "variant": "muted", "icon": "Globe", "accent": "emerald"},
        scope="character",
    )
    assert style["layout"] == "cards"
    assert style["variant"] == "muted"
    assert style["icon"] == "Globe"
    assert style["accent"] == "emerald"


def test_normalize_rejects_emoji_icon():
    style = normalize_style({"layout": "prose", "icon": "🌍"}, scope="world")
    assert "icon" not in style


def test_normalize_invalid_variant_defaults():
    style = normalize_style({"layout": "prose", "variant": "invalid"}, scope="world")
    assert style["variant"] == "default"


def test_prompt_block_lists_layouts_and_optional_fields():
    block = memory_style_prompt_block()
    assert "accordion" in block
    assert "prose" in block
    assert "icon" in block
    assert "accent" in block


def test_preset_sync_manifest_matches_frontend_contract():
    py_by_layout = {row["layout"]: row for row in preset_sync_manifest()}
    fe_by_layout = {row["layout"]: row for row in FRONTEND_SYNC_MANIFEST}
    assert py_by_layout == fe_by_layout


def test_default_scope_layout_empty():
    assert DEFAULT_SCOPE_LAYOUT == {}


def test_layout_keys_cover_all_presets():
    assert set(MEMORY_LAYOUT_KEYS) == set(MEMORY_LAYOUT_PRESETS.keys())
    assert len(MEMORY_LAYOUT_KEYS) == len(FRONTEND_SYNC_MANIFEST)


def test_frontend_ts_exports_sync_manifest():
    """Frontend TS exports SYNC_PRESET_FIELDS, icon allowlist, and all layout keys."""
    repo_root = Path(__file__).resolve().parents[2]
    ts_path = repo_root / "frontend" / "src" / "components" / "memory" / "memoryStylePresets.ts"
    icons_path = repo_root / "frontend" / "src" / "components" / "memory" / "memoryNodeIcons.tsx"
    text = ts_path.read_text(encoding="utf-8")
    icons_text = icons_path.read_text(encoding="utf-8")
    assert "export const SYNC_PRESET_FIELDS" in text
    for key in MEMORY_LAYOUT_KEYS:
        assert f"{key}:" in text
    for field in SYNC_PRESET_FIELDS:
        assert field in text
    for icon in sorted(VALID_MEMORY_ICONS):
        assert f"'{icon}'" in icons_text or f'"{icon}"' in icons_text


def test_memory_icon_allowlist_matches_frontend():
    repo_root = Path(__file__).resolve().parents[2]
    icons_path = repo_root / "frontend" / "src" / "components" / "memory" / "memoryNodeIcons.tsx"
    text = icons_path.read_text(encoding="utf-8")
    start = text.index("export const MEMORY_NODE_ICON_NAMES = [")
    end = text.index("] as const", start)
    block = text[start:end]
    fe_icons = {
        line.strip().strip("',")
        for line in block.splitlines()
        if line.strip().startswith("'")
    }
    assert fe_icons == set(VALID_MEMORY_ICONS)
