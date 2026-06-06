package com.novel.agent.content.service.crawl.dto;

public record CrawlLogEntryDTO(
    long seq,
    String level,
    String message,
    long ts
) {}
