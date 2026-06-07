"""Chapter CRUD via Content API (VFS backend)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.agent.schemas import AgentRunContext
from app.agent.backend.chapter_meta import (
    CHAPTER_TITLE_REQUIRED_MSG,
    is_valid_chapter_title,
    resolve_chapter_write_meta,
    sorted_chapter_summaries,
)
from app.config import settings

logger = logging.getLogger(__name__)


def normalize_chapter_summary(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(raw.get("id") or ""),
        "title": str(raw.get("title") or "未命名"),
        "summary": str(raw.get("summary") or ""),
        "sort_order": int(raw.get("sortOrder") or raw.get("sort_order") or 0),
        "word_count": int(raw.get("wordCount") or raw.get("word_count") or 0),
        "volume_id": str(raw.get("volumeId") or raw.get("volume_id") or ""),
        "volume_title": str(raw.get("volumeTitle") or raw.get("volume_title") or ""),
    }


async def fetch_chapter_summaries(ctx: AgentRunContext) -> list[dict[str, Any]]:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id or ctx.user_id <= 0:
        return [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
    url = f"{settings.content_base_url.rstrip('/')}/api/content/novels/{novel_id}/chapters"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"X-User-Id": str(ctx.user_id)})
            if resp.status_code != 200:
                return [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
            body = resp.json()
            if not isinstance(body, list):
                return [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
            summaries = [
                normalize_chapter_summary(item)
                for item in body
                if isinstance(item, dict) and item.get("id")
            ]
            return sorted_chapter_summaries(summaries)
    except Exception as exc:
        logger.warning("fetch chapter summaries failed novel=%s: %s", novel_id, exc)
    return [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]


async def fetch_chapter_read_slice(
    ctx: AgentRunContext,
    chapter_id: str,
    *,
    offset: int | None = None,
    limit: int | None = None,
) -> tuple[str | None, str | None]:
    """Content API line-based read (1-based offset/limit). Returns (numbered text, error)."""
    if not chapter_id or ctx.user_id <= 0:
        return None, "missing chapter_id or user_id"
    url = (
        f"{settings.content_base_url.rstrip('/')}/api/content/chapters/{chapter_id}/read"
    )
    params: dict[str, int] = {}
    if offset is not None:
        params["offset"] = int(offset)
    if limit is not None:
        params["limit"] = int(limit)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                url,
                headers={"X-User-Id": str(ctx.user_id)},
                params=params or None,
            )
            if resp.status_code == 404:
                return None, f"file not found: /novel/…/chapters/{chapter_id}.md"
            if resp.status_code != 200:
                return None, f"chapter read failed HTTP {resp.status_code}"
            body = resp.json()
            if not isinstance(body, dict):
                return None, "invalid chapter read response"
            return str(body.get("text") or ""), None
    except Exception as exc:
        logger.warning("fetch chapter read slice failed id=%s: %s", chapter_id, exc)
        return None, str(exc)


async def fetch_chapter_full(ctx: AgentRunContext, chapter_id: str) -> dict[str, Any] | None:
    if not chapter_id or ctx.user_id <= 0:
        return None
    url = f"{settings.content_base_url.rstrip('/')}/api/content/chapters/{chapter_id}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers={"X-User-Id": str(ctx.user_id)})
            if resp.status_code != 200:
                return None
            body = resp.json()
            if not isinstance(body, dict) or not body.get("id"):
                return None
            return {
                "id": str(body.get("id") or ""),
                "title": str(body.get("title") or "未命名"),
                "content": str(body.get("content") or ""),
                "summary": str(body.get("summary") or ""),
                "sort_order": int(body.get("sortOrder") or body.get("sort_order") or 0),
                "word_count": int(body.get("wordCount") or body.get("word_count") or 0),
            }
    except Exception as exc:
        logger.warning("fetch chapter full failed id=%s: %s", chapter_id, exc)
    return None


async def delete_chapter(ctx: AgentRunContext, chapter_id: str) -> tuple[bool, str]:
    if ctx.user_id <= 0:
        return False, "missing user_id"
    url = f"{settings.content_base_url.rstrip('/')}/api/content/chapters/{chapter_id}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(url, headers={"X-User-Id": str(ctx.user_id)})
            if resp.status_code in (200, 204):
                return True, ""
            if resp.status_code == 404:
                return False, f"chapter not found: {chapter_id}"
            return False, f"delete failed HTTP {resp.status_code}"
    except Exception as exc:
        return False, str(exc)


def format_persist_failure_message(meta: dict[str, Any], detail: str) -> str:
    label = str(meta.get("display_label") or meta.get("title") or "章节").strip()
    cid = str(meta.get("chapter_id") or "").strip()
    parts = [f"章节写入作品库失败：{label}"]
    if cid:
        parts.append(f"chapter_id={cid}")
    parts.append(f"错误：{(detail or 'unknown')[:500]}")
    return "；".join(parts)


async def persist_chapter_write(
    ctx: AgentRunContext,
    chapter_write: dict[str, Any],
) -> tuple[bool, dict[str, Any], str]:
    """
    PUT/POST Content API. Returns (ok, updated chapter_write, error_message_for_ai).
    On success sets persisted=True and may fill chapter_id from create response.
    """
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if ctx.user_id <= 0:
        return False, chapter_write, "missing user_id"
    content = chapter_write.get("content")
    if not isinstance(content, str) or not content.strip():
        return False, chapter_write, "chapter_write missing content"

    title = str(chapter_write.get("title") or "").strip()
    if not is_valid_chapter_title(title):
        return False, chapter_write, CHAPTER_TITLE_REQUIRED_MSG
    cid = str(chapter_write.get("chapter_id") or "").strip()
    meta = resolve_chapter_write_meta(ctx, chapter_id=cid, title=title)
    out = {**chapter_write, **meta}

    from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist

    body: dict[str, Any] = {
        "content": normalize_chapter_body_for_persist(content),
        "title": out["title"],
    }
    if out.get("sort_order"):
        body["sortOrder"] = int(out["sort_order"])

    headers = {"X-User-Id": str(ctx.user_id), "X-Edit-Source": "ai"}
    base = settings.content_base_url.rstrip("/")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if cid:
                url = f"{base}/api/content/chapters/{cid}"
                resp = await client.put(url, headers=headers, json=body)
                if resp.status_code in (200, 204):
                    out["chapter_id"] = cid
                elif resp.status_code == 404 and novel_id:
                    post_url = f"{base}/api/content/novels/{novel_id}/chapters"
                    resp = await client.post(post_url, headers=headers, json=body)
                    if resp.status_code in (200, 201):
                        created = resp.json()
                        if isinstance(created, dict) and created.get("id"):
                            out["chapter_id"] = str(created["id"])
                    else:
                        detail = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
                        return (
                            False,
                            out,
                            format_persist_failure_message(out, detail),
                        )
                else:
                    detail = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
                    return (
                        False,
                        out,
                        format_persist_failure_message(out, detail),
                    )
            elif novel_id:
                url = f"{base}/api/content/novels/{novel_id}/chapters"
                resp = await client.post(url, headers=headers, json=body)
                if resp.status_code not in (200, 201):
                    detail = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
                    return (
                        False,
                        out,
                        format_persist_failure_message(out, detail),
                    )
                created = resp.json()
                if isinstance(created, dict) and created.get("id"):
                    out["chapter_id"] = str(created["id"])
            else:
                return False, out, format_persist_failure_message(out, "missing novel_id")
    except Exception as exc:
        return False, out, format_persist_failure_message(out, str(exc))

    out["persisted"] = True
    return True, out, ""


async def update_chapter_sort_order(
    ctx: AgentRunContext,
    chapter_id: str,
    sort_order: int,
) -> tuple[bool, str]:
    if ctx.user_id <= 0 or not chapter_id:
        return False, "missing user_id or chapter_id"
    if sort_order < 1:
        return False, "sort_order must be >= 1"
    url = (
        f"{settings.content_base_url.rstrip('/')}/api/content/chapters/{chapter_id}"
    )
    headers = {"X-User-Id": str(ctx.user_id), "X-Edit-Source": "ai"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.put(
                url,
                headers=headers,
                json={"sortOrder": int(sort_order)},
            )
            if resp.status_code in (200, 204):
                return True, ""
            detail = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
            return False, detail
    except Exception as exc:
        return False, str(exc)


async def reorder_novel_chapters(
    ctx: AgentRunContext,
    chapter_ids: list[str],
) -> tuple[bool, list[dict[str, Any]], str]:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if ctx.user_id <= 0:
        return False, [], "missing user_id"
    if not novel_id:
        return False, [], "missing novel_id"
    ids = [str(cid).strip() for cid in chapter_ids if str(cid).strip()]
    if not ids:
        return False, [], "chapter_ids is empty"
    url = (
        f"{settings.content_base_url.rstrip('/')}/api/content/novels/{novel_id}/chapters/reorder"
    )
    headers = {"X-User-Id": str(ctx.user_id), "X-Edit-Source": "ai"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json={"ids": ids})
            if resp.status_code != 200:
                detail = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
                return False, [], detail
            body = resp.json()
            if not isinstance(body, list):
                fresh = await fetch_chapter_summaries(ctx)
                return True, fresh, ""
            summaries = [
                normalize_chapter_summary(item)
                for item in body
                if isinstance(item, dict) and item.get("id")
            ]
            return True, sorted_chapter_summaries(summaries), ""
    except Exception as exc:
        return False, [], str(exc)


def chapter_to_markdown(ch: dict[str, Any]) -> str:
    title = str(ch.get("title") or "未命名")
    cid = str(ch.get("id") or "")
    list_index = int(ch.get("list_index") or 0)
    sort_order = int(ch.get("sort_order") or 0)
    summary = str(ch.get("summary") or "")
    content = str(ch.get("content") or "")
    header = (
        f"---\ntitle: {title}\nchapter_id: {cid}\n"
        f"list_index: {list_index}\nsort_order: {sort_order}\n---\n\n"
    )
    if summary and summary not in content[:200]:
        header += f"<!-- summary: {summary} -->\n\n"
    return header + content
