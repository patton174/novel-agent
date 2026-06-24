"""Chapter tools — direct Content API, no VFS paths."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.agent.backend import chapter_client

logger = logging.getLogger(__name__)


from app.agent.backend.chapter_meta import resolve_chapter_write_meta
from app.agent.backend.chapter_title import strip_chapter_number_prefix
from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_catalog import (
    catalog_list_items,
    chapter_row_meta,
    chapter_rows_patch,
    load_chapter_rows,
    resolve_chapter_target,
)
from app.agent.tools.chapter_position import (
    audit_chapter_catalog,
    build_reorder_ids,
    duplicate_title_groups,
    find_chapter_index,
    insert_id_at_position,
    ordered_chapter_ids,
    resolve_target_position,
)
from app.agent.tools.chapter_resolve import resolve_chapter_row
from app.agent.tools.errors import ToolError, ToolErrorCode, tool_error_result
from app.agent.tools.schemas import (
    ChapterAuditInput,
    DeleteChapterInput,
    EditChapterInput,
    ListChaptersInput,
    ReadChapterInput,
    ReorderChaptersInput,
    WriteChapterInput,
)
from app.agent.tools.tool import ToolCallResult, build_tool


def _upstream_error(message: str, *, code: str = ToolErrorCode.UPSTREAM_5XX) -> ToolCallResult:
    return tool_error_result(
        ToolError(
            code=code,
            message=(message or "upstream error").strip()[:500],
            retryable=code in (ToolErrorCode.UPSTREAM_5XX, ToolErrorCode.INDEXING_PENDING),
        )
    )


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
    rows = await load_chapter_rows(ctx)
    report = audit_chapter_catalog(rows)
    patch: dict[str, Any] = {"last_chapter_audit": report}
    patch.update(chapter_rows_patch(rows))
    return ToolCallResult(
        content=json.dumps(report, ensure_ascii=False),
        context_patch=patch,
    )


async def list_chapters(ctx: AgentRunContext, inp: ListChaptersInput) -> ToolCallResult:
    rows = await load_chapter_rows(ctx)
    items = catalog_list_items(rows, include_summary=inp.include_summary)
    dupes = duplicate_title_groups(rows)
    payload: dict[str, Any] = {
        "count": len(items),
        "chapters": items,
    }
    if dupes:
        payload["duplicate_titles"] = {
            title: ids for title, ids in dupes.items()
        }
    patch: dict[str, Any] = {}
    patch.update(chapter_rows_patch(rows))
    return ToolCallResult(
        content=json.dumps(payload, ensure_ascii=False),
        context_patch=patch,
    )


async def read_chapter(ctx: AgentRunContext, inp: ReadChapterInput) -> ToolCallResult:
    row, rows, resolve_err = await resolve_chapter_target(
        ctx,
        chapter_id=inp.chapter_id,
        title=inp.title,
        index=inp.index,
    )
    if resolve_err or not row:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.CHAPTER_NOT_FOUND,
                message=resolve_err or "chapter not found",
                hint="Call ListChapters for index and chapter_id, then retry.",
                suggested_tools=["ListChapters"],
                retryable=True,
            )
        )
    meta = chapter_row_meta(row)
    text, err = await chapter_client.fetch_chapter_read_slice(
        ctx,
        meta["chapter_id"],
        offset=inp.offset,
        limit=inp.limit,
        list_index=meta["index"],
    )
    if err:
        return _upstream_error(err)
    patch = chapter_rows_patch(rows)
    patch["read_target"] = {
        "chapter_id": meta["chapter_id"],
        "title": meta["title"],
        "index": meta["index"],
    }
    return ToolCallResult(content=text or "", context_patch=patch)


async def write_chapter(ctx: AgentRunContext, inp: WriteChapterInput) -> ToolCallResult:
    title, title_err = await _normalize_chapter_title(inp.title)
    if title_err or not title:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message=title_err or "title is required",
                hint="Pass a pure chapter title (no 第N章 prefix).",
                retryable=True,
            )
        )

    rows = await load_chapter_rows(ctx)
    target_pos, pos_err = resolve_target_position(
        rows,
        chapter_id="",
        position=inp.index,
    )
    if pos_err:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message=pos_err,
                hint="Use index (1-based reading slot from ListChapters).",
                suggested_tools=["ListChapters"],
                retryable=True,
            )
        )

    content = (inp.content or "").strip()
    if content:
        logger.info(
            "WriteChapter: ignoring %d chars inline content (stream-only path)",
            len(content),
        )
        content = ""
    if not content:
        meta = resolve_chapter_write_meta(ctx, chapter_id="", title=title)
        patch: dict[str, Any] = {
            "chapter_write": {
                "title": meta["title"],
                "content": "",
                "sort_order": target_pos or meta.get("sort_order", 0),
                "chapter_id": "",
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
                    "index": inp.index,
                },
                ensure_ascii=False,
            ),
            context_patch=patch,
        )

    payload: dict[str, Any] = {
        "title": title,
        "content": normalize_chapter_body_for_persist(content),
    }

    ok, out, err = await chapter_client.persist_chapter_write(ctx, payload)
    if not ok:
        return _upstream_error(err)

    chapter_id = str(out.get("chapter_id") or "").strip()
    fresh = rows
    if chapter_id and target_pos is not None:
        fresh, reorder_err = await _apply_reading_order(
            ctx,
            await chapter_client.fetch_chapter_summaries(ctx),
            chapter_id,
            position=target_pos,
        )
        if reorder_err:
            return _upstream_error(reorder_err)
    elif not fresh:
        fresh = await chapter_client.fetch_chapter_summaries(ctx)

    index = find_chapter_index(fresh or [], chapter_id) if chapter_id else None
    patch = {"chapter_write": out, **chapter_rows_patch(fresh or rows)}
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
    row, rows, resolve_err = await resolve_chapter_target(
        ctx,
        chapter_id=inp.chapter_id,
    )
    if resolve_err or not row:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.CHAPTER_NOT_FOUND,
                message=resolve_err or "chapter not found",
                hint="Call ListChapters for chapter_id, then retry.",
                suggested_tools=["ListChapters", "ReadChapter"],
            )
        )
    chapter_id = chapter_row_meta(row)["chapter_id"]
    old_title = chapter_row_meta(row)["title"]

    rename = bool(inp.new_title and inp.new_title.strip() and inp.new_title.strip() != old_title)
    move = inp.index is not None
    line_edit = inp.line_start is not None

    full: dict[str, Any] | None = None
    if inp.new_content is not None:
        full = await chapter_client.fetch_chapter_full(ctx, chapter_id)
        if not full:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.CHAPTER_NOT_FOUND,
                    message=f"chapter not found: {chapter_id}",
                    hint="The chapter_id may be stale; call ListChapters and retry.",
                    suggested_tools=["ListChapters"],
                )
            )
        old_title = str(full.get("title") or old_title)

    body = str((full or {}).get("content") or "")
    new_body = body
    content_changed = False
    out: Any = None

    if inp.new_content is not None:
        new_body = inp.new_content
        content_changed = new_body != body
    elif line_edit:
        ok, patch_out, patch_err = await chapter_client.patch_chapter_lines(
            ctx,
            chapter_id,
            line_start=inp.line_start or 1,
            line_end=inp.line_end,
            line_content=inp.line_content or "",
        )
        if not ok:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.SCHEMA_INVALID,
                    message=f"{patch_err or 'line edit failed'} in chapter {chapter_id}",
                    hint=(
                        "Re-read with ReadChapter (1-based line numbers on body text), "
                        "then pass line_start, line_end, and line_content."
                    ),
                    suggested_tools=["ReadChapter", "EditChapter"],
                    resource={"chapter_id": chapter_id},
                )
            )
        out = {"chapter_write": patch_out}
        content_changed = True

    if inp.rewrite and not content_changed:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="rewrite streams server-side — omit new_content and line_* fields",
                hint="Call EditChapter with rewrite=true and chapter_id only; body is streamed.",
                suggested_tools=["ReadChapter"],
                resource={"chapter_id": chapter_id},
            )
        )

    if not content_changed and not rename and not move:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="nothing to edit",
                hint=(
                    "Provide new_title, index (move), rewrite, new_content, "
                    "or line_start+line_content."
                ),
                suggested_tools=["ReadChapter"],
                resource={"chapter_id": chapter_id},
            )
        )

    out_payload: Any = out
    if (content_changed and inp.new_content is not None) or (rename and not line_edit):
        new_title = old_title
        if rename:
            cleaned, title_err = await _normalize_chapter_title(inp.new_title or "")
            if title_err or not cleaned:
                return tool_error_result(
                    ToolError(
                        code=ToolErrorCode.SCHEMA_INVALID,
                        message=title_err or "new_title is invalid",
                        retryable=True,
                    )
                )
            new_title = cleaned
        if inp.new_content is not None:
            if full is None:
                full = await chapter_client.fetch_chapter_full(ctx, chapter_id)
            payload = {
                "chapter_id": chapter_id,
                "title": new_title or "未命名",
                "content": normalize_chapter_body_for_persist(new_body),
                "sort_order": (full or {}).get("sort_order") or 0,
            }
            ok, persist_out, err = await chapter_client.persist_chapter_write(ctx, payload)
            if not ok:
                return tool_error_result(
                    ToolError(
                        code=ToolErrorCode.UPSTREAM_5XX,
                        message=err or "chapter persist failed",
                        retryable=True,
                        resource={"chapter_id": chapter_id},
                    )
                )
            out_payload = persist_out
        elif rename:
            ok, err = await chapter_client.update_chapter_title(ctx, chapter_id, new_title)
            if not ok:
                return _upstream_error(err)
            out_payload = {"chapter_id": chapter_id, "title": new_title}
    elif rename and line_edit:
        cleaned, title_err = await _normalize_chapter_title(inp.new_title or "")
        if title_err or not cleaned:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.SCHEMA_INVALID,
                    message=title_err or "new_title is invalid",
                    retryable=True,
                )
            )
        ok, err = await chapter_client.update_chapter_title(ctx, chapter_id, cleaned)
        if not ok:
            return _upstream_error(err)

    rows = await load_chapter_rows(ctx)
    if move:
        rows, reorder_err = await _apply_reading_order(
            ctx,
            rows,
            chapter_id,
            position=inp.index,
        )
        if reorder_err:
            return _upstream_error(reorder_err)

    patch: dict[str, Any] = {}
    if out_payload is not None:
        if isinstance(out_payload, dict) and "chapter_write" in out_payload:
            patch["chapter_write"] = out_payload["chapter_write"]
        else:
            patch["chapter_write"] = out_payload
    patch.update(chapter_rows_patch(rows or []))
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
    rows = await load_chapter_rows(ctx)
    row, err = resolve_chapter_row(rows, chapter_id=inp.chapter_id.strip())
    if err or not row:
        return _upstream_error(err or "chapter not found")
    target = str(row.get("id") or row.get("chapter_id") or "").strip()

    ok, del_err = await chapter_client.delete_chapter(ctx, target)
    if not ok:
        return _upstream_error(del_err)

    fresh = await load_chapter_rows(ctx)
    patch: dict[str, Any] = {"chapter_delete": {"deleted": [target]}}
    patch.update(chapter_rows_patch(fresh))
    return ToolCallResult(
        content=json.dumps(
            {"ok": True, "deleted": [target]},
            ensure_ascii=False,
        ),
        context_patch=patch,
    )


async def reorder_chapters(ctx: AgentRunContext, inp: ReorderChaptersInput) -> ToolCallResult:
    if not inp.chapter_ids and not inp.moves:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="Provide chapter_ids or moves.",
                hint="Pass chapter_ids (full sequence) or moves [{chapter_id, position}].",
                suggested_tools=["ListChapters"],
                retryable=True,
            )
        )

    rows = await load_chapter_rows(ctx)
    moves = [(m.chapter_id, m.position) for m in (inp.moves or [])]
    ids, err = build_reorder_ids(rows, chapter_ids=inp.chapter_ids, moves=moves or None)
    if err:
        return _upstream_error(err)

    ok, summaries, reorder_err = await chapter_client.reorder_novel_chapters(ctx, ids)
    if not ok:
        return _upstream_error(reorder_err)
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
        context_patch=chapter_rows_patch(summaries),
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
        description="Read chapter body.",
        input_model=ReadChapterInput,
        call=read_chapter,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="WriteChapter",
        description=(
            "Create a new chapter. Title is pure text (no 第N章 — index comes from sort). "
            "Required index (1-based) sets insert position. Empty content streams the body. "
            "Does not overwrite existing chapters — use EditChapter instead."
        ),
        input_model=WriteChapterInput,
        call=write_chapter,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="EditChapter",
        description=(
            "Edit one chapter by chapter_id. "
            "Fields: new_title, index (move to reading slot), "
            "rewrite (stream full body), new_content (sync full replace), "
            "or line_start/line_end/line_content (1-based line edit from ReadChapter; "
            'line_content must be a string — use "" to delete lines, never null).'
        ),
        input_model=EditChapterInput,
        call=edit_chapter,
    ),
    build_tool(
        name="DeleteChapter",
        description="Delete one chapter by chapter_id from ListChapters.",
        input_model=DeleteChapterInput,
        call=delete_chapter,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="ReorderChapters",
        description=(
            "Batch reorder reading order. chapter_ids must list every chapter exactly once; "
            "or moves [{chapter_id, position}] for partial batch adjustments. "
            "Single-chapter moves use EditChapter.index."
        ),
        input_model=ReorderChaptersInput,
        call=reorder_chapters,
    ),
]
