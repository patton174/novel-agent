package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCrawlJobRequest(
    @NotBlank(message = "{validation.crawl.source_url_required}") String sourceUrl,
    String siteId,
    String configJson
) {}
