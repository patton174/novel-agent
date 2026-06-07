package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CrawlImportChapterRequest(
    @NotBlank String title,
    String content,
    @NotNull Integer sortOrder,
    String sourceUrl
) {}
