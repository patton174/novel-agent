package com.novel.agent.content.service.crawl.dto;

public record CrawlProgressRequest(
    Integer chaptersTotal,
    Integer chaptersDone,
    String title,
    String status
) {}
