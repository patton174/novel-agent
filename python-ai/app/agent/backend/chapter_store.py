"""Chapter CRUD via Content API (VFS backend)."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.agent.backend.chapter_read_stream import collect_chapter_read_text, iter_ndjson_response

from app.agent.backend.chapter_meta import (
    CHAPTER_TITLE_REQUIRED_MSG,
    is_valid_chapter_title,
    resolve_chapter_write_meta,
    sorted_chapter_summaries,
)
from app.agent.backend.content_api import content_auth_url, extract_api_error, unwrap_result, user_headers
from app.agent.schemas import AgentRunContext

logger = logging.getLogger(__name__)


def _chapter_http_error(resp: httpx.Response) -> str:
    body: Any = None
    try:
        if resp.content:
            body = resp.json()
    except Exception:
        body = None
    return extract_api_error(
        body,
        status_code=resp.status_code,
        default=resp.text[:300] if resp.text else f"HTTP {resp.status_code}",
    )


def normalize_chapter_summary(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize ChapterSummaryDTO or ChapterRowDTO from Content API."""
    chapter_id = str(
        raw.get("id")
        or raw.get("chapterId")
        or raw.get("chapter_id")
        or ""
    )
    list_index = int(raw.get("listIndex") or raw.get("list_index") or raw.get("index") or 0)
    return {
        "id": chapter_id,
        "title": str(raw.get("title") or "未命名"),
        "summary": str(raw.get("summary") or ""),
        "sort_order": int(raw.get("sortOrder") or raw.get("sort_order") or 0),
        "word_count": int(raw.get("wordCount") or raw.get("word_count") or 0),
        "volume_id": str(raw.get("volumeId") or raw.get("volume_id") or ""),
        "volume_title": str(raw.get("volumeTitle") or raw.get("volume_title") or ""),
        "list_index": list_index,
    }


def _summaries_from_api_list(body: list[Any]) -> list[dict[str, Any]]:
    summaries = [
        normalize_chapter_summary(item)
        for item in body
        if isinstance(item, dict) and (item.get("id") or item.get("chapterId"))
    ]
    if any(item.get("list_index") for item in summaries):
        return sorted(summaries, key=lambda item: item.get("list_index") or item.get("sort_order") or 0)
    return sorted_chapter_summaries(summaries)


