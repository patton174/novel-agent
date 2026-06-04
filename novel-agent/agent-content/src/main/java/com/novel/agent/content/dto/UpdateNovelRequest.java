package com.novel.agent.content.dto;

import jakarta.validation.constraints.Positive;

public record UpdateNovelRequest(
    String title,
    String description,
    String genre,
    String style,
    @Positive Integer targetChapterWords
) {}
