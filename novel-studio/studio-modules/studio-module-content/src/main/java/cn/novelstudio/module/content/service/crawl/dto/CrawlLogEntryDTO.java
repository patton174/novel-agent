package cn.novelstudio.module.content.service.crawl.dto;

public record CrawlLogEntryDTO(
    long seq,
    String level,
    String message,
    long ts
) {}
