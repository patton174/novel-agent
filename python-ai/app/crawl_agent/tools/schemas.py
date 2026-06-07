"""Pydantic schemas for crawl agent tools."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FetchPageInput(BaseModel):
    url: str = Field(..., min_length=8, description="要抓取的绝对 URL")
    use_stealth: bool | None = Field(
        default=None,
        description="是否用 Stealth 浏览器；省略则沿用任务默认",
    )


class BrowserOpenInput(BaseModel):
    url: str = Field(..., min_length=8, description="打开 Playwright 浏览器并导航到此 URL")


class BrowserGotoInput(BaseModel):
    url: str = Field(..., min_length=8, description="在当前浏览器会话中跳转到 URL")


class BrowserClickInput(BaseModel):
    text: str = Field(
        default="",
        description="按可见文字点击链接/按钮（推荐，如「网游竞技」「开始阅读」）",
    )
    selector: str = Field(default="", description="CSS 选择器；text 为空时使用")


class BrowserSnapshotInput(BaseModel):
    pass


class DiscoverChaptersInput(BaseModel):
    """Deprecated — use QueueChapters. Kept for schema compatibility."""
    url: str = Field(..., min_length=8)
    max_chapters: int | None = None


class ChapterQueueItem(BaseModel):
    title: str = Field(default="", description="章节标题（可选）")
    url: str = Field(..., min_length=8, description="章节页绝对 URL")
    sort_order: int = Field(..., ge=1, description="阅读顺序，从 1 开始")


class QueueChaptersInput(BaseModel):
    novel_title: str = Field(..., min_length=1, description="书名（从已读页面归纳）")
    author: str = Field(default="", description="作者")
    description: str = Field(default="", description="简介")
    source_url: str = Field(
        default="",
        description="书籍来源页 URL；省略则用入口或最近 FetchPage",
    )
    chapters: list[ChapterQueueItem] = Field(
        ...,
        min_length=1,
        description="你在 RUN_CONTEXT 中读到的章节列表（title/url/sort_order）",
    )
    append: bool = Field(
        default=False,
        description="True 则追加到现有队列；False 则替换",
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
        description="本批最多保存章数；省略则每批 20 章，避免长时间无日志",
    )


class GetJobStatusInput(BaseModel):
    pass


class CompleteJobInput(BaseModel):
    message: str = Field(default="爬虫任务完成", description="完成说明；发现类任务在此写明找到的 URL")


class UpdateCoverUrlInput(BaseModel):
    cover_url: str = Field(
        ...,
        min_length=8,
        description="封面图绝对 URL（须来自 RUN_CONTEXT 中 img/src 或 og:image）",
    )


class FailJobInput(BaseModel):
    message: str = Field(..., min_length=1)
