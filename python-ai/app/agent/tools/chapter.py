"""Chapter tools — direct Content API, no VFS paths."""

from __future__ import annotations

import json
from typing import Any

from app.agent.backend import chapter_client
from app.agent.backend.chapter_meta import resolve_chapter_write_meta
from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import (
    DeleteChapterInput,
    EditChapterInput,
    ListChaptersInput,
    ReadChapterInput,
    ReorderChaptersInput,
    WriteChapterInput,
)
from app.agent.tools.tool import ToolCallResult, build_tool


def _format_chapter_list_text(rows: list[dict[str, Any]], *, project_title: str = "") -> str:
    from app.agent.context.compact import CHAPTER_LIST_SCOPE_NOTE

    header = CHAPTER_LIST_SCOPE_NOTE
    if project_title:
        header += f"\n《{project_title}》章节列表："
    if not rows:
        return f"{header}\n（暂无章节）"
    lines = [header]
    for r in rows:
        cid = str(r.get("id") or "")
        title = str(r.get("title") or "未命名")
        sort_order = int(r.get("sort_order") or 0)
        wc = int(r.get("word_count") or 0)
        lines.append(f"- [{cid}] sort={sort_order} {title}（{wc}字）")
    return "\n".join(lines)


async def list_chapters(ctx: AgentRunContext, inp: ListChaptersInput) -> ToolCallResult:
    rows = await chapter_client.fetch_chapter_summaries(ctx)
    items = [
        {
            "chapter_id": r["id"],
            "title": r["title"],
            "sort_order": r["sort_order"],
            "word_count": r["word_count"],
            **({"summary": r["summary"]} if inp.include_summary and r.get("summary") else {}),
        }
        for r in rows
    ]
    project_title = str((ctx.project or {}).get("title") or "").strip()
    list_text = _format_chapter_list_text(rows, project_title=project_title)
    patch: dict[str, Any] = {
        "last_chapter_list": list_text,
        "chapters": rows,
    }
    return ToolCallResult(
        content=json.dumps({"chapters": items}, ensure_ascii=False),
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
    content = (inp.content or "").strip()
    if not content:
        meta = resolve_chapter_write_meta(
            ctx, chapter_id=(inp.chapter_id or "").strip(), title=inp.title
        )
        patch: dict[str, Any] = {
            "chapter_write": {
                "title": meta["title"],
                "content": "",
                "sort_order": inp.sort_order or meta.get("sort_order", 0),
                "chapter_id": inp.chapter_id or meta.get("chapter_id", ""),
                "display_label": meta.get("display_label", inp.title),
            },
            "stream_chapter": True,
        }
        return ToolCallResult(
            content="WriteChapter accepted; chapter body will stream.",
            context_patch=patch,
        )

    payload: dict[str, Any] = {
        "title": inp.title,
        "content": normalize_chapter_body_for_persist(content),
    }
    if inp.sort_order:
        payload["sort_order"] = inp.sort_order
    if inp.chapter_id:
        payload["chapter_id"] = inp.chapter_id

    ok, out, err = await chapter_client.persist_chapter_write(ctx, payload)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    fresh = await chapter_client.fetch_chapter_summaries(ctx)
    patch = {"chapter_write": out}
    if fresh:
        patch["chapters"] = fresh
    return ToolCallResult(
        content=json.dumps({"ok": True, "chapter_id": out.get("chapter_id")}, ensure_ascii=False),
        context_patch=patch,
    )


async def edit_chapter(ctx: AgentRunContext, inp: EditChapterInput) -> ToolCallResult:
    full = await chapter_client.fetch_chapter_full(ctx, inp.chapter_id)
    if not full:
        return ToolCallResult(
            content=f"<tool_use_error>chapter not found: {inp.chapter_id}</tool_use_error>",
            is_error=True,
        )
    body = str(full.get("content") or "")
    if inp.old_string not in body:
        return ToolCallResult(
            content="<tool_use_error>old_string not found in chapter content</tool_use_error>",
            is_error=True,
        )
    if inp.replace_all:
        new_body = body.replace(inp.old_string, inp.new_string)
    else:
        new_body = body.replace(inp.old_string, inp.new_string, 1)

    payload = {
        "chapter_id": inp.chapter_id,
        "title": full.get("title") or "未命名",
        "content": normalize_chapter_body_for_persist(new_body),
        "sort_order": full.get("sort_order") or 0,
    }
    ok, out, err = await chapter_client.persist_chapter_write(ctx, payload)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)

    if inp.sort_order is not None:
        sok, serr = await chapter_client.update_chapter_sort_order(
            ctx, inp.chapter_id, inp.sort_order
        )
        if not sok:
            return ToolCallResult(
                content=f"<tool_use_error>{serr}</tool_use_error>", is_error=True
            )

    fresh = await chapter_client.fetch_chapter_summaries(ctx)
    patch: dict[str, Any] = {"chapter_write": out}
    if fresh:
        patch["chapters"] = fresh
    return ToolCallResult(
        content=json.dumps({"ok": True, "chapter_id": inp.chapter_id}, ensure_ascii=False),
        context_patch=patch,
    )


async def delete_chapter(ctx: AgentRunContext, inp: DeleteChapterInput) -> ToolCallResult:
    ok, err = await chapter_client.delete_chapter(ctx, inp.chapter_id)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    fresh = await chapter_client.fetch_chapter_summaries(ctx)
    patch = {"chapters": fresh} if fresh else {}
    return ToolCallResult(
        content=json.dumps({"ok": True, "deleted": inp.chapter_id}, ensure_ascii=False),
        context_patch=patch or None,
    )


async def reorder_chapters(ctx: AgentRunContext, inp: ReorderChaptersInput) -> ToolCallResult:
    ok, summaries, err = await chapter_client.reorder_novel_chapters(ctx, inp.chapter_ids)
    if not ok:
        return ToolCallResult(content=f"<tool_use_error>{err}</tool_use_error>", is_error=True)
    return ToolCallResult(
        content=json.dumps({"ok": True, "count": len(inp.chapter_ids)}, ensure_ascii=False),
        context_patch={"chapters": summaries},
    )


CHAPTER_TOOLS = [
    build_tool(
        name="ListChapters",
        description="List all chapters (chapter_id, title, sort_order, word_count). Use before Read/Edit.",
        input_model=ListChaptersInput,
        call=list_chapters,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="ReadChapter",
        description="Read chapter body by chapter_id (no path).",
        input_model=ReadChapterInput,
        call=read_chapter,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
    ),
    build_tool(
        name="WriteChapter",
        description="Create or overwrite a chapter. Omit content to stream-generate body.",
        input_model=WriteChapterInput,
        call=write_chapter,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="EditChapter",
        description="Edit chapter by string replace. Optional sort_order to reposition.",
        input_model=EditChapterInput,
        call=edit_chapter,
    ),
    build_tool(
        name="DeleteChapter",
        description="Delete a chapter by chapter_id.",
        input_model=DeleteChapterInput,
        call=delete_chapter,
        is_destructive=lambda _i: True,
    ),
    build_tool(
        name="ReorderChapters",
        description="Reorder all chapters by passing chapter_ids in desired reading order.",
        input_model=ReorderChaptersInput,
        call=reorder_chapters,
    ),
]
