"""Structured API tool input schemas — ID/enum based, no file paths."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


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
    include_summary: bool = Field(True, description="Include chapter summary in listing.")


class ReadChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1, description="Chapter UUID from ListChapters.")
    offset: int | None = Field(None, ge=1, description="1-based start line.")
    limit: int | None = Field(None, ge=1, description="Max lines; omit to read to end.")


class WriteChapterInput(BaseModel):
    title: str = Field(..., min_length=1, description="Chapter title.")
    content: str = Field("", description="Chapter body; omit or empty to stream-generate.")
    sort_order: int | None = Field(None, ge=1, description="1-based position; omit to append.")
    chapter_id: str | None = Field(None, description="Set to overwrite an existing chapter.")


class EditChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    old_string: str = Field(..., min_length=1)
    new_string: str = Field(...)
    replace_all: bool = False
    sort_order: int | None = Field(None, ge=1, description="Optional: update chapter position.")


class DeleteChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)


class ReorderChaptersInput(BaseModel):
    chapter_ids: list[str] = Field(..., min_length=1, description="Ordered chapter UUIDs.")


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
