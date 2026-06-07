package com.novel.agent.content.service.crawl.dto;

public record UpdateCatalogNovelRequest(
    String title,
    String author,
    String description,
    String coverUrl,
    String sourceUrl
) {}
