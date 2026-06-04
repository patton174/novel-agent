"""VFS operations shared by Read/Write/Edit/Glob/Grep/Delete."""

from __future__ import annotations

import json
import re
from typing import Any

from app.agent_step.schemas import AgentRunContext
from app.agent_step.vfs import chapter_store, format as vfs_format, memory_store, paths
from app.agent_step.vfs import memory_catalog
from app.agent_step.vfs.api_inventory import VFS_API_SOURCE_HEADER, format_glob_inventory
from app.agent_step.vfs.memory_catalog import list_memory_vfs_paths
from app.agent_step.vfs.paths import CHAPTER_ID_RE, parse_vfs_path
from app.agent_step.vfs.read_tools import (
    annotate_read_output,
    coalesce_read_limit,
)


def _novel_id(ctx: AgentRunContext) -> str:
    return str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()


async def vfs_read(
    ctx: AgentRunContext,
    file_path: str,
    *,
    offset: int | None = None,
    limit: int | None = None,
) -> tuple[str | None, str | None]:
    nid = _novel_id(ctx)
    vp, err = parse_vfs_path(file_path, expected_novel_id=nid)
    if err or vp is None:
        return None, err or "invalid path"
    if vp.kind == "meta":
        meta = {
            "title": (ctx.project or {}).get("title") or "",
            "novel_id": nid,
            "session_id": ctx.session_id,
        }
        text = json.dumps(meta, ensure_ascii=False, indent=2)
    elif vp.kind == "chapter_index":
        from app.agent_step.vfs.chapter_meta import format_chapter_index_read

        chapters = await chapter_store.fetch_chapter_summaries(ctx)
        text = format_chapter_index_read(chapters)
    elif vp.kind == "chapter":
        if vp.chapter_id == "_new" or not CHAPTER_ID_RE.match(vp.chapter_id):
            return None, (
                f"chapter not found at {file_path}; "
                "check RUN_CONTEXT chapter_catalog or Read …/chapters/index.json (database ids)"
            )
        eff_limit = coalesce_read_limit(offset, limit, kind="chapter")
        text, err = await chapter_store.fetch_chapter_read_slice(
            ctx, vp.chapter_id, offset=offset, limit=eff_limit
        )
        if err:
            return None, err
        if text is None:
            return None, f"file not found: {file_path}"
        return annotate_read_output(text, kind="chapter"), None
    elif vp.kind == "memory":
        scope = vp.memory_scope
        seg = vp.memory_key
        eff_limit = coalesce_read_limit(offset, limit, kind="memory")
        if scope in ("character", "chapter", "characters", "chapters"):
            text, merr = await memory_store.fetch_memory_read_slice(
                ctx,
                scope,
                key="",
                item_id=seg,
                offset=offset,
                limit=eff_limit,
            )
        else:
            text, merr = await memory_store.fetch_memory_read_slice(
                ctx,
                scope,
                key=seg,
                offset=offset,
                limit=eff_limit,
            )
        if merr:
            return None, merr
        if text is None:
            return None, f"file not found: {file_path}"
        return annotate_read_output(text, kind="memory"), None
    elif vp.kind == "outline":
        patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
        text = str(patch.get("plan_markdown") or "# Plan\n\n(No plan yet.)")
    elif vp.kind == "notebook":
        return None, "notebook not found (upload .ipynb first)"
    else:
        return None, f"unsupported path: {file_path}"

    return _slice_text_locally(text, offset=offset, limit=limit)


def _slice_text_locally(
    text: str,
    *,
    offset: int | None,
    limit: int | None,
) -> tuple[str, None]:
    """Non-chapter paths (memory/outline): slice in-process; no default line cap."""
    lines = text.splitlines()
    total = len(lines)
    start = max(0, (offset or 1) - 1)
    end = min(total, start + limit) if limit is not None and limit > 0 else total
    sliced = lines[start:end]
    numbered = vfs_format.add_line_numbers("\n".join(sliced), start=start + 1)
    if end < total:
        numbered += (
            f"\n\n[共 {total} 行，已返回 {start + 1}-{end}；续读 offset={end + 1}]"
        )
    return numbered, None


