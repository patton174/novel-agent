"""Streaming chapter persistence — truthful awaited saves (AGENT_REFACTOR_PLAN P1.1).

Rewrite goals vs. the old fire-and-forget implementation:
  - **Truth**: every persist is *awaited*; ``finalize`` returns the real error so
    the loop surfaces a recoverable failure instead of a fake success.
  - **No duplicate chapters**: the first successful persist (POST) back-fills
    ``chapter_id``; all subsequent flushes go through PUT.
  - **No dropped versions**: persists are serialized by a lock and coalesce on the
    latest accumulated body; progressive flushes are shielded so a later delta
    cannot abort an in-flight create (which would lose the new ``chapter_id``).
  - **No empty shell**: the old ``schedule_start`` POSTed an empty-content shell
    that the Content API rejected anyway — removed.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.agent.backend import chapter_client
from app.agent.backend.chapter_meta import resolve_chapter_write_meta
from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist
from app.agent.schemas import AgentRunContext

logger = logging.getLogger(__name__)

_FLUSH_DEBOUNCE_SEC = 1.2
_MIN_FLUSH_CHARS = 280


class StreamingChapterAppender:
    """Append-style chapter persist aligned with chapter.stream.delta.

    Usage: ``append_delta(text)`` during streaming, then ``await finalize()`` once
    the body is complete. ``finalize`` returns ``(context_patch, error)``.
    """

    def __init__(
        self,
        ctx: AgentRunContext,
        *,
        title: str,
        chapter_id: str = "",
        stream_input: dict[str, Any] | None = None,
    ) -> None:
        self.ctx = ctx
        self.title = (title or "").strip() or "未命名"
        self.chapter_id = (chapter_id or "").strip()
        self.stream_input = dict(stream_input or {})
        self._accumulated = ""
        self._meta: dict[str, Any] = {}
        self._flush_task: asyncio.Task[None] | None = None
        self._last_persisted_len = 0
        self._persist_lock = asyncio.Lock()
        self._last_error: str | None = None

    async def append_delta(self, text: str) -> None:
        if not (text or "").strip():
            return
        self._accumulated += text
        # Restart the debounce window; the prior timer (if still sleeping) is
        # cancelled. A timer already inside _flush is shielded and keeps running.
        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        self._flush_task = asyncio.create_task(self._debounced_flush())

    async def _debounced_flush(self) -> None:
        try:
            await asyncio.sleep(_FLUSH_DEBOUNCE_SEC)
        except asyncio.CancelledError:
            return
        # Progressive save is best-effort but must not be aborted mid-persist by a
        # later append (that could create a duplicate chapter before chapter_id is
        # back-filled). Shield the actual persist.
        await asyncio.shield(self._flush(final=False))

    async def _flush(self, *, final: bool) -> str | None:
        """Persist the current accumulated body. Returns error string or None."""
        async with self._persist_lock:
            body = normalize_chapter_body_for_persist(self._accumulated)
            if not body:
                return None
            if not final:
                grown = len(body) - self._last_persisted_len
                if grown <= 0:
                    return None
                if self._last_persisted_len > 0 and grown < _MIN_FLUSH_CHARS:
                    return None
            payload = self._chapter_write_payload(body)
            if not payload:
                return None
            ok, out, err = await chapter_client.persist_chapter_write(self.ctx, payload)
            if not ok:
                self._last_error = err
                logger.warning(
                    "stream chapter persist failed final=%s title=%s: %s",
                    final,
                    self.title,
                    err,
                )
                return err
            new_cid = str(out.get("chapter_id") or "").strip()
            if new_cid:
                self.chapter_id = new_cid  # back-fill → next flush uses PUT
            self._last_persisted_len = len(body)
            self._last_error = None
            return None

    def _chapter_write_payload(self, body: str) -> dict[str, Any] | None:
        if self.ctx.user_id <= 0:
            return None
        if not self._meta:
            self._meta = resolve_chapter_write_meta(
                self.ctx,
                chapter_id=self.chapter_id,
                title=self.title,
            )
        title = str(self._meta.get("title") or self.title or "未命名").strip()
        payload: dict[str, Any] = {
            "title": title,
            "content": body,
            "display_label": self._meta.get("display_label") or title,
        }
        if self.chapter_id:
            payload["chapter_id"] = self.chapter_id
        sort_order = self._meta.get("sort_order")
        if sort_order:
            payload["sort_order"] = int(sort_order)
        return payload

    async def finalize(self) -> tuple[dict[str, Any], str | None]:
        # Stop any pending debounce timer; an in-flight shielded persist keeps
        # running and will be awaited via the persist lock inside _flush.
        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        body = normalize_chapter_body_for_persist(self._accumulated)
        patch: dict[str, Any] = {}
        if not body:
            return patch, None

        payload = self._chapter_write_payload(body)
        if not payload:
            return patch, None

        # Authoritative full-body persist (awaited truth).
        err = await self._flush(final=True)
        label = str(payload.get("display_label") or payload.get("title") or "章节")
        if err:
            failure = {**payload, "error": err}
            if self.chapter_id:
                failure["chapter_id"] = self.chapter_id
            patch["chapter_persist_failures"] = [failure]
            return patch, err

        cw: dict[str, Any] = {**payload, "persisted": True, "content": body}
        if self.chapter_id:
            cw["chapter_id"] = self.chapter_id
        for key in (
            "target_position",
            "position",
            "after_chapter_id",
            "before_chapter_id",
        ):
            if key in self.stream_input and self.stream_input[key] is not None:
                cw[key] = self.stream_input[key]
        patch["chapter_write"] = cw
        patch["chapter_async"] = "streamed"

        # Reorder + catalog refresh (awaited truth; body already persisted above).
        from app.agent.tools.chapter_stream import persist_chapter_write_patch

        finalized, ferr = await persist_chapter_write_patch(self.ctx, patch)
        if ferr:
            failures = finalized.get("chapter_persist_failures")
            if not isinstance(failures, list):
                failures = []
            failures.append({**cw, "error": ferr})
            finalized["chapter_persist_failures"] = failures
            return finalized, ferr
        return finalized, None
