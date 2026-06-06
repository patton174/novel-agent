package com.novel.agent.common.mq.crawl;

public record CrawlDispatchMessage(
    String jobId,
    String sourceUrl,
    String configJson,
    int attempt
) {}
