package cn.novelstudio.module.content.service.crawl.dto;

public record UpdateCatalogChapterRequest(
    String title,
    String content,
    Integer sortOrder,
    String sourceUrl
) {}
