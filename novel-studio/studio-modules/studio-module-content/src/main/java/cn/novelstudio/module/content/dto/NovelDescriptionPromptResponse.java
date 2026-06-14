package cn.novelstudio.module.content.dto;

public record NovelDescriptionPromptResponse(
    String title,
    String genre,
    String tags,
    String style,
    String hook,
    String protagonist,
    String worldview,
    String synopsis,
    String sellingPoints,
    Integer targetChapterWords,
    String description
) {}
