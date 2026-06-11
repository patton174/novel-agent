package cn.novelstudio.module.content.service.crawl.dto;

public record InternalCreateCrawlJobRequest(
    String sourceUrl,
    String configJson,
    String catalogNovelId
) {}
