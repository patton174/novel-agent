"""解析结果模型。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ParsedChapter(BaseModel):
    title: str
    content: str
    sort_order: int


class ParseResult(BaseModel):
    title: str = ""
    chapters: list[ParsedChapter] = Field(default_factory=list)
    text: str = ""
    error: str | None = None
    detail: str | None = None
