package cn.novelstudio.platform.messaging.catalog;

public record CatalogIndexMessage(
    String catalogNovelId,
    String chapterId,
    String title,
    int sortOrder
) {}
