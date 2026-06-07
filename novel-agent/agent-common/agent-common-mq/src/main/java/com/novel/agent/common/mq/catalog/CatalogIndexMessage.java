package com.novel.agent.common.mq.catalog;

public record CatalogIndexMessage(
    String catalogNovelId,
    String chapterId,
    String title,
    int sortOrder
) {}
