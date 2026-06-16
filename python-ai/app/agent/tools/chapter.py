"""Chapter tools — direct Content API, no VFS paths."""

from __future__ import annotations

import json
from typing import Any

from app.agent.backend import chapter_client
from app.agent.backend.chapter_meta import resolve_chapter_write_meta
from app.agent.backend.chapter_title import strip_chapter_number_prefix
from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_position import (
    audit_chapter_catalog,
    build_reorder_ids,
    chapter_list_items,
    duplicate_title_groups,
    find_chapter_index,
    format_chapter_list_text,
    insert_id_at_position,
    ordered_chapter_ids,
    resolve_target_position,
)
from app.agent.tools.chapter_resolve import resolve_chapter_row
from app.agent.tools.schemas import (
    ChapterAuditInput,
    DeleteChapterInput,
    EditChapterInput,
    ListChaptersInput,
    ReadChapterInput,
    ReorderChaptersInput,
    WriteChapterInput,
)
from app.agent.tools.text_edit import apply_string_replace
from app.agent.tools.tool import ToolCallResult, build_tool


async def _apply_reading_order(
    ctx: AgentRunContext,
    rows: list[dict[str, Any]],
    chapter_id: str,
    *,
    position: int | None = None,
    after_chapter_id: str | None = None,
    before_chapter_id: str | None = None,
) -> tuple[list[dict[str, Any]] | None, str | None]:
    target, err = resolve_target_position(
        rows,
        chapter_id=chapter_id,
        position=position,
        after_chapter_id=after_chapter_id,
        before_chapter_id=before_chapter_id,
    )
    if err:
        return None, err
    if target is None:
        return rows, None

    current_index = find_chapter_index(rows, chapter_id)
    if current_index == target:
        return rows, None

    ids = insert_id_at_position(ordered_chapter_ids(rows), chapter_id, target)
    ok, summaries, reorder_err = await chapter_client.reorder_novel_chapters(ctx, ids)
    if not ok:
        return None, reorder_err
    return summaries, None


async def _normalize_chapter_title(title: str) -> tuple[str | None, str | None]:
    raw = (title or "").strip()
    if not raw:
        return None, "title is required"
    cleaned = strip_chapter_number_prefix(raw)
    if not cleaned:
        return None, "title is empty after removing chapter-number prefix"
    return cleaned, None


async def audit_chapters(ctx: AgentRunContext, inp: ChapterAuditInput) -> ToolCallResult:
    _ = inp
    rows = await chapter_client.fetch_chapter_summaries(ctx)
    report = audit_chapter_catalog(rows)
    patch: dict[str, Any] = {"last_chapter_audit": report}
    if rows:
        patch["chapters"] = rows
    return ToolCallResult(
        content=json.dumps(report, ensure_ascii=False),
        context_patch=patch,
    )


async def list_chapters(ctx: AgentRunContext, inp: ListChaptersInput) -> ToolCallResult:
    rows = await chapter_client.fetch_chapter_summaries(ctx)
    items = chapter_list_items(rows, include_summary=inp.include_summary)
    dupes = duplicate_title_groups(rows)
    project_title = str((ctx.project or {}).get("title") or "").strip()
    list_text = format_chapter_list_text(rows, project_title=project_title)
    payload: dict[str, Any] = {
        "count": len(items),
        "chapters": items,
    }
    if dupes:
        payload["duplicate_titles"] = {
            title: ids for title, ids in dupes.items()
        }
    patch: dict[str, Any] = {
        "last_chapter_list": list_text,
        "chapters": rows,
    }
    return ToolCallResult(
        content=json.dumps(payload, ensure_ascii=False),
        context_patch=patch,
    )


async def read_chapter(ctx: AgentRunContext, inp: ReadChapterInput) -> ToolCallResult:
    text, err = await chapter_client.fetch_chapter_read_slice(
        ctx, inp.chapter_id, offset=inp.offset, limit=inp.limit
    )
    if err:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    patch: dict[str, Any] = {"last_read_chapter_id": inp.chapter_id}
    return ToolCallResult(content=text or "", context_patch=patch)


