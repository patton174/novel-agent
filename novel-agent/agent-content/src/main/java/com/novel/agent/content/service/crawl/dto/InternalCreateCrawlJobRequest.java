package com.novel.agent.content.service.crawl.dto;

public record InternalCreateCrawlJobRequest(
    String sourceUrl,
    String configJson,
    String catalogNovelId
) {}
