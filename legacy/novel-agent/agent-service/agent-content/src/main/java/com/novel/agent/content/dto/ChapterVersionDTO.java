package com.novel.agent.content.dto;

public record ChapterVersionDTO(
    String id,
    String chapterId,
    String novelId,
    String title,
    String content,
    int wordCount,
    String source,
    long createdAt
) {}
