package com.novel.agent.content.dto;

public record UpdateChapterRequest(
    String title,
    String content,
    String summary,
    Integer sortOrder
) {}
