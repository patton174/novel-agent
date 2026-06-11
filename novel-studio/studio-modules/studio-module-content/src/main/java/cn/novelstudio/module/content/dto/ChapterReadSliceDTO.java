package cn.novelstudio.module.content.dto;

/**
 * Agent Read tool: line-numbered slice of chapter markdown (1-based offset/limit).
 */
public record ChapterReadSliceDTO(
    String chapterId,
    String title,
    int totalLines,
    int offset,
    int returnedLines,
    boolean hasMore,
    Integer nextOffset,
    String text
) {}
