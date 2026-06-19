package com.novel.agent.content.dto;

public record ChapterDTO(
    String id,
    String novelId,
    String volumeId,
    String title,
    String content,
    String summary,
    int sortOrder,
    int wordCount,
    long createdAt,
    long updatedAt
) {}
