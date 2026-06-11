package cn.novelstudio.module.content.service.crawl.dto;

public record CrawlProgressRequest(
    Integer chaptersTotal,
    Integer chaptersDone,
    String title,
    String status
) {}
