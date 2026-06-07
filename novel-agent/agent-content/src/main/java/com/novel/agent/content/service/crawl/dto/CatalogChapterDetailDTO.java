package com.novel.agent.content.service.crawl.dto;

public record CatalogChapterDetailDTO(
    String id,
    String catalogNovelId,
    String title,
    String content,
    int sortOrder,
    int wordCount,
    String sourceUrl,
    long createdAt
) {}