async def vfs_glob(ctx: AgentRunContext, pattern: str, base: str | None) -> str:
    nid = _novel_id(ctx)
    chapters = await chapter_store.fetch_chapter_summaries(ctx)
    memory_paths = list_memory_vfs_paths(ctx)
    root = paths.novel_root(nid)
    paths_out: list[str] = []
    pat = (pattern or "*").strip().lower()
    want_chapters = "chapter" in pat or pat in ("*", "**/*", "*.md")
    want_memory = "memory" in pat or pat in ("*", "**/*")
    want_meta = "meta" in pat or pat == "*"

    if want_chapters or pat == "*":
        paths_out.append(f"{root}/chapters/index.json")
        for ch in chapters:
            cid = str(ch.get("id") or "")
            if cid:
                paths_out.append(f"{root}/chapters/{cid}.md")
    if want_memory:
        paths_out.extend(memory_paths)
    if want_meta:
        paths_out.append(f"{root}/meta.json")

    if base:
        base_n = paths.normalize_path(base)
        paths_out = [p for p in paths_out if p.startswith(base_n)]

    chapter_paths = [p for p in paths_out if "/chapters/" in p]
    mem_paths = [p for p in paths_out if "/memory/" in p]
    return format_glob_inventory(
        chapter_count=len(chapter_paths),
        memory_count=len(mem_paths),
        paths=paths_out,
    )


async def vfs_grep(
    ctx: AgentRunContext,
    pattern: str,
    path: str | None,
    *,
    head_limit: int = 25,
) -> str:
    nid = _novel_id(ctx)
    rx = re.compile(pattern, re.IGNORECASE)
    base_norm = paths.normalize_path(path) if path else ""
    matches: list[str] = []
    search_chapters = not base_norm or "/chapters" in base_norm or "/memory" not in base_norm
    search_memory = not base_norm or "/memory" in base_norm

    if search_chapters:
        chapters = await chapter_store.fetch_chapter_summaries(ctx)
        for ch in chapters[:80]:
            cid = str(ch.get("id") or "")
            if not cid:
                continue
            fp = f"{paths.novel_root(nid)}/chapters/{cid}.md"
            if base_norm and not fp.startswith(base_norm):
                continue
            full = await chapter_store.fetch_chapter_full(ctx, cid)
            if not full:
                continue
            body = str(full.get("content") or "") + str(full.get("title") or "")
            if rx.search(body):
                matches.append(fp)
            if len(matches) >= head_limit:
                break

    if search_memory and len(matches) < head_limit:
        for fp in list_memory_vfs_paths(ctx):
            if base_norm and not fp.startswith(base_norm):
                continue
            vp, err = parse_vfs_path(fp, expected_novel_id=nid)
            if err or vp is None or vp.kind != "memory":
                continue
            scope = vp.memory_scope
            seg = vp.memory_key
            if scope in ("character", "chapter"):
                text, merr = await memory_store.fetch_memory_read_slice(
                    ctx,
                    scope,
                    key="" if scope in ("character", "chapter") else seg,
                    item_id=seg if scope in ("character", "chapter") else "",
                    offset=None,
                    limit=None,
                )
            else:
                text, merr = await memory_store.fetch_memory_read_slice(
                    ctx, scope, key=seg, offset=None, limit=None
                )
            if merr or not text:
                continue
            if rx.search(text):
                matches.append(fp)
            if len(matches) >= head_limit:
                break

    if not matches:
        return f"{VFS_API_SOURCE_HEADER}\n(no matches)"
    header = f"{VFS_API_SOURCE_HEADER}\n# matches: {len(matches)} (API-backed content)\n"
    return header + "\n".join(matches)


