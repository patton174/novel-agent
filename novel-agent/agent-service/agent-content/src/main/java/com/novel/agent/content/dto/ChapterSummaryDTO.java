package com.novel.agent.content.dto;

public record ChapterSummaryDTO(
    String id,
    String novelId,
    String volumeId,
    String volumeTitle,
    String title,
    String summary,
    int sortOrder,
    int wordCount,
    long updatedAt
) {}
