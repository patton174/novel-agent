package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateNovelRequest(
    @NotBlank String title,
    String description,
    String genre,
    String style,
    @Positive Integer targetChapterWords
) {}
