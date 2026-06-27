package cn.novelstudio.module.content.dto;

public record NovelDTO(
    String id,
    String title,
    String description,
    String genre,
    String style,
    int targetChapterWords,
    String coverUrl,
    String coverStorageKey,
    boolean hasCover,
    long createdAt,
    long updatedAt
) {}
