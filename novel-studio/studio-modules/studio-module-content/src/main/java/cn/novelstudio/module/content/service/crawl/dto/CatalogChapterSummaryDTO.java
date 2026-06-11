package cn.novelstudio.module.content.service.crawl.dto;

public record CatalogChapterSummaryDTO(
    String id,
    String catalogNovelId,
    String title,
    int sortOrder,
    int wordCount,
    String sourceUrl
) {}
