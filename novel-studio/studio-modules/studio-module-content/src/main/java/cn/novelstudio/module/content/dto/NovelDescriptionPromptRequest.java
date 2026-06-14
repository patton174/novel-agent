package cn.novelstudio.module.content.dto;

public record NovelDescriptionPromptRequest(
    String title,
    String genre,
    String style,
    String tags,
    String hook,
    String protagonist,
    String worldview,
    String synopsis,
    String sellingPoints,
    Integer targetChapterWords,
    String draft,
    String mode
) {}
