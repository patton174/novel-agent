package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateNovelRequest(
    @NotBlank(message = "{validation.content.title_required}") String title,
    String description,
    String genre,
    String style,
    @Positive(message = "{validation.content.target_words_positive}") Integer targetChapterWords
) {}
