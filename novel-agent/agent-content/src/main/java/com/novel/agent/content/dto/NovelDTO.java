package com.novel.agent.content.dto;

public record NovelDTO(
    String id,
    String title,
    String description,
    String genre,
    String style,
    int targetChapterWords,
    long createdAt,
    long updatedAt
) {}
