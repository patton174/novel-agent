package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateChapterRequest(
    @NotBlank String title,
    String content,
    String summary,
    String volumeId,
    Integer sortOrder
) {}
