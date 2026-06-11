package cn.novelstudio.module.content.service.crawl.dto;

public record CatalogNovelProgressDTO(
    String id,
    String title,
    String author,
    String description,
    String sourceUrl,
    String coverUrl,
    int chapterCount,
    Integer chaptersExpected,
    Integer chaptersDone,
    boolean complete,
    String latestJobId,
    String latestJobStatus,
    long createdAt,
    long updatedAt
) {}
