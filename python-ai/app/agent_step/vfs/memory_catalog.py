"""Story-memory inventory from Content API (not local filesystem)."""

from __future__ import annotations

from typing import Any
from urllib.parse import quote, unquote

from app.agent_step.schemas import AgentRunContext
from app.agent_step.vfs.paths import novel_root
from app.runtime.story_memory import get_story_memory


def memory_path_segment(label: str) -> str:
    raw = (label or "item").strip() or "item"
    return quote(raw, safe="")


def memory_path_segment_decode(segment: str) -> str:
    base = (segment or "").removesuffix(".json")
    return unquote(base)


def load_story_memory_tree(ctx: AgentRunContext) -> dict[str, Any]:
    return get_story_memory(
        ctx.session_id,
        user_id=ctx.user_id,
        novel_id=ctx.novel_id,
        project=ctx.project if isinstance(ctx.project, dict) else None,
    )


def list_memory_vfs_paths(ctx: AgentRunContext) -> list[str]:
    """VFS paths backed by story-memory API (Redis/PG)."""
    nid = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not nid:
        return []
    root = novel_root(nid)
    tree = load_story_memory_tree(ctx)
    out: list[str] = []

    novel = tree.get("novel") if isinstance(tree.get("novel"), dict) else {}
    for key in sorted(novel.keys(), key=str):
        out.append(f"{root}/memory/novel/{memory_path_segment(str(key))}.json")

    world = tree.get("world") if isinstance(tree.get("world"), dict) else {}
    for key in sorted(world.keys(), key=str):
        out.append(f"{root}/memory/world/{memory_path_segment(str(key))}.json")

    characters = tree.get("characters") if isinstance(tree.get("characters"), dict) else {}
    for name in sorted(characters.keys(), key=str):
        out.append(f"{root}/memory/character/{memory_path_segment(str(name))}.json")

    ch_mem = tree.get("chapters") if isinstance(tree.get("chapters"), dict) else {}
    for cid in sorted(ch_mem.keys(), key=str):
        out.append(f"{root}/memory/chapter/{memory_path_segment(str(cid))}.json")

    background = tree.get("background") if isinstance(tree.get("background"), dict) else {}
    for key in sorted(background.keys(), key=str):
        out.append(f"{root}/memory/background/{memory_path_segment(str(key))}.json")

    return out


def format_memory_catalog_db(ctx: AgentRunContext, *, max_lines: int = 48) -> str:
    """Human-readable memory index for RUN_CONTEXT (API source of truth)."""
    from app.agent_step.vfs.read_tools import format_memory_catalog_with_read_paths

    _ = max_lines  # kept for callers; read_tools caps internally
    return format_memory_catalog_with_read_paths(ctx)
