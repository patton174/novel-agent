package cn.novelstudio.platform.messaging.crawl;

public record CrawlDispatchMessage(
    String jobId,
    String sourceUrl,
    String configJson,
    int attempt
) {}