async def vfs_delete(ctx: AgentRunContext, file_path: str) -> tuple[bool, str]:
    nid = _novel_id(ctx)
    vp, err = parse_vfs_path(file_path, expected_novel_id=nid)
    if err or vp is None:
        return False, err or "invalid path"
    if vp.kind == "chapter" and CHAPTER_ID_RE.match(vp.chapter_id):
        return await chapter_store.delete_chapter(ctx, vp.chapter_id)
    if vp.kind == "memory":
        scope = vp.memory_scope
        seg = vp.memory_key
        if scope in ("character", "chapter"):
            return memory_store.delete_memory(ctx, scope, key="*", item_id=seg)
        return memory_store.delete_memory(ctx, scope, key=seg or "*")
    return False, f"cannot delete: {file_path}"


async def vfs_write(
    ctx: AgentRunContext, file_path: str, content: str
) -> tuple[dict[str, Any], str | None]:
    """Returns context_patch fragment or error."""
    nid = _novel_id(ctx)
    vp, err = parse_vfs_path(file_path, expected_novel_id=nid)
    if err or vp is None:
        return {}, err or "invalid path"
    if vp.kind == "memory":
        from app.agent_step.vfs.memory_document import (
            MemoryDocumentError,
            validate_memory_document,
        )

        scope = vp.memory_scope
        entry_id = vp.memory_key
        try:
            parsed = json.loads(content) if content.strip() else {}
        except json.JSONDecodeError as exc:
            return {}, f"memory Write requires JSON object: {exc}"
        try:
            envelope = validate_memory_document(
                parsed, scope=scope, entry_id=entry_id
            )
        except MemoryDocumentError as exc:
            return {}, str(exc)
        from app.agent_step.vfs.memory_write_guard import validate_memory_write_target

        guard_err = validate_memory_write_target(ctx, scope, entry_id, envelope)
        if guard_err:
            return {}, guard_err
        ok, merr = memory_store.persist_memory_document(
            ctx,
            scope,
            entry_id,
            envelope,
            item_id=entry_id if scope in ("character", "chapter") else "",
        )
        patch: dict[str, Any] = {"last_memory_write": file_path}
        if ok:
            patch["memory_catalog"] = memory_catalog.format_memory_catalog_db(ctx)
        return (patch if ok else {}), merr or None
    if vp.kind == "outline":
        return {"plan_markdown": content}, None
    if vp.kind == "chapter":
        return {
            "write_path": file_path,
            "write_content": content,
            "chapter_id": vp.chapter_id if CHAPTER_ID_RE.match(vp.chapter_id) else "",
        }, None
    if vp.kind == "chapter_index":
        return {}, (
            "chapters/index.json is read-only (catalog view from Content API, not a file). "
            "To reorder chapters use ReorderChapters(chapter_ids=[uuid, ...] in reading order). "
            "To change chapter body use Write/Edit on /chapters/<chapter-uuid>.md. "
            "Do not Write or Edit chapters/index.json."
        )
    return {}, f"write not supported for {file_path}"


async def vfs_edit(
    ctx: AgentRunContext,
    file_path: str,
    old_string: str,
    new_string: str,
    *,
    replace_all: bool = False,
) -> tuple[dict[str, Any], str | None]:
    nid = _novel_id(ctx)
    vp, err = parse_vfs_path(file_path, expected_novel_id=nid)
    if err or vp is None:
        return {}, err or "invalid path"
    text, rerr = await vfs_read(ctx, file_path)
    if rerr or text is None:
        return {}, rerr or "read failed before edit"
    # strip line numbers for edit
    raw_lines = []
    for line in text.splitlines():
        if "\t" in line:
            raw_lines.append(line.split("\t", 1)[1])
        else:
            raw_lines.append(line)
    body = "\n".join(raw_lines)
    if old_string not in body:
        return {}, f"old_string not found in {file_path}"
    if replace_all:
        updated = body.replace(old_string, new_string)
    else:
        updated = body.replace(old_string, new_string, 1)
    return await vfs_write(ctx, file_path, updated)
