package cn.novelstudio.module.content.dto;

public record ChapterSearchHitDTO(
    String id,
    String title,
    String snippet,
    int sortOrder,
    int wordCount
) {}
