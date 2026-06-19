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
    format_catalog_list_text,
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
from app.agent.tools.text_edit import apply_string_replace, should_fallback_full_body_replace
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
    project_title = str((ctx.project or {}).get("title") or "").strip()
    list_text = format_catalog_list_text(rows, project_title=project_title)
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
    }
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
    position = inp.position if inp.position is not None else inp.sort_order
    target_pos, pos_err = resolve_target_position(
        rows,
        chapter_id=(inp.chapter_id or "").strip(),
        position=position,
        after_chapter_id=inp.after_chapter_id,
        before_chapter_id=inp.before_chapter_id,
    )
    if pos_err:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message=pos_err,
                hint="Use position (1-based), after_chapter_id, or before_chapter_id; or omit to append.",
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
        return _upstream_error(err)

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
    if not inp.chapter_id and not inp.title and inp.index is None:
        # 诊断：chapter_id/title/index 三者全空才会到这里。模型 thinking 通常已
        # 声明要传 chapter_id，若仍为空，说明流式 tool_use 参数在累积/解析时丢失
        # （含多行 CJK old_string 的调用易触发）。落日志以便定位上游 args 丢失。
        logger.warning(
            "EditChapter missing target run_id=%s chapter_id=%r title=%r index=%r "
            "input_keys=%s new_content_len=%s old_string_len=%s — args likely lost "
            "during streaming tool_use accumulation",
            ctx.run_id,
            inp.chapter_id,
            inp.title,
            inp.index,
            sorted(inp.model_dump().keys()),
            len(inp.new_content or ""),
            len(inp.old_string or ""),
        )
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="Provide chapter_id, title, or index.",
                hint="Pass chapter_id (from ListChapters), title, or index to target the chapter.",
                suggested_tools=["ListChapters", "ReadChapter"],
                retryable=True,
            )
        )
    row, rows, resolve_err = await resolve_chapter_target(
        ctx,
        chapter_id=inp.chapter_id,
        title=inp.title,
        index=inp.index,
    )
    if resolve_err or not row:
        code = (
            ToolErrorCode.AMBIGUOUS_TITLE
            if resolve_err and ("multiple" in resolve_err.lower() or "歧义" in resolve_err)
            else ToolErrorCode.CHAPTER_NOT_FOUND
        )
        return tool_error_result(
            ToolError(
                code=code,
                message=resolve_err or "chapter not found",
                hint="Call ListChapters for index/chapter_id, or pass index directly.",
                suggested_tools=["ListChapters", "ReadChapter"],
            )
        )
    chapter_id = chapter_row_meta(row)["chapter_id"]
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
    body = str(full.get("content") or "")
    old_title = str(full.get("title") or "")

    rename = bool(inp.new_title and inp.new_title.strip() and inp.new_title.strip() != old_title)
    move = inp.position is not None or inp.after_chapter_id or inp.before_chapter_id or (
        inp.sort_order is not None
    )

    new_body = body
    content_changed = False
    if inp.new_content is not None:
        # Preferred path: full-body replacement, no fragile snippet matching.
        new_body = inp.new_content
        content_changed = new_body != body
    elif inp.old_string or inp.new_string:
        new_body, edit_err = apply_string_replace(
            body,
            inp.old_string,
            inp.new_string,
            replace_all=inp.replace_all,
        )
        if (edit_err or new_body is None) and should_fallback_full_body_replace(
            body, inp.old_string, inp.new_string
        ):
            new_body, edit_err = apply_string_replace(
                body, "", inp.new_string, replace_all=False
            )
        if edit_err or new_body is None:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.OLD_STRING_NOT_FOUND,
                    message=f"{edit_err or 'edit failed'} in chapter {chapter_id}",
                    hint=(
                        "Re-read with ReadChapter and copy body text without line numbers, "
                        "or pass new_content to replace the full body."
                    ),
                    suggested_tools=["ReadChapter", "EditChapter"],
                    resource={"chapter_id": chapter_id},
                )
            )
        content_changed = True

    if not content_changed and not rename and not move:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="nothing to edit",
                hint=(
                    "Provide new_content (full rewrite), old_string/new_string (targeted "
                    "patch), new_title (rename), or position/after/before (move)."
                ),
                suggested_tools=["ReadChapter"],
                resource={"chapter_id": chapter_id},
            )
        )

    out: Any = None
    if content_changed or rename:
        payload = {
            "chapter_id": chapter_id,
            "title": (inp.new_title.strip() if rename else old_title) or "未命名",
            "content": normalize_chapter_body_for_persist(new_body),
            "sort_order": full.get("sort_order") or 0,
        }
        ok, out, err = await chapter_client.persist_chapter_write(ctx, payload)
        if not ok:
            return tool_error_result(
                ToolError(
                    code=ToolErrorCode.UPSTREAM_5XX,
                    message=err or "chapter persist failed",
                    retryable=True,
                    resource={"chapter_id": chapter_id},
                )
            )

    rows = await load_chapter_rows(ctx)
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
            return _upstream_error(reorder_err)

    patch: dict[str, Any] = {}
    if out is not None:
        patch["chapter_write"] = out
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
            return _upstream_error(err)
        targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())
    if inp.chapter_ids:
        for raw in inp.chapter_ids:
            cid = str(raw).strip()
            if not cid:
                continue
            row, err = resolve_chapter_row(rows, chapter_id=cid)
            if err or not row:
                return _upstream_error(err)
            targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())
    if inp.title and inp.title.strip():
        row, err = resolve_chapter_row(rows, title=inp.title.strip())
        if err or not row:
            return _upstream_error(err)
        targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())
    if inp.index is not None:
        row, err = resolve_chapter_row(rows, index=inp.index)
        if err or not row:
            return _upstream_error(err)
        targets.append(str(row.get("id") or row.get("chapter_id") or "").strip())

    unique_targets = list(dict.fromkeys(targets))
    if not unique_targets:
        return tool_error_result(
            ToolError(
                code=ToolErrorCode.SCHEMA_INVALID,
                message="Provide chapter_id, chapter_ids, title, index, or dedupe_title.",
                hint="Pass at least one target: chapter_id(s), title, index, or dedupe_title.",
                suggested_tools=["ListChapters"],
                retryable=True,
            )
        )

    deleted: list[str] = []
    errors: list[str] = []
    for cid in unique_targets:
        ok, err = await chapter_client.delete_chapter(ctx, cid)
        if ok:
            deleted.append(cid)
        else:
            errors.append(f"{cid}: {err}")

    fresh = await load_chapter_rows(ctx)
    patch: dict[str, Any] = {"chapter_delete": {"deleted": deleted}}
    patch.update(chapter_rows_patch(fresh))
    if errors and not deleted:
        return _upstream_error("; ".join(errors[:3]))
    return ToolCallResult(
        content=json.dumps(
            {"ok": True, "deleted": deleted, "errors": errors[:5]},
            ensure_ascii=False,
        ),
        context_patch=patch or None,
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
            "Edit a chapter row (index / chapter_id / title). "
            "mode=rewrite: server streams full body — pass index only, no new_content. "
            "mode=patch: old_string/new_string for small edits. "
            "new_title renames; position / after_chapter_id / before_chapter_id move it."
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
