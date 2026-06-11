package cn.novelstudio.module.content.dto;

public record ChapterVersionDTO(
    String id,
    String chapterId,
    String novelId,
    String title,
    String content,
    int wordCount,
    String source,
    long createdAt
) {}
