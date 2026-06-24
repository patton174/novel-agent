package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Agent EditChapter line-range patch (1-based lines on stored chapter content).
 */
public record PatchChapterLinesRequest(
    @NotNull @Min(1) Integer lineStart,
    @Min(1) Integer lineEnd,
    @NotNull String lineContent
) {}
