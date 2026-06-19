"""Structured API tool input schemas — ID/enum based, no file paths."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, GetJsonSchemaHandler, field_validator, model_validator
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema

from app.agent.harness.tool_json_schema import (
    chapter_row_target_one_of_schema,
    create_memory_one_of_schema,
    delete_chapter_one_of_schema,
    merge_bind_schema,
    move_memory_one_of_schema,
    reorder_chapters_one_of_schema,
    update_memory_fields_one_of_schema,
)


class NarrativeReviewScope(str, Enum):
    recent = "recent"
    full_book = "full_book"
    changed = "changed"


class MemoryScope(str, Enum):
    """Deprecated alias — scope is now any root-node title string."""

    novel = "novel"
    world = "world"
    character = "character"
    chapter = "chapter"
    background = "background"


def _memory_scope_field(description: str) -> Field:
    return Field(..., min_length=1, max_length=128, description=description)


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


class ChapterRowTarget(BaseModel):
    """Locate one chapter row in reading order (ListChapters index / chapter_id)."""

    chapter_id: str | None = Field(
        None,
        description="Chapter UUID from ListChapters.",
    )
    title: str | None = Field(
        None,
        min_length=1,
        description="Resolve by exact title when chapter_id or index is unknown.",
    )
    index: int | None = Field(
        None,
        ge=1,
        description="1-based reading-order index from ListChapters.",
    )

    @model_validator(mode="after")
    def require_row_target(self) -> "ChapterRowTarget":
        if not self.chapter_id and not self.title and self.index is None:
            raise ValueError("Provide chapter_id, title, or index.")
        return self


class ReadChapterInput(ChapterRowTarget):
    offset: int | None = Field(None, ge=1, description="1-based start line.")
    limit: int | None = Field(None, ge=1, description="Max lines; omit to read to end.")

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            chapter_row_target_one_of_schema(
                properties=base.get("properties", {}),
                optional_keys=("offset", "limit"),
            ),
        )


class WriteChapterInput(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        description="Pure chapter title (no 第N章 prefix; index comes from sort order).",
    )
    content: str = Field(
        "",
        description="Must be empty — chapter body is generated via stream pipeline; do not pass prose here.",
    )
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


class EditChapterMode(str, Enum):
    rewrite = "rewrite"
    patch = "patch"


class EditChapterInput(BaseModel):
    mode: EditChapterMode = Field(
        EditChapterMode.patch,
        description=(
            "rewrite=server streams full body (pass index/chapter_id only, no new_content); "
            "patch=targeted old_string/new_string or small new_content."
        ),
    )
    chapter_id: str | None = Field(
        None,
        description="Chapter UUID from ListChapters. Optional if title or index is set.",
    )
    title: str | None = Field(
        None,
        min_length=1,
        description="Resolve chapter by exact title when chapter_id is missing or wrong.",
    )
    index: int | None = Field(
        None,
        ge=1,
        description="1-based reading-order index from ListChapters.",
    )
    new_content: str | None = Field(
        None,
        description=(
            "patch mode only: full replacement body when small enough to inline. "
            "For rewrites use mode=rewrite (server streams body)."
        ),
    )
    new_title: str | None = Field(
        None,
        min_length=1,
        description="Rename the chapter to this pure title (no 第N章 prefix).",
    )
    old_string: str = Field(
        "",
        description=(
            "Targeted patch only: exact snippet to replace. Prefer new_content for "
            "rewrites. Empty old_string replaces the entire body."
        ),
    )
    new_string: str = Field("")
    replace_all: bool = False
    position: int | None = Field(None, ge=1, description="Move chapter to this reading slot.")
    after_chapter_id: str | None = None
    before_chapter_id: str | None = None
    sort_order: int | None = Field(None, ge=1, description="Alias of position (legacy).")

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            chapter_row_target_one_of_schema(
                properties=base.get("properties", {}),
                optional_keys=(
                    "mode",
                    "new_content",
                    "new_title",
                    "old_string",
                    "new_string",
                    "replace_all",
                    "position",
                    "after_chapter_id",
                    "before_chapter_id",
                    "sort_order",
                ),
            ),
        )


class DeleteChapterInput(BaseModel):
    chapter_id: str | None = Field(None, description="Delete a single chapter.")
    chapter_ids: list[str] | None = Field(None, description="Delete multiple chapters.")
    title: str | None = Field(
        None,
        min_length=1,
        description="Delete by exact title (when chapter_id unknown).",
    )
    index: int | None = Field(
        None,
        ge=1,
        description="Delete chapter at 1-based reading-order index.",
    )
    dedupe_title: str | None = Field(
        None,
        min_length=1,
        description="Drop duplicate chapters with this exact title; keeps the earliest in reading order.",
    )

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            delete_chapter_one_of_schema(properties=base.get("properties", {})),
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

    @model_validator(mode="after")
    def require_reorder_mode(self) -> "ReorderChaptersInput":
        if not self.chapter_ids and not self.moves:
            raise ValueError("Provide chapter_ids or moves.")
        return self

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            reorder_chapters_one_of_schema(properties=base.get("properties", {})),
        )


class ListMemoryInput(BaseModel):
    scope: str = _memory_scope_field(
        "Scope key = outermost root node title (from GetMemoryTree / memory_index)."
    )
    parent_id: str | None = Field(
        None,
        description="List children of this node; omit for scope root nodes.",
    )


class GetMemoryTreeInput(BaseModel):
    scope: str = _memory_scope_field(
        "Scope key = outermost root node title (from memory_index)."
    )


class ReadMemoryInput(BaseModel):
    memory_id: str = Field(..., min_length=1, description="Node id from ListMemory or GetMemoryTree.")


class CreateMemoryInput(BaseModel):
    node_type: Literal["root", "child"] = Field(
        ...,
        description=(
            "Node level: `root` = scope tab label (omit parent_id; optional short intro only, not full dumps); "
            "`child` = content block under that tab (**parent_id UUID required** — copy from memory.scope_root_ids). "
            "Prefer multiple children by topic for clarity."
        ),
    )
    title: str = Field(..., min_length=1)
    parent_id: str | None = Field(
        None,
        description=(
            "When node_type=child: scope root memory_id UUID (copy from RUN_CONTEXT memory.scope_root_ids). "
            "Omit when node_type=root."
        ),
    )
    sort_order: int | None = Field(None, ge=0)
    node_kind: Literal["section", "leaf", "both"] | None = None
    content: str | None = Field(
        None,
        description=(
            "Markdown body. For node_type=root: optional brief intro (≤~200 chars). "
            "For node_type=child: main readable content; keep each child focused on one topic."
        ),
    )
    style: dict[str, Any] | None = Field(
        None,
        description=(
            'Layout preset JSON, e.g. {"layout": "accordion", "variant": "emphasis", '
            '"icon": "Globe", "accent": "emerald"}. icon = Lucide PascalCase name (no emoji). '
            "Layouts: accordion, outline, cards, timeline, hero, quote, prose."
        ),
    )
    meta: dict[str, Any] | None = None

    @field_validator("style", mode="before")
    @classmethod
    def coerce_style(cls, v: Any) -> Any:
        if isinstance(v, str):
            key = v.strip().lower()
            return {"layout": key} if key else None
        return v

    @model_validator(mode="after")
    def validate_node_type_parent(self) -> "CreateMemoryInput":
        pid = (self.parent_id or "").strip()
        if self.node_type == "root":
            if pid:
                raise ValueError("node_type=root must not set parent_id")
        elif not pid:
            raise ValueError(
                "node_type=child requires parent_id (UUID from memory.scope_root_ids)"
            )
        return self

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            create_memory_one_of_schema(properties=base.get("properties", {})),
        )


class _MemoryIdPatchBase(BaseModel):
    memory_id: str = Field(
        ...,
        min_length=1,
        description=(
            "Required node UUID from ListMemory or GetMemoryTree. "
            "Never null, never omit, never use scope title as memory_id."
        ),
    )
    parent_id: str | None = Field(
        None,
        description=(
            "Optional guard: must match the node's current parent_id "
            "(use when disambiguating siblings). Does not reparent — use MoveMemory for that."
        ),
    )


class UpdateMemoryFieldsInput(_MemoryIdPatchBase):
    """Patch title / node_kind / style only — not content or meta."""

    title: str | None = Field(None, min_length=1)
    node_kind: Literal["section", "leaf", "both"] | None = None
    style: dict[str, Any] | None = Field(
        None,
        description="Partial style patch; merges with stored style (same layout keys as CreateMemory).",
    )

    @model_validator(mode="after")
    def require_field_patch(self) -> "UpdateMemoryFieldsInput":
        if not any(v is not None for v in (self.title, self.node_kind, self.style)):
            raise ValueError("Provide at least one of title, node_kind, style.")
        return self

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            update_memory_fields_one_of_schema(properties=base.get("properties", {})),
        )


class UpdateMemoryContentInput(_MemoryIdPatchBase):
    """Replace node Markdown body — content must be non-empty."""

    content: str = Field(..., min_length=1, description="Non-empty Markdown body for the node.")


class UpdateMemoryMetaInput(_MemoryIdPatchBase):
    """Replace node meta JSON — meta must be a non-empty object."""

    meta: dict[str, Any] = Field(..., description="Non-empty structured JSON object.")

    @model_validator(mode="after")
    def require_non_empty_meta(self) -> "UpdateMemoryMetaInput":
        if not self.meta:
            raise ValueError("meta must be a non-empty JSON object.")
        return self


class MoveMemoryInput(BaseModel):
    memory_id: str = Field(..., min_length=1)
    parent_id: str | None = Field(None, description="New parent; null for scope root.")
    sort_order: int | None = Field(None, ge=0)

    @model_validator(mode="after")
    def require_move_target(self) -> "MoveMemoryInput":
        if "parent_id" not in self.model_fields_set and self.sort_order is None:
            raise ValueError("Provide parent_id and/or sort_order.")
        return self

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        base = handler(core_schema)
        return merge_bind_schema(
            base,
            move_memory_one_of_schema(properties=base.get("properties", {})),
        )


class DeleteMemoryInput(BaseModel):
    memory_id: str = Field(..., min_length=1)
    cascade: bool = Field(True, description="Delete subtree when true (default).")


class SearchKnowledgeInput(BaseModel):
    query: str = Field(..., min_length=1)
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
