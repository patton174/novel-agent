package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record CrawlPreviewRequest(
    @NotBlank String sourceUrl,
    String siteId,
    String configJson
) {}
