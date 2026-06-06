"""Pydantic schemas for crawl agent tools."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FetchPageInput(BaseModel):
    url: str = Field(..., min_length=8, description="要抓取的绝对 URL")
    use_stealth: bool | None = Field(
        default=None,
        description="是否用 Stealth 浏览器；省略则沿用任务默认",
    )


class DiscoverChaptersInput(BaseModel):
    url: str = Field(..., min_length=8, description="书籍页/目录页/章节列表页 URL")
    max_chapters: int | None = Field(
        default=None,
        description="最多识别章数；省略则用任务上限",
    )


class InitNovelInput(BaseModel):
    title: str = Field(..., min_length=1)
    author: str = ""
    description: str = ""
    source_url: str = Field(
        default="",
        description="书籍来源 URL；省略则用当前入口或最近发现页",
    )


class FetchAndSaveChapterInput(BaseModel):
    url: str = Field(..., min_length=8, description="章节页 URL")
    title_hint: str = Field(default="", description="章节标题提示（可选）")
    sort_order: int = Field(..., ge=1, description="章节序号，从 1 开始")


class SaveQueuedChaptersInput(BaseModel):
    start_from: int = Field(
        default=1,
        ge=1,
        description="从队列中第几章开始保存（含）；默认 1",
    )
    max_count: int | None = Field(
        default=None,
        ge=1,
        description="最多保存章数；省略则保存至任务上限或队列末尾",
    )


class GetJobStatusInput(BaseModel):
    pass


class CompleteJobInput(BaseModel):
    message: str = Field(default="爬虫任务完成")


class FailJobInput(BaseModel):
    message: str = Field(..., min_length=1)
