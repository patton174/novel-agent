package com.novel.agent.content.service.crawl.dto;

import com.novel.agent.content.crawl.CrawlJobStatus;

public record CrawlJobDTO(
    String id,
    String sourceUrl,
    String siteId,
    String title,
    CrawlJobStatus status,
    Long createdByAdminId,
    String catalogNovelId,
    Integer chaptersTotal,
    Integer chaptersDone,
    String configJson,
    String errorMessage,
    long startedAt,
    long completedAt,
    long createdAt,
    long updatedAt
) {}
