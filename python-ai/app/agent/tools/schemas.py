"""Structured API tool input schemas — ID/enum based, no file paths."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NarrativeReviewScope(str, Enum):
    recent = "recent"
    full_book = "full_book"
    changed = "changed"


class MemoryScope(str, Enum):
    novel = "novel"
    world = "world"
    character = "character"
    chapter = "chapter"
    background = "background"


class SearchMode(str, Enum):
    vector = "vector"
    graph = "graph"
    hybrid = "hybrid"


class ListChaptersInput(BaseModel):
    include_summary: bool = Field(False, description="Include per-chapter summary text.")


class ChapterAuditInput(BaseModel):
    """No fields — audits current novel chapter catalog."""


class NarrativeReviewInput(BaseModel):
    scope: NarrativeReviewScope = Field(
        NarrativeReviewScope.recent,
        description="recent=last N chapters; full_book=semantic scan all + deep read focus; changed=focus_chapter_ids.",
    )
    chapter_ids: list[str] | None = Field(
        None,
        description="Explicit chapter ids (overrides scope selection for deep-read window).",
    )
    focus_chapter_ids: list[str] | None = Field(
        None,
        description="Recently changed chapters — deep ReadChapter + memory check.",
    )
    max_chapters: int = Field(
        5,
        ge=1,
        le=12,
        description="Max chapters for deep-read body excerpts in one LLM call.",
    )
    semantic_threshold: float = Field(
        0.88,
        ge=0.5,
        le=0.99,
        description="Cosine similarity threshold for cross-chapter semantic duplicates.",
    )
    check_continuity: bool = True
    check_outline: bool = True
    check_worldview: bool = True
    check_foreshadow: bool = True
    check_duplication: bool = True
    check_engagement: bool = True


class ReadChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1, description="Chapter UUID from ListChapters.")
    offset: int | None = Field(None, ge=1, description="1-based start line.")
    limit: int | None = Field(None, ge=1, description="Max lines; omit to read to end.")


class WriteChapterInput(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        description="Pure chapter title (no 第N章 prefix; index comes from sort order).",
    )
    content: str = Field("", description="Chapter body; empty triggers stream generation.")
    chapter_id: str | None = Field(None, description="Existing chapter UUID to overwrite.")
    position: int | None = Field(
        None,
        ge=1,
        description="1-based reading slot (1=first). Defaults to append for new chapters.",
    )
    after_chapter_id: str | None = Field(
        None,
        description="Insert after this chapter (alternative to position).",
    )
    before_chapter_id: str | None = Field(
        None,
        description="Insert before this chapter (alternative to position).",
    )
    sort_order: int | None = Field(
        None,
        ge=1,
        description="Alias of position (legacy).",
    )


class EditChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    old_string: str = Field(..., min_length=1)
    new_string: str = Field("")
    replace_all: bool = False
    position: int | None = Field(None, ge=1, description="Move chapter to this reading slot.")
    after_chapter_id: str | None = None
    before_chapter_id: str | None = None
    sort_order: int | None = Field(None, ge=1, description="Alias of position (legacy).")


class DeleteChapterInput(BaseModel):
    chapter_id: str | None = Field(None, description="Delete a single chapter.")
    chapter_ids: list[str] | None = Field(None, description="Delete multiple chapters.")
    dedupe_title: str | None = Field(
        None,
        min_length=1,
        description="Drop duplicate chapters with this exact title; keeps the earliest in reading order.",
    )


class ChapterMoveInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    position: int = Field(..., ge=1, description="Target 1-based reading slot.")


class ReorderChaptersInput(BaseModel):
    chapter_ids: list[str] | None = Field(
        None,
        min_length=1,
        description="Full reading order. Omitted chapters are appended after these, in prior order.",
    )
    moves: list[ChapterMoveInput] | None = Field(
        None,
        min_length=1,
        description="Partial moves; tool merges with the current catalog order.",
    )


class ListMemoryInput(BaseModel):
    scope: MemoryScope | None = Field(None, description="Filter by scope; omit for all.")


class ReadMemoryInput(BaseModel):
    scope: MemoryScope = Field(..., description="Memory scope.")
    key: str = Field(..., min_length=1, description="Entry key (raw, not URL-encoded).")
    offset: int | None = Field(None, ge=1)
    limit: int | None = Field(None, ge=1)


class WriteMemoryInput(BaseModel):
    scope: MemoryScope
    key: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(..., description="Memory document body (v1 JSON object).")


class EditMemoryInput(BaseModel):
    scope: MemoryScope
    key: str = Field(..., min_length=1)
    old_string: str = Field(..., min_length=1)
    new_string: str = Field(...)
    replace_all: bool = False


class DeleteMemoryInput(BaseModel):
    scope: MemoryScope
    key: str = Field(..., min_length=1)


class SearchKnowledgeInput(BaseModel):
    query: str = Field(..., min_length=1)
    mode: SearchMode = Field(SearchMode.hybrid, description="vector | graph | hybrid")
    top_k: int = Field(5, ge=1, le=20)


class GetCharacterGraphInput(BaseModel):
    character: str = Field(..., min_length=1, description="Character name to get relationship subgraph.")


class AskUserInput(BaseModel):
    questions: list[dict[str, Any]] = Field(default_factory=list)
    options: list[dict[str, Any]] | None = None


class TodoItemInput(BaseModel):
    model_config = {"extra": "allow"}
    id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    status: str = "pending"


class TodoWriteInput(BaseModel):
    todos: list[TodoItemInput]
    merge: bool = True


class AgentInput(BaseModel):
    description: str = Field(..., description="Short label for UI.")
    prompt: str = Field(..., description="Full subtask spec for the child agent.")


class WebSearchInput(BaseModel):
    query: str = Field(..., min_length=1)


class WebFetchInput(BaseModel):
    url: str = Field(..., min_length=1)
    prompt: str = Field("", description="Optional extraction instruction.")


class ListMcpResourcesInput(BaseModel):
    server: str = Field("", description="MCP server name; empty for all.")


class ReadMcpResourceInput(BaseModel):
    server: str = Field(..., min_length=1)
    uri: str = Field(..., min_length=1)


class SkillInput(BaseModel):
    skill: str = Field(..., min_length=1, description="Skill name to load.")
