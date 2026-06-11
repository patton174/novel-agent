package cn.novelstudio.module.content.service.crawl.dto;

public record CatalogNovelDTO(
    String id,
    String title,
    String author,
    String description,
    String sourceUrl,
    String coverUrl,
    int chapterCount,
    long createdAt,
    long updatedAt
) {}
