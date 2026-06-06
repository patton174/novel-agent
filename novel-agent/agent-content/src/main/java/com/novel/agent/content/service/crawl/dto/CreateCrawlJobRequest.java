package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCrawlJobRequest(
    @NotBlank String sourceUrl,
    String siteId,
    String configJson
) {}
