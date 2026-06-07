"""Chapter stream persistence helpers (post-stream save for WriteChapter)."""

from __future__ import annotations

import re
from typing import Any

from app.agent.backend import chapter_client
from app.agent.backend.chapter_meta import resolve_chapter_write_meta, resolve_chapter_write_title
from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist
from app.agent.schemas import AgentRunContext
from app.agent.harness.tool_display import split_frontmatter

CHAPTER_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)


def title_from_chapter_markdown(body: str) -> str:
    """Only YAML frontmatter title; never treat body first line as chapter title."""
    text = (body or "").strip()
    if not text.startswith("---"):
        return ""
    end = text.find("---", 3)
    if end <= 0:
        return ""
    front = text[3:end]
    for line in front.splitlines():
        line = line.strip()
        if line.lower().startswith("title:"):
            return line.split(":", 1)[1].strip().strip('"') or ""
    return ""


def attach_chapter_write_patch(
    patch: dict,
    *,
    file_path: str = "",
    content: str,
    ctx: AgentRunContext | None = None,
    title: str = "",
    chapter_id: str = "",
) -> dict:
    """Build chapter_write side-effect from streamed or written chapter body."""
    out = dict(patch or {})
    raw_body = str(out.get("write_content") or content or "").strip()
    _, stripped = split_frontmatter(raw_body)
    body = normalize_chapter_body_for_persist(stripped or raw_body)
    if not body:
        return out

    cw_existing = out.get("chapter_write") if isinstance(out.get("chapter_write"), dict) else {}
    cid = str(out.get("chapter_id") or cw_existing.get("chapter_id") or chapter_id or "").strip()
    if not cid and file_path and "/chapters/" in file_path:
        tail = file_path.split("/chapters/")[-1].replace(".md", "")
        if tail and tail != "_new" and CHAPTER_ID_RE.match(tail):
            cid = tail

    fm_title = title_from_chapter_markdown(raw_body)
    explicit_title = str(cw_existing.get("title") or title or "").strip()
    resolved_title, title_err = resolve_chapter_write_title(
        ctx, chapter_id=cid, frontmatter_title=fm_title or explicit_title
    )
    if title_err:
        out["chapter_write_error"] = title_err
        return out
    assert resolved_title is not None
    meta = (
        resolve_chapter_write_meta(ctx, chapter_id=cid, title=resolved_title)
        if ctx is not None
        else {
            "chapter_id": cid,
            "title": resolved_title,
            "sort_order": 0,
            "list_index": 0,
            "display_label": resolved_title,
        }
    )
    chapter_write: dict[str, Any] = {
        "title": meta["title"],
        "content": body,
        "sort_order": meta.get("sort_order", 0),
        "list_index": meta.get("list_index", 0),
        "display_label": meta.get("display_label", meta["title"]),
    }
    if cid and CHAPTER_ID_RE.match(cid):
        chapter_write["chapter_id"] = cid
    out["chapter_write"] = chapter_write
    return out


async def persist_chapter_write_patch(
    ctx: AgentRunContext, patch: dict
) -> tuple[dict, str | None]:
    """Sync persist to Content API; returns (patch, error_for_ai)."""
    cw = patch.get("chapter_write")
    if not isinstance(cw, dict) or cw.get("persisted"):
        return patch, None
    ok, updated, err = await chapter_client.persist_chapter_write(ctx, cw)
    if not ok:
        failures = patch.get("chapter_persist_failures")
        if not isinstance(failures, list):
            failures = []
        failures.append({**(updated or cw), "error": err})
        patch = {**patch, "chapter_persist_failures": failures}
        return patch, err
    patch = {**patch, "chapter_write": updated}
    fresh = await chapter_client.fetch_chapter_summaries(ctx)
    if fresh:
        patch["chapters"] = fresh
    return patch, None
