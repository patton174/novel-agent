"""Pydantic schemas for catalog CRUD tools."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CatalogNovelIdInput(BaseModel):
    catalog_novel_id: str = Field(
        default="",
        description="书库作品 ID；省略则用任务已关联的 catalogNovelId",
    )


class ListCatalogNovelsInput(BaseModel):
    page_current: int = Field(default=1, ge=1, description="页码，从 1 开始")
    page_size: int = Field(default=20, ge=1, le=50, description="每页条数")


class UpdateCatalogNovelInput(BaseModel):
    catalog_novel_id: str = Field(default="", description="书库作品 ID；省略则用任务关联 ID")
    title: str | None = Field(default=None, description="书名")
    author: str | None = Field(default=None, description="作者")
    description: str | None = Field(default=None, description="简介")
    cover_url: str | None = Field(default=None, description="封面图 URL")
    source_url: str | None = Field(default=None, description="来源页 URL")


class DeleteCatalogNovelInput(BaseModel):
    catalog_novel_id: str = Field(..., min_length=1, description="要删除的书库作品 ID")


class ListCatalogChaptersInput(BaseModel):
    catalog_novel_id: str = Field(default="", description="书库作品 ID；省略则用任务关联 ID")


class GetCatalogChapterInput(BaseModel):
    catalog_novel_id: str = Field(default="", description="书库作品 ID；省略则用任务关联 ID")
    chapter_id: str = Field(..., min_length=1, description="章节 ID（见 ListCatalogChapters）")


class AddCatalogChapterInput(BaseModel):
    catalog_novel_id: str = Field(default="", description="书库作品 ID；省略则用任务关联 ID")
    title: str = Field(..., min_length=1, description="章节标题")
    content: str = Field(default="", description="章节正文")
    sort_order: int = Field(..., ge=1, description="章节序号")
    source_url: str = Field(default="", description="章节来源 URL")


class UpdateCatalogChapterInput(BaseModel):
    catalog_novel_id: str = Field(default="", description="书库作品 ID；省略则用任务关联 ID")
    chapter_id: str = Field(..., min_length=1, description="章节 ID")
    title: str | None = Field(default=None, description="新标题")
    content: str | None = Field(default=None, description="新正文")
    sort_order: int | None = Field(default=None, ge=1, description="新序号")
    source_url: str | None = Field(default=None, description="新来源 URL")


class DeleteCatalogChapterInput(BaseModel):
    catalog_novel_id: str = Field(default="", description="书库作品 ID；省略则用任务关联 ID")
    chapter_id: str = Field(..., min_length=1, description="要删除的章节 ID")
