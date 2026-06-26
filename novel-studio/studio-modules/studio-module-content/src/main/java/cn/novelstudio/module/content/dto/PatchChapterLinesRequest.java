package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Agent EditChapter line-range patch (1-based lines on stored chapter content).
 */
public record PatchChapterLinesRequest(
    @NotNull(message = "{validation.content.line_start_required}") @Min(value = 1, message = "{validation.number.min_one}") Integer lineStart,
    @Min(value = 1, message = "{validation.number.min_one}") Integer lineEnd,
    @NotNull(message = "{validation.content.line_content_required}") String lineContent
) {}