async def write_chapter(ctx: AgentRunContext, inp: WriteChapterInput) -> ToolCallResult:
    title, title_err = await _normalize_chapter_title(inp.title)
    if title_err or not title:
        return ToolCallResult(content=f"<tool_use_error>{title_err}</tool_use_error>", is_error=True)

    rows = await chapter_client.fetch_chapter_summaries(ctx)
    position = inp.position if inp.position is not None else inp.sort_order
    target_pos, pos_err = resolve_target_position(
        rows,
        chapter_id=(inp.chapter_id or "").strip(),
        position=position,
        after_chapter_id=inp.after_chapter_id,
        before_chapter_id=inp.before_chapter_id,
    )
    if pos_err:
        return ToolCallResult(content=f"<tool_use_error>{pos_err}</tool_use_error>", is_error=True)

    content = (inp.content or "").strip()
    if not content:
        meta = resolve_chapter_write_meta(
            ctx, chapter_id=(inp.chapter_id or "").strip(), title=title
        )
        patch: dict[str, Any] = {
            "chapter_write": {
                "title": meta["title"],
                "content": "",
                "sort_order": target_pos or meta.get("sort_order", 0),
                "chapter_id": inp.chapter_id or meta.get("chapter_id", ""),
                "display_label": meta.get("display_label", title),
                "target_position": target_pos,
            },
            "stream_chapter": True,
        }
        return ToolCallResult(
            content=json.dumps(
                {
                    "ok": True,
                    "streaming": True,
                    "title": meta["title"],
                    "target_position": target_pos,
                    "chapter_id": patch["chapter_write"].get("chapter_id") or None,
                },
                ensure_ascii=False,
            ),
            context_patch=patch,
        )

    payload: dict[str, Any] = {
        "title": title,
        "content": normalize_chapter_body_for_persist(content),
    }
    if inp.chapter_id:
        payload["chapter_id"] = inp.chapter_id

    ok, out, err = await chapter_client.persist_chapter_write(ctx, payload)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)

    chapter_id = str(out.get("chapter_id") or inp.chapter_id or "").strip()
    fresh = rows
    if chapter_id and target_pos is not None:
        fresh, reorder_err = await _apply_reading_order(
            ctx,
            await chapter_client.fetch_chapter_summaries(ctx),
            chapter_id,
            position=target_pos,
        )
        if reorder_err:
            return ToolCallResult(content=f"<tool_use_error>{reorder_err}</tool_use_error>", is_error=True)
    elif not fresh:
        fresh = await chapter_client.fetch_chapter_summaries(ctx)

    index = find_chapter_index(fresh or [], chapter_id) if chapter_id else None
    patch = {"chapter_write": out, "chapters": fresh or rows}
    return ToolCallResult(
        content=json.dumps(
            {
                "ok": True,
                "chapter_id": chapter_id,
                "index": index,
                "title": title,
            },
            ensure_ascii=False,
        ),
        context_patch=patch,
    )


async def edit_chapter(ctx: AgentRunContext, inp: EditChapterInput) -> ToolCallResult:
    if not inp.chapter_id and not inp.title and inp.index is None:
        return ToolCallResult(
            content="<tool_use_error>Provide chapter_id, title, or index.</tool_use_error>",
            is_error=True,
        )
    rows = await chapter_client.fetch_chapter_summaries(ctx)
    row, resolve_err = resolve_chapter_row(
        rows,
        chapter_id=inp.chapter_id,
        title=inp.title,
        index=inp.index,
    )
    if resolve_err or not row:
        return ToolCallResult(
            content=f"<tool_use_error>{resolve_err or 'chapter not found'}</tool_use_error>",
            is_error=True,
        )
    chapter_id = str(row.get("id") or row.get("chapter_id") or "").strip()
    full = await chapter_client.fetch_chapter_full(ctx, chapter_id)
    if not full:
        return ToolCallResult(
            content=f"<tool_use_error>chapter not found: {chapter_id}</tool_use_error>",
            is_error=True,
        )
    body = str(full.get("content") or "")
    new_body, edit_err = apply_string_replace(
        body,
        inp.old_string,
        inp.new_string,
        replace_all=inp.replace_all,
    )
    if edit_err or new_body is None:
        hint = (
            "Re-read with ReadChapter and copy body text without line numbers, "
            "or pass empty old_string to replace the full body."
        )
        return ToolCallResult(
            content=f"<tool_use_error>{edit_err or 'edit failed'} in chapter {chapter_id}. {hint}</tool_use_error>",
            is_error=True,
        )

    payload = {
        "chapter_id": chapter_id,
        "title": full.get("title") or "未命名",
        "content": normalize_chapter_body_for_persist(new_body),
        "sort_order": full.get("sort_order") or 0,
    }
    ok, out, err = await chapter_client.persist_chapter_write(ctx, payload)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)

    rows = await chapter_client.fetch_chapter_summaries(ctx)
    position = inp.position if inp.position is not None else inp.sort_order
    if position is not None or inp.after_chapter_id or inp.before_chapter_id:
        rows, reorder_err = await _apply_reading_order(
            ctx,
            rows,
            chapter_id,
            position=position,
            after_chapter_id=inp.after_chapter_id,
            before_chapter_id=inp.before_chapter_id,
        )
        if reorder_err:
            return ToolCallResult(content=f"<tool_use_error>{reorder_err}</tool_use_error>", is_error=True)

    patch: dict[str, Any] = {"chapter_write": out}
    if rows:
        patch["chapters"] = rows
    return ToolCallResult(
        content=json.dumps(
            {
                "ok": True,
                "chapter_id": chapter_id,
                "index": find_chapter_index(rows or [], chapter_id),
            },
            ensure_ascii=False,
        ),
        context_patch=patch,
    )


