package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AddCatalogChapterRequest(
    @NotBlank String title,
    String content,
    @Min(1) int sortOrder,
    String sourceUrl
) {}
