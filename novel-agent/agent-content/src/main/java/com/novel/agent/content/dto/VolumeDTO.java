package com.novel.agent.content.dto;

public record VolumeDTO(
    String id,
    String novelId,
    String title,
    String description,
    int sortOrder,
    int chapterCount,
    long createdAt,
    long updatedAt
) {}
