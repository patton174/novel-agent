package com.novel.agent.content.service.crawl.dto;

public record UpdateCatalogChapterRequest(
    String title,
    String content,
    Integer sortOrder,
    String sourceUrl
) {}
