"""Pydantic input models aligned with CC tool schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ReadInput(BaseModel):
    file_path: str = Field(
        description=(
            "Absolute VFS path under /novel/{novelId}/ from RUN_CONTEXT catalog "
            "(e.g. …/chapters/{uuid}.md or …/memory/world/{key}.json)."
        )
    )
    offset: int | None = Field(
        None,
        ge=1,
        description="1-based start line. Default 1. Use footer next offset to continue.",
    )
    limit: int | None = Field(
        None,
        ge=1,
        description=(
            "Max lines from offset. Omit to read through end of file. "
            "Small limits may return only memory headers — prefer omitting limit."
        ),
    )


class WriteInput(BaseModel):
    file_path: str
    content: str = ""


class EditInput(BaseModel):
    file_path: str
    old_string: str
    new_string: str
    replace_all: bool = False
    sort_order: int | None = Field(
        None,
        ge=1,
        description="Optional: persist chapter position (1-based sortOrder) via Content API after edit.",
    )


class ReorderChaptersInput(BaseModel):
    chapter_ids: list[str] = Field(
        ...,
        min_length=1,
        description="Ordered chapter UUIDs for the entire novel (from chapter_catalog or Read index).",
    )


class GlobInput(BaseModel):
    pattern: str
    path: str | None = None


class GrepInput(BaseModel):
    pattern: str
    path: str | None = None
    glob: str | None = None
    output_mode: str = "files_with_matches"
    head_limit: int | None = 25


class DeleteInput(BaseModel):
    file_path: str


class AskUserInput(BaseModel):
    questions: list[dict[str, Any]] = Field(default_factory=list)
    options: list[dict[str, Any]] | None = None


class TodoItemInput(BaseModel):
    """CC TodoWrite: model must supply stable id + content (no server-side invention)."""

    model_config = {"extra": "allow"}

    id: str = Field(min_length=1)
    content: str = Field(min_length=1)
    status: str = "pending"


class TodoWriteInput(BaseModel):
    todos: list[TodoItemInput]
    merge: bool = True


class WebFetchInput(BaseModel):
    url: str
    prompt: str = ""


class WebSearchInput(BaseModel):
    query: str


class ToolSearchInput(BaseModel):
    query: str
    max_results: int = 5


class NotebookEditInput(BaseModel):
    notebook_path: str
    cell_id: str = ""
    new_source: str = ""
    edit_mode: str = "replace"


class PlanModeInput(BaseModel):
    reason: str = ""


class AgentInput(BaseModel):
    description: str = Field(
        ...,
        description="Short label for UI (e.g. '迁移第1-4章记忆').",
    )
    prompt: str = Field(
        ...,
        description=(
            "Full subtask spec for the child agent: scope, chapter_ids, "
            "paths, done criteria. Keep each dispatch to ≤4 chapters or ≤6 tool-heavy steps."
        ),
    )


class TaskCreateInput(BaseModel):
    subject: str
    description: str = ""
    activeForm: str = ""


class TaskGetInput(BaseModel):
    task_id: str


class TaskListInput(BaseModel):
    pass


class TaskUpdateInput(BaseModel):
    task_id: str
    status: str = ""


class TaskStopInput(BaseModel):
    task_id: str


class BriefInput(BaseModel):
    text: str


class SkillInput(BaseModel):
    skill: str


class McpListInput(BaseModel):
    server: str = ""


class McpReadInput(BaseModel):
    server: str
    uri: str
