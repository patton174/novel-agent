package cn.novelstudio.module.content.service.crawl.dto;

public record UpdateCatalogNovelRequest(
    String title,
    String author,
    String description,
    String coverUrl,
    String sourceUrl
) {}
