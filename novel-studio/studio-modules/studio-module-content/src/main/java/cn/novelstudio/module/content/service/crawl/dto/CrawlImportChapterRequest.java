package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CrawlImportChapterRequest(
    @NotBlank(message = "{validation.content.title_required}") String title,
    String content,
    @NotNull(message = "{validation.crawl.sort_order_required}") Integer sortOrder,
    String sourceUrl
) {}