async def delete_chapter(ctx: AgentRunContext, inp: DeleteChapterInput) -> ToolCallResult:
    rows = await chapter_client.fetch_chapter_summaries(ctx)
    targets: list[str] = []

    if inp.dedupe_title:
        dupes = duplicate_title_groups(rows)
        ids = dupes.get(inp.dedupe_title.strip(), [])
        if len(ids) <= 1:
            return ToolCallResult(
                content=json.dumps(
                    {"ok": True, "deleted": [], "message": "no duplicate chapters for title"},
                    ensure_ascii=False,
                ),
            )
        targets.extend(ids[1:])

    if inp.chapter_id:
        row, err = resolve_chapter_row(rows, chapter_id=inp.chapter_id.strip())
        if err or not row:
            return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
        targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())
    if inp.chapter_ids:
        for raw in inp.chapter_ids:
            cid = str(raw).strip()
            if not cid:
                continue
            row, err = resolve_chapter_row(rows, chapter_id=cid)
            if err or not row:
                return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
            targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())
    if inp.title and inp.title.strip():
        row, err = resolve_chapter_row(rows, title=inp.title.strip())
        if err or not row:
            return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
        targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())
    if inp.index is not None:
        row, err = resolve_chapter_row(rows, index=inp.index)
        if err or not row:
            return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
        targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())

    unique_targets = list(dict.fromkeys(targets))
    if not unique_targets:
        return ToolCallResult(
            content="<tool_use_error>Provide chapter_id, chapter_ids, title, index, or dedupe_title.</tool_use_error>",
            is_error=True,
        )

    deleted: list[str] = []
    errors: list[str] = []
    for cid in unique_targets:
        ok, err = await chapter_client.delete_chapter(ctx, cid)
        if ok:
            deleted.append(cid)
        else:
            errors.append(f"{cid}: {err}")

    fresh = await chapter_client.fetch_chapter_summaries(ctx)
    patch: dict[str, Any] = {"chapter_delete": {"deleted": deleted}}
    if fresh:
        patch["chapters"] = fresh
    if errors and not deleted:
        return ToolCallResult(
            content=f"<tool_use_error>{'; '.join(errors[:3])}</tool_use_error>",
            is_error=True,
        )
    return ToolCallResult(
        content=json.dumps(
            {"ok": True, "deleted": deleted, "errors": errors[:5]},
            ensure_ascii=False,
        ),
        context_patch=patch or None,
    )


async def reorder_chapters(ctx: AgentRunContext, inp: ReorderChaptersInput) -> ToolCallResult:
    if not inp.chapter_ids and not inp.moves:
        return ToolCallResult(
            content="<tool_use_error>Provide chapter_ids or moves.</tool_use_error>",
            is_error=True,
        )

    rows = await chapter_client.fetch_chapter_summaries(ctx)
    moves = [(m.chapter_id, m.position) for m in (inp.moves or [])]
    ids, err = build_reorder_ids(rows, chapter_ids=inp.chapter_ids, moves=moves or None)
    if err:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)

    ok, summaries, reorder_err = await chapter_client.reorder_novel_chapters(ctx, ids)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{reorder_err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps(
            {
                "ok": True,
                "count": len(ids),
                "order": [
                    {
                        "index": index,
                        "chapter_id": cid,
                    }
                    for index, cid in enumerate(ids, start=1)
                ],
            },
            ensure_ascii=False,
        ),
        context_patch={"chapters": summaries},
    )


CHAPTER_TOOLS = [
    build_tool(
        name="ListChapters",
        description=(
            "Chapter catalog: index (reading order), chapter_id, title, word_count. "
            "Marks duplicate titles when present. Titles are pure text — no 第N章 prefix."
        ),
        input_model=ListChaptersInput,
        call=list_chapters,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="ChapterAudit",
        description=(
            "Read-only audit: duplicate titles, empty/short chapters, titles with 第N章 prefix. "
            "Call after parallel Agent writes or before finishing a batch."
        ),
        input_model=ChapterAuditInput,
        call=audit_chapters,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="ReadChapter",
        description="Read chapter body by chapter_id.",
        input_model=ReadChapterInput,
        call=read_chapter,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="WriteChapter",
        description=(
            "Create or update a chapter. Title is pure text (no 第N章 — index comes from sort). "
            "Controls order via position (1-based), after_chapter_id, or before_chapter_id; "
            "new chapters append by default. Empty content streams the body."
        ),
        input_model=WriteChapterInput,
        call=write_chapter,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="EditChapter",
        description=(
            "Patch chapter text via old_string/new_string (empty old_string replaces full body). "
            "Target by chapter_id, title, or index (ListChapters). "
            "Snippets from ReadChapter may include line numbers — tool normalizes them. "
            "Optional position / after_chapter_id / before_chapter_id to move it."
        ),
        input_model=EditChapterInput,
        call=edit_chapter,
    ),
    build_tool(
        name="DeleteChapter",
        description=(
            "Delete by chapter_id, chapter_ids, title, index (ListChapters), "
            "or dedupe_title (keeps earliest chapter with that title)."
        ),
        input_model=DeleteChapterInput,
        call=delete_chapter,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="ReorderChapters",
        description=(
            "Fix reading order. Use chapter_ids for the full sequence, "
            "or moves [{chapter_id, position}] to adjust a few chapters."
        ),
        input_model=ReorderChaptersInput,
        call=reorder_chapters,
    ),
]
