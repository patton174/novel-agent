package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record UpsertCrawlSiteRequest(
    @NotBlank String name,
    String baseUrl,
    String configJson,
    Boolean enabled,
    String remark
) {}
