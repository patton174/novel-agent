"""Pydantic models for memory_node tree API (replacement storage)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

MemoryNodeKind = Literal["section", "leaf", "both"]


class MemoryNodeStyle(BaseModel):
    layout: str | None = None
    level: int | None = None
    variant: str | None = None
    icon: str | None = None
    accent: str | None = None
    collapse_default: bool | None = None
    show_content_inline: bool | None = None


class MemoryNodeDTO(BaseModel):
    memory_id: str
    novel_id: str
    scope: str = Field(..., min_length=1, max_length=128)
    parent_id: str | None = None
    sort_order: int = 0
    title: str
    node_kind: MemoryNodeKind = "both"
    content: str | None = None
    style: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None
    child_count: int = 0


class CreateMemoryNodeInput(BaseModel):
    scope: str | None = Field(None, max_length=128)
    title: str = Field(..., min_length=1)
    parent_id: str | None = None
    sort_order: int | None = None
    node_kind: MemoryNodeKind = "both"
    content: str | None = None
    style: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None


class UpdateMemoryNodeInput(BaseModel):
    title: str | None = None
    node_kind: MemoryNodeKind | None = None
    content: str | None = None
    style: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None


class MoveMemoryNodeInput(BaseModel):
    parent_id: str | None = None
    sort_order: int | None = None
