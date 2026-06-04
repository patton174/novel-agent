"""Read/Glob/Grep helpers — pagination floors, body hints, catalog paths."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import unquote

from app.agent_step.schemas import AgentRunContext
from app.agent_step.vfs.memory_catalog import memory_path_segment
from app.agent_step.vfs.paths import CHAPTER_ID_RE, VfsPath, novel_root, parse_vfs_path

# Small limit on offset=1 often returns only v1 header lines before "---" (body below).
MIN_READ_LINES_MEMORY = 120
MIN_READ_LINES_CHAPTER = 150

_HEADER_ONLY_HINT = (
    "\n\n[提示] 本次切片可能只有元信息（正文在 `---` 之后）。"
    "请用相同 file_path、文末给出的 offset 续读；或省略 limit 一次读取全文。"
)

_CONTINUATION_RE = re.compile(r"续读 offset=(\d+)")


def coalesce_read_limit(
    offset: int | None,
    limit: int | None,
    *,
    kind: str,
) -> int | None:
    """Raise tiny first-page limits so Read usually includes Markdown body."""
    if limit is None or limit <= 0:
        return None
    if (offset or 1) > 1:
        return limit
    floor = MIN_READ_LINES_MEMORY if kind == "memory" else MIN_READ_LINES_CHAPTER
    return max(limit, floor)


def annotate_read_output(text: str, *, kind: str) -> str:
    """Append guidance when the slice likely omits memory/chapter body."""
    body = (text or "").strip()
    if not body:
        return text or ""
    if kind == "memory" and "# 记忆文档" in body and "---" not in body:
        if "续读 offset=" in body or "记忆共" in body:
            if _HEADER_ONLY_HINT not in body:
                return body + _HEADER_ONLY_HINT
    if kind == "chapter" and "续读 offset=" in body and body.count("\n") < 12:
        if _HEADER_ONLY_HINT not in body:
            return body + _HEADER_ONLY_HINT
    return text


def parse_next_read_offset(text: str) -> int | None:
    m = _CONTINUATION_RE.search(text or "")
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def slice_includes_memory_body(text: str) -> bool:
    return "---" in (text or "")


def build_read_context_patch(
    file_path: str,
    text: str,
    *,
    expected_novel_id: str = "",
) -> dict[str, Any]:
    """Compact hint for RUN_CONTEXT after a successful Read."""
    vp, err = parse_vfs_path(file_path, expected_novel_id=expected_novel_id)
    if err or vp is None:
        return {}
    patch: dict[str, Any] = {
        "last_read": {
            "ok": True,
            "path": file_path,
            "kind": vp.kind,
        }
    }
    last = patch["last_read"]
    if vp.kind == "memory":
        last["scope"] = vp.memory_scope
        last["key"] = vp.memory_key
        last["has_body"] = slice_includes_memory_body(text)
        nxt = parse_next_read_offset(text)
        if nxt is not None:
            last["next_offset"] = nxt
            last["needs_continue"] = True
    elif vp.kind == "chapter":
        last["chapter_id"] = vp.chapter_id
        nxt = parse_next_read_offset(text)
        if nxt is not None:
            last["next_offset"] = nxt
            last["needs_continue"] = True
    return patch


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


def format_memory_catalog_with_read_paths(ctx) -> str:
    """RUN_CONTEXT memory_catalog: keys + exact Read VFS paths (API-backed)."""
    from app.agent_step.vfs.memory_catalog import load_story_memory_tree

    nid = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not nid:
        return "（无 novel_id，无法列举记忆）"
    root = novel_root(nid)
    tree = load_story_memory_tree(ctx)
    scope_labels = {
        "novel": "大纲（创作规划，非逐章记忆）",
        "world": "世界观",
        "character": "角色库",
        "chapter": "章节记忆（路径用 chapter_catalog 的 UUID；人类可读名见下行标题）",
        "background": "背景设定",
    }
    lines = [
        "【故事记忆 · story-memory API】Glob/Read 路径是访问入口，不是磁盘文件。",
        f"读取单条：Read `{root}/memory/{{scope}}/{{key}}.json`（key 需 URL 编码，见下列路径）。",
        "Glob/Grep 只列路径或匹配路径，不含正文；正文必须用 Read。",
        "分页：offset/limit 为 1-based 行号；省略 limit=从 offset 读到末尾。",
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
    max_lines = 56
    for vfs_scope, _bucket_key, bucket in sections:
        if not bucket:
            continue
        label = scope_labels.get(vfs_scope, vfs_scope)
        lines.append(f"## {label}（{len(bucket)} 条）")
        for key in sorted(bucket.keys(), key=str):
            if total >= max_lines:
                lines.append("…（其余条目见 Glob `/memory/**`）")
                return "\n".join(lines)
            seg = memory_path_segment(str(key))
            path = f"{root}/memory/{vfs_scope}/{seg}.json"
            preview = str(bucket[key])[:60].replace("\n", " ")
            if vfs_scope == "chapter":
                label = chapter_memory_catalog_label(ctx, str(key), bucket[key])
                lines.append(f"- {label} → Read `{path}`  ({preview})")
            else:
                lines.append(f"- {key} → Read `{path}`  ({preview})")
            total += 1
    if total == 0:
        lines.append("（当前无记忆条目）")
    return "\n".join(lines)


def decode_memory_path_segment(segment: str) -> str:
    return unquote((segment or "").removesuffix(".json"))


def memory_scope_from_vpath(vp: VfsPath) -> str:
    scope = (vp.memory_scope or "").strip().lower()
    if scope == "characters":
        return "character"
    if scope == "chapters":
        return "chapter"
    return scope