def _fallback_ctx_chapters(ctx: AgentRunContext) -> list[dict[str, Any]]:
    return sorted_chapter_summaries(
        [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
    )


async def fetch_chapter_summaries(ctx: AgentRunContext) -> list[dict[str, Any]]:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id or ctx.user_id <= 0:
        return _fallback_ctx_chapters(ctx)
    for path in ("/chapters/rows", "/chapters"):
        url = content_auth_url(f"/novels/{novel_id}{path}")
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(url, headers=user_headers(ctx.user_id))
                if resp.status_code != 200:
                    continue
                body = unwrap_result(resp.json())
                if not isinstance(body, list):
                    continue
                return _summaries_from_api_list(body)
        except Exception as exc:
            logger.warning("fetch chapter summaries failed novel=%s path=%s: %s", novel_id, path, exc)
    return _fallback_ctx_chapters(ctx)


async def resolve_chapter_row_api(
    ctx: AgentRunContext,
    *,
    chapter_id: str | None = None,
    title: str | None = None,
    index: int | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    """Server-side row resolve (index / chapter_id / title)."""
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id or ctx.user_id <= 0:
        return None, "missing novel_id or user_id"
    params: dict[str, str | int] = {}
    cid = str(chapter_id or "").strip()
    if cid:
        params["chapterId"] = cid
    if index is not None:
        params["index"] = int(index)
    want = str(title or "").strip()
    if want:
        params["title"] = want
    if not params:
        return None, "provide chapterId, title, or index"
    url = content_auth_url(f"/novels/{novel_id}/chapters/resolve")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=user_headers(ctx.user_id), params=params)
            if resp.status_code == 400:
                body = resp.json() if resp.content else {}
                return None, extract_api_error(body, status_code=400, default="resolve failed")
            if resp.status_code != 200:
                return None, f"chapter resolve failed HTTP {resp.status_code}"
            body = unwrap_result(resp.json())
            if not isinstance(body, dict):
                return None, "invalid chapter resolve response"
            row = normalize_chapter_summary(body)
            if not row.get("id"):
                return None, "chapter not found"
            return row, None
    except Exception as exc:
        logger.warning("resolve chapter row failed novel=%s: %s", novel_id, exc)
        return None, str(exc)


async def fetch_chapter_read_by_target(
    ctx: AgentRunContext,
    *,
    chapter_id: str | None = None,
    title: str | None = None,
    index: int | None = None,
    offset: int | None = None,
    limit: int | None = None,
) -> tuple[str | None, str | None]:
    """Novel-level read by index / chapter_id / title — single JSON response."""
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id or ctx.user_id <= 0:
        return None, "missing novel_id or user_id"
    params: dict[str, int | str] = {}
    cid = str(chapter_id or "").strip()
    if cid:
        params["chapterId"] = cid
    if index is not None:
        params["index"] = int(index)
    want = str(title or "").strip()
    if want:
        params["title"] = want
    if offset is not None:
        params["offset"] = int(offset)
    if limit is not None:
        params["limit"] = int(limit)
    if not (cid or want or index is not None):
        return None, "provide chapterId, title, or index"
    url = content_auth_url(f"/novels/{novel_id}/chapters/read")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(
                url,
                headers=user_headers(ctx.user_id),
                params=params or None,
            )
        if resp.status_code >= 400:
            body: Any = None
            try:
                if resp.content:
                    body = resp.json()
            except Exception:
                body = None
            return None, extract_api_error(
                body,
                status_code=resp.status_code,
                default=resp.text[:300] if resp.text else f"HTTP {resp.status_code}",
            )
        data = unwrap_result(resp.json())
        if not isinstance(data, dict):
            return None, "invalid chapter read response"
        return str(data.get("text") or ""), None
    except Exception as exc:
        logger.warning("chapter read by target failed novel=%s: %s", novel_id, exc)
        return None, str(exc)


async def iter_chapter_read_by_target_stream(
    ctx: AgentRunContext,
    *,
    chapter_id: str | None = None,
    title: str | None = None,
    index: int | None = None,
    offset: int | None = None,
    limit: int | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Yield NDJSON events from Content API read/stream."""
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id or ctx.user_id <= 0:
        yield {"type": "error", "message": "missing novel_id or user_id"}
        return
    params: dict[str, str | int] = {}
    cid = str(chapter_id or "").strip()
    if cid:
        params["chapterId"] = cid
    if index is not None:
        params["index"] = int(index)
    want = str(title or "").strip()
    if want:
        params["title"] = want
    if offset is not None:
        params["offset"] = int(offset)
    if limit is not None:
        params["limit"] = int(limit)
    if not (cid or want or index is not None):
        yield {"type": "error", "message": "provide chapterId, title, or index"}
        return
    url = content_auth_url(f"/novels/{novel_id}/chapters/read/stream")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "GET",
                url,
                headers=user_headers(ctx.user_id),
                params=params or None,
            ) as resp:
                if resp.status_code == 400:
                    raw = await resp.aread()
                    try:
                        parsed = json.loads(raw.decode("utf-8")) if raw else {}
                    except Exception:
                        parsed = {}
                    yield {
                        "type": "error",
                        "message": extract_api_error(parsed, status_code=400, default="read failed"),
                    }
                    return
                if resp.status_code == 404:
                    yield {"type": "error", "message": "chapter not found"}
                    return
                if resp.status_code != 200:
                    yield {
                        "type": "error",
                        "message": f"chapter read stream failed HTTP {resp.status_code}",
                    }
                    return
                async for obj in iter_ndjson_response(resp):
                    yield obj
    except Exception as exc:
        logger.warning("chapter read stream by target failed novel=%s: %s", novel_id, exc)
        yield {"type": "error", "message": str(exc)}


async def _fetch_chapter_read_by_target_stream_collect(
    ctx: AgentRunContext,
    *,
    chapter_id: str | None = None,
    title: str | None = None,
    index: int | None = None,
    offset: int | None = None,
    limit: int | None = None,
) -> tuple[str | None, str | None]:
    text, _, err = await collect_chapter_read_text(
        iter_chapter_read_by_target_stream(
            ctx,
            chapter_id=chapter_id,
            title=title,
            index=index,
            offset=offset,
            limit=limit,
        )
    )
    if err:
        return None, err
    return text, None


async def iter_chapter_read_slice_stream(
    ctx: AgentRunContext,
    chapter_id: str,
    *,
    offset: int | None = None,
    limit: int | None = None,
) -> AsyncIterator[dict[str, Any]]:
    if not chapter_id or ctx.user_id <= 0:
        yield {"type": "error", "message": "missing chapter_id or user_id"}
        return
    url = content_auth_url(f"/chapters/{chapter_id}/read/stream")
    params: dict[str, int] = {}
    if offset is not None:
        params["offset"] = int(offset)
    if limit is not None:
        params["limit"] = int(limit)
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "GET",
                url,
                headers=user_headers(ctx.user_id),
                params=params or None,
            ) as resp:
                if resp.status_code == 404:
                    yield {
                        "type": "error",
                        "message": f"file not found: /novel/…/chapters/{chapter_id}.md",
                    }
                    return
                if resp.status_code != 200:
                    yield {
                        "type": "error",
                        "message": f"chapter read stream failed HTTP {resp.status_code}",
                    }
                    return
                async for obj in iter_ndjson_response(resp):
                    yield obj
    except Exception as exc:
        logger.warning("chapter read slice stream failed id=%s: %s", chapter_id, exc)
        yield {"type": "error", "message": str(exc)}


async def fetch_chapter_read_slice(
    ctx: AgentRunContext,
    chapter_id: str,
    *,
    offset: int | None = None,
    limit: int | None = None,
    list_index: int | None = None,
) -> tuple[str | None, str | None]:
    """Content API line-based read (1-based offset/limit). Single JSON response — no NDJSON stream."""
    if not chapter_id or ctx.user_id <= 0:
        return None, "missing chapter_id or user_id"
    url = content_auth_url(f"/chapters/{chapter_id}/read")
    params: dict[str, int] = {}
    if offset is not None:
        params["offset"] = int(offset)
    if limit is not None:
        params["limit"] = int(limit)
    if list_index is not None and int(list_index) > 0:
        params["listIndex"] = int(list_index)
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(
                url,
                headers=user_headers(ctx.user_id),
                params=params or None,
            )
        if resp.status_code == 404:
            return None, f"file not found: /novel/…/chapters/{chapter_id}.md"
        if resp.status_code >= 400:
            body: Any = None
            try:
                if resp.content:
                    body = resp.json()
            except Exception:
                body = None
            return None, extract_api_error(
                body,
                status_code=resp.status_code,
                default=resp.text[:300] if resp.text else f"HTTP {resp.status_code}",
            )
        data = unwrap_result(resp.json())
        if not isinstance(data, dict):
            return None, "invalid chapter read response"
        text = str(data.get("text") or "")
        return text, None
    except Exception as exc:
        logger.warning("chapter read slice failed id=%s: %s", chapter_id, exc)
        return None, str(exc)


async def fetch_chapter_full(ctx: AgentRunContext, chapter_id: str) -> dict[str, Any] | None:
    if not chapter_id or ctx.user_id <= 0:
        return None
    url = content_auth_url(f"/chapters/{chapter_id}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=user_headers(ctx.user_id))
            if resp.status_code != 200:
                return None
            body = unwrap_result(resp.json())
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
    url = content_auth_url(f"/chapters/{chapter_id}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(url, headers=user_headers(ctx.user_id))
            if resp.status_code in (200, 204):
                return True, ""
            if resp.status_code == 404:
                return False, f"chapter not found: {chapter_id}"
            body = resp.json() if resp.content else {}
            return False, extract_api_error(body, status_code=resp.status_code, default="delete failed")
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

    headers = user_headers(ctx.user_id, edit_source="ai")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if cid:
                url = content_auth_url(f"/chapters/{cid}")
                resp = await client.put(url, headers=headers, json=body)
                if resp.status_code in (200, 204):
                    out["chapter_id"] = cid
                elif resp.status_code == 404 and novel_id:
                    post_url = content_auth_url(f"/novels/{novel_id}/chapters")
                    resp = await client.post(post_url, headers=headers, json=body)
                    if resp.status_code in (200, 201):
                        created = unwrap_result(resp.json())
                        if isinstance(created, dict) and created.get("id"):
                            out["chapter_id"] = str(created["id"])
                    else:
                        detail = _chapter_http_error(resp)
                        return (
                            False,
                            out,
                            format_persist_failure_message(out, detail),
                        )
                else:
                    detail = _chapter_http_error(resp)
                    return (
                        False,
                        out,
                        format_persist_failure_message(out, detail),
                    )
            elif novel_id:
                url = content_auth_url(f"/novels/{novel_id}/chapters")
                resp = await client.post(url, headers=headers, json=body)
                if resp.status_code not in (200, 201):
                    detail = _chapter_http_error(resp)
                    return (
                        False,
                        out,
                        format_persist_failure_message(out, detail),
                    )
                created = unwrap_result(resp.json())
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
    url = content_auth_url(f"/chapters/{chapter_id}")
    headers = user_headers(ctx.user_id, edit_source="ai")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.put(
                url,
                headers=headers,
                json={"sortOrder": int(sort_order)},
            )
            if resp.status_code in (200, 204):
                return True, ""
            detail = _chapter_http_error(resp)
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
    url = content_auth_url(f"/novels/{novel_id}/chapters/reorder")
    headers = user_headers(ctx.user_id, edit_source="ai")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json={"ids": ids})
            if resp.status_code != 200:
                detail = _chapter_http_error(resp)
                return False, [], detail
            body = unwrap_result(resp.json())
            if not isinstance(body, list):
                fresh = await fetch_chapter_summaries(ctx)
                return True, fresh, ""
            summaries = [
                normalize_chapter_summary(item)
                for item in body
                if isinstance(item, dict) and (item.get("id") or item.get("chapterId"))
            ]
            if any(item.get("list_index") for item in summaries):
                return True, sorted(
                    summaries,
                    key=lambda item: item.get("list_index") or item.get("sort_order") or 0,
                ), ""
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
