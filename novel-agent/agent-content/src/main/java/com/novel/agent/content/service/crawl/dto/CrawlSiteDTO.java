package com.novel.agent.content.service.crawl.dto;

public record CrawlSiteDTO(
    String id,
    String name,
    String baseUrl,
    String configJson,
    boolean enabled,
    String remark,
    long createdAt,
    long updatedAt
) {}
