"""Crawl agent working memory — append-step context with stale pruning."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

PAGE_HTML_MAX = 22_000
MEMORY_CHAR_BUDGET = 24_000
MAX_ACTIVE_PAGE_VIEWS = 2


@dataclass
class CrawlMemoryEntry:
    id: str
    step: int
    kind: str
    url: str
    text: str
    active: bool = True
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class CrawlContextMemory:
    entries: list[CrawlMemoryEntry] = field(default_factory=list)
    step_counter: int = 0

    def apply_patch(self, patch: dict[str, Any]) -> None:
        if not patch:
            return
        if "append_page" in patch:
            self._append_page(dict(patch["append_page"] or {}))
        if "append_catalog" in patch:
            self._append_catalog(dict(patch["append_catalog"] or {}))
        if "append_note" in patch:
            self._append_note(str(patch["append_note"] or ""))
        if patch.get("clear_pages"):
            self._deactivate_pages()
        self._trim_budget()

    def _next_step(self) -> int:
        self.step_counter += 1
        return self.step_counter

    def _append_page(self, data: dict[str, Any]) -> None:
        url = str(data.get("url") or "").strip()
        content = str(data.get("content") or "").strip()[:PAGE_HTML_MAX]
        title = str(data.get("title") or "").strip()
        header = f"<!-- title: {title} -->\n" if title else ""
        body = f"{header}{content}".strip()

        active_pages = [e for e in self.entries if e.kind == "page_view" and e.active]
        while len(active_pages) >= MAX_ACTIVE_PAGE_VIEWS:
            oldest = active_pages.pop(0)
            oldest.active = False
            oldest.text = f"（已失效）曾打开 {oldest.url}"

        self.entries.append(
            CrawlMemoryEntry(
                id=str(uuid4()),
                step=self._next_step(),
                kind="page_view",
                url=url,
                text=body,
                meta={"chars": len(content), "title": title},
            )
        )

    def _append_catalog(self, data: dict[str, Any]) -> None:
        title = str(data.get("title") or "")
        author = str(data.get("author") or "")
        count = int(data.get("chapter_count") or 0)
        preview = data.get("chapters_preview") if isinstance(data.get("chapters_preview"), list) else []
        preview_lines = [
            f"  {i}. {c.get('title', '')} → {c.get('url', '')}"
            for i, c in enumerate(preview[:12], start=1)
            if isinstance(c, dict)
        ]
        text = "\n".join(
            [
                f"书名：{title}",
                f"作者：{author or '未知'}",
                f"章节数：{count}",
                "章节预览：",
                *preview_lines,
            ]
        )
        self._deactivate_pages()
        self.entries.append(
            CrawlMemoryEntry(
                id=str(uuid4()),
                step=self._next_step(),
                kind="catalog",
                url=str(data.get("url") or ""),
                text=text,
                meta={"chapter_count": count},
            )
        )

    def _append_note(self, note: str) -> None:
        note = note.strip()
        if not note:
            return
        self.entries.append(
            CrawlMemoryEntry(
                id=str(uuid4()),
                step=self._next_step(),
                kind="note",
                url="",
                text=note,
            )
        )

    def _deactivate_pages(self) -> None:
        for entry in self.entries:
            if entry.kind == "page_view" and entry.active:
                entry.active = False
                if not entry.text.startswith("（已失效）"):
                    entry.text = f"（已失效）{entry.url}"

    def active_entries(self) -> list[CrawlMemoryEntry]:
        return [e for e in self.entries if e.active]

    def _trim_budget(self) -> None:
        total = sum(len(e.text) for e in self.entries if e.active)
        if total <= MEMORY_CHAR_BUDGET:
            return
        for entry in self.entries:
            if entry.kind != "page_view" or not entry.active:
                continue
            if total <= MEMORY_CHAR_BUDGET:
                break
            if len(entry.text) > 2000:
                cut = len(entry.text) - 2000
                entry.text = entry.text[:2000] + f"\n…(截断 {cut} 字)"
                total = sum(len(e.text) for e in self.entries if e.active)

    def format_sections(self) -> list[str]:
        sections: list[str] = []
        for entry in self.active_entries():
            header = f"### Step {entry.step} · {entry.kind}"
            if entry.url:
                header += f" · {entry.url}"
            sections.append(f"{header}\n{entry.text}")
        return sections

    def snapshot_json(self) -> dict[str, Any]:
        return {
            "step_counter": self.step_counter,
            "active_entries": [
                {"step": e.step, "kind": e.kind, "url": e.url, "chars": len(e.text)}
                for e in self.active_entries()
            ],
        }
