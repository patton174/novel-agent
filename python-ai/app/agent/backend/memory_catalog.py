"""Story-memory catalog for RUN_CONTEXT (scope + key, no VFS paths)."""

from __future__ import annotations

from typing import Any
from urllib.parse import quote, unquote

from app.agent.backend.ids import CHAPTER_ID_RE
from app.agent.schemas import AgentRunContext
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


def chapter_memory_catalog_label(
    ctx: AgentRunContext,
    chapter_id: str,
    bucket_entry: Any = None,
) -> str:
    """Human-readable catalog line for chapter memory (storage key stays UUID)."""
    cid = (chapter_id or "").strip()
    if not cid:
        return chapter_id
    list_index = 0
    catalog_title = ""
    for ch in ctx.chapters or []:
        if not isinstance(ch, dict) or str(ch.get("id") or "") != cid:
            continue
        catalog_title = str(ch.get("title") or "").strip()
        try:
            list_index = int(ch.get("list_index") or 0)
        except (TypeError, ValueError):
            list_index = 0
        break
    env_title = ""
    if isinstance(bucket_entry, dict):
        env_title = str(bucket_entry.get("title") or "").strip()
    title = catalog_title or env_title
    if title:
        pos = f"列表第{list_index}章 · " if list_index > 0 else ""
        short_id = f"{cid[:8]}…" if len(cid) > 12 else cid
        return f"{pos}{title}（chapter_id={short_id}）"
    if CHAPTER_ID_RE.match(cid):
        return f"章节记忆（chapter_id={cid[:8]}…）"
    return cid


def format_memory_catalog_db(ctx: AgentRunContext, *, max_lines: int = 48) -> str:
    """Human-readable memory index for RUN_CONTEXT (API source of truth)."""
    nid = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not nid:
        return "（无 novel_id，无法列举记忆）"
    tree = load_story_memory_tree(ctx)
    scope_labels = {
        "novel": "大纲（创作规划，非逐章记忆）",
        "world": "世界观",
        "character": "角色库",
        "chapter": "章节记忆",
        "background": "背景设定",
    }
    lines = [
        "【故事记忆 · story-memory API】用 ListMemory / ReadMemory(scope, key) 访问。",
        "scope 枚举：novel | world | character | chapter | background；key 为原始文本键名。",
    ]
    sections: list[tuple[str, str, dict[str, Any]]] = [
        ("novel", "novel", tree.get("novel") if isinstance(tree.get("novel"), dict) else {}),
        ("world", "world", tree.get("world") if isinstance(tree.get("world"), dict) else {}),
        (
            "character",
            "characters",
            tree.get("characters") if isinstance(tree.get("characters"), dict) else {},
        ),
        (
            "chapter",
            "chapters",
            tree.get("chapters") if isinstance(tree.get("chapters"), dict) else {},
        ),
        (
            "background",
            "background",
            tree.get("background") if isinstance(tree.get("background"), dict) else {},
        ),
    ]
    total = 0
    for vfs_scope, _bucket_key, bucket in sections:
        if not bucket:
            continue
        label = scope_labels.get(vfs_scope, vfs_scope)
        lines.append(f"## {label}（{len(bucket)} 条）")
        for key in sorted(bucket.keys(), key=str):
            if total >= max_lines:
                lines.append("…（其余条目请 ListMemory）")
                return "\n".join(lines)
            preview = str(bucket[key])[:60].replace("\n", " ")
            if vfs_scope == "chapter":
                human = chapter_memory_catalog_label(ctx, str(key), bucket[key])
                lines.append(f"- scope=chapter key={key!r}  {human}  ({preview})")
            else:
                lines.append(f"- scope={vfs_scope} key={key!r}  ({preview})")
            total += 1
    if total == 0:
        lines.append("（当前无记忆条目）")
    return "\n".join(lines)
